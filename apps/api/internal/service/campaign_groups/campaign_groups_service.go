package campaigngroupsservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"log/slog"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type partiesService interface {
	GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32, createIfMissing ...bool) (int32, error)
	ListPartyOfficials(ctx context.Context, partyID int16, chapterID int32) ([]queries.ListPartyOfficialsRow, error)
}

type CampaignGroupsService struct {
	queries        *queries.Queries
	pool           *pgxpool.Pool
	rdb            *redis.Client
	partiesService partiesService
}

func NewCampaignGroupsService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, partiesService partiesService) *CampaignGroupsService {
	return &CampaignGroupsService{
		queries:        q,
		pool:           pool,
		rdb:            rdb,
		partiesService: partiesService,
	}
}

// MapElectionScopeToCampaignScope translates election scopes to campaign group scopes.
// (e.g. "nationwide" -> "national", "senatorial-district" / "federal-constituency" -> "state", "lga" -> "lga", etc.)
func MapElectionScopeToCampaignScope(electionScope string) string {
	switch electionScope {
	case "nationwide", "national":
		return "national"
	case "state", "senatorial-district", "federal-constituency", "state-constituency":
		return "state"
	case "lga":
		return "lga"
	case "ward":
		return "ward"
	default:
		return "national"
	}
}

// resolveGroupBounds extracts matching geographical boundary identifiers based on election scope.
func resolveGroupBounds(election queries.Election, campaignScope string) (stateID, lgaID, wardID pgtype.Int4) {
	stateID = utils.PgInt4FromPositive(election.StateID.Int16)
	if campaignScope == "lga" || campaignScope == "ward" {
		lgaID = utils.PgInt4FromPositive(election.LgaID.Int32)
	}
	if campaignScope == "ward" {
		wardID = utils.PgInt4FromPositive(election.WardID.Int32)
	}
	return
}

// SyncOfficialsResult encapsulates the diagnostics and outcome of synchronizing party officials to a campaign group.
type SyncOfficialsResult struct {
	GroupID               int64   `json:"group_id"`
	PartyID               int16   `json:"party_id"`
	TargetElectionGroupID *int32  `json:"target_election_group_id,omitempty"`
	Scope                 string  `json:"scope"`
	ChapterID             int32   `json:"chapter_id"`
	OfficialsFound        int     `json:"officials_found"`
	OfficialsAdded        int     `json:"officials_added"`
	AddedUserIDs          []int64 `json:"added_user_ids"`
}

// InvalidateCampaignGroupCache flushes the cached metadata for a campaign group.
func (s *CampaignGroupsService) InvalidateCampaignGroupCache(ctx context.Context, groupID int64) {
	if groupID > 0 {
		cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupByID, groupID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// GetCampaignGroupByID fetches a campaign group by its primary key ID, backed by a 30-day Redis cache.
func (s *CampaignGroupsService) GetCampaignGroupByID(ctx context.Context, id int64) (queries.CampaignGroup, error) {
	if id <= 0 {
		return queries.CampaignGroup{}, fmt.Errorf("invalid campaign group id: %d", id)
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupByID, id)

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var group queries.CampaignGroup
		if jsonErr := json.Unmarshal([]byte(cachedVal), &group); jsonErr == nil {
			return group, nil
		}
	}

	// 2. Query DB
	group, err := s.queries.GetCampaignGroupByID(ctx, id)
	if err != nil {
		return queries.CampaignGroup{}, err
	}

	// 3. Cache in Redis
	if data, err := json.Marshal(group); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisThirtyDaysTTL).Err()
	}

	return group, nil
}

// SyncPartyOfficialsToGroup synchronizes the party's chapter officials for the group's scope and adds them to the campaign group.
// It is protected by a 30-minute Redis cooldown lock per group to prevent excessive database lookups.
func (s *CampaignGroupsService) SyncPartyOfficialsToGroup(ctx context.Context, groupID int64) (*SyncOfficialsResult, error) {
	if groupID <= 0 {
		return nil, fmt.Errorf("invalid campaign group id: %d", groupID)
	}

	group, err := s.GetCampaignGroupByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch campaign group %d: %w", groupID, err)
	}

	// 30-minute rate limit lock per group to avoid spamming the database
	lockKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupSyncLock, groupID)
	_, err = s.rdb.SetArgs(ctx, lockKey, "1", redis.SetArgs{
		TTL:  db.RedisThirtyMinutesTTL,
		Mode: "NX", // only set if not exists
	}).Result()

	// If the lock already exists (cooldown is active), calculate and return the remaining time
	if errors.Is(err, redis.Nil) {
		ttl, _ := s.rdb.TTL(ctx, lockKey).Result()
		minsRemaining := int(ttl.Minutes())
		if minsRemaining < 1 {
			minsRemaining = 1
		}

		return nil, fmt.Errorf("officials were recently synced for this group; please wait %d minutes before syncing again", minsRemaining)
	} else if err != nil {
		slog.Warn("failed to check sync cooldown lock in redis", "groupID", groupID, "error", err)
	}

	// Proceed with the actual sync operation
	res, err := s.syncPartyOfficialsToGroup(ctx, group.PartyID, group)
	if err != nil {
		// Release lock on failure so caller can retry without being locked out
		_ = s.rdb.Del(ctx, lockKey).Err()
		return nil, err
	}

	return res, nil
}

// syncPartyOfficialsToGroup fetches the party's chapter officials at the group's scope and adds them to the campaign group.
func (s *CampaignGroupsService) syncPartyOfficialsToGroup(ctx context.Context, partyID int16, group queries.CampaignGroup) (*SyncOfficialsResult, error) {
	if partyID <= 0 {
		return &SyncOfficialsResult{GroupID: group.ID, PartyID: partyID, Scope: group.Scope, AddedUserIDs: make([]int64, 0)}, nil
	}

	// Initialize synchronization result tracker
	result := &SyncOfficialsResult{
		GroupID:      group.ID,
		PartyID:      partyID,
		Scope:        group.Scope,
		AddedUserIDs: make([]int64, 0),
	}
	if group.TargetElectionGroupID.Valid {
		result.TargetElectionGroupID = &group.TargetElectionGroupID.Int32
	}

	var chapterID int32
	var err error

	// Resolve matching party chapter based on the campaign group's jurisdictional scope
	switch group.Scope {
	case "national":
		chapterID, err = s.partiesService.GetOrCreateNationalChapter(ctx, partyID, constants.NigeriaCountryID, false)
	case "state":
		if group.StateID.Valid {
			chapterID, err = s.partiesService.GetOrCreateStateChapter(ctx, partyID, int16(group.StateID.Int32), false)
		}
	case "lga":
		if group.LgaID.Valid {
			chapterID, err = s.partiesService.GetOrCreateLGAChapter(ctx, partyID, group.LgaID.Int32, false)
		}
	case "ward":
		if group.WardID.Valid {
			chapterID, err = s.partiesService.GetOrCreateWardChapter(ctx, partyID, group.WardID.Int32, false)
		}
	}

	// if no chapter is found, return early
	if err != nil {
		return nil, fmt.Errorf("failed to resolve chapter for campaign group %d: %w", group.ID, err)
	}

	result.ChapterID = chapterID

	// If no chapter exists yet at this jurisdictional level, return early
	if chapterID == 0 {
		return result, nil
	}

	// Fetch all active party officials assigned to this chapter
	officials, err := s.partiesService.ListPartyOfficials(ctx, partyID, chapterID)
	if err != nil {
		return nil, fmt.Errorf("failed to list party officials for chapter %d: %w", chapterID, err)
	}

	result.OfficialsFound = len(officials)

	// If no officials exist in this chapter yet, return early without marking as added
	if len(officials) == 0 {
		return result, nil
	}

	// Collect active official IDs to enroll
	activeUserIDs := make([]int64, 0, len(officials))
	for _, official := range officials {
		if official.UserID <= 0 || official.AssignmentStatus != "active" {
			continue
		}
		activeUserIDs = append(activeUserIDs, official.UserID)

		// Party officials have null election_group_id as their tenure is chapter-bound
		_, err := s.AddCampaignGroupMember(ctx, partyID, pgtype.Int4{Valid: false}, group.ID, official.UserID, "party_official", true)
		if err != nil {
			slog.Warn("failed to add party official to campaign group", "userID", official.UserID, "groupID", group.ID, "error", err)
			continue
		}

		result.OfficialsAdded++
		result.AddedUserIDs = append(result.AddedUserIDs, official.UserID)
	}

	// Only mark group officials flag as added if officials were actually enrolled
	if result.OfficialsAdded > 0 {
		if err := s.queries.MarkCampaignGroupOfficialsAdded(ctx, group.ID); err != nil {
			return nil, err
		}
		s.InvalidateCampaignGroupCache(ctx, group.ID)
	}

	// Invalidate cached member roster so callers see updated status
	s.InvalidateGroupMembersCache(ctx, group.ID)
	return result, nil
}

// AddCampaignGroupMember adds or updates a member in a campaign group and invalidates the cached group member roster.
func (s *CampaignGroupsService) AddCampaignGroupMember(ctx context.Context, partyID int16, electionGroupID pgtype.Int4, groupID int64, userID int64, role string, canBroadcast bool) (queries.CampaignGroupMember, error) {
	member, err := s.queries.AddCampaignGroupMember(ctx, queries.AddCampaignGroupMemberParams{
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		GroupID:         groupID,
		UserID:          userID,
		Role:            role,
		CanBroadcast:    canBroadcast,
	})
	if err != nil {
		return queries.CampaignGroupMember{}, err
	}

	s.InvalidateGroupMembersCache(ctx, groupID)
	return member, nil
}

// RemoveCampaignGroupMember removes a user from a specific campaign group and invalidates the cached group member roster.
func (s *CampaignGroupsService) RemoveCampaignGroupMember(ctx context.Context, groupID int64, userID int64) error {
	// Delete member record from the campaign group
	err := s.queries.RemoveCampaignGroupMember(ctx, queries.RemoveCampaignGroupMemberParams{
		GroupID: groupID,
		UserID:  userID,
	})
	if err != nil {
		return err
	}

	// Invalidate the group's cached member roster
	s.InvalidateGroupMembersCache(ctx, groupID)
	return nil
}

// InvalidateGroupMembersCache invalidates the Redis cache for a campaign group's member roster.
func (s *CampaignGroupsService) InvalidateGroupMembersCache(ctx context.Context, groupID int64) {
	if groupID > 0 {
		cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupMembers, groupID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// GetGroupMembers retrieves all members of a campaign group, backed by a 7-day Redis cache.
func (s *CampaignGroupsService) GetGroupMembers(ctx context.Context, groupID int64) ([]queries.ListCampaignGroupMembersRow, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupMembers, groupID)

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []queries.ListCampaignGroupMembersRow
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	members, err := s.queries.ListCampaignGroupMembers(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch campaign group members for group %d: %w", groupID, err)
	}

	if members == nil {
		members = []queries.ListCampaignGroupMembersRow{}
	}

	// 3. Cache in Redis
	if data, err := json.Marshal(members); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return members, nil
}

// GetOrCreateCampaignGroupInput contains parameters to resolve or provision a campaign group.
type GetOrCreateCampaignGroupInput struct {
	PartyID         int16
	ElectionGroupID int32
	Scope           string
	StateID         pgtype.Int4
	LgaID           pgtype.Int4
	WardID          pgtype.Int4
}

// GetOrCreateCampaignGroup finds or provisions a campaign group for a given party,
// election cycle, and territorial scope, and ensures party chapter officials are populated.
func (s *CampaignGroupsService) GetOrCreateCampaignGroup(ctx context.Context, input GetOrCreateCampaignGroupInput) (*queries.CampaignGroup, error) {
	group, err := s.queries.FindOrCreateCampaignGroup(ctx, queries.FindOrCreateCampaignGroupParams{
		PartyID:               input.PartyID,
		TargetElectionGroupID: utils.PgInt4FromPositive(input.ElectionGroupID),
		Scope:                 input.Scope,
		StateID:               input.StateID,
		LgaID:                 input.LgaID,
		WardID:                input.WardID,
		Name:                  pgtype.Text{Valid: false},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to find or create campaign group: %w", err)
	}

	// Populate party chapter officials if not already added to this group
	if !group.OfficialsAdded {
		if syncRes, err := s.syncPartyOfficialsToGroup(ctx, input.PartyID, group); err != nil {
			slog.Warn("failed to sync party officials to campaign group", "groupID", group.ID, "error", err)
		} else if syncRes != nil && syncRes.OfficialsAdded > 0 {
			group.OfficialsAdded = true
		}
	}

	return &group, nil
}

// EnsureElectionCandidateInGroup provisions the anchor campaign group for a fielded candidate or running mate
// and registers them as a group member with broadcasting permissions.
func (s *CampaignGroupsService) EnsureElectionCandidateInGroup(ctx context.Context, partyID int16, election queries.Election, candidateID int64) (*queries.CampaignGroup, error) {
	campaignScope := MapElectionScopeToCampaignScope(election.Scope)
	stateID, lgaID, wardID := resolveGroupBounds(election, campaignScope)

	group, err := s.GetOrCreateCampaignGroup(ctx, GetOrCreateCampaignGroupInput{
		PartyID:         partyID,
		ElectionGroupID: election.ElectionGroupID,
		Scope:           campaignScope,
		StateID:         stateID,
		LgaID:           lgaID,
		WardID:          wardID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to ensure campaign group for election %d: %w", election.ID, err)
	}

	_, err = s.AddCampaignGroupMember(ctx, partyID, utils.PgInt4FromPositive(election.ElectionGroupID), group.ID, candidateID, "candidate", true)
	if err != nil {
		return nil, fmt.Errorf("failed to add candidate %d to campaign group %d: %w", candidateID, group.ID, err)
	}

	return group, nil
}

// RemoveCandidateFromElectionGroup revokes candidate membership across all campaign groups for the party in an election cycle.
func (s *CampaignGroupsService) RemoveCandidateFromElectionGroup(ctx context.Context, partyID int16, electionGroupID int32, candidateID int64) error {
	// Remove member records from all groups tied to this party and election cycle
	groupIDs, err := s.queries.RemoveCampaignGroupMembersByElectionGroup(ctx, queries.RemoveCampaignGroupMembersByElectionGroupParams{
		PartyID:         partyID,
		ElectionGroupID: utils.PgInt4FromPositive(electionGroupID),
		UserID:          candidateID,
	})
	if err != nil {
		return err
	}

	// Invalidate cached member rosters for every affected campaign group
	for _, groupID := range groupIDs {
		s.InvalidateGroupMembersCache(ctx, groupID)
	}

	return nil
}

type EnsureAgentCampaignInGroupInput struct {
	PartyID         int16
	ElectionGroupID int32
	UserID          int64
	Role            string
	StateID         int16
	LgaID           int32
	WardID          int32
	PollingUnitID   int32
}

// EnsureAgentCampaignGroupInput is an alias for backward compatibility.
type EnsureAgentCampaignGroupInput = EnsureAgentCampaignInGroupInput

// EnsureAgentCampaignInGroup provisions or resolves the campaign group for an approved supervisor or polling agent,
// enrolls the user as a member with their operational role, and ensures party officials at that tier are populated.
func (s *CampaignGroupsService) EnsureAgentCampaignInGroup(ctx context.Context, input EnsureAgentCampaignInGroupInput) (*queries.CampaignGroup, error) {
	scope := "ward"
	switch input.Role {
	case "state_election_supervisor":
		scope = "state"
	case "lga_election_supervisor":
		scope = "lga"
	}

	sID := utils.PgInt4FromPositive(input.StateID)
	var lID, wID pgtype.Int4
	if scope == "lga" || scope == "ward" {
		lID = utils.PgInt4FromPositive(input.LgaID)
	}
	if scope == "ward" {
		wID = utils.PgInt4FromPositive(input.WardID)
	}

	group, err := s.GetOrCreateCampaignGroup(ctx, GetOrCreateCampaignGroupInput{
		PartyID:         input.PartyID,
		ElectionGroupID: input.ElectionGroupID,
		Scope:           scope,
		StateID:         sID,
		LgaID:           lID,
		WardID:          wID,
	})
	if err != nil {
		return nil, err
	}

	// Add or update user as group member
	_, err = s.AddCampaignGroupMember(ctx, input.PartyID, utils.PgInt4FromPositive(input.ElectionGroupID), group.ID, input.UserID, input.Role, true)
	if err != nil {
		return nil, fmt.Errorf("failed to add member %d to campaign group %d: %w", input.UserID, group.ID, err)
	}

	return group, nil
}

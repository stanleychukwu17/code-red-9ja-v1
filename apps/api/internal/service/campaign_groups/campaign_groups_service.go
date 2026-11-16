package campaigngroupsservice

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
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
	GetPartyChapterByID(ctx context.Context, chapterID int32) (queries.PartyChapter, error)
}

type bodiesService interface {
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
	CheckLGA(ctx context.Context, lgaID int32) (queries.Lga, error)
	CheckWard(ctx context.Context, wardID int32) (queries.Ward, error)
}

type CampaignGroupsService struct {
	queries        *queries.Queries
	pool           *pgxpool.Pool
	rdb            *redis.Client
	partiesService partiesService
	bodiesService  bodiesService
}

func NewCampaignGroupsService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, partiesService partiesService, bodiesService bodiesService) *CampaignGroupsService {
	return &CampaignGroupsService{
		queries:        q,
		pool:           pool,
		rdb:            rdb,
		partiesService: partiesService,
		bodiesService:  bodiesService,
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
	OfficialsRemoved      int     `json:"officials_removed"`
	RemovedUserIDs        []int64 `json:"removed_user_ids"`
}

// InvalidateCampaignGroupCache flushes the cached metadata for a campaign group.
func (s *CampaignGroupsService) InvalidateCampaignGroupCache(ctx context.Context, groupID int64) {
	if groupID > 0 {
		cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupByID, groupID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// GetCampaignGroupByID fetches a campaign group by its primary key ID, backed by a 30-day Redis cache.
func (s *CampaignGroupsService) GetCampaignGroupByID(ctx context.Context, id int64) (queries.GetCampaignGroupByIDRow, error) {
	if id <= 0 {
		return queries.GetCampaignGroupByIDRow{}, fmt.Errorf("invalid campaign group id: %d", id)
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupByID, id)

	// Check Redis cache
	if group, ok := utils.GetCachedJSON[queries.GetCampaignGroupByIDRow](ctx, s.rdb, cacheKey); ok {
		return group, nil
	}

	// Query DB
	group, err := s.queries.GetCampaignGroupByID(ctx, id)
	if err != nil {
		return queries.GetCampaignGroupByIDRow{}, err
	}

	// Cache in Redis
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, group, db.RedisThirtyDaysTTL)

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
	res, err := s.syncPartyOfficialsToGroup(ctx, group.PartyID, toCampaignGroup(group))
	if err != nil {
		// Release lock on failure so caller can retry without being locked out
		_ = s.rdb.Del(ctx, lockKey).Err()
		return nil, err
	}

	return res, nil
}

// toCampaignGroup converts a GetCampaignGroupByIDRow into a CampaignGroup.
func toCampaignGroup(r queries.GetCampaignGroupByIDRow) queries.CampaignGroup {
	return queries.CampaignGroup{
		ID:                    r.ID,
		PartyID:               r.PartyID,
		TargetElectionGroupID: r.TargetElectionGroupID,
		Scope:                 r.Scope,
		StateID:               r.StateID,
		LgaID:                 r.LgaID,
		WardID:                r.WardID,
		Status:                r.Status,
		OfficialsAdded:        r.OfficialsAdded,
		CreatedAt:             r.CreatedAt,
		UpdatedAt:             r.UpdatedAt,
	}
}

// syncPartyOfficialsToGroup fetches the party's chapter officials at the group's scope,
// removes any group officials no longer assigned to the chapter, and enrolls active chapter officials.
func (s *CampaignGroupsService) syncPartyOfficialsToGroup(ctx context.Context, partyID int16, group queries.CampaignGroup) (*SyncOfficialsResult, error) {
	if partyID <= 0 {
		return &SyncOfficialsResult{
			GroupID:        group.ID,
			PartyID:        partyID,
			Scope:          group.Scope,
			AddedUserIDs:   make([]int64, 0),
			RemovedUserIDs: make([]int64, 0),
		}, nil
	}

	// Initialize synchronization result tracker
	result := &SyncOfficialsResult{
		GroupID:        group.ID,
		PartyID:        partyID,
		Scope:          group.Scope,
		AddedUserIDs:   make([]int64, 0),
		RemovedUserIDs: make([]int64, 0),
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

	// If chapter resolution failed, return early
	if err != nil {
		return nil, fmt.Errorf("failed to resolve chapter for campaign group %d: %w", group.ID, err)
	}
	if chapterID <= 0 {
		return nil, fmt.Errorf("party chapter not found for campaign group %d with scope %s", group.ID, group.Scope)
	}

	result.ChapterID = chapterID

	// Fetch all active party officials assigned to this chapter
	officials, err := s.partiesService.ListPartyOfficials(ctx, partyID, chapterID)
	if err != nil {
		return nil, fmt.Errorf("failed to list party officials for chapter %d: %w", chapterID, err)
	}

	// Map of active official user IDs in this chapter
	activeOfficialMap := make(map[int64]bool)
	for _, official := range officials {
		if official.UserID > 0 && official.AssignmentStatus == "active" {
			activeOfficialMap[official.UserID] = true
		}
	}
	result.OfficialsFound = len(activeOfficialMap)

	// 1. Fetch current party officials enrolled in this campaign group
	currentOfficialUserIDs, err := s.GetCampaignGroupOfficials(ctx, group.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch current campaign group officials for group %d: %w", group.ID, err)
	}

	// 2. Prune / remove any campaign group official who is no longer an active chapter official
	for _, currentUserID := range currentOfficialUserIDs {
		if !activeOfficialMap[currentUserID] {
			if err := s.RemoveCampaignGroupMember(ctx, group.ID, currentUserID); err != nil {
				slog.Warn("failed to remove stale party official from campaign group", "userID", currentUserID, "groupID", group.ID, "error", err)
				continue
			}
			result.OfficialsRemoved++
			result.RemovedUserIDs = append(result.RemovedUserIDs, currentUserID)
		}
	}

	// 3. Enroll / update active party chapter officials in the campaign group
	for _, official := range officials {
		if official.UserID <= 0 || official.AssignmentStatus != "active" {
			continue
		}

		// Party officials have null election_group_id as their tenure is chapter-bound
		_, err := s.AddCampaignGroupMember(ctx, AddCampaignGroupMemberParams{
			PartyID:         partyID,
			ElectionGroupID: pgtype.Int4{Valid: false},
			GroupID:         group.ID,
			UserID:          official.UserID,
			Role:            "party_official",
			CanBroadcast:    true,
		})
		if err != nil {
			slog.Warn("failed to add party official to campaign group", "userID", official.UserID, "groupID", group.ID, "error", err)
			continue
		}

		result.OfficialsAdded++
		result.AddedUserIDs = append(result.AddedUserIDs, official.UserID)
	}

	// Mark group officials flag as added if officials are enrolled or currently present
	if !group.OfficialsAdded && (result.OfficialsAdded > 0 || len(activeOfficialMap) > 0) {
		if err := s.queries.MarkCampaignGroupOfficialsAdded(ctx, group.ID); err != nil {
			return nil, err
		}
		s.InvalidateCampaignGroupCache(ctx, group.ID)
	}

	// Invalidate cached member roster so callers see updated status
	s.InvalidateGroupMembersCache(ctx, group.ID)
	return result, nil
}

// AddCampaignGroupMemberParams contains the parameters for adding or updating a campaign group member.
type AddCampaignGroupMemberParams struct {
	PartyID         int16
	ElectionGroupID pgtype.Int4
	GroupID         int64
	UserID          int64
	Role            string
	CanBroadcast    bool
}

// AddCampaignGroupMember adds or updates a member in a campaign group and invalidates the cached group member roster.
func (s *CampaignGroupsService) AddCampaignGroupMember(ctx context.Context, params AddCampaignGroupMemberParams) (queries.CampaignGroupMember, error) {
	member, err := s.queries.AddCampaignGroupMember(ctx, queries.AddCampaignGroupMemberParams{
		PartyID:         params.PartyID,
		ElectionGroupID: params.ElectionGroupID,
		GroupID:         params.GroupID,
		UserID:          params.UserID,
		Role:            params.Role,
		CanBroadcast:    params.CanBroadcast,
	})
	if err != nil {
		return queries.CampaignGroupMember{}, err
	}

	// Invalidate member roster, user groups hierarchy, and party membership check caches
	s.InvalidateGroupMembersCache(ctx, params.GroupID)
	s.InvalidatePartyMemberCheckCache(ctx, params.PartyID, params.UserID)
	s.InvalidateUserCampaignGroupsCache(ctx, params.UserID)
	if params.Role == "party_official" {
		s.InvalidateGroupOfficialsCache(ctx, params.GroupID) // flush cached officials roster
	}

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

	// Invalidate the group's cached member roster, user groups hierarchy, and officials list
	s.InvalidateGroupMembersCache(ctx, groupID)
	s.InvalidateGroupOfficialsCache(ctx, groupID)
	s.InvalidateUserCampaignGroupsCache(ctx, userID)
	return nil
}

// InvalidateGroupMembersCache invalidates the Redis cache for a campaign group's member roster and stats.
func (s *CampaignGroupsService) InvalidateGroupMembersCache(ctx context.Context, groupID int64) {
	if groupID > 0 {
		cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupMembers, groupID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
		statsKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupStats, groupID)
		_ = s.rdb.Del(ctx, statsKey).Err()
	}
}

// InvalidateGroupOfficialsCache clears the cached official user IDs for a campaign group.
func (s *CampaignGroupsService) InvalidateGroupOfficialsCache(ctx context.Context, groupID int64) {
	if groupID > 0 {
		cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupOfficials, groupID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// InvalidatePartyMemberCheckCache clears the cached party campaign membership check for a user.
func (s *CampaignGroupsService) InvalidatePartyMemberCheckCache(ctx context.Context, partyID int16, userID int64) {
	if partyID > 0 && userID > 0 {
		cacheKey := fmt.Sprintf("%s%d:%d", db.RedisCampaignGroupMemberCheck, partyID, userID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// InvalidateUserCampaignGroupsCache clears the cached campaign groups hierarchy response for a user.
func (s *CampaignGroupsService) InvalidateUserCampaignGroupsCache(ctx context.Context, userID int64) {
	if userID > 0 {
		cacheKey := fmt.Sprintf("%suser_groups:%d", db.RedisCampaignGroupLookup, userID)
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// GetCampaignGroupOfficials retrieves the official user IDs for a campaign group, backed by a 7-day Redis cache.
func (s *CampaignGroupsService) GetCampaignGroupOfficials(ctx context.Context, groupID int64) ([]int64, error) {
	if groupID <= 0 {
		return []int64{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupOfficials, groupID)

	// Check Redis cache
	if cached, ok := utils.GetCachedJSON[[]int64](ctx, s.rdb, cacheKey); ok {
		return cached, nil
	}

	// Query DB
	userIDs, err := s.queries.ListCampaignGroupOfficials(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch campaign group officials for group %d: %w", groupID, err)
	}

	if userIDs == nil {
		userIDs = []int64{}
	}

	// Cache in Redis
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, userIDs, db.RedisSevenDaysTTL)

	return userIDs, nil
}

// GetGroupMembers retrieves all members of a campaign group
func (s *CampaignGroupsService) GetGroupMembers(ctx context.Context, groupID int64) ([]queries.ListCampaignGroupMembersRow, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupMembers, groupID)

	// Check Redis cache
	if cached, ok := utils.GetCachedJSON[[]queries.ListCampaignGroupMembersRow](ctx, s.rdb, cacheKey); ok {
		return cached, nil
	}

	// Query DB
	members, err := s.queries.ListCampaignGroupMembers(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch campaign group members for group %d: %w", groupID, err)
	}

	if members == nil {
		members = []queries.ListCampaignGroupMembersRow{}
	}

	// Cache in Redis
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, members, db.RedisSevenDaysTTL)

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

// formatTerritoryLookupKey generates a consistent Redis key for territory-scoped campaign group lookups.
func formatTerritoryLookupKey(partyID int16, scope string, stateID, lgaID, wardID pgtype.Int4) string {
	var sID, lID, wID int32
	if stateID.Valid {
		sID = stateID.Int32
	}
	if lgaID.Valid {
		lID = lgaID.Int32
	}
	if wardID.Valid {
		wID = wardID.Int32
	}
	return fmt.Sprintf("%s%d:%s:%d:%d:%d", db.RedisCampaignGroupLookup, partyID, scope, sID, lID, wID)
}

// GetOrCreateCampaignGroup finds or provisions a campaign group for a given party,
// election cycle, and territorial scope, and ensures party chapter officials are populated.
// It leverages a 30-day Redis territory cache to avoid database upserts and row locks on repeated lookups.
func (s *CampaignGroupsService) GetOrCreateCampaignGroup(ctx context.Context, input GetOrCreateCampaignGroupInput) (*queries.CampaignGroup, error) {
	lookupKey := formatTerritoryLookupKey(input.PartyID, input.Scope, input.StateID, input.LgaID, input.WardID)

	// Check Redis territory lookup cache
	if cachedIDStr, err := s.rdb.Get(ctx, lookupKey).Result(); err == nil {
		if groupID, parseErr := strconv.ParseInt(cachedIDStr, 10, 64); parseErr == nil && groupID > 0 {
			if groupRow, err := s.GetCampaignGroupByID(ctx, groupID); err == nil && groupRow.ID > 0 {
				group := toCampaignGroup(groupRow)
				if !group.OfficialsAdded {
					if syncRes, err := s.syncPartyOfficialsToGroup(ctx, input.PartyID, group); err == nil && syncRes != nil && syncRes.OfficialsAdded > 0 {
						group.OfficialsAdded = true
					}
				}
				return &group, nil
			}
		}
	}

	// Read-path: Check if the campaign group already exists in the database
	if existingID, err := s.queries.GetCampaignGroupIDByTerritory(ctx, queries.GetCampaignGroupIDByTerritoryParams{
		PartyID: input.PartyID,
		Scope:   input.Scope,
		StateID: input.StateID,
		LgaID:   input.LgaID,
		WardID:  input.WardID,
	}); err == nil && existingID > 0 {
		_ = s.rdb.Set(ctx, lookupKey, strconv.FormatInt(existingID, 10), db.RedisThirtyDaysTTL).Err()
		if groupRow, err := s.GetCampaignGroupByID(ctx, existingID); err == nil && groupRow.ID > 0 {
			group := toCampaignGroup(groupRow)
			if !group.OfficialsAdded {
				if syncRes, err := s.syncPartyOfficialsToGroup(ctx, input.PartyID, group); err == nil && syncRes != nil && syncRes.OfficialsAdded > 0 {
					group.OfficialsAdded = true
				}
			}
			return &group, nil
		}
	}

	// Write-path (fallback only): Provision new campaign group if not found
	group, err := s.queries.FindOrCreateCampaignGroup(ctx, queries.FindOrCreateCampaignGroupParams{
		PartyID:               input.PartyID,
		TargetElectionGroupID: utils.PgInt4FromPositive(input.ElectionGroupID),
		Scope:                 input.Scope,
		StateID:               input.StateID,
		LgaID:                 input.LgaID,
		WardID:                input.WardID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to find or create campaign group: %w", err)
	}

	// Cache territory lookup mapping
	_ = s.rdb.Set(ctx, lookupKey, strconv.FormatInt(group.ID, 10), db.RedisThirtyDaysTTL).Err()

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

	_, err = s.AddCampaignGroupMember(ctx, AddCampaignGroupMemberParams{
		PartyID:         partyID,
		ElectionGroupID: utils.PgInt4FromPositive(election.ElectionGroupID),
		GroupID:         group.ID,
		UserID:          candidateID,
		Role:            "candidate",
		CanBroadcast:    true,
	})
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
	s.InvalidatePartyMemberCheckCache(ctx, partyID, candidateID)

	return nil
}

// RemoveAgentFromPartyCampaignGroups revokes agent/supervisor membership across all campaign groups for the party.
func (s *CampaignGroupsService) RemoveAgentFromPartyCampaignGroups(ctx context.Context, partyID int16, userID int64) error {
	groupIDs, err := s.queries.RemoveAgentCampaignGroupMembers(ctx, queries.RemoveAgentCampaignGroupMembersParams{
		PartyID: partyID,
		UserID:  userID,
	})
	if err != nil {
		return fmt.Errorf("failed to remove agent from campaign groups: %w", err)
	}

	for _, groupID := range groupIDs {
		s.InvalidateGroupMembersCache(ctx, groupID)
	}
	s.InvalidatePartyMemberCheckCache(ctx, partyID, userID)

	return nil
}

// RemoveOfficialFromChapterCampaignGroup removes a user from the campaign group matching a party chapter if their role is 'party_official'.
func (s *CampaignGroupsService) RemoveOfficialFromChapterCampaignGroup(ctx context.Context, partyID int16, chapterID int32, userID int64) error {
	chapter, err := s.partiesService.GetPartyChapterByID(ctx, chapterID)
	if err != nil {
		return fmt.Errorf("failed to fetch chapter %d: %w", chapterID, err)
	}

	scope := chapter.ChapterType
	if scope == "zonal" {
		scope = "state"
	}

	var stateID pgtype.Int4
	if chapter.StateID.Valid {
		stateID = pgtype.Int4{Int32: int32(chapter.StateID.Int16), Valid: true}
	}

	groupID, err := s.queries.GetCampaignGroupIDByTerritory(ctx, queries.GetCampaignGroupIDByTerritoryParams{
		PartyID: partyID,
		Scope:   scope,
		StateID: stateID,
		LgaID:   chapter.LgaID,
		WardID:  chapter.WardID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("failed to lookup campaign group for chapter %d: %w", chapterID, err)
	}

	var deletedGroupID int64
	err = s.pool.QueryRow(ctx, `
		DELETE FROM campaign_group_members
		WHERE group_id = $1 
		  AND user_id = $2 
		  AND role = 'party_official'
		RETURNING group_id
	`, groupID, userID).Scan(&deletedGroupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("failed to delete party_official membership from campaign group %d: %w", groupID, err)
	}

	s.InvalidateGroupMembersCache(ctx, groupID)
	s.InvalidateGroupOfficialsCache(ctx, groupID)
	s.InvalidatePartyMemberCheckCache(ctx, partyID, userID)

	return nil
}

// RemovePartyOfficialFromAllCampaignGroups removes a user from all campaign groups for a party where their role is 'party_official'.
func (s *CampaignGroupsService) RemovePartyOfficialFromAllCampaignGroups(ctx context.Context, partyID int16, userID int64) error {
	rows, err := s.pool.Query(ctx, `
		DELETE FROM campaign_group_members
		WHERE party_id = $1 
		  AND user_id = $2 
		  AND role = 'party_official'
		RETURNING group_id
	`, partyID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove official from campaign groups: %w", err)
	}
	defer rows.Close()

	var groupIDs []int64
	for rows.Next() {
		var gid int64
		if err := rows.Scan(&gid); err == nil {
			groupIDs = append(groupIDs, gid)
		}
	}

	for _, gid := range groupIDs {
		s.InvalidateGroupMembersCache(ctx, gid)
		s.InvalidateGroupOfficialsCache(ctx, gid)
	}
	s.InvalidatePartyMemberCheckCache(ctx, partyID, userID)

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
	// Default to ward scope (used for polling unit agents and ward supervisors)
	scope := "ward"

	// Resolve campaign group scope tier based on assigned role
	switch input.Role {
	case "state_election_supervisor":
		scope = "state"
	case "lga_election_supervisor":
		scope = "lga"
	}

	// Prepare geographic identifiers based on the target hierarchy scope
	stateID := utils.PgInt4FromPositive(input.StateID)
	var lgaID, wardID pgtype.Int4
	if scope == "lga" || scope == "ward" {
		lgaID = utils.PgInt4FromPositive(input.LgaID)
	}
	if scope == "ward" {
		wardID = utils.PgInt4FromPositive(input.WardID)
	}

	// Retrieve existing campaign group or create one for this territory
	group, err := s.GetOrCreateCampaignGroup(ctx, GetOrCreateCampaignGroupInput{
		PartyID:         input.PartyID,
		ElectionGroupID: input.ElectionGroupID,
		Scope:           scope,
		StateID:         stateID,
		LgaID:           lgaID,
		WardID:          wardID,
	})
	if err != nil {
		return nil, err
	}

	// Remove user from any other campaign groups in this party (excluding this target group)
	oldGroupIDs, err := s.queries.RemoveCampaignGroupMembersByElectionGroupExcept(ctx, queries.RemoveCampaignGroupMembersByElectionGroupExceptParams{
		PartyID: input.PartyID,
		UserID:  input.UserID,
		GroupID: group.ID,
	})
	if err != nil {
		slog.Warn("failed to clear previous campaign group memberships", "userID", input.UserID, "error", err)
	} else {
		for _, oldGroupID := range oldGroupIDs {
			s.InvalidateGroupMembersCache(ctx, oldGroupID)
		}
		s.InvalidatePartyMemberCheckCache(ctx, input.PartyID, input.UserID)
	}

	// Enroll or update the agent as an active member with their assigned role
	_, err = s.AddCampaignGroupMember(ctx, AddCampaignGroupMemberParams{
		PartyID:         input.PartyID,
		ElectionGroupID: utils.PgInt4FromPositive(input.ElectionGroupID),
		GroupID:         group.ID,
		UserID:          input.UserID,
		Role:            input.Role,
		CanBroadcast:    true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to add member %d to campaign group %d: %w", input.UserID, group.ID, err)
	}

	return group, nil
}

// IsUserPartyCampaignMember checks if a user is enrolled in any campaign group for this party via sqlc, backed by a 7-day Redis cache.
func (s *CampaignGroupsService) IsUserPartyCampaignMember(ctx context.Context, partyID int16, userID int64) (bool, error) {
	if partyID <= 0 || userID <= 0 {
		return false, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisCampaignGroupMemberCheck, partyID, userID)

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		return cachedVal == "1", nil
	}

	// 2. Query DB via generated sqlc query (hits idx_campaign_group_members_party_user)
	exists, err := s.queries.CheckUserInPartyCampaignGroup(ctx, queries.CheckUserInPartyCampaignGroupParams{
		PartyID: partyID,
		UserID:  userID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check party campaign membership for party %d, user %d: %w", partyID, userID, err)
	}

	// 3. Cache result in Redis for 7 days
	val := "0"
	if exists {
		val = "1"
	}
	_ = s.rdb.Set(ctx, cacheKey, val, db.RedisSevenDaysTTL).Err()

	return exists, nil
}

// CanUserAccessGroup evaluates if the authenticated user has permission to access a campaign group.
// Permitted users:
// 1. Global super administrator ("super_admin").
// 2. Super party administrator ("super_party_admin") if assigned to the group's party.
// 3. Enrolled operatives of any campaign group in this party (candidates, supervisors, agents, officials).
func (s *CampaignGroupsService) CanUserAccessGroup(ctx context.Context, group queries.GetCampaignGroupByIDRow, claims *utils.JWTClaims) (bool, error) {
	if claims == nil {
		return false, nil
	}

	// 1. Global super admin check
	if claims.HasAnyRole("super_admin") {
		return true, nil
	}

	// 2. Super party admin check for matching party
	if claims.HasAnyRole("super_party_admin") && claims.PartyID == group.PartyID {
		return true, nil
	}

	// 3. Party operative check: an enrolled operative in any campaign group of this party can access all of the party's campaign groups
	return s.IsUserPartyCampaignMember(ctx, group.PartyID, claims.UserID)
}

// FindCampaignGroupIDInput holds the criteria to locate a campaign group by territorial hierarchy.
type FindCampaignGroupIDInput struct {
	PartyID int16 `json:"party_id"`
	StateID int32 `json:"state_id"`
	LgaID   int32 `json:"lga_id"`
	WardID  int32 `json:"ward_id"`
}

// FindCampaignGroupID locates a campaign group's ID for a given party by territorial scope:
// if ward > 0 => ward scope; if lga > 0 => lga scope; if state > 0 => state scope; else national scope.
// It wraps lookups in Redis (30-day TTL) for sub-millisecond retrieval since campaign group IDs rarely change.
func (s *CampaignGroupsService) FindCampaignGroupID(ctx context.Context, input FindCampaignGroupIDInput) (int64, error) {
	// Validate required party ID
	if input.PartyID <= 0 {
		return 0, fmt.Errorf("invalid party_id: %d", input.PartyID)
	}

	// Determine territorial scope, boundary IDs, and Redis cache key
	var scope string
	var cacheKey string
	var stateID, lgaID, wardID pgtype.Int4

	if input.WardID > 0 {
		scope = "ward"
		stateID = utils.PgInt4FromPositive(input.StateID)
		lgaID = utils.PgInt4FromPositive(input.LgaID)
		wardID = utils.PgInt4FromPositive(input.WardID)
		cacheKey = fmt.Sprintf("%s%d:ward:%d", db.RedisCampaignGroupLookup, input.PartyID, input.WardID)
	} else if input.LgaID > 0 {
		scope = "lga"
		stateID = utils.PgInt4FromPositive(input.StateID)
		lgaID = utils.PgInt4FromPositive(input.LgaID)
		cacheKey = fmt.Sprintf("%s%d:lga:%d", db.RedisCampaignGroupLookup, input.PartyID, input.LgaID)
	} else if input.StateID > 0 {
		scope = "state"
		stateID = utils.PgInt4FromPositive(input.StateID)
		cacheKey = fmt.Sprintf("%s%d:state:%d", db.RedisCampaignGroupLookup, input.PartyID, input.StateID)
	} else {
		scope = "national"
		cacheKey = fmt.Sprintf("%s%d:national", db.RedisCampaignGroupLookup, input.PartyID)
	}

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if gid, parseErr := strconv.ParseInt(cachedVal, 10, 64); parseErr == nil && gid > 0 {
			return gid, nil
		}
	}

	// 2. Query Database via unified sqlc query
	groupID, err := s.queries.GetCampaignGroupIDByTerritory(ctx, queries.GetCampaignGroupIDByTerritoryParams{
		PartyID: input.PartyID,
		Scope:   scope,
		StateID: stateID,
		LgaID:   lgaID,
		WardID:  wardID,
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("campaign group not found for this %s scope", scope)
		}

		return 0, fmt.Errorf("failed to query campaign group: %w", err)
	}

	// 3. Cache in Redis
	_ = s.rdb.Set(ctx, cacheKey, strconv.FormatInt(groupID, 10), db.RedisThirtyDaysTTL).Err()

	return groupID, nil
}

// CampaignGroupStats holds aggregate operative counts rolled up for the group's territorial hierarchy.
type CampaignGroupStats struct {
	All             int64 `json:"all"`
	Candidate       int64 `json:"candidate"`
	PartyOfficial   int64 `json:"party_official"`
	Supervisor      int64 `json:"supervisor"`
	Agent           int64 `json:"agent"`
	PollingAgent    int64 `json:"polling_agent"`
	WardSupervisor  int64 `json:"ward_supervisor"`
	LgaSupervisor   int64 `json:"lga_supervisor"`
	StateSupervisor int64 `json:"state_supervisor"`
}

// GetCampaignGroupStats calculates the hierarchical operative counts for the group's territorial scope.
// Lookups are cached in Redis with a 10-minute TTL.
func (s *CampaignGroupsService) GetCampaignGroupStats(ctx context.Context, group queries.GetCampaignGroupByIDRow) (*CampaignGroupStats, error) {
	if group.ID <= 0 {
		return &CampaignGroupStats{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupStats, group.ID)

	// Fast-path: Check Redis cache
	if cachedStats, ok := utils.GetCachedJSON[CampaignGroupStats](ctx, s.rdb, cacheKey); ok {
		return &cachedStats, nil
	}

	// Query DB based on scope
	type statRow struct {
		Role  string
		Count int64
	}

	var rows []statRow

	switch group.Scope {
	case "national":
		res, err := s.queries.GetCampaignGroupNationalStats(ctx, group.PartyID)
		if err != nil {
			return &CampaignGroupStats{}, err
		}
		for _, r := range res {
			rows = append(rows, statRow{Role: r.Role, Count: r.Count})
		}
	case "state":
		res, err := s.queries.GetCampaignGroupStateStats(ctx, queries.GetCampaignGroupStateStatsParams{
			PartyID: group.PartyID,
			StateID: group.StateID,
		})
		if err != nil {
			return &CampaignGroupStats{}, err
		}
		for _, r := range res {
			rows = append(rows, statRow{Role: r.Role, Count: r.Count})
		}
	case "lga":
		res, err := s.queries.GetCampaignGroupLGAStats(ctx, queries.GetCampaignGroupLGAStatsParams{
			PartyID: group.PartyID,
			LgaID:   group.LgaID,
		})
		if err != nil {
			return &CampaignGroupStats{}, err
		}
		for _, r := range res {
			rows = append(rows, statRow{Role: r.Role, Count: r.Count})
		}
	case "ward":
		res, err := s.queries.GetCampaignGroupWardStats(ctx, queries.GetCampaignGroupWardStatsParams{
			PartyID: group.PartyID,
			WardID:  group.WardID,
		})
		if err != nil {
			return &CampaignGroupStats{}, err
		}
		for _, r := range res {
			rows = append(rows, statRow{Role: r.Role, Count: r.Count})
		}
	}

	stats := &CampaignGroupStats{}
	for _, r := range rows {
		stats.All += r.Count
		switch r.Role {
		case "candidate":
			stats.Candidate += r.Count
		case "party_official":
			stats.PartyOfficial += r.Count
		case "agent", "polling_agent":
			stats.Agent += r.Count
			stats.PollingAgent += r.Count
		case "ward_supervisor", "ward_election_supervisor":
			stats.Supervisor += r.Count
			stats.WardSupervisor += r.Count
		case "lga_supervisor", "lga_election_supervisor":
			stats.Supervisor += r.Count
			stats.LgaSupervisor += r.Count
		case "state_supervisor", "state_election_supervisor":
			stats.Supervisor += r.Count
			stats.StateSupervisor += r.Count
		default:
			if strings.Contains(r.Role, "supervisor") {
				stats.Supervisor += r.Count
			}
		}
	}

	// Cache in Redis with short duration
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, stats, 10*time.Minute)

	return stats, nil
}

// formatCampaignGroupTitle creates human-readable title matching the design mock for each scope tier.
func formatCampaignGroupTitle(scope string, stateName, lgaName, wardName string) string {
	switch scope {
	case "national":
		return "National campaign group"
	case "state":
		if stateName != "" {
			return fmt.Sprintf("%s state campaign group", stateName)
		}
		return "State campaign group"
	case "lga":
		if lgaName != "" {
			return fmt.Sprintf("%s LGA campaign group", lgaName)
		}
		return "LGA campaign group"
	case "ward":
		if wardName != "" {
			return fmt.Sprintf("%s ward campaign group", wardName)
		}
		return "Ward campaign group"
	default:
		return "Campaign group"
	}
}

// formatCampaignGroupDescription generates the descriptive text matching the UI design for each scope tier.
func formatCampaignGroupDescription(scope string) string {
	switch scope {
	case "national":
		return "Find National officials and candidates you are representing in the national campaign group"
	case "state":
		return "Find State officials and candidates you are representing in the state campaign group"
	case "lga":
		return "Find Local Government officials and candidates you are representing in the LGA campaign group"
	case "ward":
		return "Find Ward officials and candidates you are representing in the ward campaign group"
	default:
		return "Find officials and candidates you are representing in this campaign group"
	}
}

// UserCampaignGroupItem represents a resolved campaign group in the hierarchy for an operative.
type UserCampaignGroupItem struct {
	ID          int64   `json:"id"`
	PartyID     int16   `json:"party_id"`
	Scope       string  `json:"scope"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	StateID     *int32  `json:"state_id,omitempty"`
	StateName   *string `json:"state_name,omitempty"`
	LgaID       *int32  `json:"lga_id,omitempty"`
	LgaName     *string `json:"lga_name,omitempty"`
	WardID      *int32  `json:"ward_id,omitempty"`
	WardName    *string `json:"ward_name,omitempty"`
}

// GetUserCampaignGroupsResponse encapsulates the resolved campaign groups hierarchy for an operative.
type GetUserCampaignGroupsResponse struct {
	Role   string                  `json:"role"`
	Groups []UserCampaignGroupItem `json:"groups"`
}

// GetUserCampaignGroups resolves the hierarchical campaign groups visible to a user based on their operational assignment.
// Hierarchy depth:
// - Polling Unit Agent / Ward Supervisor: Ward, LGA, State, National (4 groups)
// - LGA Supervisor: LGA, State, National (3 groups)
// - State Supervisor: State, National (2 groups)
// Results are cached in Redis with a 5-minute TTL.
func (s *CampaignGroupsService) GetUserCampaignGroups(ctx context.Context, userID int64) (*GetUserCampaignGroupsResponse, error) {
	if userID <= 0 {
		return &GetUserCampaignGroupsResponse{Role: "none", Groups: []UserCampaignGroupItem{}}, nil
	}

	// Check Redis cache
	cacheKey := fmt.Sprintf("%suser_groups:%d", db.RedisCampaignGroupLookup, userID)
	if cachedResp, ok := utils.GetCachedJSON[GetUserCampaignGroupsResponse](ctx, s.rdb, cacheKey); ok {
		return &cachedResp, nil
	}

	// Resolve user campaign group membership directly using sqlc
	membership, err := s.queries.GetUserCampaignGroupMembership(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &GetUserCampaignGroupsResponse{
				Role:   "none",
				Groups: []UserCampaignGroupItem{},
			}, nil
		}
		return nil, fmt.Errorf("failed to query user campaign group membership: %w", err)
	}

	var (
		role      = membership.Role
		depth     = membership.Scope
		partyID   = membership.PartyID
		stateID   = membership.StateID
		lgaID     = membership.LgaID
		wardID    = membership.WardID
		stateName = membership.StateName.String
		lgaName   = membership.LgaName.String
		wardName  = membership.WardName.String
	)

	// Fill in missing territory names using optimized bodiesService with 180-day Redis cache
	if stateName == "" && stateID.Valid && stateID.Int32 > 0 {
		if st, err := s.bodiesService.CheckStateByID(ctx, int16(stateID.Int32)); err == nil {
			stateName = st.Name
		}
	}
	if lgaName == "" && lgaID.Valid && lgaID.Int32 > 0 {
		if lg, err := s.bodiesService.CheckLGA(ctx, lgaID.Int32); err == nil {
			lgaName = lg.Name
		}
	}
	if wardName == "" && wardID.Valid && wardID.Int32 > 0 {
		if wd, err := s.bodiesService.CheckWard(ctx, wardID.Int32); err == nil {
			wardName = wd.Name
		}
	}

	// Determine which scopes to include (National is always top, then State, LGA, Ward)
	type scopeSpec struct {
		scope   string
		stateID pgtype.Int4
		lgaID   pgtype.Int4
		wardID  pgtype.Int4
	}

	var targetScopes []scopeSpec

	// National group is always included
	targetScopes = append(targetScopes, scopeSpec{
		scope: "national",
	})

	// State group
	if depth == "state" || depth == "lga" || depth == "ward" {
		targetScopes = append(targetScopes, scopeSpec{
			scope:   "state",
			stateID: stateID,
		})
	}

	// LGA group
	if depth == "lga" || depth == "ward" {
		targetScopes = append(targetScopes, scopeSpec{
			scope:   "lga",
			stateID: stateID,
			lgaID:   lgaID,
		})
	}

	// Ward group
	if depth == "ward" {
		targetScopes = append(targetScopes, scopeSpec{
			scope:   "ward",
			stateID: stateID,
			lgaID:   lgaID,
			wardID:  wardID,
		})
	}

	// Resolve or provision each campaign group
	var groups []UserCampaignGroupItem
	for _, spec := range targetScopes {
		group, err := s.GetOrCreateCampaignGroup(ctx, GetOrCreateCampaignGroupInput{
			PartyID: partyID,
			Scope:   spec.scope,
			StateID: spec.stateID,
			LgaID:   spec.lgaID,
			WardID:  spec.wardID,
		})
		if err != nil {
			slog.Warn("failed to get or create campaign group in hierarchy", "scope", spec.scope, "error", err)
			continue
		}

		// Build group item with formatted display details
		item := UserCampaignGroupItem{
			ID:          group.ID,
			PartyID:     partyID,
			Scope:       spec.scope,
			Title:       formatCampaignGroupTitle(spec.scope, stateName, lgaName, wardName),
			Description: formatCampaignGroupDescription(spec.scope),
		}

		// Attach territory metadata where applicable
		if spec.stateID.Valid && spec.stateID.Int32 > 0 {
			sid := spec.stateID.Int32
			sName := stateName
			item.StateID = &sid
			item.StateName = &sName
		}
		if spec.lgaID.Valid && spec.lgaID.Int32 > 0 {
			lid := spec.lgaID.Int32
			lName := lgaName
			item.LgaID = &lid
			item.LgaName = &lName
		}
		if spec.wardID.Valid && spec.wardID.Int32 > 0 {
			wid := spec.wardID.Int32
			wName := wardName
			item.WardID = &wid
			item.WardName = &wName
		}

		// append the item to the group
		groups = append(groups, item)
	}

	response := &GetUserCampaignGroupsResponse{
		Role:   role,
		Groups: groups,
	}

	// Cache in Redis with configured TTL
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, response, db.RedisOneHourTTL)

	return response, nil
}

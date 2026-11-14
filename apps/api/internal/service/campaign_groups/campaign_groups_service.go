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

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var group queries.GetCampaignGroupByIDRow
		if jsonErr := json.Unmarshal([]byte(cachedVal), &group); jsonErr == nil {
			return group, nil
		}
	}

	// 2. Query DB
	group, err := s.queries.GetCampaignGroupByID(ctx, id)
	if err != nil {
		return queries.GetCampaignGroupByIDRow{}, err
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

	// Invalidate member roster and party membership check caches
	s.InvalidateGroupMembersCache(ctx, params.GroupID)
	s.InvalidatePartyMemberCheckCache(ctx, params.PartyID, params.UserID)
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

	// Invalidate the group's cached member roster and officials list
	s.InvalidateGroupMembersCache(ctx, groupID)
	s.InvalidateGroupOfficialsCache(ctx, groupID)
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

// GetCampaignGroupOfficials retrieves the official user IDs for a campaign group, backed by a 7-day Redis cache.
func (s *CampaignGroupsService) GetCampaignGroupOfficials(ctx context.Context, groupID int64) ([]int64, error) {
	if groupID <= 0 {
		return []int64{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisCampaignGroupOfficials, groupID)

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []int64
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	userIDs, err := s.queries.ListCampaignGroupOfficials(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch campaign group officials for group %d: %w", groupID, err)
	}

	if userIDs == nil {
		userIDs = []int64{}
	}

	// 3. Cache in Redis
	if data, err := json.Marshal(userIDs); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return userIDs, nil
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

	// 1. Fast-path: Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cachedStats CampaignGroupStats
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cachedStats); jsonErr == nil {
			return &cachedStats, nil
		}
	}

	// 2. Query DB based on scope
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

	// 3. Cache in Redis (10 minutes)
	if data, err := json.Marshal(stats); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, 10*time.Minute).Err()
	}

	return stats, nil
}

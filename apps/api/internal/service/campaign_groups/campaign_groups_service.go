package campaigngroupsservice

import (
	"context"
	"encoding/json"
	"fmt"
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

// syncPartyOfficialsToGroup fetches the party's chapter officials at the group's scope and adds them to the campaign group.
func (s *CampaignGroupsService) syncPartyOfficialsToGroup(ctx context.Context, partyID int16, electionGroupID int32, group queries.CampaignGroup) error {
	var chapterID int32
	var err error

	switch group.Scope {
	case "national":
		chapterID, err = s.partiesService.GetOrCreateNationalChapter(ctx, partyID, 1, false)
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

	if err != nil {
		return fmt.Errorf("failed to resolve chapter for campaign group %d: %w", group.ID, err)
	}

	// If no chapter exists yet at this level, mark as added and return early
	if chapterID == 0 {
		return s.queries.MarkCampaignGroupOfficialsAdded(ctx, group.ID)
	}

	officials, err := s.partiesService.ListPartyOfficials(ctx, partyID, chapterID)
	if err != nil {
		return fmt.Errorf("failed to list party officials for chapter %d: %w", chapterID, err)
	}

	for _, official := range officials {
		if official.UserID <= 0 || official.AssignmentStatus != "active" {
			continue
		}
		_, err := s.AddCampaignGroupMember(ctx, partyID, electionGroupID, group.ID, official.UserID, "party_official", true)
		if err != nil {
			slog.Warn("failed to add party official to campaign group", "userID", official.UserID, "groupID", group.ID, "error", err)
		}
	}

	return s.queries.MarkCampaignGroupOfficialsAdded(ctx, group.ID)
}

// AddCampaignGroupMember adds or updates a member in a campaign group and invalidates the cached group member roster.
func (s *CampaignGroupsService) AddCampaignGroupMember(ctx context.Context, partyID int16, electionGroupID int32, groupID int64, userID int64, role string, canBroadcast bool) (queries.CampaignGroupMember, error) {
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
	err := s.queries.RemoveCampaignGroupMember(ctx, queries.RemoveCampaignGroupMemberParams{
		GroupID: groupID,
		UserID:  userID,
	})
	if err != nil {
		return err
	}

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

// EnsureElectionCandidateGroup provisions the anchor campaign group for a fielded candidate or running mate
// and registers them as a group member with broadcasting permissions.
func (s *CampaignGroupsService) EnsureElectionCandidateGroup(ctx context.Context, partyID int16, election queries.Election, candidateID int64) (*queries.CampaignGroup, error) {
	campaignScope := MapElectionScopeToCampaignScope(election.Scope)
	stateID, lgaID, wardID := resolveGroupBounds(election, campaignScope)

	// 1. Find or create the anchor campaign group
	group, err := s.queries.FindOrCreateCampaignGroup(ctx, queries.FindOrCreateCampaignGroupParams{
		PartyID:         partyID,
		ElectionGroupID: election.ElectionGroupID,
		Scope:           campaignScope,
		StateID:         stateID,
		LgaID:           lgaID,
		WardID:          wardID,
		Name:            pgtype.Text{Valid: false}, // dynamic fallback default
	})
	if err != nil {
		return nil, fmt.Errorf("failed to ensure campaign group for election %d: %w", election.ID, err)
	}

	// 2. Add or update candidate as group member
	_, err = s.AddCampaignGroupMember(ctx, partyID, election.ElectionGroupID, group.ID, candidateID, "candidate", true)
	if err != nil {
		return nil, fmt.Errorf("failed to add candidate %d to campaign group %d: %w", candidateID, group.ID, err)
	}

	// 3. Populate party chapter officials if not already added to this group
	if !group.OfficialsAdded {
		if err := s.syncPartyOfficialsToGroup(ctx, partyID, election.ElectionGroupID, group); err != nil {
			slog.Warn("failed to sync party officials to campaign group", "groupID", group.ID, "error", err)
		} else {
			group.OfficialsAdded = true
		}
	}

	return &group, nil
}

// RemoveCandidateFromElectionGroup revokes candidate membership across all campaign groups for the party in an election cycle.
func (s *CampaignGroupsService) RemoveCandidateFromElectionGroup(ctx context.Context, partyID int16, electionGroupID int32, candidateID int64) error {
	// Remove member records from all groups tied to this party and election cycle
	groupIDs, err := s.queries.RemoveCampaignGroupMembersByElectionGroup(ctx, queries.RemoveCampaignGroupMembersByElectionGroupParams{
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
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


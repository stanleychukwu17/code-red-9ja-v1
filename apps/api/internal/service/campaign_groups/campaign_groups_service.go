package campaigngroupsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type CampaignGroupsService struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
	rdb     *redis.Client
}

func NewCampaignGroupsService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *CampaignGroupsService {
	return &CampaignGroupsService{
		queries: q,
		pool:    pool,
		rdb:     rdb,
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

// EnsureElectionCandidateGroup provisions the anchor campaign group for a fielded candidate or running mate
// and registers them as a group member with broadcasting permissions.
func (s *CampaignGroupsService) EnsureElectionCandidateGroup(ctx context.Context, partyID int16, election queries.Election, candidateID int64, role string) (*queries.CampaignGroup, error) {
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
	_, err = s.queries.AddCampaignGroupMember(ctx, queries.AddCampaignGroupMemberParams{
		PartyID:         partyID,
		ElectionGroupID: election.ElectionGroupID,
		GroupID:         group.ID,
		UserID:          candidateID,
		Role:            role,
		CanBroadcast:    true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to add candidate %d to campaign group %d: %w", candidateID, group.ID, err)
	}

	return &group, nil
}

// RemoveCandidateFromElectionGroup revokes candidate membership across all campaign groups for the party in an election cycle.
func (s *CampaignGroupsService) RemoveCandidateFromElectionGroup(ctx context.Context, partyID int16, electionGroupID int32, candidateID int64) error {
	return s.queries.RemoveCampaignGroupMembersByElectionGroup(ctx, queries.RemoveCampaignGroupMembersByElectionGroupParams{
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		UserID:          candidateID,
	})
}


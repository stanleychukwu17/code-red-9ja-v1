package puassignments

import (
	"context"
	"encoding/json"
	"errors"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries         *queries.Queries
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
}

func NewService(q *queries.Queries, rdb *redis.Client, taskDistributor worker.TaskDistributor) *Service {
	return &Service{
		queries:         q,
		rdb:             rdb,
		taskDistributor: taskDistributor,
	}
}

func (s *Service) AssignAgent(ctx context.Context, userID, electionGroupID int64, partyID int16, assignedBy int64, pollingUnitID int32, roleType string) (queries.PollingUnitAssignment, error) {
	var assignedByVal pgtype.Int8
	if assignedBy > 0 {
		assignedByVal = pgtype.Int8{Int64: assignedBy, Valid: true}
	}

	var potentialPaymentKobo int64 = 0
	party, err := s.queries.GetPartyByID(ctx, partyID)
	if err == nil && party.AgentPaymentAllocationKobo != nil {
		roleKey := roleType
		if roleKey == "" {
			roleKey = "polling_agent"
		}
		var allocs map[string]struct {
			Default int64 `json:"default"`
		}
		if err := json.Unmarshal(party.AgentPaymentAllocationKobo, &allocs); err == nil {
			if alloc, ok := allocs[roleKey]; ok {
				potentialPaymentKobo = alloc.Default
			} else if alloc, ok := allocs["polling_agent"]; ok {
				potentialPaymentKobo = alloc.Default
			}
		}
	}

	return s.queries.CreateAssignment(ctx, queries.CreateAssignmentParams{
		UserID:               userID,
		PollingUnitID:        pollingUnitID,
		ElectionGroupID:      electionGroupID,
		PartyID:              partyID,
		RoleType:             pgtype.Text{String: roleType, Valid: roleType != ""},
		AssignedBy:           assignedByVal,
		PotentialPaymentKobo: potentialPaymentKobo,
	})
}

func (s *Service) GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error) {
	return s.queries.GetAssignmentByID(ctx, id)
}

func (s *Service) ListAssignments(ctx context.Context, electionGroupID int64, partyID int16, userID int64, pollingUnitID int32, limit, offset int32) ([]queries.ListAssignmentsRow, error) {
	return s.queries.ListAssignments(ctx, queries.ListAssignmentsParams{
		Limit:           limit,
		Offset:          offset,
		ElectionGroupID: electionGroupID,
		PartyID:         partyID,
		PollingUnitID:   pollingUnitID,
		UserID:          userID,
	})
}

func (s *Service) DeleteAssignment(ctx context.Context, id int64) error {
	return s.queries.DeleteAssignment(ctx, id)
}

func parseTimeParam(timeStr *string) pgtype.Timestamptz {
	if timeStr == nil || *timeStr == "" {
		return pgtype.Timestamptz{Valid: false}
	}
	// Parse assuming ISO 8601 format
	t, err := time.Parse(time.RFC3339, *timeStr)
	if err != nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: t, Valid: true}
}

func parseTextParam(str *string) pgtype.Text {
	if str == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *str, Valid: true}
}

func (s *Service) UpdateAssignmentTracking(ctx context.Context, id int64, arrivedAt, arrivalVideoUrl, electionStartedAt, electionStartedVideoUrl, electionEndedAt, electionEndedVideoUrl *string) (queries.UpdateAssignmentTrackingRow, error) {
	assignment, err := s.queries.GetAssignmentByID(ctx, id)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid assignment")
	}

	electionGroup, err := s.queries.GetElectionGroupByID(ctx, assignment.ElectionGroupID)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid election group")
	}
	if electionGroup.ElectionDate.Valid {
		now := time.Now().UTC()
		if now.Format("2006-01-02") != electionGroup.ElectionDate.Time.Format("2006-01-02") {
			return queries.UpdateAssignmentTrackingRow{}, errors.New("updates can only be submitted on the election day")
		}
	}

	updated, err := s.queries.UpdateAssignmentTracking(ctx, queries.UpdateAssignmentTrackingParams{
		ID:                      id,
		ArrivedAt:               parseTimeParam(arrivedAt),
		ArrivalVideoUrl:         parseTextParam(arrivalVideoUrl),
		ElectionStartedAt:       parseTimeParam(electionStartedAt),
		ElectionStartedVideoUrl: parseTextParam(electionStartedVideoUrl),
		ElectionEndedAt:         parseTimeParam(electionEndedAt),
		ElectionEndedVideoUrl:   parseTextParam(electionEndedVideoUrl),
	})
	if err != nil {
		return updated, err
	}

	// Enqueue a background task to recalculate the PU stats (which will cascade to Ward, LGA, etc.)
	// The worker debounces duplicate updates to the same PU automatically.
	_ = s.taskDistributor.DistributeTaskRefreshPollingUnitStats(context.Background(), &worker.RefreshPollingUnitStatsPayload{
		Params: queries.RefreshSingleElectionGroupPollingUnitStatsParams{
			ElectionGroupID: assignment.ElectionGroupID,
			PollingUnitID:   assignment.PollingUnitID,
		},
	})

	return updated, nil
}

package puassignments

import (
	"context"
	"errors"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewService(q *queries.Queries, rdb *redis.Client) *Service {
	return &Service{
		queries: q,
		rdb:     rdb,
	}
}

func (s *Service) AssignAgent(ctx context.Context, userID, electionGroupID, partyID, assignedBy int64, pollingUnitID int32, roleType string) (queries.PollingUnitAssignment, error) {
	var assignedByVal pgtype.Int8
	if assignedBy > 0 {
		assignedByVal = pgtype.Int8{Int64: assignedBy, Valid: true}
	}

	return s.queries.CreateAssignment(ctx, queries.CreateAssignmentParams{
		UserID:          userID,
		PollingUnitID:   pollingUnitID,
		ElectionGroupID: electionGroupID,
		PartyID:         partyID,
		RoleType:        pgtype.Text{String: roleType, Valid: roleType != ""},
		AssignedBy:      assignedByVal,
	})
}

func (s *Service) GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error) {
	return s.queries.GetAssignmentByID(ctx, id)
}

func (s *Service) ListAssignments(ctx context.Context, electionGroupID, partyID, userID int64, pollingUnitID int32, limit, offset int32) ([]queries.ListAssignmentsRow, error) {
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

	return s.queries.UpdateAssignmentTracking(ctx, queries.UpdateAssignmentTrackingParams{
		ID:                      id,
		ArrivedAt:               parseTimeParam(arrivedAt),
		ArrivalVideoUrl:         parseTextParam(arrivalVideoUrl),
		ElectionStartedAt:       parseTimeParam(electionStartedAt),
		ElectionStartedVideoUrl: parseTextParam(electionStartedVideoUrl),
		ElectionEndedAt:         parseTimeParam(electionEndedAt),
		ElectionEndedVideoUrl:   parseTextParam(electionEndedVideoUrl),
	})
}

package puassignments

import (
	"context"
	"errors"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries     *queries.Queries
	rdb         *redis.Client
	earningsSvc earningsService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

func NewService(q *queries.Queries, rdb *redis.Client, earningsSvc earningsService) *Service {
	return &Service{
		queries:     q,
		rdb:         rdb,
		earningsSvc: earningsSvc,
	}
}

func (s *Service) GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error) {
	return s.queries.GetAssignmentByID(ctx, id)
}

func (s *Service) ListAssignments(ctx context.Context, electionGroupID int32, partyID int16, userID int64, pollingUnitID int32, limit, offset int32) ([]queries.ListAssignmentsRow, error) {
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

func (s *Service) UpdateAssignmentTracking(ctx context.Context, id int64, arrivedAt, arrivalVideoUrl, electionStartedAt, electionStartedVideoUrl, electionEndedAt, electionEndedVideoUrl *string) (queries.UpdateAssignmentTrackingRow, error) {
	assignment, err := s.queries.GetAssignmentByID(ctx, id)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid assignment")
	}

	electionGroup, err := s.queries.GetElectionGroupByID(ctx, assignment.ElectionGroupID)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid election group")
	}
	now := time.Now().UTC()
	if now.Year() > electionGroup.ElectionDate.Time.Year() {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("tracking can only be submitted during the election cycle")
	}

	updated, err := s.queries.UpdateAssignmentTracking(ctx, queries.UpdateAssignmentTrackingParams{
		ID:                      id,
		ArrivedAt:               parseTimeParam(arrivedAt),
		ArrivalVideoUrl:         utils.PgTextFromPtr(arrivalVideoUrl),
		ElectionStartedAt:       parseTimeParam(electionStartedAt),
		ElectionStartedVideoUrl: utils.PgTextFromPtr(electionStartedVideoUrl),
		ElectionEndedAt:         parseTimeParam(electionEndedAt),
		ElectionEndedVideoUrl:   utils.PgTextFromPtr(electionEndedVideoUrl),
	})
	if err != nil {
		return updated, err
	}

	// Trigger earnings calculation & wallet credit based on updated fields
	if s.earningsSvc != nil {
		if arrivedAt != nil && *arrivedAt != "" {
			go s.earningsSvc.ProcessTaskEarnings(context.Background(), id, "attendance")
		}
		if electionStartedAt != nil && *electionStartedAt != "" {
			go s.earningsSvc.ProcessTaskEarnings(context.Background(), id, "election_start")
		}
		if electionEndedAt != nil && *electionEndedAt != "" {
			go s.earningsSvc.ProcessTaskEarnings(context.Background(), id, "election_end")
		}
	}

	return updated, nil
}

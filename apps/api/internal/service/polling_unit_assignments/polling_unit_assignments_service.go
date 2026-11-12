package puassignments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"time"

	"github.com/jackc/pgx/v5"
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

// NewService initializes a new polling unit assignments service.
func NewService(q *queries.Queries, rdb *redis.Client, earningsSvc earningsService) *Service {
	return &Service{
		queries:     q,
		rdb:         rdb,
		earningsSvc: earningsSvc,
	}
}

// GetAssignmentByID retrieves a specific assignment by its primary key ID.
func (s *Service) GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error) {
	return s.queries.GetAssignmentByID(ctx, id)
}

// ListAssignments queries assignments filtered by election group, party, user, or polling unit with pagination.
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

func (s *Service) userAssignmentCacheKey(userID int64, electionGroupID int32) string {
	return fmt.Sprintf("%s%d:eg:%d", db.RedisUserPollingUnitAssignment, userID, electionGroupID)
}

// InvalidateUserAssignmentCache removes the cached polling unit and supervisor assignments for a user in an election group.
func (s *Service) InvalidateUserAssignmentCache(ctx context.Context, userID int64, electionGroupID int32) {
	_ = s.rdb.Del(ctx,
		s.userAssignmentCacheKey(userID, electionGroupID),
		fmt.Sprintf("%s%d:eg:%d", db.RedisStateSupervisorAssignment, userID, electionGroupID),
		fmt.Sprintf("%s%d:eg:%d", db.RedisLgaSupervisorAssignment, userID, electionGroupID),
		fmt.Sprintf("%s%d:eg:%d", db.RedisWardSupervisorAssignment, userID, electionGroupID),
	).Err()
}

// GetMyAssignment retrieves the unique polling unit assigned to an agent for a specific election group, cached in Redis.
func (s *Service) GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error) {
	cacheKey := s.userAssignmentCacheKey(userID, electionGroupID)

	// Check Redis cache first
	if cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		// Sentinel check: if empty sentinel "{}", user has no assignment
		if cachedJSON == "{}" || cachedJSON == "null" {
			return nil, nil
		}

		var cached queries.GetUserAssignmentRow
		if err := json.Unmarshal([]byte(cachedJSON), &cached); err == nil && cached.ID > 0 {
			return &cached, nil
		}
	}

	// Query assignment directly using unique constraint index (user_id, election_group_id)
	assignment, err := s.queries.GetUserAssignment(ctx, queries.GetUserAssignmentParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})

	if err != nil {
		// Return nil without error if user has not been assigned to a polling unit yet
		if errors.Is(err, pgx.ErrNoRows) {
			// Negative cache: store empty sentinel for 10 minutes to protect DB from repeated queries
			_ = s.rdb.Set(ctx, cacheKey, "{}", 10*time.Minute).Err()
			return nil, nil
		}
		return nil, err
	}

	// Cache valid assignment in Redis for 7 days (invalidated on tracking updates or deletion/revocation)
	if jsonBytes, mErr := json.Marshal(assignment); mErr == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisSevenDaysTTL).Err()
	}

	return &assignment, nil
}

// DeleteAssignment removes a polling unit assignment record by its ID and invalidates cache.
func (s *Service) DeleteAssignment(ctx context.Context, id int64) error {
	// Look up assignment first to get userID and electionGroupID for cache invalidation
	if assignment, err := s.queries.GetAssignmentByID(ctx, id); err == nil {
		defer s.InvalidateUserAssignmentCache(ctx, assignment.UserID, assignment.ElectionGroupID)
	}
	return s.queries.DeleteAssignment(ctx, id)
}

// parseTimeParam converts an optional ISO 8601/RFC3339 string into a pgtype.Timestamptz.
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

// UpdateAssignmentTracking records agent progress timestamps/proof videos and triggers task earnings.
func (s *Service) UpdateAssignmentTracking(ctx context.Context, id int64, arrivedAt, arrivalVideoUrl, electionStartedAt, electionStartedVideoUrl, electionEndedAt, electionEndedVideoUrl *string) (queries.UpdateAssignmentTrackingRow, error) {
	// Verify assignment exists
	assignment, err := s.queries.GetAssignmentByID(ctx, id)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid assignment")
	}

	// Verify the election group and cycle validity
	electionGroup, err := s.queries.GetElectionGroupByID(ctx, assignment.ElectionGroupID)
	if err != nil {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("invalid election group")
	}
	now := time.Now().UTC()
	if now.Year() > electionGroup.ElectionDate.Time.Year() {
		return queries.UpdateAssignmentTrackingRow{}, errors.New("tracking can only be submitted during the election cycle")
	}

	// Persist tracking timestamps and proof video URLs
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

	// Invalidate cached assignment in Redis so subsequent reads fetch fresh tracking timestamps
	s.InvalidateUserAssignmentCache(ctx, assignment.UserID, assignment.ElectionGroupID)

	// Trigger earnings calculation & wallet credit asynchronously for each reported milestone
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

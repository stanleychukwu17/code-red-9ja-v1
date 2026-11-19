package puassignments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries     *queries.Queries
	rdb         *redis.Client
	distributor worker.TaskDistributor
}

// NewService initializes a new polling unit assignments service.
func NewService(q *queries.Queries, rdb *redis.Client, distributor worker.TaskDistributor) *Service {
	return &Service{
		queries:     q,
		rdb:         rdb,
		distributor: distributor,
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
		fmt.Sprintf("%s%d", db.RedisUserHasActiveAssignment, userID),
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
			// Negative cache: store empty sentinel for 7 days to protect DB from repeated queries
			_ = s.rdb.Set(ctx, cacheKey, "{}", db.RedisSevenDaysTTL).Err()
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

// HasActiveAssignment checks whether a user has any active polling unit or supervisor assignment for an upcoming election.
// The result is cached in Redis with a 7-day TTL to shield database calls.
func (s *Service) HasActiveAssignment(ctx context.Context, userID int64) (bool, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserHasActiveAssignment, userID)

	// Check Redis cache first ("1" = true, "0" = false)
	if val, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		return val == "1", nil
	}

	// Fallback to database check
	hasActive, err := s.queries.HasActiveAssignment(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to check active assignment: %w", err)
	}

	// Cache result in Redis for subsequent checks
	val := "0"
	if hasActive {
		val = "1"
	}
	_ = s.rdb.Set(ctx, cacheKey, val, db.RedisSevenDaysTTL).Err()

	return hasActive, nil
}

// GetActiveAssignment retrieves the user's active polling unit assignment for an upcoming election.
func (s *Service) GetActiveAssignment(ctx context.Context, userID int64) (*queries.GetUserAssignmentRow, error) {
	assignment, err := s.queries.GetUserActiveAssignment(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	// Cache valid assignment under user's election group assignment key
	cacheKey := s.userAssignmentCacheKey(userID, assignment.ElectionGroupID)
	if jsonBytes, mErr := json.Marshal(assignment); mErr == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisSevenDaysTTL).Err()
	}

	res := queries.GetUserAssignmentRow(assignment)
	return &res, nil
}

// GetActiveSupervisorElectionGroupID retrieves the election group ID for a user's active supervisor role.
func (s *Service) GetActiveSupervisorElectionGroupID(ctx context.Context, userID int64) (int32, error) {
	egID, err := s.queries.GetActiveSupervisorElectionGroupID(ctx, userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return egID, nil
}

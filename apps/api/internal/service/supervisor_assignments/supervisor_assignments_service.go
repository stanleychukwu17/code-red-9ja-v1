package supervisorassignments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	q   *queries.Queries
	rdb *redis.Client
}

func NewService(q *queries.Queries, rdb *redis.Client) *Service {
	return &Service{
		q:   q,
		rdb: rdb,
	}
}

type SupervisorAssignmentsResponse struct {
	StateSupervisor *queries.StateElectionSupervisor `json:"state_supervisor"`
	LgaSupervisor   *queries.LgaElectionSupervisor   `json:"lga_supervisor"`
	WardSupervisor  *queries.WardElectionSupervisor  `json:"ward_supervisor"`
}

func (s *Service) stateCacheKey(userID int64, electionGroupID int32) string {
	return fmt.Sprintf("%s%d:eg:%d", db.RedisStateSupervisorAssignment, userID, electionGroupID)
}

func (s *Service) lgaCacheKey(userID int64, electionGroupID int32) string {
	return fmt.Sprintf("%s%d:eg:%d", db.RedisLgaSupervisorAssignment, userID, electionGroupID)
}

func (s *Service) wardCacheKey(userID int64, electionGroupID int32) string {
	return fmt.Sprintf("%s%d:eg:%d", db.RedisWardSupervisorAssignment, userID, electionGroupID)
}

// InvalidateUserSupervisorCache removes all cached supervisor assignments for a user in an election group.
func (s *Service) InvalidateUserSupervisorCache(ctx context.Context, userID int64, electionGroupID int32) {
	_ = s.rdb.Del(ctx,
		s.stateCacheKey(userID, electionGroupID),
		s.lgaCacheKey(userID, electionGroupID),
		s.wardCacheKey(userID, electionGroupID),
	).Err()
}

// GetStateSupervisorAssignment retrieves the state supervisor assignment for a user in an election group, cached in Redis.
func (s *Service) GetStateSupervisorAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.StateElectionSupervisor, error) {
	cacheKey := s.stateCacheKey(userID, electionGroupID)

	// Check Redis cache first
	if cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if cachedJSON == "{}" || cachedJSON == "null" {
			return nil, nil
		}
		var cached queries.StateElectionSupervisor
		if err := json.Unmarshal([]byte(cachedJSON), &cached); err == nil && cached.ID > 0 {
			return &cached, nil
		}
	}

	stateSup, err := s.q.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_ = s.rdb.Set(ctx, cacheKey, "{}", 10*time.Minute).Err()
			return nil, nil
		}
		return nil, err
	}

	if jsonBytes, mErr := json.Marshal(stateSup); mErr == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisSevenDaysTTL).Err()
	}

	return &stateSup, nil
}

// GetLgaSupervisorAssignment retrieves the LGA supervisor assignment for a user in an election group, cached in Redis.
func (s *Service) GetLgaSupervisorAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.LgaElectionSupervisor, error) {
	cacheKey := s.lgaCacheKey(userID, electionGroupID)

	// Check Redis cache first
	if cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if cachedJSON == "{}" || cachedJSON == "null" {
			return nil, nil
		}
		var cached queries.LgaElectionSupervisor
		if err := json.Unmarshal([]byte(cachedJSON), &cached); err == nil && cached.ID > 0 {
			return &cached, nil
		}
	}

	lgaSup, err := s.q.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_ = s.rdb.Set(ctx, cacheKey, "{}", 10*time.Minute).Err()
			return nil, nil
		}
		return nil, err
	}

	if jsonBytes, mErr := json.Marshal(lgaSup); mErr == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisSevenDaysTTL).Err()
	}

	return &lgaSup, nil
}

// GetWardSupervisorAssignment retrieves the ward supervisor assignment for a user in an election group, cached in Redis.
func (s *Service) GetWardSupervisorAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.WardElectionSupervisor, error) {
	cacheKey := s.wardCacheKey(userID, electionGroupID)

	// Check Redis cache first
	if cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if cachedJSON == "{}" || cachedJSON == "null" {
			return nil, nil
		}
		var cached queries.WardElectionSupervisor
		if err := json.Unmarshal([]byte(cachedJSON), &cached); err == nil && cached.ID > 0 {
			return &cached, nil
		}
	}

	wardSup, err := s.q.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_ = s.rdb.Set(ctx, cacheKey, "{}", 10*time.Minute).Err()
			return nil, nil
		}
		return nil, err
	}

	if jsonBytes, mErr := json.Marshal(wardSup); mErr == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisSevenDaysTTL).Err()
	}

	return &wardSup, nil
}

// GetUserSupervisorAssignments composes all supervisor assignments for a user in an election group.
func (s *Service) GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int32) (*SupervisorAssignmentsResponse, error) {
	stateSup, err := s.GetStateSupervisorAssignment(ctx, userID, electionGroupID)
	if err != nil {
		return nil, err
	}

	lgaSup, err := s.GetLgaSupervisorAssignment(ctx, userID, electionGroupID)
	if err != nil {
		return nil, err
	}

	wardSup, err := s.GetWardSupervisorAssignment(ctx, userID, electionGroupID)
	if err != nil {
		return nil, err
	}

	return &SupervisorAssignmentsResponse{
		StateSupervisor: stateSup,
		LgaSupervisor:   lgaSup,
		WardSupervisor:  wardSup,
	}, nil
}

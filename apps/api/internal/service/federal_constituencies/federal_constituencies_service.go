package federalconstituenciesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// FederalConstituenciesService provides business logic and caching for federal constituencies.
type FederalConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// NewFederalConstituenciesService creates and returns a new FederalConstituenciesService instance.
func NewFederalConstituenciesService(q *queries.Queries, rdb *redis.Client) *FederalConstituenciesService {
	return &FederalConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

// CreateFederalConstituencyParams defines the attributes required to create a federal constituency.
type CreateFederalConstituencyParams struct {
	Name                   string
	Code                   string
	StateID                int32
	StateName              string
	SenatorialDistrictID   int32
	SenatorialDistrictName string
}

// UpdateFederalConstituencyParams defines the attributes required to update an existing federal constituency.
type UpdateFederalConstituencyParams struct {
	ID                     int32
	Name                   string
	Code                   string
	StateID                int32
	StateName              string
	SenatorialDistrictID   int32
	SenatorialDistrictName string
}

// CreateFederalConstituency creates a new federal constituency record and invalidates the state cache.
func (s *FederalConstituenciesService) CreateFederalConstituency(ctx context.Context, params CreateFederalConstituencyParams) (queries.FederalConstituency, error) {
	arg := queries.CreateFederalConstituencyParams{
		Name:                   params.Name,
		Code:                   utils.PgTextFromString(params.Code),
		StateID:                params.StateID,
		StateName:              params.StateName,
		SenatorialDistrictID:   pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName: utils.PgTextFromString(params.SenatorialDistrictName),
	}

	fc, err := s.queries.CreateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, params.StateID)

	return fc, nil
}

// GetFederalConstituencyByID retrieves a federal constituency by its ID.
func (s *FederalConstituenciesService) GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error) {
	return s.queries.GetFederalConstituencyByID(ctx, id)
}

// UpdateFederalConstituency updates an existing federal constituency and invalidates state caches.
func (s *FederalConstituenciesService) UpdateFederalConstituency(ctx context.Context, params UpdateFederalConstituencyParams) (queries.FederalConstituency, error) {
	// Fetch current to invalidate its cache state, in case stateID is changed
	current, err := s.queries.GetFederalConstituencyByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateFederalConstituencyParams{
		ID:                     params.ID,
		Name:                   params.Name,
		Code:                   utils.PgTextFromString(params.Code),
		StateID:                params.StateID,
		StateName:              params.StateName,
		SenatorialDistrictID:   pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName: utils.PgTextFromString(params.SenatorialDistrictName),
	}

	fc, err := s.queries.UpdateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the new state
	s.invalidateCache(ctx, params.StateID)

	return fc, nil
}

// DeleteFederalConstituency deletes a federal constituency and invalidates the state cache.
func (s *FederalConstituenciesService) DeleteFederalConstituency(ctx context.Context, id int32) error {
	fc, err := s.queries.GetFederalConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteFederalConstituency(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, fc.StateID)

	return nil
}

// GetFederalConstituencies retrieves all federal constituencies for a state/senatorial district, using Redis cache when available.
func (s *FederalConstituenciesService) GetFederalConstituencies(ctx context.Context, stateID, senatorialDistrictID int32) ([]queries.FederalConstituency, error) {
	type Response struct {
		Constituencies []queries.FederalConstituency `json:"constituencies"`
	}

	redisKey := fmt.Sprintf("%s%d_%d", db.RedisFederalConstituenciesByState, stateID, senatorialDistrictID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetFederalConstituenciesParams{
			StateID:              stateID,
			SenatorialDistrictID: senatorialDistrictID,
		}
		dbData, err := s.queries.GetFederalConstituencies(ctx, arg)
		if err != nil {
			return nil, err
		}

		payload := Response{
			Constituencies: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Constituencies, nil
	default:
		return nil, err
	}
}

// invalidateCache clears Redis cache entries for a state's federal constituencies and national metrics.
func (s *FederalConstituenciesService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisFederalConstituenciesByState, stateID)
	s.rdb.Del(ctx, redisKey)
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

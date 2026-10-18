package stateassemblyconstituenciesservice

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

// StateConstituenciesService provides business logic and caching for state assembly constituencies.
type StateConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// NewStateConstituenciesService creates and returns a new StateConstituenciesService instance.
func NewStateConstituenciesService(q *queries.Queries, rdb *redis.Client) *StateConstituenciesService {
	return &StateConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

// CreateStateConstituencyParams defines the attributes required to create a state assembly constituency.
type CreateStateConstituencyParams struct {
	Name                    string
	Code                    string
	LgaID                   int32
	LgaName                 string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// UpdateStateConstituencyParams defines the attributes required to update an existing state assembly constituency.
type UpdateStateConstituencyParams struct {
	ID                      int32
	Name                    string
	Code                    string
	LgaID                   int32
	LgaName                 string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// CreateStateConstituency creates a new state assembly constituency record and invalidates the state cache.
func (s *StateConstituenciesService) CreateStateConstituency(ctx context.Context, params CreateStateConstituencyParams) (queries.StateConstituency, error) {
	arg := queries.CreateStateConstituencyParams{
		Name:                    params.Name,
		Code:                    utils.PgTextFromString(params.Code),
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	sac, err := s.queries.CreateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, params.StateID)

	return sac, nil
}

// GetStateConstituencyByID retrieves a state assembly constituency by its ID, utilizing Redis cache when available.
func (s *StateConstituenciesService) GetStateConstituencyByID(ctx context.Context, id int32) (queries.StateConstituency, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachStateConstituency, id)
	cached, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var sac queries.StateConstituency
		if json.Unmarshal([]byte(cached), &sac) == nil && sac.ID > 0 {
			return sac, nil
		}
	}

	sac, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	if data, err := json.Marshal(sac); err == nil {
		s.rdb.Set(ctx, redisKey, data, db.RedisOneEightyDaysTTL)
	}

	return sac, nil
}

// UpdateStateConstituency updates an existing state assembly constituency and invalidates state caches.
func (s *StateConstituenciesService) UpdateStateConstituency(ctx context.Context, params UpdateStateConstituencyParams) (queries.StateConstituency, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetStateConstituencyByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID, params.ID)
	}

	arg := queries.UpdateStateConstituencyParams{
		ID:                      params.ID,
		Name:                    params.Name,
		Code:                    utils.PgTextFromString(params.Code),
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	sac, err := s.queries.UpdateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for new state and constituency
	s.invalidateCache(ctx, params.StateID, params.ID)

	return sac, nil
}

// DeleteStateConstituency deletes a state assembly constituency and invalidates the state cache.
func (s *StateConstituenciesService) DeleteStateConstituency(ctx context.Context, id int32) error {
	sac, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteStateConstituency(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the state and constituency
	s.invalidateCache(ctx, sac.StateID, id)

	return nil
}

// GetStateConstituencies retrieves all state assembly constituencies for a state/federal constituency, using Redis cache when available.
func (s *StateConstituenciesService) GetStateConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateConstituency, error) {
	type Response struct {
		Constituencies []queries.StateConstituency `json:"constituencies"`
	}

	redisKey := fmt.Sprintf("%s%d:%d", db.RedisStateConstituenciesByState, stateID, federalConstituencyID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetStateConstituenciesParams{
			StateID:               stateID,
			FederalConstituencyID: federalConstituencyID,
		}
		dbData, err := s.queries.GetStateConstituencies(ctx, arg)
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

// invalidateCache clears Redis cache entries for a state's state constituencies, the national cache, national metrics, and individual constituency cache.
func (s *StateConstituenciesService) invalidateCache(ctx context.Context, stateID int32, constituencyIDs ...int32) {
	// Invalidate individual constituency record cache(s) if provided
	for _, id := range constituencyIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachStateConstituency, id))
		}
	}

	// Invalidate state-level constituency list caches (matches compound stateID:senatorialDistrictID:federalConstituencyID keys)
	pattern := fmt.Sprintf("%s%d:*", db.RedisStateConstituenciesByState, stateID)
	iter := s.rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		s.rdb.Del(ctx, iter.Val())
	}

	// Invalidate national/all-constituencies list cache (state:0:0)
	if stateID != 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s0:0", db.RedisStateConstituenciesByState))
	}

	// Invalidate national metrics cache
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

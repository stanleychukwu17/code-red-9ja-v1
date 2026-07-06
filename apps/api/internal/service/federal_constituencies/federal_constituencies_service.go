package federalconstituenciesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/redis/go-redis/v9"
)

type FederalConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewFederalConstituenciesService(q *queries.Queries, rdb *redis.Client) *FederalConstituenciesService {
	return &FederalConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *FederalConstituenciesService) CreateFederalConstituency(
	ctx context.Context,
	name string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
) (queries.FederalConstituency, error) {
	arg := queries.CreateFederalConstituencyParams{
		Name:                   name,
		StateID:                stateID,
		StateName:              stateName,
		SenatorialDistrictID:   senatorialDistrictID,
		SenatorialDistrictName: senatorialDistrictName,
	}

	fc, err := s.queries.CreateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, stateID)

	return fc, nil
}

func (s *FederalConstituenciesService) GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error) {
	return s.queries.GetFederalConstituencyByID(ctx, id)
}

func (s *FederalConstituenciesService) UpdateFederalConstituency(
	ctx context.Context,
	id int32,
	name string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
) (queries.FederalConstituency, error) {
	// Fetch current to invalidate its cache state, in case stateID is changed
	current, err := s.queries.GetFederalConstituencyByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateFederalConstituencyParams{
		ID:                     id,
		Name:                   name,
		StateID:                stateID,
		StateName:              stateName,
		SenatorialDistrictID:   senatorialDistrictID,
		SenatorialDistrictName: senatorialDistrictName,
	}

	fc, err := s.queries.UpdateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the new state
	s.invalidateCache(ctx, stateID)

	return fc, nil
}

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
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Constituencies, nil
	default:
		return nil, err
	}
}

func (s *FederalConstituenciesService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisFederalConstituenciesByState, stateID)
	s.rdb.Del(ctx, redisKey)
}

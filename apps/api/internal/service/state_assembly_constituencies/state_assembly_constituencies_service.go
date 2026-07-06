package stateassemblyconstituenciesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/redis/go-redis/v9"
)

type StateAssemblyConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewStateAssemblyConstituenciesService(q *queries.Queries, rdb *redis.Client) *StateAssemblyConstituenciesService {
	return &StateAssemblyConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *StateAssemblyConstituenciesService) CreateStateAssemblyConstituency(
	ctx context.Context,
	name string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.StateAssemblyConstituency, error) {
	arg := queries.CreateStateAssemblyConstituencyParams{
		Name:                    name,
		LgaID:                   lgaID,
		LgaName:                 lgaName,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    senatorialDistrictID,
		SenatorialDistrictName:  senatorialDistrictName,
		FederalConstituencyID:   federalConstituencyID,
		FederalConstituencyName: federalConstituencyName,
	}

	sac, err := s.queries.CreateStateAssemblyConstituency(ctx, arg)
	if err != nil {
		return queries.StateAssemblyConstituency{}, err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, stateID)

	return sac, nil
}

func (s *StateAssemblyConstituenciesService) GetStateAssemblyConstituencyByID(ctx context.Context, id int32) (queries.StateAssemblyConstituency, error) {
	return s.queries.GetStateAssemblyConstituencyByID(ctx, id)
}

func (s *StateAssemblyConstituenciesService) UpdateStateAssemblyConstituency(
	ctx context.Context,
	id int32,
	name string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.StateAssemblyConstituency, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetStateAssemblyConstituencyByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateStateAssemblyConstituencyParams{
		ID:                      id,
		Name:                    name,
		LgaID:                   lgaID,
		LgaName:                 lgaName,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    senatorialDistrictID,
		SenatorialDistrictName:  senatorialDistrictName,
		FederalConstituencyID:   federalConstituencyID,
		FederalConstituencyName: federalConstituencyName,
	}

	sac, err := s.queries.UpdateStateAssemblyConstituency(ctx, arg)
	if err != nil {
		return queries.StateAssemblyConstituency{}, err
	}

	// Invalidate cache for new state
	s.invalidateCache(ctx, stateID)

	return sac, nil
}

func (s *StateAssemblyConstituenciesService) DeleteStateAssemblyConstituency(ctx context.Context, id int32) error {
	sac, err := s.queries.GetStateAssemblyConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteStateAssemblyConstituency(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, sac.StateID)

	return nil
}

func (s *StateAssemblyConstituenciesService) GetStateAssemblyConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateAssemblyConstituency, error) {
	type Response struct {
		Constituencies []queries.StateAssemblyConstituency `json:"constituencies"`
	}

	redisKey := fmt.Sprintf("%s%d_%d", db.RedisStateAssemblyConstituenciesByState, stateID, federalConstituencyID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetStateAssemblyConstituenciesParams{
			StateID:               stateID,
			FederalConstituencyID: federalConstituencyID,
		}
		dbData, err := s.queries.GetStateAssemblyConstituencies(ctx, arg)
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

func (s *StateAssemblyConstituenciesService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisStateAssemblyConstituenciesByState, stateID)
	s.rdb.Del(ctx, redisKey)
}

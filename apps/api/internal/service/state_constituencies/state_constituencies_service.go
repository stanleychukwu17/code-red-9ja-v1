package stateassemblyconstituenciesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type StateConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewStateConstituenciesService(q *queries.Queries, rdb *redis.Client) *StateConstituenciesService {
	return &StateConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *StateConstituenciesService) CreateStateConstituency(
	ctx context.Context,
	name string,
	code string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.StateConstituency, error) {
	arg := queries.CreateStateConstituencyParams{
		Name:                    name,
		Code:                    pgtype.Text{String: code, Valid: code != ""},
		LgaID:                   lgaID,
		LgaName:                 lgaName,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: senatorialDistrictID, Valid: senatorialDistrictID != 0},
		SenatorialDistrictName:  pgtype.Text{String: senatorialDistrictName, Valid: senatorialDistrictName != ""},
		FederalConstituencyID:   pgtype.Int4{Int32: federalConstituencyID, Valid: federalConstituencyID != 0},
		FederalConstituencyName: pgtype.Text{String: federalConstituencyName, Valid: federalConstituencyName != ""},
	}

	sac, err := s.queries.CreateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, stateID)

	return sac, nil
}

func (s *StateConstituenciesService) GetStateConstituencyByID(ctx context.Context, id int32) (queries.StateConstituency, error) {
	return s.queries.GetStateConstituencyByID(ctx, id)
}

func (s *StateConstituenciesService) UpdateStateConstituency(
	ctx context.Context,
	id int32,
	name string,
	code string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.StateConstituency, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateStateConstituencyParams{
		ID:                      id,
		Name:                    name,
		Code:                    pgtype.Text{String: code, Valid: code != ""},
		LgaID:                   lgaID,
		LgaName:                 lgaName,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: senatorialDistrictID, Valid: senatorialDistrictID != 0},
		SenatorialDistrictName:  pgtype.Text{String: senatorialDistrictName, Valid: senatorialDistrictName != ""},
		FederalConstituencyID:   pgtype.Int4{Int32: federalConstituencyID, Valid: federalConstituencyID != 0},
		FederalConstituencyName: pgtype.Text{String: federalConstituencyName, Valid: federalConstituencyName != ""},
	}

	sac, err := s.queries.UpdateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for new state
	s.invalidateCache(ctx, stateID)

	return sac, nil
}

func (s *StateConstituenciesService) DeleteStateConstituency(ctx context.Context, id int32) error {
	sac, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteStateConstituency(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, sac.StateID)

	return nil
}

func (s *StateConstituenciesService) GetStateConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateConstituency, error) {
	type Response struct {
		Constituencies []queries.StateConstituency `json:"constituencies"`
	}

	redisKey := fmt.Sprintf("%s%d_%d", db.RedisStateConstituenciesByState, stateID, federalConstituencyID)
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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Constituencies, nil
	default:
		return nil, err
	}
}

func (s *StateConstituenciesService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisStateConstituenciesByState, stateID)
	s.rdb.Del(ctx, redisKey)
}

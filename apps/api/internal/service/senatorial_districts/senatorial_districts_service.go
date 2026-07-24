package senatorialdistrictsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type SenatorialDistrictsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewSenatorialDistrictsService(q *queries.Queries, rdb *redis.Client) *SenatorialDistrictsService {
	return &SenatorialDistrictsService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *SenatorialDistrictsService) CreateSenatorialDistrict(
	ctx context.Context,
	name string,
	description string,
	coalitionCenter string,
	stateID int32,
	stateName string,
) (queries.SenatorialDistrict, error) {
	arg := queries.CreateSenatorialDistrictParams{
		Name: name,
		Description: pgtype.Text{
			String: description,
			Valid:  true,
		},
		CoalitionCenter: pgtype.Text{
			String: coalitionCenter,
			Valid:  true,
		},
		StateID:   stateID,
		StateName: stateName,
	}

	sd, err := s.queries.CreateSenatorialDistrict(ctx, arg)
	if err != nil {
		return queries.SenatorialDistrict{}, err
	}

	// Invalidate cached senatorial districts for the state
	s.invalidateCache(ctx, stateID)

	return sd, nil
}

func (s *SenatorialDistrictsService) GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error) {
	return s.queries.GetSenatorialDistrictByID(ctx, id)
}

func (s *SenatorialDistrictsService) UpdateSenatorialDistrict(
	ctx context.Context,
	id int32,
	name string,
	description string,
	coalitionCenter string,
	stateID int32,
	stateName string,
) (queries.SenatorialDistrict, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetSenatorialDistrictByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateSenatorialDistrictParams{
		ID:   id,
		Name: name,
		Description: pgtype.Text{
			String: description,
			Valid:  true,
		},
		CoalitionCenter: pgtype.Text{
			String: coalitionCenter,
			Valid:  true,
		},
		StateID:   stateID,
		StateName: stateName,
	}

	sd, err := s.queries.UpdateSenatorialDistrict(ctx, arg)
	if err != nil {
		return queries.SenatorialDistrict{}, err
	}

	// Invalidate cache for new state
	s.invalidateCache(ctx, stateID)

	return sd, nil
}

func (s *SenatorialDistrictsService) DeleteSenatorialDistrict(ctx context.Context, id int32) error {
	sd, err := s.queries.GetSenatorialDistrictByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteSenatorialDistrict(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the state
	s.invalidateCache(ctx, sd.StateID)

	return nil
}

func (s *SenatorialDistrictsService) GetSenatorialDistricts(ctx context.Context, stateID int32) ([]queries.SenatorialDistrict, error) {
	type Response struct {
		Districts []queries.SenatorialDistrict `json:"districts"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisSenatorialDistrictsByState, stateID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbData, err := s.queries.GetSenatorialDistricts(ctx, stateID)
		if err != nil {
			return nil, err
		}

		payload := Response{
			Districts: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Districts, nil
	default:
		return nil, err
	}
}

func (s *SenatorialDistrictsService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisSenatorialDistrictsByState, stateID)
	s.rdb.Del(ctx, redisKey)
}

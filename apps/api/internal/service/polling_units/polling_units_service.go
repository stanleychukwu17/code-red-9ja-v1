package pollingunitsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/redis/go-redis/v9"
)

type PollingUnitsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewPollingUnitsService(q *queries.Queries, rdb *redis.Client) *PollingUnitsService {
	return &PollingUnitsService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *PollingUnitsService) CreatePollingUnit(
	ctx context.Context,
	arg queries.CreatePollingUnitParams,
) (queries.PollingUnit, error) {
	pu, err := s.queries.CreatePollingUnit(ctx, arg)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	// Invalidate cache for the Ward
	s.invalidateCache(ctx, arg.WardID)

	return pu, nil
}

func (s *PollingUnitsService) GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error) {
	return s.queries.GetPollingUnitByID(ctx, id)
}

func (s *PollingUnitsService) UpdatePollingUnit(
	ctx context.Context,
	arg queries.UpdatePollingUnitParams,
) (queries.PollingUnit, error) {
	// Fetch current to invalidate old Ward cache in case wardID changed
	current, err := s.queries.GetPollingUnitByID(ctx, arg.ID)
	if err == nil {
		s.invalidateCache(ctx, current.WardID)
	}

	pu, err := s.queries.UpdatePollingUnit(ctx, arg)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	// Invalidate cache for new Ward
	s.invalidateCache(ctx, arg.WardID)

	return pu, nil
}

func (s *PollingUnitsService) DeletePollingUnit(ctx context.Context, id int32) error {
	pu, err := s.queries.GetPollingUnitByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeletePollingUnit(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the Ward
	s.invalidateCache(ctx, pu.WardID)

	return nil
}

func (s *PollingUnitsService) GetPollingUnits(ctx context.Context, wardID, localGovernmentID, stateID int32) ([]queries.PollingUnit, error) {
	type Response struct {
		PollingUnits []queries.PollingUnit `json:"polling_units"`
	}

	redisKey := fmt.Sprintf("%s%d_%d_%d", db.RedisPollingUnitsByWard, wardID, localGovernmentID, stateID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetPollingUnitsParams{
			WardID:  wardID,
			LgaID:   localGovernmentID,
			StateID: stateID,
		}
		dbData, err := s.queries.GetPollingUnits(ctx, arg)
		if err != nil {
			return nil, err
		}

		payload := Response{
			PollingUnits: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.PollingUnits, nil
	default:
		return nil, err
	}
}

func (s *PollingUnitsService) invalidateCache(ctx context.Context, wardID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisPollingUnitsByWard, wardID)
	s.rdb.Del(ctx, redisKey)
}

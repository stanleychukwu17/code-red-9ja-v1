package wardsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/redis/go-redis/v9"
)

type WardsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewWardsService(q *queries.Queries, rdb *redis.Client) *WardsService {
	return &WardsService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *WardsService) CreateWard(
	ctx context.Context,
	name string,
	abbreviation string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
) (queries.Ward, error) {
	arg := queries.CreateWardParams{
		Name:         name,
		Abbreviation: abbreviation,
		LgaID:        lgaID,
		LgaName:      lgaName,
		StateID:      stateID,
		StateName:    stateName,
	}

	ward, err := s.queries.CreateWard(ctx, arg)
	if err != nil {
		return queries.Ward{}, err
	}

	// Invalidate cache for the LGA
	s.invalidateCache(ctx, lgaID)

	return ward, nil
}

func (s *WardsService) GetWardByID(ctx context.Context, id int32) (queries.Ward, error) {
	return s.queries.GetWardByID(ctx, id)
}

func (s *WardsService) UpdateWard(
	ctx context.Context,
	id int32,
	name string,
	abbreviation string,
	lgaID int32,
	lgaName string,
	stateID int32,
	stateName string,
) (queries.Ward, error) {
	// Fetch current to invalidate old LGA cache in case lgaID changed
	current, err := s.queries.GetWardByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.LgaID)
	}

	arg := queries.UpdateWardParams{
		ID:           id,
		Name:         name,
		Abbreviation: abbreviation,
		LgaID:        lgaID,
		LgaName:      lgaName,
		StateID:      stateID,
		StateName:    stateName,
	}

	ward, err := s.queries.UpdateWard(ctx, arg)
	if err != nil {
		return queries.Ward{}, err
	}

	// Invalidate cache for new LGA
	s.invalidateCache(ctx, lgaID)

	return ward, nil
}

func (s *WardsService) DeleteWard(ctx context.Context, id int32) error {
	ward, err := s.queries.GetWardByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteWard(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the LGA
	s.invalidateCache(ctx, ward.LgaID)

	return nil
}

func (s *WardsService) GetWards(ctx context.Context, localGovernmentID, stateID int32) ([]queries.Ward, error) {
	type Response struct {
		Wards []queries.Ward `json:"wards"`
	}

	redisKey := fmt.Sprintf("%s%d_%d", db.RedisWardsByLGA, localGovernmentID, stateID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetWardsParams{
			LgaID:   localGovernmentID,
			StateID: stateID,
		}
		dbData, err := s.queries.GetWards(ctx, arg)
		if err != nil {
			return nil, err
		}

		payload := Response{
			Wards: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Wards, nil
	default:
		return nil, err
	}
}

func (s *WardsService) invalidateCache(ctx context.Context, lgaID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisWardsByLGA, lgaID)
	s.rdb.Del(ctx, redisKey)
}

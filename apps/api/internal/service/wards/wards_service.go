package wardsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

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

type CreateWardParams struct {
	Name      string
	Code      string
	LgaID     int32
	LgaName   string
	StateID   int32
	StateName string
}

type UpdateWardParams struct {
	ID        int32
	Name      string
	Code      string
	LgaID     int32
	LgaName   string
	StateID   int32
	StateName string
}

func (s *WardsService) CreateWard(ctx context.Context, params CreateWardParams) (queries.Ward, error) {
	lga, _ := s.queries.GetLGAByID(ctx, params.LgaID)
	arg := queries.CreateWardParams{
		Name:                    params.Name,
		Code:                    params.Code,
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		SenatorialDistrictID:    lga.SenatorialDistrictID,
		SenatorialDistrictName:  lga.SenatorialDistrictName,
		FederalConstituencyID:   lga.FederalConstituencyID,
		FederalConstituencyName: lga.FederalConstituencyName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
	}

	ward, err := s.queries.CreateWard(ctx, arg)
	if err != nil {
		return queries.Ward{}, err
	}

	s.invalidateCache(ctx, params.LgaID)

	return ward, nil
}

// GetWardByID retrieves a single ward by its ID, utilizing Redis cache when available.
func (s *WardsService) GetWardByID(ctx context.Context, id int32) (queries.Ward, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachWard, id)
	cached, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var ward queries.Ward
		if json.Unmarshal([]byte(cached), &ward) == nil && ward.ID > 0 {
			return ward, nil
		}
	}

	ward, err := s.queries.GetWardByID(ctx, id)
	if err != nil {
		return queries.Ward{}, err
	}

	if data, err := json.Marshal(ward); err == nil {
		s.rdb.Set(ctx, redisKey, data, db.RedisOneEightyDaysTTL)
	}

	return ward, nil
}

// UpdateWard updates an existing ward and invalidates relevant caches.
func (s *WardsService) UpdateWard(ctx context.Context, params UpdateWardParams) (queries.Ward, error) {
	current, err := s.queries.GetWardByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.LgaID, params.ID)
	}

	lga, _ := s.queries.GetLGAByID(ctx, params.LgaID)
	arg := queries.UpdateWardParams{
		ID:                      params.ID,
		Name:                    params.Name,
		Code:                    params.Code,
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		SenatorialDistrictID:    lga.SenatorialDistrictID,
		SenatorialDistrictName:  lga.SenatorialDistrictName,
		FederalConstituencyID:   lga.FederalConstituencyID,
		FederalConstituencyName: lga.FederalConstituencyName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
	}

	ward, err := s.queries.UpdateWard(ctx, arg)
	if err != nil {
		return queries.Ward{}, err
	}

	// Invalidate cache for new LGA and ward
	s.invalidateCache(ctx, params.LgaID, params.ID)

	return ward, nil
}

// DeleteWard deletes a ward by its ID and invalidates the LGA cache.
func (s *WardsService) DeleteWard(ctx context.Context, id int32) error {
	ward, err := s.queries.GetWardByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteWard(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the LGA and ward
	s.invalidateCache(ctx, ward.LgaID, id)

	return nil
}

func (s *WardsService) GetWards(ctx context.Context, lgaID, stateID int32) ([]queries.Ward, error) {
	type Response struct {
		Wards []queries.Ward `json:"wards"`
	}

	redisKey := fmt.Sprintf("%s%d:%d", db.RedisWardsByLGA, lgaID, stateID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		arg := queries.GetWardsParams{
			LgaID:   lgaID,
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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Wards, nil
	default:
		return nil, err
	}
}

// invalidateCache clears Redis cache entries for an LGA's wards, national metrics, and individual ward cache.
func (s *WardsService) invalidateCache(ctx context.Context, lgaID int32, wardIDs ...int32) {
	// Invalidate individual ward record cache(s) if provided
	for _, id := range wardIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachWard, id))
		}
	}

	// Invalidate LGA-level ward list caches (matches compound lgaID:stateID keys)
	pattern := fmt.Sprintf("%s%d:*", db.RedisWardsByLGA, lgaID)
	iter := s.rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		s.rdb.Del(ctx, iter.Val())
	}
	if lgaID != 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s0:0", db.RedisWardsByLGA))
	}

	// Invalidate national metrics cache
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

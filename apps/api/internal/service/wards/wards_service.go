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

	s.invalidateCache(ctx, params.StateID)

	return ward, nil
}

func (s *WardsService) GetWardByID(ctx context.Context, id int32) (queries.Ward, error) {
	return s.queries.GetWardByID(ctx, id)
}

func (s *WardsService) UpdateWard(ctx context.Context, params UpdateWardParams) (queries.Ward, error) {
	current, err := s.queries.GetWardByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
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

	// Invalidate cache for new LGA
	s.invalidateCache(ctx, params.LgaID)

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

func (s *WardsService) invalidateCache(ctx context.Context, lgaID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisWardsByLGA, lgaID)
	s.rdb.Del(ctx, redisKey)
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

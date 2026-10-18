package senatorialdistrictsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/redis/go-redis/v9"
)

// SenatorialDistrictsService provides business logic and caching for senatorial districts.
type SenatorialDistrictsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// NewSenatorialDistrictsService creates and returns a new SenatorialDistrictsService instance.
func NewSenatorialDistrictsService(q *queries.Queries, rdb *redis.Client) *SenatorialDistrictsService {
	return &SenatorialDistrictsService{
		queries: q,
		rdb:     rdb,
	}
}

// CreateSenatorialDistrictParams defines the attributes required to create a senatorial district.
type CreateSenatorialDistrictParams struct {
	Name            string
	Code            string
	Description     string
	CoalitionCenter string
	StateID         int32
	StateName       string
}

// UpdateSenatorialDistrictParams defines the attributes required to update an existing senatorial district.
type UpdateSenatorialDistrictParams struct {
	ID              int32
	Name            string
	Code            string
	Description     string
	CoalitionCenter string
	StateID         int32
	StateName       string
}

// CreateSenatorialDistrict creates a new senatorial district record and invalidates the state cache.
func (s *SenatorialDistrictsService) CreateSenatorialDistrict(ctx context.Context, params CreateSenatorialDistrictParams) (queries.SenatorialDistrict, error) {
	arg := queries.CreateSenatorialDistrictParams{
		Name:            params.Name,
		Code:            utils.PgTextFromString(params.Code),
		Description:     utils.PgTextFromString(params.Description),
		CoalitionCenter: utils.PgTextFromString(params.CoalitionCenter),
		StateID:         params.StateID,
		StateName:       params.StateName,
	}

	sd, err := s.queries.CreateSenatorialDistrict(ctx, arg)
	if err != nil {
		return queries.SenatorialDistrict{}, err
	}

	// Invalidate cached senatorial districts for the state
	s.invalidateCache(ctx, params.StateID)

	return sd, nil
}

// GetSenatorialDistrictByID retrieves a senatorial district by its ID.
func (s *SenatorialDistrictsService) GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error) {
	return s.queries.GetSenatorialDistrictByID(ctx, id)
}

// UpdateSenatorialDistrict updates an existing district and invalidates both old and new state caches.
func (s *SenatorialDistrictsService) UpdateSenatorialDistrict(ctx context.Context, params UpdateSenatorialDistrictParams) (queries.SenatorialDistrict, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetSenatorialDistrictByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateSenatorialDistrictParams{
		ID:              params.ID,
		Name:            params.Name,
		Code:            utils.PgTextFromString(params.Code),
		Description:     utils.PgTextFromString(params.Description),
		CoalitionCenter: utils.PgTextFromString(params.CoalitionCenter),
		StateID:         params.StateID,
		StateName:       params.StateName,
	}

	sd, err := s.queries.UpdateSenatorialDistrict(ctx, arg)
	if err != nil {
		return queries.SenatorialDistrict{}, err
	}

	// Invalidate cache for new state
	s.invalidateCache(ctx, params.StateID)

	return sd, nil
}

// DeleteSenatorialDistrict deletes a senatorial district and invalidates the state cache.
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

// GetSenatorialDistricts retrieves all senatorial districts for a state, utilizing Redis cache when available.
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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Districts, nil
	default:
		return nil, err
	}
}

// invalidateCache clears Redis cache entries for a state's senatorial districts and national metrics.
func (s *SenatorialDistrictsService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisSenatorialDistrictsByState, stateID)
	s.rdb.Del(ctx, redisKey)
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

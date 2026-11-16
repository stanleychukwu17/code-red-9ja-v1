package senatorialdistrictsservice

import (
	"context"
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

	// Invalidate cached senatorial districts for the state and nationwide
	s.invalidateCache(ctx, params.StateID, sd.ID)

	return sd, nil
}

// GetSenatorialDistrictByID retrieves a senatorial district by its ID, utilizing Redis cache when available.
func (s *SenatorialDistrictsService) GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachSenatorialDistrict, id)
	if sd, ok := utils.GetCachedJSON[queries.SenatorialDistrict](ctx, s.rdb, redisKey); ok && sd.ID > 0 {
		return sd, nil
	}

	sd, err := s.queries.GetSenatorialDistrictByID(ctx, id)
	if err != nil {
		return queries.SenatorialDistrict{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, sd, db.RedisOneEightyDaysTTL)

	return sd, nil
}

// UpdateSenatorialDistrict updates an existing district and invalidates both old and new state caches.
func (s *SenatorialDistrictsService) UpdateSenatorialDistrict(ctx context.Context, params UpdateSenatorialDistrictParams) (queries.SenatorialDistrict, error) {
	// Fetch current to invalidate old state cache in case stateID changed
	current, err := s.queries.GetSenatorialDistrictByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID, params.ID)
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

	// Invalidate cache for new state and district
	s.invalidateCache(ctx, params.StateID, params.ID)

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

	// Invalidate cache for the state and district
	s.invalidateCache(ctx, sd.StateID, id)

	return nil
}

// GetSenatorialDistricts retrieves all senatorial districts for a state or nationwide, utilizing Redis cache when available.
func (s *SenatorialDistrictsService) GetSenatorialDistricts(ctx context.Context, stateID int32) ([]queries.SenatorialDistrict, error) {
	type Response struct {
		Districts []queries.SenatorialDistrict `json:"districts"`
	}

	// Determine cache key: state-specific list or nationwide all list
	var redisKey string
	if stateID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisSenatorialDistrictsByState, stateID)
	} else {
		redisKey = db.RedisSenatorialDistrictsAll
	}

	if payload, ok := utils.GetCachedJSON[Response](ctx, s.rdb, redisKey); ok {
		return payload.Districts, nil
	}

	dbData, err := s.queries.GetSenatorialDistricts(ctx, stateID)
	if err != nil {
		return nil, err
	}

	payload := Response{
		Districts: dbData,
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, payload, db.RedisOneEightyDaysTTL)

	return dbData, nil
}

// invalidateCache clears Redis cache entries for a state's senatorial districts, the national all-districts cache, national metrics, and individual district cache.
func (s *SenatorialDistrictsService) invalidateCache(ctx context.Context, stateID int32, districtIDs ...int32) {
	// Invalidate individual district record cache(s) if provided
	for _, id := range districtIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachSenatorialDistrict, id))
		}
	}

	// Invalidate state-level district list cache
	if stateID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisSenatorialDistrictsByState, stateID))
	}

	// Invalidate national/all-districts list cache and national metrics
	s.rdb.Del(ctx, db.RedisSenatorialDistrictsAll, db.RedisNationalMetrics)
}

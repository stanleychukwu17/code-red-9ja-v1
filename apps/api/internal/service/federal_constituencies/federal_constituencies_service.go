package federalconstituenciesservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// FederalConstituenciesService provides business logic and caching for federal constituencies.
type FederalConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// NewFederalConstituenciesService creates and returns a new FederalConstituenciesService instance.
func NewFederalConstituenciesService(q *queries.Queries, rdb *redis.Client) *FederalConstituenciesService {
	return &FederalConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

// CreateFederalConstituencyParams defines the attributes required to create a federal constituency.
type CreateFederalConstituencyParams struct {
	Name                   string
	Code                   string
	StateID                int32
	StateName              string
	SenatorialDistrictID   int32
	SenatorialDistrictName string
}

// UpdateFederalConstituencyParams defines the attributes required to update an existing federal constituency.
type UpdateFederalConstituencyParams struct {
	ID                     int32
	Name                   string
	Code                   string
	StateID                int32
	StateName              string
	SenatorialDistrictID   int32
	SenatorialDistrictName string
}

// CreateFederalConstituency creates a new federal constituency record and invalidates the state cache.
func (s *FederalConstituenciesService) CreateFederalConstituency(ctx context.Context, params CreateFederalConstituencyParams) (queries.FederalConstituency, error) {
	arg := queries.CreateFederalConstituencyParams{
		Name:                   params.Name,
		Code:                   utils.PgTextFromString(params.Code),
		StateID:                params.StateID,
		StateName:              params.StateName,
		SenatorialDistrictID:   pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName: utils.PgTextFromString(params.SenatorialDistrictName),
	}

	fc, err := s.queries.CreateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the state, senatorial district, and nationwide lists
	s.invalidateCache(ctx, params.StateID, params.SenatorialDistrictID)

	return fc, nil
}

// GetFederalConstituencyByID retrieves a federal constituency by its ID, utilizing Redis cache when available.
func (s *FederalConstituenciesService) GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachFederalConstituency, id)
	if fc, ok := utils.GetCachedJSON[queries.FederalConstituency](ctx, s.rdb, redisKey); ok && fc.ID > 0 {
		return fc, nil
	}

	fc, err := s.queries.GetFederalConstituencyByID(ctx, id)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, fc, db.RedisOneEightyDaysTTL)

	return fc, nil
}

// UpdateFederalConstituency updates an existing federal constituency and invalidates state caches.
func (s *FederalConstituenciesService) UpdateFederalConstituency(ctx context.Context, params UpdateFederalConstituencyParams) (queries.FederalConstituency, error) {
	// Fetch current to invalidate its cache state, in case stateID or senatorialDistrictID is changed
	current, err := s.queries.GetFederalConstituencyByID(ctx, params.ID)
	if err == nil {
		var oldSenatorialID int32
		if current.SenatorialDistrictID.Valid {
			oldSenatorialID = current.SenatorialDistrictID.Int32
		}
		s.invalidateCache(ctx, current.StateID, oldSenatorialID, params.ID)
	}

	arg := queries.UpdateFederalConstituencyParams{
		ID:                     params.ID,
		Name:                   params.Name,
		Code:                   utils.PgTextFromString(params.Code),
		StateID:                params.StateID,
		StateName:              params.StateName,
		SenatorialDistrictID:   pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName: utils.PgTextFromString(params.SenatorialDistrictName),
	}

	fc, err := s.queries.UpdateFederalConstituency(ctx, arg)
	if err != nil {
		return queries.FederalConstituency{}, err
	}

	// Invalidate cache for the new state, senatorial district, and constituency
	s.invalidateCache(ctx, params.StateID, params.SenatorialDistrictID, params.ID)

	return fc, nil
}

// DeleteFederalConstituency deletes a federal constituency and invalidates relevant caches.
func (s *FederalConstituenciesService) DeleteFederalConstituency(ctx context.Context, id int32) error {
	fc, err := s.queries.GetFederalConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteFederalConstituency(ctx, id)
	if err != nil {
		return err
	}

	var senatorialID int32
	if fc.SenatorialDistrictID.Valid {
		senatorialID = fc.SenatorialDistrictID.Int32
	}

	// Invalidate cache for the state, senatorial district, and constituency
	s.invalidateCache(ctx, fc.StateID, senatorialID, id)

	return nil
}

// GetFederalConstituencies retrieves federal constituencies for a state/senatorial district or nationwide, using Redis cache when available.
func (s *FederalConstituenciesService) GetFederalConstituencies(ctx context.Context, stateID, senatorialDistrictID int32) ([]queries.FederalConstituency, error) {
	// Response shape envelope for caching constituency list
	type Response struct {
		Constituencies []queries.FederalConstituency `json:"constituencies"`
	}

	// Determine cache key based on the most specific filter available
	var redisKey string
	if senatorialDistrictID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisFederalConstituenciesBySenatorial, senatorialDistrictID)
	} else if stateID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisFederalConstituenciesByState, stateID)
	} else {
		redisKey = db.RedisFederalConstituenciesAll
	}

	if payload, ok := utils.GetCachedJSON[Response](ctx, s.rdb, redisKey); ok {
		return payload.Constituencies, nil
	}

	// Cache miss: query PostgreSQL for constituencies matching filter parameters
	arg := queries.GetFederalConstituenciesParams{
		StateID:              stateID,
		SenatorialDistrictID: senatorialDistrictID,
	}
	dbData, err := s.queries.GetFederalConstituencies(ctx, arg)
	if err != nil {
		return nil, err
	}

	// Wrap and cache results in Redis
	payload := Response{
		Constituencies: dbData,
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, payload, db.RedisOneEightyDaysTTL)

	return dbData, nil
}

// invalidateCache clears Redis cache entries for a constituency's state list, senatorial district list, nationwide list, national metrics, and individual constituency cache.
func (s *FederalConstituenciesService) invalidateCache(ctx context.Context, stateID, senatorialDistrictID int32, constituencyIDs ...int32) {
	// Invalidate individual constituency record cache(s) if provided
	for _, id := range constituencyIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachFederalConstituency, id))
		}
	}

	// Invalidate senatorial district list cache
	if senatorialDistrictID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisFederalConstituenciesBySenatorial, senatorialDistrictID))
	}

	// Invalidate state-level constituency list cache
	if stateID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisFederalConstituenciesByState, stateID))
	}

	// Invalidate nationwide list and national metrics cache
	s.rdb.Del(ctx, db.RedisFederalConstituenciesAll, db.RedisNationalMetrics)
}

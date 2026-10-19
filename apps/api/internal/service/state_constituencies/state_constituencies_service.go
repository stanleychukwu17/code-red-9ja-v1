package stateassemblyconstituenciesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// StateConstituenciesService provides business logic and caching for state assembly constituencies.
type StateConstituenciesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// NewStateConstituenciesService creates and returns a new StateConstituenciesService instance.
func NewStateConstituenciesService(q *queries.Queries, rdb *redis.Client) *StateConstituenciesService {
	return &StateConstituenciesService{
		queries: q,
		rdb:     rdb,
	}
}

// CreateStateConstituencyParams defines the attributes required to create a state assembly constituency.
type CreateStateConstituencyParams struct {
	Name                    string
	Code                    string
	LgaID                   int32
	LgaName                 string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// UpdateStateConstituencyParams defines the attributes required to update an existing state assembly constituency.
type UpdateStateConstituencyParams struct {
	ID                      int32
	Name                    string
	Code                    string
	LgaID                   int32
	LgaName                 string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// CreateStateConstituency creates a new state assembly constituency record and invalidates the state cache.
func (s *StateConstituenciesService) CreateStateConstituency(ctx context.Context, params CreateStateConstituencyParams) (queries.StateConstituency, error) {
	arg := queries.CreateStateConstituencyParams{
		Name:                    params.Name,
		Code:                    utils.PgTextFromString(params.Code),
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	sac, err := s.queries.CreateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for the state, federal constituency, nationwide list, and metrics
	s.invalidateCache(ctx, params.StateID, params.FederalConstituencyID)

	return sac, nil
}

// GetStateConstituencyByID retrieves a state assembly constituency by its ID, utilizing Redis cache when available.
func (s *StateConstituenciesService) GetStateConstituencyByID(ctx context.Context, id int32) (queries.StateConstituency, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachStateConstituency, id)
	cached, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var sac queries.StateConstituency
		if json.Unmarshal([]byte(cached), &sac) == nil && sac.ID > 0 {
			return sac, nil
		}
	}

	sac, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	if data, err := json.Marshal(sac); err == nil {
		s.rdb.Set(ctx, redisKey, data, db.RedisOneEightyDaysTTL)
	}

	return sac, nil
}

// UpdateStateConstituency updates an existing state assembly constituency and invalidates state caches.
func (s *StateConstituenciesService) UpdateStateConstituency(ctx context.Context, params UpdateStateConstituencyParams) (queries.StateConstituency, error) {
	// Fetch current to invalidate old state and federal constituency cache in case they changed
	current, err := s.queries.GetStateConstituencyByID(ctx, params.ID)
	if err == nil {
		var oldFedID int32
		if current.FederalConstituencyID.Valid {
			oldFedID = current.FederalConstituencyID.Int32
		}
		s.invalidateCache(ctx, current.StateID, oldFedID, params.ID)
	}

	arg := queries.UpdateStateConstituencyParams{
		ID:                      params.ID,
		Name:                    params.Name,
		Code:                    utils.PgTextFromString(params.Code),
		LgaID:                   params.LgaID,
		LgaName:                 params.LgaName,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	sac, err := s.queries.UpdateStateConstituency(ctx, arg)
	if err != nil {
		return queries.StateConstituency{}, err
	}

	// Invalidate cache for new state, federal constituency, and constituency ID
	s.invalidateCache(ctx, params.StateID, params.FederalConstituencyID, params.ID)

	return sac, nil
}

// DeleteStateConstituency deletes a state assembly constituency and invalidates the state cache.
func (s *StateConstituenciesService) DeleteStateConstituency(ctx context.Context, id int32) error {
	sac, err := s.queries.GetStateConstituencyByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteStateConstituency(ctx, id)
	if err != nil {
		return err
	}

	var fedID int32
	if sac.FederalConstituencyID.Valid {
		fedID = sac.FederalConstituencyID.Int32
	}

	// Invalidate cache for the state, federal constituency, and constituency ID
	s.invalidateCache(ctx, sac.StateID, fedID, id)

	return nil
}

// GetStateConstituencies retrieves state assembly constituencies for a state/federal constituency or nationwide, using Redis cache when available.
func (s *StateConstituenciesService) GetStateConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateConstituency, error) {
	// Response shape envelope for caching constituency list
	type Response struct {
		Constituencies []queries.StateConstituency `json:"constituencies"`
	}

	// Determine cache key based on the most specific filter available
	var redisKey string
	if federalConstituencyID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisStateConstituenciesByFederal, federalConstituencyID)
	} else if stateID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisStateConstituenciesByState, stateID)
	} else {
		redisKey = db.RedisStateConstituenciesAll
	}

	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		// Cache miss: query PostgreSQL for constituencies matching filter parameters
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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

		return dbData, nil
	case nil:
		// Cache hit: deserialize cached JSON directly into constituency slice
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.Constituencies, nil
	default:
		// Return unexpected Redis error
		return nil, err
	}
}

// invalidateCache clears Redis cache entries for a constituency's state list, federal constituency list, nationwide list, national metrics, and individual constituency cache.
func (s *StateConstituenciesService) invalidateCache(ctx context.Context, stateID, federalConstituencyID int32, constituencyIDs ...int32) {
	// Invalidate individual constituency record cache(s) if provided
	for _, id := range constituencyIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachStateConstituency, id))
		}
	}

	// Invalidate federal constituency list cache
	if federalConstituencyID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisStateConstituenciesByFederal, federalConstituencyID))
	}

	// Invalidate state-level constituency list cache
	if stateID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisStateConstituenciesByState, stateID))
	}

	// Invalidate nationwide list and national metrics cache
	s.rdb.Del(ctx, db.RedisStateConstituenciesAll, db.RedisNationalMetrics)
}

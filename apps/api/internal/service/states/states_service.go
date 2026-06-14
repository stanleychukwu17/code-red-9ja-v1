package statesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type StatesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewStatesService(q *queries.Queries, rdb *redis.Client) *StatesService {
	return &StatesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *StatesService) CreateState(ctx context.Context, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error) {
	var latNumeric pgtype.Numeric
	var lngNumeric pgtype.Numeric

	_ = latNumeric.Scan(fmt.Sprintf("%f", latitude))
	_ = lngNumeric.Scan(fmt.Sprintf("%f", longitude))

	arg := queries.CreateStateParams{
		Name:        name,
		CountryID:   countryID,
		CountryCode: countryCode,
		Latitude:    latNumeric,
		Longitude:   lngNumeric,
	}

	state, err := s.queries.CreateState(ctx, arg)
	if err != nil {
		return queries.CState{}, err
	}

	// Invalidate cache
	s.invalidateCache(ctx, countryID, state.ID)

	return state, nil
}

func (s *StatesService) GetStateByID(ctx context.Context, id int16) (queries.CState, error) {
	return s.queries.GetStateDetailsByID(ctx, id)
}

func (s *StatesService) UpdateState(ctx context.Context, id int16, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error) {
	var latNumeric pgtype.Numeric
	var lngNumeric pgtype.Numeric

	_ = latNumeric.Scan(fmt.Sprintf("%f", latitude))
	_ = lngNumeric.Scan(fmt.Sprintf("%f", longitude))

	arg := queries.UpdateStateParams{
		ID:          id,
		Name:        name,
		CountryID:   countryID,
		CountryCode: countryCode,
		Latitude:    latNumeric,
		Longitude:   lngNumeric,
	}

	state, err := s.queries.UpdateState(ctx, arg)
	if err != nil {
		return queries.CState{}, err
	}

	// Invalidate cache
	s.invalidateCache(ctx, countryID, id)

	return state, nil
}

func (s *StatesService) DeleteState(ctx context.Context, id int16) error {
	// Get state details to retrieve countryID for cache invalidation
	state, err := s.queries.GetStateDetailsByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteState(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateCache(ctx, state.CountryID, id)

	return nil
}

func (s *StatesService) GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.GetStatesByCountryIDRow, error) {
	type StatesResponse struct {
		States []queries.GetStatesByCountryIDRow `json:"states"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisStatesByCountry, countryID)
	statesData, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbStates, err := s.queries.GetStatesByCountryID(ctx, countryID)
		if err != nil {
			return nil, err
		}

		payload := StatesResponse{
			States: dbStates,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour)

		return dbStates, nil
	case nil:
		var payload StatesResponse
		err = json.Unmarshal([]byte(statesData), &payload)
		return payload.States, nil
	default:
		return nil, err
	}
}

func (s *StatesService) invalidateCache(ctx context.Context, countryID int16, stateID int16) {
	// Invalidate general list of states by country
	redisKeyList := fmt.Sprintf("%s%d", db.RedisStatesByCountry, countryID)
	s.rdb.Del(ctx, redisKeyList)

	// Invalidate specific state details cache
	redisKeyState := fmt.Sprintf("%s%d", db.RedisEachState, stateID)
	s.rdb.Del(ctx, redisKeyState)
}

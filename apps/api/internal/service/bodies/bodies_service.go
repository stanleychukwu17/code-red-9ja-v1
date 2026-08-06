package bodiesservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/redis/go-redis/v9"
)

type BodiesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewBodiesService(q *queries.Queries, rdb *redis.Client) *BodiesService {
	return &BodiesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *BodiesService) GetOccupations(ctx context.Context) ([]queries.Occupation, error) {
	return s.queries.GetOccupations(ctx)
}

// GetAllCountries retrieves a list of all countries, using a cached version if available.
func (s *BodiesService) GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error) {
	type CountriesResponse struct {
		Countries []queries.ListCountriesRow `json:"countries"`
	}

	countries, err := s.rdb.Get(ctx, db.RedisCountriesAll).Result()
	switch err {
	case redis.Nil:
		dbCountries, err := s.queries.ListCountries(ctx)
		if err != nil {
			return nil, err
		}

		payload := CountriesResponse{
			Countries: dbCountries,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, db.RedisCountriesAll, jsonData, db.RedisFiveYearsTTL) // 5years TTL

		return dbCountries, nil
	case nil:
		var payload CountriesResponse
		err = json.Unmarshal([]byte(countries), &payload)
		return payload.Countries, nil
	default:
		return nil, err
	}
}

// GetStatesByCountryID retrieves a list of states for a given country ID, using a cached version if available.
func (s *BodiesService) GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.CState, error) {
	type StatesResponse struct {
		States []queries.CState `json:"states"`
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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL) // 5years TTL

		return dbStates, nil
	case nil:
		var payload StatesResponse
		err = json.Unmarshal([]byte(statesData), &payload)
		return payload.States, nil
	default:
		return nil, err
	}
}

// GetCitiesByStateID retrieves a list of cities for a given state ID, using a cached version if available.
func (s *BodiesService) GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error) {
	type CitiesResponse struct {
		Cities []queries.GetCitiesByStateIDRow `json:"cities"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisCitiesByState, stateID)
	citiesData, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbCities, err := s.queries.GetCitiesByStateID(ctx, stateID)
		if err != nil {
			return nil, err
		}

		payload := CitiesResponse{
			Cities: dbCities,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL) // 5years TTL

		return dbCities, nil
	case nil:
		var payload CitiesResponse
		err = json.Unmarshal([]byte(citiesData), &payload)
		return payload.Cities, nil
	default:
		return nil, err
	}
}

// GetLGAs retrieves a list of Local Government Areas (LGAs) for a given state ID, using a cached version if available.
func (s *BodiesService) GetLGAs(ctx context.Context, stateID int32) ([]queries.Lga, error) {
	type Response struct {
		LGAs []queries.Lga `json:"lgas"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisLGAsByState, stateID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbData, err := s.queries.GetLGAs(ctx, stateID)
		if err != nil {
			return nil, err
		}

		payload := Response{
			LGAs: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisFiveYearsTTL) // 5years TTL

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.LGAs, nil
	default:
		return nil, err
	}
}

// CreateLGA creates a new Local Government Area and invalidates the state's LGA cache.
func (s *BodiesService) CreateLGA(
	ctx context.Context,
	name string,
	abbreviation string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.Lga, error) {
	arg := queries.CreateLGAParams{
		Name:                    name,
		Abbreviation:            abbreviation,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    senatorialDistrictID,
		SenatorialDistrictName:  senatorialDistrictName,
		FederalConstituencyID:   federalConstituencyID,
		FederalConstituencyName: federalConstituencyName,
	}

	lga, err := s.queries.CreateLGA(ctx, arg)
	if err != nil {
		return queries.Lga{}, err
	}

	s.invalidateCache(ctx, stateID)

	return lga, nil
}

// GetLGAByID retrieves a single Local Government Area by its ID.
func (s *BodiesService) GetLGAByID(ctx context.Context, id int32) (queries.Lga, error) {
	return s.queries.GetLGAByID(ctx, id)
}

// UpdateLGA updates an existing Local Government Area and invalidates relevant caches.
func (s *BodiesService) UpdateLGA(
	ctx context.Context,
	id int32,
	name string,
	abbreviation string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.Lga, error) {
	current, err := s.queries.GetLGAByID(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, current.StateID)
	}

	arg := queries.UpdateLGAParams{
		ID:                      id,
		Name:                    name,
		Abbreviation:            abbreviation,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    senatorialDistrictID,
		SenatorialDistrictName:  senatorialDistrictName,
		FederalConstituencyID:   federalConstituencyID,
		FederalConstituencyName: federalConstituencyName,
	}

	lga, err := s.queries.UpdateLGA(ctx, arg)
	if err != nil {
		return queries.Lga{}, err
	}

	s.invalidateCache(ctx, stateID)

	return lga, nil
}

// DeleteLGA deletes a Local Government Area by its ID and invalidates the state's cache.
func (s *BodiesService) DeleteLGA(ctx context.Context, id int32) error {
	lga, err := s.queries.GetLGAByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeleteLGA(ctx, id)
	if err != nil {
		return err
	}

	s.invalidateCache(ctx, lga.StateID)

	return nil
}

func (s *BodiesService) invalidateCache(ctx context.Context, stateID int32) {
	redisKey := fmt.Sprintf("%s%d", db.RedisLGAsByState, stateID)
	s.rdb.Del(ctx, redisKey)
}

// function: check if the user country is valid
func (s *BodiesService) CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error) {
	redisCountryKey := fmt.Sprintf("%s%d", db.RedisEachCountry, country_id)

	// attempt to get country details from redis
	country_data, err := s.rdb.Get(ctx, redisCountryKey).Result()
	if err == nil {
		var country_dts queries.GetCountryByIDRow
		json.Unmarshal([]byte(country_data), &country_dts)
		if country_dts.ID > 0 {
			return country_dts, nil
		}
	}

	// get country details from db
	country_dts, _ := s.queries.GetCountryByID(ctx, country_id)
	if country_dts.ID > 0 {
		jsonBytes, _ := json.Marshal(country_dts)
		s.rdb.Set(ctx, redisCountryKey, jsonBytes, 0)
		return country_dts, nil
	}

	return queries.GetCountryByIDRow{}, errors.New("invalid country ID")
}

// function: check if the state is valid
func (s *BodiesService) CheckState(ctx context.Context, country_id, state_id int16) (queries.GetStateByIDRow, error) {
	redisStateKey := fmt.Sprintf("%s%d", db.RedisEachState, state_id)

	// get state details from redis
	state_data, err := s.rdb.Get(ctx, redisStateKey).Result()
	if err == nil {
		var state_dts queries.GetStateByIDRow
		json.Unmarshal([]byte(state_data), &state_dts)
		if state_dts.ID > 0 {
			return state_dts, nil
		}
	}

	// get state details from db
	state_dts, _ := s.queries.GetStateByID(ctx, queries.GetStateByIDParams{
		ID:        state_id,
		CountryID: country_id,
	})
	if state_dts.ID > 0 {
		// save to redis
		state_data, _ := json.Marshal(state_dts)
		s.rdb.Set(ctx, redisStateKey, state_data, db.RedisFiveYearsTTL) // expires in 5years

		return state_dts, nil
	}
	return queries.GetStateByIDRow{}, fmt.Errorf("invalid state ID")
}

// function: check if the city is valid
func (s *BodiesService) CheckCity(ctx context.Context, state_id int16, city_id int32) (queries.GetCityByIDRow, error) {
	redisCityKey := fmt.Sprintf("%s%d", db.RedisEachCity, city_id)

	// get city details from redis
	city_data, err := s.rdb.Get(ctx, redisCityKey).Result()
	if err == nil {
		var city_dts queries.GetCityByIDRow
		json.Unmarshal([]byte(city_data), &city_dts)
		if city_dts.ID > 0 {
			return city_dts, nil
		}
	}

	// get city details from db
	city_dts, _ := s.queries.GetCityByID(ctx, queries.GetCityByIDParams{
		ID:      city_id,
		StateID: state_id,
	})
	if city_dts.ID > 0 {
		// save to redis
		city_data, _ := json.Marshal(city_dts)
		s.rdb.Set(ctx, redisCityKey, city_data, db.RedisFiveYearsTTL) // expires in 5years

		return city_dts, nil
	}

	return queries.GetCityByIDRow{}, fmt.Errorf("invalid city ID")
}

// GetLocationNames retrieves the country, state, and city names based on their IDs using caching.
func (s *BodiesService) GetLocationNames(ctx context.Context, countryID, stateID int16, cityID int32) (string, string, string) {
	var countryName, stateName, cityName string

	if countryID > 0 {
		if countryData, err := s.CheckCountry(ctx, countryID); err == nil {
			countryName = countryData.Name
		}
	}

	if countryID > 0 && stateID > 0 {
		if stateData, err := s.CheckState(ctx, countryID, stateID); err == nil {
			stateName = stateData.Name
		}
	}

	if stateID > 0 && cityID > 0 {
		if cityData, err := s.CheckCity(ctx, stateID, cityID); err == nil {
			cityName = cityData.Name
		}
	}

	return countryName, stateName, cityName
}

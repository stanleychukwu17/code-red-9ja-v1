package bodiesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

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
		s.rdb.Set(ctx, db.RedisCountriesAll, jsonData, 5*365*24*time.Hour)

		return dbCountries, nil
	case nil:
		var payload CountriesResponse
		err = json.Unmarshal([]byte(countries), &payload)
		return payload.Countries, nil
	default:
		return nil, err
	}
}

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
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour)

		return dbCities, nil
	case nil:
		var payload CitiesResponse
		err = json.Unmarshal([]byte(citiesData), &payload)
		return payload.Cities, nil
	default:
		return nil, err
	}
}

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
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.LGAs, nil
	default:
		return nil, err
	}
}

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

func (s *BodiesService) GetLGAByID(ctx context.Context, id int32) (queries.Lga, error) {
	return s.queries.GetLGAByID(ctx, id)
}

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


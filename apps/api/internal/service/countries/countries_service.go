package countriesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/redis/go-redis/v9"
)

type CountryService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewCountryService(q *queries.Queries, rdb *redis.Client) *CountryService {
	return &CountryService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *CountryService) GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error) {
	//type for response
	type CountriesResponse struct {
		Countries []queries.ListCountriesRow `json:"countries"`
	}

	//check if in redis
	countries, err := s.rdb.Get(ctx, db.RedisCountriesAll).Result()

	//not in redis, get from db
	switch err {
	case redis.Nil:
		//get from db
		dbCountries, _ := s.queries.ListCountries(ctx)

		//wrap in response struct
		payload := CountriesResponse{
			Countries: dbCountries,
		}

		//convert to json
		jsonData, _ := json.Marshal(payload)

		//set in redis
		s.rdb.Set(ctx, db.RedisCountriesAll, jsonData, 5*365*24*time.Hour) // expires in 5years

		return dbCountries, nil
	case nil:
		//unmarshall from redis
		var payload CountriesResponse
		err = json.Unmarshal([]byte(countries), &payload)
		return payload.Countries, nil
	default:
		return nil, err
	}
}

func (s *CountryService) GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.GetStatesByCountryIDRow, error) {
	//type for response
	type StatesResponse struct {
		States []queries.GetStatesByCountryIDRow `json:"states"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisStatesByCountry, countryID)

	//check if in redis
	statesData, err := s.rdb.Get(ctx, redisKey).Result()

	//not in redis, get from db
	switch err {
	case redis.Nil:
		//get from db
		dbStates, err := s.queries.GetStatesByCountryID(ctx, countryID)
		if err != nil {
			return nil, err
		}

		//wrap in response struct
		payload := StatesResponse{
			States: dbStates,
		}

		//convert to json
		jsonData, _ := json.Marshal(payload)

		//set in redis
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour) // expires in 5years

		return dbStates, nil
	case nil:
		//unmarshall from redis
		var payload StatesResponse
		err = json.Unmarshal([]byte(statesData), &payload)
		return payload.States, nil
	default:
		return nil, err
	}
}

func (s *CountryService) GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error) {
	//type for response
	type CitiesResponse struct {
		Cities []queries.GetCitiesByStateIDRow `json:"cities"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisCitiesByState, stateID)

	//check if in redis
	citiesData, err := s.rdb.Get(ctx, redisKey).Result()

	//not in redis, get from db
	switch err {
	case redis.Nil:
		//get from db
		dbCities, err := s.queries.GetCitiesByStateID(ctx, stateID)
		if err != nil {
			return nil, err
		}

		//wrap in response struct
		payload := CitiesResponse{
			Cities: dbCities,
		}

		//convert to json
		jsonData, _ := json.Marshal(payload)

		//set in redis
		s.rdb.Set(ctx, redisKey, jsonData, 5*365*24*time.Hour) // expires in 5years

		return dbCities, nil
	case nil:
		//unmarshall from redis
		var payload CitiesResponse
		err = json.Unmarshal([]byte(citiesData), &payload)
		return payload.Cities, nil
	default:
		return nil, err
	}
}

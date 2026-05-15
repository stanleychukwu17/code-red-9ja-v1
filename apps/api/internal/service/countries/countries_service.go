package countriesservice

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"

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
	countries, err := s.rdb.Get(ctx, "countries:all").Result()

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
		s.rdb.Set(ctx, "countries:all", jsonData, 0)

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

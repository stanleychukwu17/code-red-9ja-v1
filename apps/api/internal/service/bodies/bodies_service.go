package bodiesservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type PartiesService interface {
	GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error)
}

type BodiesService struct {
	queries        *queries.Queries
	rdb            *redis.Client
	partiesService PartiesService
}

func NewBodiesService(q *queries.Queries, rdb *redis.Client) *BodiesService {
	return &BodiesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *BodiesService) SetPartiesService(partiesService PartiesService) {
	s.partiesService = partiesService
}

// PartyHierarchySelection identifies a selected party chapter.
type PartyHierarchySelection struct {
	PartyID     int64  `json:"partyId"`
	ChapterType string `json:"chapterType"`
	ChapterID   *int32 `json:"chapterId"`
}

// PartyHierarchyResult contains each body ID and its party chapter ID.
type PartyHierarchyResult struct {
	Ward struct {
		WardID    int32 `json:"wardID"`
		ChapterID int32 `json:"chapterID"`
	} `json:"ward"`
	Lga struct {
		LgaID     int32 `json:"lgaID"`
		ChapterID int32 `json:"chapterID"`
	} `json:"lga"`
	State struct {
		StateID   int16 `json:"stateID"`
		ChapterID int32 `json:"chapterID"`
	} `json:"state"`
	National struct {
		NationalID int16 `json:"nationalID"`
		ChapterID  int32 `json:"chapterID"`
	} `json:"national"`
}

// CompletePartyHierarchySelections resolves body IDs from the most specific selection.
func (s *BodiesService) CompletePartyHierarchySelections(ctx context.Context, partyID int64, selections []PartyHierarchySelection) (PartyHierarchyResult, error) {
	var hasWard, hasLGA, hasState, hasNational bool
	var wardID, lgaID int32
	var stateID, nationalID int16

	// Check which chapter types have selected IDs.
	for _, sel := range selections {
		if sel.ChapterID == nil || *sel.ChapterID <= 0 {
			continue
		}
		switch sel.ChapterType {
		case "ward":
			hasWard, wardID = true, *sel.ChapterID
		case "lga":
			hasLGA, lgaID = true, *sel.ChapterID
		case "state":
			hasState, stateID = true, int16(*sel.ChapterID)
		case "national":
			hasNational, nationalID = true, int16(*sel.ChapterID)
		}
	}

	result := PartyHierarchyResult{}
	if hasWard {
		ward, err := s.CheckWard(ctx, wardID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
		result.Ward.WardID, result.Lga.LgaID, result.State.StateID = ward.ID, ward.LgaID, int16(ward.StateID)

		stateDetails, err := s.CheckStateByID(ctx, result.State.StateID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}

		result.National.NationalID = int16(stateDetails.CountryID)
	} else if hasLGA {
		lga, err := s.CheckLGA(ctx, lgaID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
		result.Lga.LgaID, result.State.StateID = lga.ID, int16(lga.StateID)

		stateDetails, err := s.CheckStateByID(ctx, result.State.StateID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}

		result.National.NationalID = int16(stateDetails.CountryID)
	} else if hasState {
		result.State.StateID = stateID

		stateDetails, err := s.CheckStateByID(ctx, result.State.StateID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}

		result.National.NationalID = int16(stateDetails.CountryID)
	} else if hasNational {
		countryDts, err := s.CheckCountry(ctx, nationalID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}

		result.National.NationalID = int16(countryDts.ID)
	}

	// Only Nigeria (country ID 161) is supported at this time.
	if result.National.NationalID == 0 {
		return PartyHierarchyResult{}, fmt.Errorf("a national/country ID is required")
	}
	if result.National.NationalID != 161 {
		return PartyHierarchyResult{}, errors.New("only Nigerian chapters are supported at this time")
	}

	// Fetch party chapter IDs after resolving the body hierarchy.
	var err error
	if result.Ward.WardID > 0 {
		result.Ward.ChapterID, err = s.partiesService.GetOrCreateWardChapter(ctx, int16(partyID), result.Ward.WardID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
	}
	if result.Lga.LgaID > 0 {
		result.Lga.ChapterID, err = s.partiesService.GetOrCreateLGAChapter(ctx, int16(partyID), result.Lga.LgaID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
	}
	if result.State.StateID > 0 {
		result.State.ChapterID, err = s.partiesService.GetOrCreateStateChapter(ctx, int16(partyID), result.State.StateID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
	}
	if result.National.NationalID > 0 {
		result.National.ChapterID, err = s.partiesService.GetOrCreateNationalChapter(ctx, int16(partyID), result.National.NationalID)
		if err != nil {
			return PartyHierarchyResult{}, err
		}
	}

	return result, nil

}

func (s *BodiesService) GetOccupations(ctx context.Context) ([]queries.Occupation, error) {
	return s.queries.GetOccupations(ctx)
}

// GetNationalMetrics retrieves aggregated metrics for electoral bodies nationwide, using a cached version if available.
func (s *BodiesService) GetNationalMetrics(ctx context.Context) (queries.NationalMetric, error) {
	val, err := s.rdb.Get(ctx, db.RedisNationalMetrics).Result()
	if err == nil {
		var metrics queries.NationalMetric
		if err := json.Unmarshal([]byte(val), &metrics); err == nil {
			return metrics, nil
		}
	}

	metrics, err := s.queries.GetNationalMetrics(ctx)
	if err != nil {
		return queries.NationalMetric{}, err
	}

	if jsonData, err := json.Marshal(metrics); err == nil {
		s.rdb.Set(ctx, db.RedisNationalMetrics, jsonData, db.RedisOneEightyDaysTTL)
	}

	return metrics, nil
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
		s.rdb.Set(ctx, db.RedisCountriesAll, jsonData, db.RedisOneYearTTL)

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
		// Nigeria (161) states are extremely stable; all other countries expire sooner
		stateTTL := db.RedisSevenDaysTTL
		if countryID == 161 {
			stateTTL = db.RedisOneEightyDaysTTL
		}
		s.rdb.Set(ctx, redisKey, jsonData, stateTTL)

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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

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
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisOneEightyDaysTTL)

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
	code string,
	stateID int32,
	stateName string,
	senatorialDistrictID int32,
	senatorialDistrictName string,
	federalConstituencyID int32,
	federalConstituencyName string,
) (queries.Lga, error) {
	arg := queries.CreateLGAParams{
		Name:                    name,
		Code:                    code,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: senatorialDistrictID, Valid: senatorialDistrictID != 0},
		SenatorialDistrictName:  pgtype.Text{String: senatorialDistrictName, Valid: senatorialDistrictName != ""},
		FederalConstituencyID:   pgtype.Int4{Int32: federalConstituencyID, Valid: federalConstituencyID != 0},
		FederalConstituencyName: pgtype.Text{String: federalConstituencyName, Valid: federalConstituencyName != ""},
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
	code string,
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
		Code:                    code,
		StateID:                 stateID,
		StateName:               stateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: senatorialDistrictID, Valid: senatorialDistrictID != 0},
		SenatorialDistrictName:  pgtype.Text{String: senatorialDistrictName, Valid: senatorialDistrictName != ""},
		FederalConstituencyID:   pgtype.Int4{Int32: federalConstituencyID, Valid: federalConstituencyID != 0},
		FederalConstituencyName: pgtype.Text{String: federalConstituencyName, Valid: federalConstituencyName != ""},
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
	s.rdb.Del(ctx, db.RedisNationalMetrics)
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
		s.rdb.Set(ctx, redisCountryKey, jsonBytes, db.RedisOneYearTTL)
		return country_dts, nil
	}

	return queries.GetCountryByIDRow{}, errors.New("invalid country ID")
}

// CheckState checks if the state is valid and belongs to the given country (if country_id > 0).
func (s *BodiesService) CheckState(ctx context.Context, country_id, state_id int16) (queries.CState, error) {
	state, err := s.CheckStateByID(ctx, state_id)
	if err != nil {
		return queries.CState{}, err
	}

	if country_id > 0 && state.CountryID != country_id {
		return queries.CState{}, fmt.Errorf("state does not belong to specified country")
	}

	return state, nil
}

// CheckCity checks if the city is valid and belongs to state_id (if state_id > 0)
func (s *BodiesService) CheckCity(ctx context.Context, state_id int16, city_id int32) (queries.GetCityByIDRow, error) {
	redisCityKey := fmt.Sprintf("%s%d", db.RedisEachCity, city_id)
	var city_dts queries.GetCityByIDRow

	// 1. Try fetching city details from Redis cache
	city_data, err := s.rdb.Get(ctx, redisCityKey).Result()
	if err == nil {
		if json.Unmarshal([]byte(city_data), &city_dts) == nil && city_dts.ID > 0 {

			// Validate that the cached city belongs to the requested state
			if state_id > 0 && city_dts.StateID != state_id {
				return queries.GetCityByIDRow{}, fmt.Errorf("city does not belong to specified state")
			}

			return city_dts, nil
		}
	}

	// 2. Fetch city details from the database on cache miss
	city_dts, err = s.queries.GetCityByID(ctx, city_id)
	if err == nil && city_dts.ID > 0 {
		// Populate Redis cache for future queries
		if data, err := json.Marshal(city_dts); err == nil {
			s.rdb.Set(ctx, redisCityKey, data, db.RedisOneEightyDaysTTL)
		}

		// Validate state association
		if state_id > 0 && city_dts.StateID != state_id {
			return queries.GetCityByIDRow{}, fmt.Errorf("city does not belong to specified state")
		}

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

// CheckZone checks if a geopolitical zone ID is valid (cached in Redis).
func (s *BodiesService) CheckZone(ctx context.Context, zoneID int16) (queries.CZonesNigerium, error) {
	redisZoneKey := fmt.Sprintf("%s%d", db.RedisEachZone, zoneID)

	zoneData, err := s.rdb.Get(ctx, redisZoneKey).Result()
	if err == nil {
		var zone queries.CZonesNigerium
		if json.Unmarshal([]byte(zoneData), &zone) == nil && zone.ID > 0 {
			return zone, nil
		}
	}

	zones, err := s.queries.ListZones(ctx)
	if err != nil {
		return queries.CZonesNigerium{}, fmt.Errorf("failed to fetch zones: %w", err)
	}

	for _, z := range zones {
		if z.ID == zoneID {
			if data, err := json.Marshal(z); err == nil {
				s.rdb.Set(ctx, redisZoneKey, data, db.RedisOneYearTTL)
			}
			return z, nil
		}
	}

	return queries.CZonesNigerium{}, errors.New("invalid zone ID")
}

// CheckStateByID checks if a state is valid by ID alone (cached in Redis).
func (s *BodiesService) CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error) {
	redisStateKey := fmt.Sprintf("%s%d", db.RedisEachState, stateID)

	stateData, err := s.rdb.Get(ctx, redisStateKey).Result()
	if err == nil {
		var state queries.CState
		if json.Unmarshal([]byte(stateData), &state) == nil && state.ID > 0 {
			return state, nil
		}
	}

	state, err := s.queries.GetStateDetailsByID(ctx, stateID)
	if err != nil {
		return queries.CState{}, fmt.Errorf("invalid state ID: %w", err)
	}

	if data, err := json.Marshal(state); err == nil {
		s.rdb.Set(ctx, redisStateKey, data, db.RedisOneEightyDaysTTL)
	}

	return state, nil
}

// CheckLGA checks if a Local Government Area ID is valid (cached in Redis).
func (s *BodiesService) CheckLGA(ctx context.Context, lgaID int32) (queries.Lga, error) {
	redisLGAKey := fmt.Sprintf("%s%d", db.RedisEachLGA, lgaID)

	lgaData, err := s.rdb.Get(ctx, redisLGAKey).Result()
	if err == nil {
		var lga queries.Lga
		if json.Unmarshal([]byte(lgaData), &lga) == nil && lga.ID > 0 {
			return lga, nil
		}
	}

	lga, err := s.queries.GetLGAByID(ctx, lgaID)
	if err != nil {
		return queries.Lga{}, fmt.Errorf("invalid LGA ID: %w", err)
	}

	if data, err := json.Marshal(lga); err == nil {
		s.rdb.Set(ctx, redisLGAKey, data, db.RedisOneEightyDaysTTL)
	}

	return lga, nil
}

// CheckWard checks if a Ward ID is valid (cached in Redis).
func (s *BodiesService) CheckWard(ctx context.Context, wardID int32) (queries.Ward, error) {
	redisWardKey := fmt.Sprintf("%s%d", db.RedisEachWard, wardID)

	wardData, err := s.rdb.Get(ctx, redisWardKey).Result()
	if err == nil {
		var ward queries.Ward
		if json.Unmarshal([]byte(wardData), &ward) == nil && ward.ID > 0 {
			return ward, nil
		}
	}

	ward, err := s.queries.GetWardByID(ctx, wardID)
	if err != nil {
		return queries.Ward{}, fmt.Errorf("invalid ward ID: %w", err)
	}

	if data, err := json.Marshal(ward); err == nil {
		s.rdb.Set(ctx, redisWardKey, data, db.RedisOneEightyDaysTTL)
	}

	return ward, nil
}

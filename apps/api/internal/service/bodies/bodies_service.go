package bodiesservice

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type PartiesService interface {
	GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error)
	GetPartyChapterByID(ctx context.Context, chapterID int32) (queries.PartyChapter, error)
}

type BodiesService struct {
	queries        *queries.Queries
	pool           *pgxpool.Pool
	rdb            *redis.Client
	partiesService PartiesService
}

func NewBodiesService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *BodiesService {
	return &BodiesService{
		queries: q,
		pool:    pool,
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
		rawID := *sel.ChapterID
		switch sel.ChapterType {
		case "ward":
			hasWard = true
			wardID = rawID
			if ch, err := s.partiesService.GetPartyChapterByID(ctx, rawID); err == nil && ch.ID > 0 && ch.ChapterType == "ward" && ch.WardID.Valid {
				wardID = ch.WardID.Int32
			}
		case "lga":
			hasLGA = true
			lgaID = rawID
			if ch, err := s.partiesService.GetPartyChapterByID(ctx, rawID); err == nil && ch.ID > 0 && ch.ChapterType == "lga" && ch.LgaID.Valid {
				lgaID = ch.LgaID.Int32
			}
		case "state":
			hasState = true
			stateID = int16(rawID)
			if ch, err := s.partiesService.GetPartyChapterByID(ctx, rawID); err == nil && ch.ID > 0 && ch.ChapterType == "state" && ch.StateID.Valid {
				stateID = ch.StateID.Int16
			}
		case "national":
			hasNational = true
			nationalID = int16(rawID)
			if ch, err := s.partiesService.GetPartyChapterByID(ctx, rawID); err == nil && ch.ID > 0 && ch.ChapterType == "national" && ch.CountryID.Valid {
				nationalID = ch.CountryID.Int16
			}
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
	if result.National.NationalID != constants.NigeriaCountryID {
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
		result.National.ChapterID, err = s.partiesService.GetOrCreateNationalChapter(ctx, int16(partyID), constants.NigeriaCountryID)
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
	if metrics, ok := utils.GetCachedJSON[queries.NationalMetric](ctx, s.rdb, db.RedisNationalMetrics); ok {
		return metrics, nil
	}

	metrics, err := s.queries.GetNationalMetrics(ctx)
	if err != nil {
		return queries.NationalMetric{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, db.RedisNationalMetrics, metrics, db.RedisOneEightyDaysTTL)

	return metrics, nil
}

// GetAllCountries retrieves a list of all countries, using a cached version if available.
func (s *BodiesService) GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error) {
	type CountriesResponse struct {
		Countries []queries.ListCountriesRow `json:"countries"`
	}

	if payload, ok := utils.GetCachedJSON[CountriesResponse](ctx, s.rdb, db.RedisCountriesAll); ok {
		return payload.Countries, nil
	}

	dbCountries, err := s.queries.ListCountries(ctx)
	if err != nil {
		return nil, err
	}

	payload := CountriesResponse{
		Countries: dbCountries,
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, db.RedisCountriesAll, payload, db.RedisOneYearTTL)

	return dbCountries, nil
}

// GetStatesByCountryID retrieves a list of states for a given country ID, using a cached version if available.
func (s *BodiesService) GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.CState, error) {
	type StatesResponse struct {
		States []queries.CState `json:"states"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisStatesByCountry, countryID)
	if payload, ok := utils.GetCachedJSON[StatesResponse](ctx, s.rdb, redisKey); ok {
		return payload.States, nil
	}

	dbStates, err := s.queries.GetStatesByCountryID(ctx, countryID)
	if err != nil {
		return nil, err
	}

	payload := StatesResponse{
		States: dbStates,
	}

	// Nigeria states are extremely stable; all other countries expire sooner
	stateTTL := db.RedisSevenDaysTTL
	if countryID == constants.NigeriaCountryID {
		stateTTL = db.RedisOneEightyDaysTTL
	}
	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, payload, stateTTL)

	return dbStates, nil
}

// GetCitiesByStateID retrieves a list of cities for a given state ID, using a cached version if available.
func (s *BodiesService) GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error) {
	type CitiesResponse struct {
		Cities []queries.GetCitiesByStateIDRow `json:"cities"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisCitiesByState, stateID)
	if payload, ok := utils.GetCachedJSON[CitiesResponse](ctx, s.rdb, redisKey); ok {
		return payload.Cities, nil
	}

	dbCities, err := s.queries.GetCitiesByStateID(ctx, stateID)
	if err != nil {
		return nil, err
	}

	payload := CitiesResponse{
		Cities: dbCities,
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, payload, db.RedisOneEightyDaysTTL)

	return dbCities, nil
}

// GetLGAs retrieves a list of Local Government Areas (LGAs) for a given state ID or nationwide, using Redis cache when available.
func (s *BodiesService) GetLGAs(ctx context.Context, stateID int32) ([]queries.Lga, error) {
	type Response struct {
		LGAs []queries.Lga `json:"lgas"`
	}

	var redisKey string
	if stateID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisLGAsByState, stateID)
	} else {
		redisKey = db.RedisLGAsAll
	}

	if payload, ok := utils.GetCachedJSON[Response](ctx, s.rdb, redisKey); ok {
		return payload.LGAs, nil
	}

	dbData, err := s.queries.GetLGAs(ctx, stateID)
	if err != nil {
		return nil, err
	}

	payload := Response{
		LGAs: dbData,
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, payload, db.RedisOneEightyDaysTTL)

	return dbData, nil
}

// CreateLGAParams defines the attributes required to create a Local Government Area.
type CreateLGAParams struct {
	Name                    string
	Code                    string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// UpdateLGAParams defines the attributes required to update an existing Local Government Area.
type UpdateLGAParams struct {
	ID                      int32
	Name                    string
	Code                    string
	StateID                 int32
	StateName               string
	SenatorialDistrictID    int32
	SenatorialDistrictName  string
	FederalConstituencyID   int32
	FederalConstituencyName string
}

// CreateLGA creates a new Local Government Area and invalidates the state's LGA cache.
func (s *BodiesService) CreateLGA(ctx context.Context, params CreateLGAParams) (queries.Lga, error) {
	arg := queries.CreateLGAParams{
		Name:                    params.Name,
		Code:                    params.Code,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	lga, err := s.queries.CreateLGA(ctx, arg)
	if err != nil {
		return queries.Lga{}, err
	}

	s.invalidateCache(ctx, params.StateID, lga.ID)

	return lga, nil
}

// GetLGAByID retrieves a single Local Government Area by its ID, utilizing Redis cache when available.
func (s *BodiesService) GetLGAByID(ctx context.Context, id int32) (queries.Lga, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachLGA, id)
	if lga, ok := utils.GetCachedJSON[queries.Lga](ctx, s.rdb, redisKey); ok && lga.ID > 0 {
		return lga, nil
	}

	lga, err := s.queries.GetLGAByID(ctx, id)
	if err != nil {
		return queries.Lga{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisKey, lga, db.RedisOneEightyDaysTTL)

	return lga, nil
}

// UpdateLGA updates an existing Local Government Area and invalidates relevant caches.
func (s *BodiesService) UpdateLGA(ctx context.Context, params UpdateLGAParams) (queries.Lga, error) {
	current, err := s.queries.GetLGAByID(ctx, params.ID)
	if err == nil {
		s.invalidateCache(ctx, current.StateID, params.ID)
	}

	arg := queries.UpdateLGAParams{
		ID:                      params.ID,
		Name:                    params.Name,
		Code:                    params.Code,
		StateID:                 params.StateID,
		StateName:               params.StateName,
		SenatorialDistrictID:    pgtype.Int4{Int32: params.SenatorialDistrictID, Valid: params.SenatorialDistrictID != 0},
		SenatorialDistrictName:  utils.PgTextFromString(params.SenatorialDistrictName),
		FederalConstituencyID:   pgtype.Int4{Int32: params.FederalConstituencyID, Valid: params.FederalConstituencyID != 0},
		FederalConstituencyName: utils.PgTextFromString(params.FederalConstituencyName),
	}

	lga, err := s.queries.UpdateLGA(ctx, arg)
	if err != nil {
		return queries.Lga{}, err
	}

	s.invalidateCache(ctx, params.StateID, params.ID)

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

	s.invalidateCache(ctx, lga.StateID, id)

	return nil
}

// invalidateCache clears Redis cache entries for a state's LGAs, the nationwide all-LGAs cache, national metrics, and individual LGA cache.
func (s *BodiesService) invalidateCache(ctx context.Context, stateID int32, lgaIDs ...int32) {
	// Invalidate individual LGA record cache(s) if provided
	for _, id := range lgaIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachLGA, id))
		}
	}

	// Invalidate state-level LGA list cache
	if stateID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisLGAsByState, stateID))
	}

	// Invalidate nationwide/all-LGAs list cache and national metrics
	s.rdb.Del(ctx, db.RedisLGAsAll, db.RedisNationalMetrics)
}

// function: check if the user country is valid
func (s *BodiesService) CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error) {
	redisCountryKey := fmt.Sprintf("%s%d", db.RedisEachCountry, country_id)

	// attempt to get country details from redis
	if country_dts, ok := utils.GetCachedJSON[queries.GetCountryByIDRow](ctx, s.rdb, redisCountryKey); ok && country_dts.ID > 0 {
		return country_dts, nil
	}

	// get country details from db
	country_dts, _ := s.queries.GetCountryByID(ctx, country_id)
	if country_dts.ID > 0 {
		_ = utils.SetCachedJSON(ctx, s.rdb, redisCountryKey, country_dts, db.RedisOneYearTTL)
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

	// Try fetching city details from Redis cache
	if city_dts, ok := utils.GetCachedJSON[queries.GetCityByIDRow](ctx, s.rdb, redisCityKey); ok && city_dts.ID > 0 {
		// Validate that the cached city belongs to the requested state
		if state_id > 0 && city_dts.StateID != state_id {
			return queries.GetCityByIDRow{}, fmt.Errorf("city does not belong to specified state")
		}

		return city_dts, nil
	}

	// Fetch city details from the database on cache miss
	city_dts, err := s.queries.GetCityByID(ctx, city_id)
	if err == nil && city_dts.ID > 0 {
		// Populate Redis cache for future queries
		_ = utils.SetCachedJSON(ctx, s.rdb, redisCityKey, city_dts, db.RedisOneEightyDaysTTL)

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

	if zone, ok := utils.GetCachedJSON[queries.CZonesNigerium](ctx, s.rdb, redisZoneKey); ok && zone.ID > 0 {
		return zone, nil
	}

	zones, err := s.queries.ListZones(ctx)
	if err != nil {
		return queries.CZonesNigerium{}, fmt.Errorf("failed to fetch zones: %w", err)
	}

	for _, z := range zones {
		if z.ID == zoneID {
			_ = utils.SetCachedJSON(ctx, s.rdb, redisZoneKey, z, db.RedisOneYearTTL)
			return z, nil
		}
	}

	return queries.CZonesNigerium{}, errors.New("invalid zone ID")
}

// CheckStateByID checks if a state is valid by ID alone (cached in Redis).
func (s *BodiesService) CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error) {
	redisStateKey := fmt.Sprintf("%s%d", db.RedisEachState, stateID)

	if state, ok := utils.GetCachedJSON[queries.CState](ctx, s.rdb, redisStateKey); ok && state.ID > 0 {
		return state, nil
	}

	state, err := s.queries.GetStateDetailsByID(ctx, stateID)
	if err != nil {
		return queries.CState{}, fmt.Errorf("invalid state ID: %w", err)
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisStateKey, state, db.RedisOneEightyDaysTTL)

	return state, nil
}

// CheckLGA checks if a Local Government Area ID is valid (cached in Redis).
func (s *BodiesService) CheckLGA(ctx context.Context, lgaID int32) (queries.Lga, error) {
	redisLGAKey := fmt.Sprintf("%s%d", db.RedisEachLGA, lgaID)

	if lga, ok := utils.GetCachedJSON[queries.Lga](ctx, s.rdb, redisLGAKey); ok && lga.ID > 0 {
		return lga, nil
	}

	lga, err := s.queries.GetLGAByID(ctx, lgaID)
	if err != nil {
		return queries.Lga{}, fmt.Errorf("invalid LGA ID: %w", err)
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisLGAKey, lga, db.RedisOneEightyDaysTTL)

	return lga, nil
}

// CheckWard checks if a Ward ID is valid (cached in Redis).
func (s *BodiesService) CheckWard(ctx context.Context, wardID int32) (queries.Ward, error) {
	redisWardKey := fmt.Sprintf("%s%d", db.RedisEachWard, wardID)

	if ward, ok := utils.GetCachedJSON[queries.Ward](ctx, s.rdb, redisWardKey); ok && ward.ID > 0 {
		return ward, nil
	}

	ward, err := s.queries.GetWardByID(ctx, wardID)
	if err != nil {
		return queries.Ward{}, fmt.Errorf("invalid ward ID: %w", err)
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, redisWardKey, ward, db.RedisOneEightyDaysTTL)

	return ward, nil
}

// InvalidateAllBodiesCache invalidates national metrics, Nigeria states list,
// and scans and removes any cached electoral body lists (senatorial districts, LGAs, wards, constituencies).
func (s *BodiesService) InvalidateAllBodiesCache(ctx context.Context) {
	// 1. Delete high-level aggregate keys directly:
	// - Nigeria states cache (countries:states:161) so admin lists and state-level dropdowns fetch fresh metrics.
	// - National metrics cache (bodies:national_metrics) so dashboard summary cards update immediately.
	nigeriaStatesKey := fmt.Sprintf("%s%d", db.RedisStatesByCountry, constants.NigeriaCountryID)
	s.rdb.Del(ctx, db.RedisNationalMetrics, nigeriaStatesKey)

	// 2. Non-blocking SCAN for sub-electoral bodies:
	// Use SCAN with a non-blocking cursor instead of KEYS to avoid blocking the Redis server in production.
	// We scan in batches of 500 for keys matching "bodies:*" (senatorial districts, constituencies, LGAs, wards, PUs).
	var bodyKeys []string
	iter := s.rdb.Scan(ctx, 0, "bodies:*", 500).Iterator()
	for iter.Next(ctx) {
		bodyKeys = append(bodyKeys, iter.Val())
	}

	// 3. Batch delete all discovered body cache keys in a single command
	if len(bodyKeys) > 0 {
		s.rdb.Del(ctx, bodyKeys...)
	}
}

// RecalculateBodyMetrics runs bottom-up recalculation across all administrative levels
// in a single atomic database transaction and invalidates all corresponding Redis caches.
func (s *BodiesService) RecalculateBodyMetrics(ctx context.Context) error {
	// 1. Begin atomic database transaction:
	// If any recalculation query fails, rollback ensures we don't leave the database in an inconsistent state.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx) // Safe: becomes a no-op once tx.Commit() succeeds

	// Bind sqlc generated queries to the active transaction
	qtx := s.queries.WithTx(tx)

	// 2. Execute bottom-up recalculation:
	// We aggregate hierarchically from the smallest electoral unit (polling units) up to national totals.

	// Step 2a: Count polling units assigned to each ward
	if err := qtx.RecalculateWardMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate ward metrics: %w", err)
	}

	// Step 2b: Count wards and polling units for each state assembly constituency
	if err := qtx.RecalculateStateConstituencyMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate state constituency metrics: %w", err)
	}

	// Step 2c: Count constituencies, wards, and polling units for each LGA
	if err := qtx.RecalculateLGAMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate LGA metrics: %w", err)
	}

	// Step 2d: Count LGAs, constituencies, wards, and polling units for each federal constituency
	if err := qtx.RecalculateFederalConstituencyMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate federal constituency metrics: %w", err)
	}

	// Step 2e: Count federal constituencies, LGAs, wards, and polling units for each senatorial district
	if err := qtx.RecalculateSenatorialDistrictMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate senatorial district metrics: %w", err)
	}

	// Step 2f: Aggregate senatorial districts, federal/state constituencies, LGAs, wards, and PUs for each state
	if err := qtx.RecalculateStateMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate state metrics: %w", err)
	}

	// Step 2g: Aggregate country-wide totals into the national_metrics table
	if err := qtx.RecalculateNationalMetrics(ctx); err != nil {
		return fmt.Errorf("failed to recalculate national metrics: %w", err)
	}

	// 3. Commit the transaction to persist all recalculated counts atomically
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit metrics recalculation: %w", err)
	}

	// 4. Invalidate all Redis caches across all electoral levels so readers fetch fresh metrics
	s.InvalidateAllBodiesCache(ctx)
	return nil
}

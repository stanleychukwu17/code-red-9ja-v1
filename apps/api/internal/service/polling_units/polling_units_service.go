package pollingunitsservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/redis/go-redis/v9"
)

type PollingUnitsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewPollingUnitsService(q *queries.Queries, rdb *redis.Client) *PollingUnitsService {
	return &PollingUnitsService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *PollingUnitsService) CreatePollingUnit(ctx context.Context, arg queries.CreatePollingUnitParams) (queries.PollingUnit, error) {
	pu, err := s.queries.CreatePollingUnit(ctx, arg)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	// Invalidate cache for the Ward
	s.invalidateCache(ctx, arg.WardID)

	return pu, nil
}

// GetPollingUnitByID retrieves a single polling unit by its ID, utilizing Redis cache when available.
func (s *PollingUnitsService) GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisEachPollingUnit, id)
	cached, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var pu queries.PollingUnit
		if json.Unmarshal([]byte(cached), &pu) == nil && pu.ID > 0 {
			return pu, nil
		}
	}

	pu, err := s.queries.GetPollingUnitByID(ctx, id)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	if data, err := json.Marshal(pu); err == nil {
		s.rdb.Set(ctx, redisKey, data, db.RedisSixtyDaysTTL)
	}

	return pu, nil
}

// UpdatePollingUnit updates an existing polling unit and invalidates relevant caches.
func (s *PollingUnitsService) UpdatePollingUnit(ctx context.Context, arg queries.UpdatePollingUnitParams) (queries.PollingUnit, error) {
	// Fetch current to invalidate old Ward cache in case wardID changed
	current, err := s.queries.GetPollingUnitByID(ctx, arg.ID)
	if err == nil {
		s.invalidateCache(ctx, current.WardID, arg.ID)
	}

	pu, err := s.queries.UpdatePollingUnit(ctx, arg)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	// Invalidate cache for new Ward and polling unit
	s.invalidateCache(ctx, arg.WardID, arg.ID)

	return pu, nil
}

// DeletePollingUnit deletes a polling unit by its ID and invalidates the Ward cache.
func (s *PollingUnitsService) DeletePollingUnit(ctx context.Context, id int32) error {
	pu, err := s.queries.GetPollingUnitByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeletePollingUnit(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the Ward and polling unit
	s.invalidateCache(ctx, pu.WardID, id)

	return nil
}

// GetPollingUnitsByWardID retrieves all polling units for a specific ward with Redis cache protection.
func (s *PollingUnitsService) GetPollingUnitsByWardID(ctx context.Context, wardID int32) ([]queries.PollingUnit, error) {
	if wardID <= 0 {
		return nil, errors.New("invalid ward ID")
	}

	type Response struct {
		PollingUnits []queries.PollingUnit `json:"polling_units"`
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisPollingUnitsByWard, wardID)
	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbData, err := s.queries.GetPollingUnitsByWardID(ctx, wardID)
		if err != nil {
			return nil, err
		}

		payload := Response{
			PollingUnits: dbData,
		}

		jsonData, _ := json.Marshal(payload)
		s.rdb.Set(ctx, redisKey, jsonData, db.RedisSixtyDaysTTL)

		return dbData, nil
	case nil:
		var payload Response
		err = json.Unmarshal([]byte(data), &payload)
		return payload.PollingUnits, nil
	default:
		return nil, err
	}
}

// GetPollingUnitsPaginated executes a database-level filtered, searched, and paginated query.
func (s *PollingUnitsService) GetPollingUnitsPaginated(ctx context.Context, arg queries.GetPollingUnitsPaginatedParams) ([]queries.PollingUnit, error) {
	return s.queries.GetPollingUnitsPaginated(ctx, arg)
}

// GetPollingUnits retrieves polling units directly from the database based on arbitrary filter parameters.
// It requires at least one geographic filter to prevent fetching all nationwide polling units at once.
func (s *PollingUnitsService) GetPollingUnits(ctx context.Context, arg queries.GetPollingUnitsParams) ([]queries.PollingUnit, error) {
	hasFilter := arg.WardID > 0 ||
		arg.LgaID > 0 ||
		arg.StateID > 0 ||
		(arg.SenatorialDistrictID.Valid && arg.SenatorialDistrictID.Int32 > 0) ||
		(arg.FederalConstituencyID.Valid && arg.FederalConstituencyID.Int32 > 0) ||
		(arg.StateConstituencyID.Valid && arg.StateConstituencyID.Int32 > 0)

	if !hasFilter {
		return nil, errors.New("at least one geographic filter (ward_id, lga_id, state_id, or constituency) must be provided")
	}

	return s.queries.GetPollingUnits(ctx, arg)
}

type PollingUnitWithCapacity struct {
	queries.GetPollingUnitsWithPartyCountRow
	IsCapacityFull bool `json:"is_capacity_full"`
}

func (s *PollingUnitsService) GetPollingUnitsWithCapacity(ctx context.Context, wardID, localGovernmentID, stateID int32, partyID int16, electionGroupID int32) ([]PollingUnitWithCapacity, error) {
	if wardID <= 0 && localGovernmentID <= 0 && stateID <= 0 {
		return nil, errors.New("at least one geographic filter (ward_id, lga_id, or state_id) must be provided")
	}

	// First, fetch the party to get its agent_acquisition_targets
	party, err := s.queries.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch party: %w", err)
	}

	var targets map[string]int
	if len(party.AgentAcquisitionTargets) > 0 {
		_ = json.Unmarshal(party.AgentAcquisitionTargets, &targets)
	}
	targetCount := targets["polling_agent"]
	if targetCount <= 0 {
		targetCount = targets["pollingUnitAgent"]
	}
	if targetCount <= 0 {
		targetCount = 1 // Default if not found or 0
	}

	arg := queries.GetPollingUnitsWithPartyCountParams{
		WardID:          wardID,
		LgaID:           localGovernmentID,
		StateID:         stateID,
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
	}

	dbData, err := s.queries.GetPollingUnitsWithPartyCount(ctx, arg)
	if err != nil {
		return nil, err
	}

	var results []PollingUnitWithCapacity
	for _, row := range dbData {
		isFull := row.AgentsCount >= int32(targetCount)
		results = append(results, PollingUnitWithCapacity{
			GetPollingUnitsWithPartyCountRow: row,
			IsCapacityFull:                   isFull,
		})
	}

	return results, nil
}

// invalidateCache clears Redis cache entries for a ward's polling units, national metrics, and individual polling unit cache.
func (s *PollingUnitsService) invalidateCache(ctx context.Context, wardID int32, puIDs ...int32) {
	// Invalidate individual polling unit record cache(s) if provided
	for _, id := range puIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachPollingUnit, id))
		}
	}

	// Invalidate ward-level polling units list cache directly
	if wardID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisPollingUnitsByWard, wardID))
	}

	// Invalidate national metrics cache
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

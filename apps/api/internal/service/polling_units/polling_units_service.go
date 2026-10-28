package pollingunitsservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

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

	// Invalidate cache for Ward and LGA
	s.invalidateCache(ctx, arg.WardID, arg.LgaID)

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
	// Fetch current to invalidate old Ward/LGA cache in case geographic assignment changed
	current, err := s.queries.GetPollingUnitByID(ctx, arg.ID)
	if err == nil {
		s.invalidateCache(ctx, current.WardID, current.LgaID, arg.ID)
	}

	pu, err := s.queries.UpdatePollingUnit(ctx, arg)
	if err != nil {
		return queries.PollingUnit{}, err
	}

	// Invalidate cache for new Ward/LGA and polling unit
	s.invalidateCache(ctx, arg.WardID, arg.LgaID, arg.ID)

	return pu, nil
}

// DeletePollingUnit deletes a polling unit by its ID and invalidates the Ward and LGA cache.
func (s *PollingUnitsService) DeletePollingUnit(ctx context.Context, id int32) error {
	pu, err := s.queries.GetPollingUnitByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.queries.DeletePollingUnit(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate cache for the Ward, LGA, and polling unit
	s.invalidateCache(ctx, pu.WardID, pu.LgaID, id)

	return nil
}

// GetPollingUnitsPaginated executes a database-level filtered, searched, and paginated query.
func (s *PollingUnitsService) GetPollingUnitsPaginated(ctx context.Context, arg queries.GetPollingUnitsPaginatedParams) ([]queries.PollingUnit, error) {
	return s.queries.GetPollingUnitsPaginated(ctx, arg)
}

// GetPollingUnits retrieves polling units for selector dropdowns, caching results by
// geographic scope (Ward > LGA). It strictly requires ward_id or lga_id to prevent
// massive, un-cached memory dumps of nationwide or statewide polling units.
func (s *PollingUnitsService) GetPollingUnits(ctx context.Context, arg queries.GetPollingUnitsParams) ([]queries.PollingUnit, error) {
	if arg.WardID <= 0 && arg.LgaID <= 0 {
		return nil, errors.New("at least one geographic filter (ward_id or lga_id) must be provided")
	}

	type Response struct {
		PollingUnits []queries.PollingUnit `json:"polling_units"`
	}

	// Cache key selection: prioritize ward (most granular, ~10-30 PUs) then LGA (~200-500 PUs)
	var redisKey string
	if arg.WardID > 0 {
		redisKey = fmt.Sprintf("%s%d", db.RedisPollingUnitsByWard, arg.WardID)
	} else {
		redisKey = fmt.Sprintf("%s%d", db.RedisPollingUnitsByLGA, arg.LgaID)
	}

	data, err := s.rdb.Get(ctx, redisKey).Result()
	switch err {
	case redis.Nil:
		dbData, err := s.queries.GetPollingUnits(ctx, arg)
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
		if err != nil {
			return nil, err
		}
		return payload.PollingUnits, nil
	default:
		return nil, err
	}
}

type PollingUnitWithCapacity struct {
	queries.GetPollingUnitsWithPartyCountRow
	IsCapacityFull bool  `json:"is_capacity_full"`
	TargetCount    int32 `json:"target_count"`
	RemainingSlots int32 `json:"remaining_slots"`
}

func (s *PollingUnitsService) GetPollingUnitsWithCapacity(ctx context.Context, wardID int32, partyID int16, electionGroupID int32, search string) ([]PollingUnitWithCapacity, error) {
	if wardID <= 0 {
		return nil, errors.New("ward_id must be provided")
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
		targetCount = 1 // Default if not found or 0
	}

	arg := queries.GetPollingUnitsWithPartyCountParams{
		WardID:          wardID,
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		Search:          utils.PgTextFromString(search),
	}

	dbData, err := s.queries.GetPollingUnitsWithPartyCount(ctx, arg)
	if err != nil {
		return nil, err
	}

	var results []PollingUnitWithCapacity
	for _, row := range dbData {
		isFull := row.AgentsCount >= int32(targetCount)
		remaining := int32(targetCount) - row.AgentsCount
		if remaining < 0 {
			remaining = 0
		}

		results = append(results, PollingUnitWithCapacity{
			GetPollingUnitsWithPartyCountRow: row,
			IsCapacityFull:                   isFull,
			TargetCount:                      int32(targetCount),
			RemainingSlots:                   remaining,
		})
	}

	return results, nil
}

// invalidateCache clears Redis cache entries for a ward's polling units, LGA's polling units (if known), national metrics, and individual polling unit cache.
func (s *PollingUnitsService) invalidateCache(ctx context.Context, wardID int32, lgaID int32, puIDs ...int32) {
	// Invalidate individual polling unit record cache(s) if provided
	for _, id := range puIDs {
		if id > 0 {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisEachPollingUnit, id))
		}
	}

	// Invalidate ward-level polling units list cache directly
	if wardID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisPollingUnitsByWard, wardID))
		// If lgaID was not explicitly provided, try to discover it from the ward
		if lgaID <= 0 {
			if ward, err := s.queries.GetWardByID(ctx, wardID); err == nil {
				lgaID = ward.LgaID
			}
		}
	}

	// Invalidate LGA-level polling units list cache if known
	if lgaID > 0 {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisPollingUnitsByLGA, lgaID))
	}

	// Invalidate national metrics cache
	s.rdb.Del(ctx, db.RedisNationalMetrics)
}

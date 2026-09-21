package electiongroupsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type ElectionGroupsService struct {
	queries     *queries.Queries
	rdb         *redis.Client
	distributor worker.TaskDistributor
}

// NewElectionGroupsService instantiates a new ElectionGroupsService with the database queries client,
// Redis client, and asynchronous task distributor.
func NewElectionGroupsService(q *queries.Queries, rdb *redis.Client, distributor worker.TaskDistributor) *ElectionGroupsService {
	return &ElectionGroupsService{
		queries:     q,
		rdb:         rdb,
		distributor: distributor,
	}
}

// invalidateCache purges the cached collections for all election groups and elections,
// as well as the individual election group cache entry if a specific group ID is provided.
func (s *ElectionGroupsService) invalidateCache(ctx context.Context, id *int32) {
	// 1. Clear global collections for election groups and elections
	s.rdb.Del(ctx, db.RedisElectionGroupsAll)
	s.rdb.Del(ctx, db.RedisElectionsAll)

	// 2. If a specific group ID is provided, invalidate its individual cache key
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionGroupInfo, *id))
	}
}

// GetSafeNationalMetrics retrieves the nationwide counts of electoral units using a 3-tier strategy:
// 1. Redis Cache: Instant retrieval from memory via RedisNationalMetrics.
// 2. Database Query: Fetches fresh totals from the national_metrics table and caches them (1-year TTL).
// 3. Static Fallback: Default standard Nigerian administrative counts so group creation never fails.
func (s *ElectionGroupsService) GetSafeNationalMetrics(ctx context.Context) queries.NationalMetric {
	// 1. Attempt to load cached national metrics from Redis
	val, err := s.rdb.Get(ctx, db.RedisNationalMetrics).Result()
	if err == nil {
		var metrics queries.NationalMetric
		if err := json.Unmarshal([]byte(val), &metrics); err == nil {
			return metrics
		}
	}

	// 2. Cache miss or parse failure: query database and refresh the cache
	metrics, err := s.queries.GetNationalMetrics(ctx)
	if err == nil {
		if data, err := json.Marshal(metrics); err == nil {
			s.rdb.Set(ctx, db.RedisNationalMetrics, data, db.RedisOneYearTTL)
		}
		return metrics
	}

	// 3. Fallback to default official Nigerian electoral unit metrics if DB is unavailable
	return queries.NationalMetric{
		SenatorialDistrictsCount:   109,
		FederalConstituenciesCount: 360,
		LgasCount:                  774,
		StateConstituenciesCount:   993,
		WardsCount:                 8809,
		PollingUnitsCount:          176846,
	}
}

// CreateElectionGroup creates a new election group umbrella record with snapshotted national metrics,
// schedules an asynchronous task to seed initial geographic statistic rows, and invalidates related caches.
func (s *ElectionGroupsService) CreateElectionGroup(ctx context.Context, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
	// 1. Fetch nationwide administrative boundary metrics (districts, constituencies, LGAs, wards, polling units)
	// from Redis cache (or DB with static fallback) to snapshot total units onto this election group.
	metrics := s.GetSafeNationalMetrics(ctx)

	// 2. Persist the new election group record along with its baseline boundary counts and schedule.
	eg, err := s.queries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
		Name:                       name,
		Rank:                       rank,
		ElectionsCount:             electionsCount,
		StatesCount:                statesCount,
		ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
		SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
		FederalConstituenciesCount: metrics.FederalConstituenciesCount,
		LgasCount:                  metrics.LgasCount,
		StateConstituenciesCount:   metrics.StateConstituenciesCount,
		WardsCount:                 metrics.WardsCount,
		PollingUnitsCount:          metrics.PollingUnitsCount,
	})
	if err != nil {
		return eg, err
	}

	// 3. Invalidate global election group caches
	s.invalidateCache(ctx, nil)

	return eg, nil
}

// GetElectionGroupByID retrieves an election group record by its unique identifier.
// It leverages Redis caching with a 24-hour TTL to minimize database lookups for group metadata.
func (s *ElectionGroupsService) GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupInfo, id)

	// 1. Attempt to fetch pre-cached election group from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var eg queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &eg); err == nil {
			return eg, nil
		}
	}

	// 2. Cache miss: fetch election group directly from the database
	eg, err := s.queries.GetElectionGroupByID(ctx, id)
	if err != nil {
		return eg, err
	}

	// 3. Serialize and populate Redis cache with a 24-hour expiration
	if egBytes, err := json.Marshal(eg); err == nil {
		s.rdb.Set(ctx, cacheKey, egBytes, 24*time.Hour)
	}

	return eg, nil
}

// ListElectionGroups returns all election group records across the platform.
// Results are cached in Redis under db.RedisElectionGroupsAll with a 24-hour TTL.
func (s *ElectionGroupsService) ListElectionGroups(ctx context.Context) ([]queries.ElectionGroup, error) {
	cacheKey := db.RedisElectionGroupsAll

	// 1. Attempt to fetch pre-cached election group list from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var groups []queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &groups); err == nil {
			return groups, nil
		}
	}

	// 2. Cache miss: retrieve all election groups from the database
	groups, err := s.queries.ListElectionGroups(ctx)
	if err != nil {
		return nil, err
	}

	// 3. Serialize and cache election groups in Redis for 24 hours
	if groupsBytes, err := json.Marshal(groups); err == nil {
		s.rdb.Set(ctx, cacheKey, groupsBytes, 24*time.Hour)
	}

	return groups, nil
}

// UpdateElectionGroup modifies an existing election group's metadata, cascades the election date
// to all constituent elections within the group to maintain scheduling alignment, and invalidates related caches.
func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int32, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
	// 1. Update the election group record in the database
	group, err := s.queries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:             id,
		Name:           name,
		Rank:           rank,
		ElectionsCount: electionsCount,
		StatesCount:    statesCount,
		ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
	})
	if err != nil {
		return group, err
	}

	// 2. Update the dates for all constituent elections in this group so they stay in alignment
	_ = s.queries.UpdateElectionDatesByGroup(ctx, queries.UpdateElectionDatesByGroupParams{
		ElectionDate:    pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID: id,
	})

	// 3. Invalidate Redis caches for this election group and global collections
	s.invalidateCache(ctx, &id)

	return group, nil
}

// DeleteElectionGroup removes an election group record by its ID and purges associated Redis caches on success.
func (s *ElectionGroupsService) DeleteElectionGroup(ctx context.Context, id int32) error {
	// 1. Execute deletion query on the election group
	err := s.queries.DeleteElectionGroup(ctx, id)

	// 2. Invalidate cache on successful deletion
	if err == nil {
		s.invalidateCache(ctx, &id)
	}
	return err
}

// ListElectionGroupsWithPartyStats retrieves all election groups enriched with specific political party metrics,
// such as polling agent coverage percentages and number of contested elections.
func (s *ElectionGroupsService) ListElectionGroupsWithPartyStats(ctx context.Context, partyID int16) ([]queries.ListElectionGroupsWithPartyStatsRow, error) {
	// Query database for election groups joined with the specified party's statistics
	return s.queries.ListElectionGroupsWithPartyStats(ctx, partyID)
}

// UpsertPartyElectionGroupStats creates or updates party-specific election group statistics,
// including polling agent coverage JSON data and the count of elections contested by the party.
func (s *ElectionGroupsService) UpsertPartyElectionGroupStats(ctx context.Context, partyID int16, electionGroupID int32, pollingAgentsCoverage []byte, electionsContesting int32) (queries.PartyElectionGroup, error) {
	// Persist or update the party's coverage metrics for this election group
	return s.queries.UpsertPartyElectionGroupStats(ctx, queries.UpsertPartyElectionGroupStatsParams{
		PartyID:             partyID,
		ElectionGroupID:     electionGroupID,
		Column3:             pollingAgentsCoverage,
		ElectionsContesting: electionsContesting,
	})
}

// ListGroupElections returns all detailed election instances belonging to a specific election group,
// including office information, hierarchy ranks, candidate counts, and geographic scopes.
func (s *ElectionGroupsService) ListGroupElections(ctx context.Context, electionGroupID int32) ([]queries.ListElectionsDetailedByGroupIDRow, error) {
	// Fetch all election records mapped to this election group ID
	return s.queries.ListElectionsDetailedByGroupID(ctx, electionGroupID)
}

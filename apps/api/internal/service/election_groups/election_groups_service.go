package electiongroupsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"

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
	// 1. Clear global collections for election groups
	s.rdb.Del(ctx, db.RedisElectionGroupsAll)

	// 2. If a specific group ID is provided, invalidate its individual cache key
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionGroupByID, *id))
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
			s.rdb.Set(ctx, db.RedisNationalMetrics, data, db.RedisOneEightyDaysTTL)
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

// CreateElectionGroup creates a new election group umbrella record with snapshotted national metrics
// and invalidates related election group caches. Geographic stats seeding is deferred to child election creation.
func (s *ElectionGroupsService) CreateElectionGroup(ctx context.Context, name string, year int16) (queries.ElectionGroup, error) {
	// Persist the new election group record
	eg, err := s.queries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
		Name: name,
		Year: year,
	})
	if err != nil {
		return eg, err
	}

	// Invalidate global election group caches
	s.invalidateCache(ctx, nil)

	return eg, nil
}

// GetElectionGroupByID retrieves an election group record by its unique identifier.
// It leverages Redis caching with a 24-hour TTL to minimize database lookups for group metadata.
func (s *ElectionGroupsService) GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupByID, id)

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

	// 3. Serialize and populate Redis cache
	if egBytes, err := json.Marshal(eg); err == nil {
		s.rdb.Set(ctx, cacheKey, egBytes, db.RedisNinetyDaysTTL)
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

	// 3. Serialize and cache election groups in Redis
	if groupsBytes, err := json.Marshal(groups); err == nil {
		s.rdb.Set(ctx, cacheKey, groupsBytes, db.RedisNinetyDaysTTL)
	}

	return groups, nil
}

// UpdateElectionGroup modifies an existing election group's metadata and invalidates related caches.
func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int32, name string, year int16) (queries.ElectionGroup, error) {
	// 1. Update the election group record in the database
	group, err := s.queries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:   id,
		Name: name,
		Year: year,
	})
	if err != nil {
		return group, err
	}

	// 2. Invalidate Redis caches for this election group and global collections
	s.invalidateCache(ctx, &id)

	return group, nil
}

// DeleteElectionGroup removes an election group record by its ID, preventing deletion if candidates are registered,
// and purges associated Redis caches on success.
func (s *ElectionGroupsService) DeleteElectionGroup(ctx context.Context, id int32) error {
	// 1. Guard: Check if anyone has participated or is participating in this election group (candidates or voters)
	participantsCount, err := s.queries.CountParticipantsInElectionGroup(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to verify participants in election group: %w", err)
	}
	if participantsCount > 0 {
		return fmt.Errorf("cannot delete election group: people have already participated or are currently participating in it")
	}

	// 2. Execute deletion query on the election group
	if err := s.queries.DeleteElectionGroup(ctx, id); err != nil {
		return err
	}

	// 3. Invalidate cache on successful deletion
	s.invalidateCache(ctx, &id)
	return nil
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

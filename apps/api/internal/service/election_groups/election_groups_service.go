package electiongroupsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
	"log/slog"
	"time"


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
	// 1. Clear global collections for election groups (all and active)
	s.rdb.Del(ctx, db.RedisElectionGroupsAll, db.RedisElectionGroupsActive)

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

// CreateElectionGroup creates a new election group umbrella record,
// invalidates related election group caches, and enqueues a background task to seed its geographic hierarchy stats.
func (s *ElectionGroupsService) CreateElectionGroup(ctx context.Context, name string, electionDate time.Time) (queries.ElectionGroup, error) {
	// Persist the new election group record
	eg, err := s.queries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
		Name:         name,
		ElectionDate: utils.PgDateFromTime(electionDate),
	})
	if err != nil {
		return eg, err
	}

	// Invalidate global election group caches
	s.invalidateCache(ctx, nil)

	// Seed geographic hierarchy stats for this new election group asynchronously in the background
	if s.distributor != nil && eg.ID > 0 {
		if err := s.distributor.DistributeTaskSeedElectionGroupStats(ctx, &worker.SeedElectionGroupStatsPayload{
			ElectionGroupID: eg.ID,
		}); err != nil {
			slog.Warn("failed to enqueue seed election group stats task", "election_group_id", eg.ID, "error", err)
		}
	}

	return eg, nil
}

// ListElectionGroups returns election group records across the platform, optionally filtered by active status.
// Results are cached in Redis with a 90-day TTL.
func (s *ElectionGroupsService) ListElectionGroups(ctx context.Context, active *bool) ([]queries.ElectionGroup, error) {
	cacheKey := db.RedisElectionGroupsAll
	if active != nil {
		if *active {
			cacheKey = db.RedisElectionGroupsActive
		} else {
			cacheKey = fmt.Sprintf("%s:inactive", db.RedisElectionGroupsAll)
		}
	}

	// 1. Attempt to fetch pre-cached election group list from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var groups []queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &groups); err == nil {
			return groups, nil
		}
	}

	// 2. Cache miss: retrieve election groups from the database
	groups, err := s.queries.ListElectionGroups(ctx, utils.PgBoolFromPtr(active))
	if err != nil {
		return nil, err
	}

	// 3. Serialize and cache election groups in Redis
	if groupsBytes, err := json.Marshal(groups); err == nil {
		s.rdb.Set(ctx, cacheKey, groupsBytes, db.RedisNinetyDaysTTL)
	}

	return groups, nil
}

// UpdateElectionGroup modifies an existing election group's metadata and active status, then invalidates related caches.
func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int32, name string, electionDate time.Time, active bool) (queries.ElectionGroup, error) {
	// 1. Update the election group record in the database
	group, err := s.queries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:           id,
		Name:         name,
		ElectionDate: utils.PgDateFromTime(electionDate),
		Active:       active,
	})
	if err != nil {
		return group, err
	}

	// 2. Invalidate Redis caches for this election group and global collections
	s.invalidateCache(ctx, &id)

	return group, nil
}

// DeleteElectionGroup removes an election group record by its ID, preventing deletion if candidates/voters
// have participated or if any election instances are attached to it, and purges associated Redis caches on success.
func (s *ElectionGroupsService) DeleteElectionGroup(ctx context.Context, id int32) error {
	// 1. Guard: Check if anyone has participated or is participating in this election group (candidates or voters)
	participantsCount, err := s.queries.CountParticipantsInElectionGroup(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to verify participants in election group: %w", err)
	}
	if participantsCount > 0 {
		return fmt.Errorf("cannot delete election group: people have already participated or are currently participating in it")
	}

	// 2. Guard: Check if any election instances are attached to this election group
	electionsCount, err := s.queries.CountElectionsInElectionGroup(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to verify election instances in election group: %w", err)
	}
	if electionsCount > 0 {
		return fmt.Errorf("cannot delete election group: %d election instance(s) are attached to it. Please delete the election instances first or deactivate the group", electionsCount)
	}

	// 3. Execute deletion query on the election group
	if err := s.queries.DeleteElectionGroup(ctx, id); err != nil {
		return err
	}

	// 4. Invalidate cache on successful deletion
	s.invalidateCache(ctx, &id)
	return nil
}

// ListElectionGroupsWithPartyStats retrieves all election groups enriched with specific political party metrics,
// such as polling agent coverage percentages and number of contested elections, optionally filtered by active status.
func (s *ElectionGroupsService) ListElectionGroupsWithPartyStats(ctx context.Context, partyID int16, active *bool) ([]queries.ListElectionGroupsWithPartyStatsRow, error) {
	// Query database for election groups joined with the specified party's statistics
	return s.queries.ListElectionGroupsWithPartyStats(ctx, queries.ListElectionGroupsWithPartyStatsParams{
		PartyID: partyID,
		Active:  utils.PgBoolFromPtr(active),
	})
}


// ListGroupElections returns all detailed election instances belonging to a specific election group,
// including office information, hierarchy ranks, candidate counts, and geographic scopes.
func (s *ElectionGroupsService) ListGroupElections(ctx context.Context, electionGroupID int32) ([]queries.ElectionGroupListItem, error) {
	// Fetch all election records mapped to this election group ID
	rows, err := s.queries.ListElectionsDetailedByGroupID(ctx, electionGroupID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	items := make([]queries.ElectionGroupListItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, queries.ElectionGroupListItem{
			ListElectionsDetailedByGroupIDRow: row,
			Status:                            utils.ElectionStatusForDate(row.ElectionDate.Time, now),
		})
	}
	return items, nil
}

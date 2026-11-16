package electiongroupsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
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

// invalidateCache purges the cached collections for all election groups and elections
func (s *ElectionGroupsService) invalidateCache(ctx context.Context, id *int32) {
	// Clear global collections for election groups
	s.rdb.Del(ctx, db.RedisElectionGroupsAll, db.RedisElectionGroupsActive)

	// Invalidate individual group cache key if provided
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionGroupInstances, *id))

		key := fmt.Sprintf("%s%d", db.RedisElectionGroupByID, *id)
		if eg, ok := utils.GetCachedJSON[queries.ElectionGroup](ctx, s.rdb, key); ok && eg.FakeID.Valid {
			s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionGroupByFakeID, eg.FakeID.Int64))
		}

		s.rdb.Del(ctx, key)
	}
}

// GetSafeNationalMetrics retrieves the nationwide counts of electoral units
func (s *ElectionGroupsService) GetSafeNationalMetrics(ctx context.Context) queries.NationalMetric {
	// Attempt to load cached national metrics from Redis
	if metrics, ok := utils.GetCachedJSON[queries.NationalMetric](ctx, s.rdb, db.RedisNationalMetrics); ok {
		return metrics
	}

	// Query database and refresh the cache on cache miss
	metrics, err := s.queries.GetNationalMetrics(ctx)
	if err == nil {
		_ = utils.SetCachedJSON(ctx, s.rdb, db.RedisNationalMetrics, metrics, db.RedisOneEightyDaysTTL)
		return metrics
	}

	// Fallback to default official Nigerian electoral unit metrics if DB is unavailable
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

	return eg, nil
}

// GetElectionGroupByID retrieves an election group record by its unique identifier, utilizing Redis caching.
func (s *ElectionGroupsService) GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupByID, id)

	if eg, ok := utils.GetCachedJSON[queries.ElectionGroup](ctx, s.rdb, cacheKey); ok {
		return eg, nil
	}

	eg, err := s.queries.GetElectionGroupByID(ctx, id)
	if err != nil {
		return eg, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, eg, db.RedisNinetyDaysTTL)

	return eg, nil
}

// GetElectionGroupByFakeID retrieves an election group record by its unique fake ID, utilizing Redis caching.
func (s *ElectionGroupsService) GetElectionGroupByFakeID(ctx context.Context, fakeID int64) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupByFakeID, fakeID)

	if eg, ok := utils.GetCachedJSON[queries.ElectionGroup](ctx, s.rdb, cacheKey); ok {
		return eg, nil
	}

	eg, err := s.queries.GetElectionGroupByFakeID(ctx, utils.PgInt8FromInt64(fakeID))
	if err != nil {
		return eg, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, eg, db.RedisNinetyDaysTTL)

	return eg, nil
}

// ListElectionGroups returns election group records across the platform, optionally filtered by active status.
func (s *ElectionGroupsService) ListElectionGroups(ctx context.Context, active *bool) ([]queries.ElectionGroup, error) {
	cacheKey := db.RedisElectionGroupsAll
	if active != nil {
		if *active {
			cacheKey = db.RedisElectionGroupsActive
		} else {
			cacheKey = fmt.Sprintf("%s:inactive", db.RedisElectionGroupsAll)
		}
	}

	if groups, ok := utils.GetCachedJSON[[]queries.ElectionGroup](ctx, s.rdb, cacheKey); ok {
		return groups, nil
	}

	groups, err := s.queries.ListElectionGroups(ctx, utils.PgBoolFromPtr(active))
	if err != nil {
		return nil, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, groups, db.RedisNinetyDaysTTL)

	return groups, nil
}

// UpdateElectionGroup modifies an existing election group's metadata and active status, then invalidates related caches.
func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int32, name string, electionDate time.Time, active bool, acceptsCandidates bool, acceptsAgents bool) (queries.ElectionGroup, error) {
	// 1. Update the election group record in the database
	group, err := s.queries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:                id,
		Name:              name,
		ElectionDate:      utils.PgDateFromTime(electionDate),
		Active:            active,
		AcceptsCandidates: acceptsCandidates,
		AcceptsAgents:     acceptsAgents,
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

	// Invalidate cache on successful deletion
	s.invalidateCache(ctx, &id)
	return nil
}

// ListGroupElections returns all detailed election instances belonging to a specific election group
func (s *ElectionGroupsService) ListGroupElections(ctx context.Context, electionGroupID int32) ([]queries.ElectionGroupListItem, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupInstances, electionGroupID)

	// Attempt to fetch pre-cached detailed elections list from Redis
	rows, ok := utils.GetCachedJSON[[]queries.ListElectionsDetailedByGroupIDRow](ctx, s.rdb, cacheKey)

	// Fetch from PostgreSQL and cache if missing
	if !ok || len(rows) == 0 {
		var err error
		rows, err = s.queries.ListElectionsDetailedByGroupID(ctx, electionGroupID)
		if err != nil {
			return nil, err
		}

		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, rows, db.RedisSevenDaysTTL)
	}

	// Dynamically evaluate real-time election status using wall-clock time
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

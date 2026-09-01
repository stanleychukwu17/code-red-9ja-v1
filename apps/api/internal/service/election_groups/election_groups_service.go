package electiongroupsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type ElectionGroupsService struct {
	queries     *queries.Queries
	rdb         *redis.Client
	distributor worker.TaskDistributor
}

func NewElectionGroupsService(q *queries.Queries, rdb *redis.Client, distributor worker.TaskDistributor) *ElectionGroupsService {
	return &ElectionGroupsService{
		queries:     q,
		rdb:         rdb,
		distributor: distributor,
	}
}

func (s *ElectionGroupsService) invalidateCache(ctx context.Context, id *int64) {
	s.rdb.Del(ctx, "election_groups:all")
	s.rdb.Del(ctx, "elections:all")
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("election_group:%d", *id))
	}
}

func getSafeNationalMetrics(ctx context.Context, q *queries.Queries) queries.NationalMetric {
	metrics, err := q.GetNationalMetrics(ctx)
	if err == nil {
		return metrics
	}
	return queries.NationalMetric{
		SenatorialDistrictsCount:   109,
		FederalConstituenciesCount: 360,
		LgasCount:                  774,
		StateConstituenciesCount:   993,
		WardsCount:                 8809,
		PollingUnitsCount:          176846,
	}
}

func (s *ElectionGroupsService) CreateElectionGroup(ctx context.Context, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
	metrics := getSafeNationalMetrics(ctx, s.queries)

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

	// Enqueue a background task to seed zeroed geography stat rows.
	// It fires after a short delay so any elections belonging to this group
	// can be created first (stats are scoped to the elections' scope fields).
	if s.distributor != nil {
		if seedErr := s.distributor.DistributeTaskSeedElectionGroupStats(ctx, &worker.SeedElectionGroupStatsPayload{
			ElectionGroupID: eg.ID,
		}); seedErr != nil {
			// Non-fatal: log and continue — the cron refresh will eventually create the rows.
			slog.Warn("failed to enqueue seed election group stats task",
				"election_group_id", eg.ID, "error", seedErr)
		}
	}

	s.invalidateCache(ctx, nil)

	return eg, nil
}

func (s *ElectionGroupsService) GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("election_group:%d", id)
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var eg queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &eg); err == nil {
			return eg, nil
		}
	}

	eg, err := s.queries.GetElectionGroupByID(ctx, id)
	if err != nil {
		return eg, err
	}

	if egBytes, err := json.Marshal(eg); err == nil {
		s.rdb.Set(ctx, cacheKey, egBytes, 24*time.Hour)
	}

	return eg, nil
}

func (s *ElectionGroupsService) ListElectionGroups(ctx context.Context) ([]queries.ElectionGroup, error) {
	cacheKey := "election_groups:all"
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var groups []queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &groups); err == nil {
			return groups, nil
		}
	}

	groups, err := s.queries.ListElectionGroups(ctx)
	if err != nil {
		return nil, err
	}

	if groupsBytes, err := json.Marshal(groups); err == nil {
		s.rdb.Set(ctx, cacheKey, groupsBytes, 24*time.Hour)
	}

	return groups, nil
}

func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int64, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
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

	// Also update the dates for all elections in this group so they are in alignment
	_ = s.queries.UpdateElectionDatesByGroup(ctx, queries.UpdateElectionDatesByGroupParams{
		ElectionDate:    pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID: id,
	})

	s.invalidateCache(ctx, &id)

	return group, nil
}

func (s *ElectionGroupsService) DeleteElectionGroup(ctx context.Context, id int64) error {
	err := s.queries.DeleteElectionGroup(ctx, id)
	if err == nil {
		s.invalidateCache(ctx, &id)
	}
	return err
}

func (s *ElectionGroupsService) ListElectionGroupsWithPartyStats(ctx context.Context, partyID int16) ([]queries.ListElectionGroupsWithPartyStatsRow, error) {
	return s.queries.ListElectionGroupsWithPartyStats(ctx, partyID)
}

func (s *ElectionGroupsService) UpsertPartyElectionGroupStats(ctx context.Context, partyID int16, electionGroupID int64, pollingAgentsCoverage []byte, electionsContesting int32) (queries.PartyElectionGroup, error) {
	return s.queries.UpsertPartyElectionGroupStats(ctx, queries.UpsertPartyElectionGroupStatsParams{
		PartyID:             partyID,
		ElectionGroupID:     electionGroupID,
		Column3:             pollingAgentsCoverage,
		ElectionsContesting: electionsContesting,
	})
}

func (s *ElectionGroupsService) ListGroupElections(ctx context.Context, electionGroupID int64) ([]queries.ListElectionsDetailedByGroupIDRow, error) {
	return s.queries.ListElectionsDetailedByGroupID(ctx, electionGroupID)
}


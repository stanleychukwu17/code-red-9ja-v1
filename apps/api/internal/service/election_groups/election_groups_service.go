package electiongroupsservice

import (
	"context"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type ElectionGroupsService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewElectionGroupsService(q *queries.Queries, rdb *redis.Client) *ElectionGroupsService {
	return &ElectionGroupsService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *ElectionGroupsService) CreateElectionGroup(ctx context.Context, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
	return s.queries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
		Name:           name,
		Rank:           rank,
		ElectionsCount: electionsCount,
		StatesCount:    statesCount,
		ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
	})
}

func (s *ElectionGroupsService) GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error) {
	return s.queries.GetElectionGroupByID(ctx, id)
}

func (s *ElectionGroupsService) ListElectionGroups(ctx context.Context) ([]queries.ElectionGroup, error) {
	return s.queries.ListElectionGroups(ctx)
}

func (s *ElectionGroupsService) UpdateElectionGroup(ctx context.Context, id int64, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error) {
	return s.queries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:             id,
		Name:           name,
		Rank:           rank,
		ElectionsCount: electionsCount,
		StatesCount:    statesCount,
		ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
	})
}

func (s *ElectionGroupsService) DeleteElectionGroup(ctx context.Context, id int64) error {
	return s.queries.DeleteElectionGroup(ctx, id)
}

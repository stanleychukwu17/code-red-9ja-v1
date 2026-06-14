package partiesservice

import (
	"context"
	"free9ja/api/internal/db/queries"

	"github.com/redis/go-redis/v9"
)

type PartiesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewPartiesService(q *queries.Queries, rdb *redis.Client) *PartiesService {
	return &PartiesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *PartiesService) CreateParty(ctx context.Context, shortName, name, logo string) (queries.Party, error) {
	return s.queries.CreateParty(ctx, queries.CreatePartyParams{
		ShortName: shortName,
		Name:      name,
		Logo:      logo,
	})
}

func (s *PartiesService) GetPartyByID(ctx context.Context, id int64) (queries.Party, error) {
	return s.queries.GetPartyByID(ctx, id)
}

func (s *PartiesService) GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error) {
	return s.queries.GetPartyByShortName(ctx, shortName)
}

func (s *PartiesService) ListParties(ctx context.Context) ([]queries.Party, error) {
	return s.queries.ListParties(ctx)
}

func (s *PartiesService) UpdateParty(ctx context.Context, id int64, shortName, name, logo string) (queries.Party, error) {
	return s.queries.UpdateParty(ctx, queries.UpdatePartyParams{
		ID:        id,
		ShortName: shortName,
		Name:      name,
		Logo:      logo,
	})
}

func (s *PartiesService) DeleteParty(ctx context.Context, id int64) error {
	return s.queries.DeleteParty(ctx, id)
}

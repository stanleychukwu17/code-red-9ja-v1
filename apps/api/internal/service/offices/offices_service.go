package officesservice

import (
	"context"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type OfficesService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewOfficesService(q *queries.Queries, rdb *redis.Client) *OfficesService {
	return &OfficesService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *OfficesService) CreateOffice(ctx context.Context, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error) {
	var inecText pgtype.Text
	if inecElectionTypeID != nil && *inecElectionTypeID != "" {
		inecText = pgtype.Text{String: *inecElectionTypeID, Valid: true}
	}
	return s.queries.CreateOffice(ctx, queries.CreateOfficeParams{
		Name:               name,
		Election:           election,
		Scope:              scope,
		Rank:               rank,
		InecElectionTypeID: inecText,
	})
}

func (s *OfficesService) GetOfficeByID(ctx context.Context, id int64) (queries.Office, error) {
	return s.queries.GetOfficeByID(ctx, id)
}

func (s *OfficesService) GetOfficeByName(ctx context.Context, name string) (queries.Office, error) {
	return s.queries.GetOfficeByName(ctx, name)
}

func (s *OfficesService) ListOffices(ctx context.Context) ([]queries.Office, error) {
	return s.queries.ListOffices(ctx)
}

func (s *OfficesService) UpdateOffice(ctx context.Context, id int64, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error) {
	var inecText pgtype.Text
	if inecElectionTypeID != nil && *inecElectionTypeID != "" {
		inecText = pgtype.Text{String: *inecElectionTypeID, Valid: true}
	}
	return s.queries.UpdateOffice(ctx, queries.UpdateOfficeParams{
		ID:                 id,
		Name:               name,
		Election:           election,
		Scope:              scope,
		Rank:               rank,
		InecElectionTypeID: inecText,
	})
}

func (s *OfficesService) DeleteOffice(ctx context.Context, id int64) error {
	return s.queries.DeleteOffice(ctx, id)
}

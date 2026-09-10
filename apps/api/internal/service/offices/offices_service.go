package officesservice

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"strings"

	"github.com/jackc/pgx/v5"
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

// invalidateCache clears the cached offices list from Redis.
func (s *OfficesService) invalidateCache(ctx context.Context) {
	s.rdb.Del(ctx, db.RedisOfficesAll)
}

// CreateOffice inserts a new political office and invalidates the cached offices list.
func (s *OfficesService) CreateOffice(ctx context.Context, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error) {
	// 1. Wrap optional INEC election type ID into a nullable pgtype.Text
	var inecText pgtype.Text
	if inecElectionTypeID != nil && *inecElectionTypeID != "" {
		inecText = pgtype.Text{String: *inecElectionTypeID, Valid: true}
	}

	// 2. Insert new office record into PostgreSQL
	office, err := s.queries.CreateOffice(ctx, queries.CreateOfficeParams{
		Name:               name,
		Election:           election,
		Scope:              scope,
		Rank:               rank,
		InecElectionTypeID: inecText,
	})
	if err != nil {
		return office, err
	}

	// 3. Invalidate Redis cache so the next read fetches fresh data
	s.invalidateCache(ctx)

	return office, nil
}

// ListOffices returns all political offices, caching the result in Redis under db.RedisOfficesAll.
func (s *OfficesService) ListOffices(ctx context.Context) ([]queries.Office, error) {
	cacheKey := db.RedisOfficesAll

	// 1. Check Redis cache first
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var offices []queries.Office
		if err := json.Unmarshal([]byte(val), &offices); err == nil {
			return offices, nil
		}
	}

	// 2. Cache miss: fetch all offices from database
	offices, err := s.queries.ListOffices(ctx)
	if err != nil {
		return nil, err
	}

	// 3. Cache the fetched list in Redis with a 5-year TTL
	if officesBytes, err := json.Marshal(offices); err == nil {
		s.rdb.Set(ctx, cacheKey, officesBytes, db.RedisFiveYearsTTL)
	}

	return offices, nil
}

// GetOfficeByID retrieves an office by ID from the cached master list.
func (s *OfficesService) GetOfficeByID(ctx context.Context, id int64) (queries.Office, error) {
	// 1. Fetch cached list of offices (< 500 records)
	offices, err := s.ListOffices(ctx)
	if err != nil {
		return queries.Office{}, err
	}

	// 2. Linear scan by ID in memory
	for _, office := range offices {
		if office.ID == id {
			return office, nil
		}
	}

	return queries.Office{}, pgx.ErrNoRows
}

// GetOfficeByName retrieves an office by Name from the cached master list.
func (s *OfficesService) GetOfficeByName(ctx context.Context, name string) (queries.Office, error) {
	// 1. Fetch cached list of offices (< 500 records)
	offices, err := s.ListOffices(ctx)
	if err != nil {
		return queries.Office{}, err
	}

	// 2. Exact match first
	for _, office := range offices {
		if office.Name == name {
			return office, nil
		}
	}

	// 3. Case-insensitive fallback
	for _, office := range offices {
		if strings.EqualFold(office.Name, name) {
			return office, nil
		}
	}

	return queries.Office{}, pgx.ErrNoRows
}

// UpdateOffice modifies an existing office record and invalidates the cached offices list.
func (s *OfficesService) UpdateOffice(ctx context.Context, id int64, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error) {
	// 1. Wrap optional INEC election type ID into a nullable pgtype.Text
	var inecText pgtype.Text
	if inecElectionTypeID != nil && *inecElectionTypeID != "" {
		inecText = pgtype.Text{String: *inecElectionTypeID, Valid: true}
	}

	// 2. Update office in PostgreSQL
	office, err := s.queries.UpdateOffice(ctx, queries.UpdateOfficeParams{
		ID:                 id,
		Name:               name,
		Election:           election,
		Scope:              scope,
		Rank:               rank,
		InecElectionTypeID: inecText,
	})
	if err != nil {
		return office, err
	}

	// 3. Invalidate Redis cache so the next read fetches updated data
	s.invalidateCache(ctx)

	return office, nil
}

// DeleteOffice removes an office by ID and invalidates the cached offices list.
func (s *OfficesService) DeleteOffice(ctx context.Context, id int64) error {
	// 1. Delete office from PostgreSQL
	err := s.queries.DeleteOffice(ctx, id)
	if err != nil {
		return err
	}

	// 2. Invalidate Redis cache so the deleted office is removed on next read
	s.invalidateCache(ctx)

	return nil
}

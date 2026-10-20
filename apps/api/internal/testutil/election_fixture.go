// Package testutil provides isolated fixtures for integration tests. Connection
// settings must explicitly point to disposable test services.
package testutil

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func Migration(t *testing.T, name string) (up, down string) {
	t.Helper()
	_, file, _, _ := runtime.Caller(0)
	raw, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../db/migrations", name))
	require.NoError(t, err)
	parts := strings.SplitN(string(raw), "-- +goose Down", 2)
	require.Len(t, parts, 2)
	return parts[0], parts[1]
}

func ElectionDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("FREE9JA_TEST_POSTGRES_URL")
	if dsn == "" {
		t.Skip("set FREE9JA_TEST_POSTGRES_URL to a disposable PostgreSQL database")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	// Test packages can start fixtures concurrently. Install the shared extension
	// under a transaction-scoped lock so schema cleanup never removes it.
	_, err = admin.Exec(ctx, `SELECT pg_advisory_xact_lock(5216020);
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;`)
	require.NoError(t, err)
	schema := fmt.Sprintf("election_test_%d", time.Now().UnixNano())
	_, err = admin.Exec(ctx, "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize())
	require.NoError(t, err)
	config, err := pgxpool.ParseConfig(dsn)
	require.NoError(t, err)
	config.ConnConfig.RuntimeParams["search_path"] = schema + ",public"
	pool, err := pgxpool.NewWithConfig(ctx, config)
	require.NoError(t, err)
	t.Cleanup(func() {
		pool.Close()
		_, _ = admin.Exec(ctx, "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
		admin.Close()
	})
	// Unrelated geography is intentionally minimal; election and user tables
	// below come from the real migration sources.
	_, err = pool.Exec(ctx, `
CREATE TABLE c_countries (id smallint PRIMARY KEY, name text);
CREATE TABLE c_zones_nigeria (id smallint PRIMARY KEY, name text);
CREATE TABLE c_states (id smallint PRIMARY KEY, name text);
CREATE TABLE c_cities (id int PRIMARY KEY);
CREATE TABLE senatorial_districts (id int PRIMARY KEY);
CREATE TABLE federal_constituencies (id int PRIMARY KEY);
CREATE TABLE state_constituencies (id int PRIMARY KEY);
CREATE TABLE lgas (id int PRIMARY KEY, name text);
CREATE TABLE wards (id int PRIMARY KEY, name text);
CREATE TABLE polling_units (id int PRIMARY KEY);
CREATE TABLE offices (id smallint PRIMARY KEY, name text, election text);
INSERT INTO c_countries VALUES (1, 'Nigeria');
INSERT INTO c_states VALUES (1, 'Lagos');
INSERT INTO offices VALUES (1, 'President', 'Presidential');
CREATE TABLE party_chapters (
 id int PRIMARY KEY, party_id smallint, chapter_type text,
 country_id smallint, zonal_id smallint, state_id smallint,
 lga_id int, ward_id int
);
CREATE TABLE party_membership (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id bigint, party_id smallint, chapter_id int, status text,
 UNIQUE(user_id, party_id, chapter_id)
);`)
	require.NoError(t, err)
	partySQL, _ := Migration(t, "20260506152000_parties.sql")
	_, err = pool.Exec(ctx, partySQL)
	require.NoError(t, err)
	userSQL, _ := Migration(t, "20260606105900_users.sql")
	_, err = pool.Exec(ctx, strings.SplitN(userSQL, "CREATE INDEX idx_users_party_id", 2)[0])
	require.NoError(t, err)
	electionSQL, _ := Migration(t, "20260607120000_elections_schema.sql")
	_, err = pool.Exec(ctx, electionSQL)
	require.NoError(t, err)
	return pool
}

func Redis(t *testing.T, database int) *redis.Client {
	t.Helper()
	addr := os.Getenv("FREE9JA_TEST_REDIS_ADDR")
	if addr == "" {
		t.Skip("set FREE9JA_TEST_REDIS_ADDR to a disposable Redis instance")
	}
	rdb := redis.NewClient(&redis.Options{Addr: addr, DB: database})
	require.NoError(t, rdb.FlushDB(context.Background()).Err())
	t.Cleanup(func() { _ = rdb.Close() })
	return rdb
}

package authservice_test

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	authservice "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

var (
	testPool    *pgxpool.Pool
	testRedis   *redis.Client
	authService *authservice.AuthService
)

func TestMain(m *testing.M) {
	ctx := context.Background()

	// 1. Setup Postgres Container
	pgConfig, pgContainer, err := utils.SetupPostgresTestContainer("testuser", "testpass", "testdb", "5432")
	if err != nil {
		log.Fatalf("failed to setup postgres container: %v", err)
	}
	defer pgContainer.Terminate(ctx)

	// 2. Setup Redis Container
	redisAddr, redisContainer, err := utils.SetupRedisTestContainer("6379")
	if err != nil {
		log.Fatalf("failed to setup redis container: %v", err)
	}
	defer redisContainer.Terminate(ctx)

	// 3. Connect to Postgres
	dsn := fmt.Sprintf("postgres://testuser:testpass@%s:%s/testdb?sslmode=disable", pgConfig.Host, pgConfig.Port)
	testPool, err = db.NewPostgresPool(ctx, dsn)
	if err != nil {
		log.Fatalf("failed to connect to test postgres: %v", err)
	}
	defer testPool.Close()

	// 4. Connect to Redis
	testRedis = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	defer testRedis.Close()

	// 5. Run Migrations
	runMigrations(ctx, testPool)

	// 6. Initialize AuthService
	q := queries.New(testPool)
	authService = authservice.NewAuthService(q, testRedis)

	// 7. Run Tests
	code := m.Run()

	os.Exit(code)
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) {
	cwd, _ := os.Getwd()
	migrationDir := filepath.Join(cwd, "..", "..", "..", "db", "migrations")

	files, err := os.ReadDir(migrationDir)
	if err != nil {
		log.Fatalf("failed to read migrations directory: %v", err)
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			// Skip the massive cities migration for tests to keep them fast
			if strings.Contains(file.Name(), "insert_cities") || strings.Contains(file.Name(), "insert_states") || strings.Contains(file.Name(), "insert_countries") {
				continue
			}

			content, err := os.ReadFile(filepath.Join(migrationDir, file.Name()))
			if err != nil {
				log.Fatalf("failed to read migration file %s: %v", file.Name(), err)
			}

			sql := string(content)
			// Only execute the "Up" part
			parts := strings.Split(sql, "-- +goose Down")
			upPart := strings.Replace(parts[0], "-- +goose Up", "", 1)

			_, err = pool.Exec(ctx, upPart)
			if err != nil {
				log.Fatalf("failed to execute migration %s: %v", file.Name(), err)
			}
		}
	}

	// Insert minimal data needed for tests
	setupTestData(ctx, pool)
}

func setupTestData(ctx context.Context, pool *pgxpool.Pool) {
	// Insert test region, country, state, and city
	queries := []string{
		"INSERT INTO c_regions (name) VALUES ('Africa') ON CONFLICT DO NOTHING",
		"INSERT INTO c_countries (name, iso2, phonecode, currency, currency_symbol, nationality, latitude, longitude, emoji, emoji_unicode) VALUES ('Nigeria', 'NG', '234', 'NGN', '₦', 'Nigerian', 9.08, 8.67, '🇳🇬', 'U+1F1F3 U+1F1EC') ON CONFLICT DO NOTHING",
		"INSERT INTO c_states (id, name, country_id, country_code, latitude, longitude) VALUES (1, 'Lagos', 1, 'NG', 6.52, 3.37) ON CONFLICT DO NOTHING",
		"INSERT INTO c_cities (id, name, state_id, country_id, latitude, longitude) VALUES (1, 'Ikeja', 1, 1, 6.59, 3.34) ON CONFLICT DO NOTHING",
	}

	for _, q := range queries {
		_, err := pool.Exec(ctx, q)
		if err != nil {
			log.Fatalf("failed to setup test data: %v", err)
		}
	}
}

func TestRegister(t *testing.T) {
	ctx := context.Background()

	t.Run("successful registration", func(t *testing.T) {
		params := queries.CreateUserParams{
			Username:       pgtype.Text{String: "johndoe", Valid: true},
			Email:          pgtype.Text{String: "john@example.com", Valid: true},
			Phone:          "+2348011111111",
			PasswordHash:   "securepassword",
			FirstName:      pgtype.Text{String: "John", Valid: true},
			LastName:       pgtype.Text{String: "Doe", Valid: true},
			Gender:         pgtype.Text{String: "male", Valid: true},
			DateOfBirth:    pgtype.Date{Time: time.Now().AddDate(-20, 0, 0), Valid: true},
			CurrentCountry: 1, // Nigeria usually
			CurrentState:   1, // Lagos usually
			CurrentCity:    pgtype.Int4{Int32: 1, Valid: true},
		}

		result, err := authService.Register(ctx, params, "12345678901")
		require.NoError(t, err)
		require.NotZero(t, result.UserID)
		require.NotZero(t, result.FakeID)

		// Verify in Redis
		exists, _ := testRedis.SIsMember(ctx, "registered_usernames", "johndoe").Result()
		require.True(t, exists)

		exists, _ = testRedis.SIsMember(ctx, "registered_emails", "john@example.com").Result()
		require.True(t, exists)
	})

	t.Run("duplicate username", func(t *testing.T) {
		params := queries.CreateUserParams{
			Username:       pgtype.Text{String: "johndoe", Valid: true}, // already registered
			Email:          pgtype.Text{String: "another@example.com", Valid: true},
			Phone:          "+2348022222222",
			PasswordHash:   "password",
			CurrentCountry: 1,
			CurrentState:   1,
			DateOfBirth:    pgtype.Date{Time: time.Now().AddDate(-25, 0, 0), Valid: true},
		}

		_, err := authService.Register(ctx, params, "22345678901")
		require.Error(t, err)
		require.Contains(t, err.Error(), "username already exists")
	})

	t.Run("underage user", func(t *testing.T) {
		params := queries.CreateUserParams{
			Username:       pgtype.Text{String: "younguser", Valid: true},
			DateOfBirth:    pgtype.Date{Time: time.Now().AddDate(-10, 0, 0), Valid: true}, // 10 years old
			CurrentCountry: 1,
			CurrentState:   1,
			CurrentCity:    pgtype.Int4{Int32: 1, Valid: true},
			Phone:          "+2348033333333",
		}

		_, err := authService.Register(ctx, params, "32345678901")
		require.Error(t, err)
		require.Contains(t, err.Error(), "you must be at least 18 years old")
	})
}

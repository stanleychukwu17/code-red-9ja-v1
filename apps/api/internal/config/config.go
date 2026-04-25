// Package config provides configuration management for the API application.
// It handles loading environment variables from .env files and system environment,
// with support for default values and type conversion.
package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"sync"

	"free9ja/api/internal/utils"

	"github.com/joho/godotenv"
)

// DatabaseConfig holds database connection parameters.
// These settings control the connection pool behavior and database connection details.
type DatabaseConfig struct {
	URL       string // Database connection URL (e.g., postgres://user:pass@host:port/db)
	MaxConns  int    // Maximum number of open connections to the database
	IdleConns int    // Maximum number of idle connections in the pool
	// ConnTimeout time.Duration // Connection timeout (currently commented out)
	// MaxLifetime time.Duration // Maximum lifetime of a connection (currently commented out)
}

// RedisConfig holds Redis connection parameters.
type RedisConfig struct {
	Addr     string // Redis server address (e.g., localhost:6379)
	Password string // Redis password (empty if no authentication)
	DB       int    // Redis database number (default 0)
}

// Config holds the complete application configuration.
// It includes environment settings, server port, and database configuration.
type Config struct {
	Env      string         // Application environment (development, staging, production)
	Port     string         // Server port for HTTP listener
	Database DatabaseConfig // Database connection configuration
	Redis    RedisConfig    // Redis connection configuration
}

var (
	cfg  *Config   // Global configuration instance (singleton)
	once sync.Once // Ensures Load() is only executed once (thread-safe)
)

// Load loads the application configuration using the singleton pattern.
// It loads environment variables from .env files and system environment,
// applies default values, and performs validation. This function is thread-safe
// and will only initialize the configuration once, regardless of how many times it's called.
func Load() *Config {
	once.Do(func() {
		// Load .env and .env.local
		// Note: .env.local is usually loaded first if you want it to take precedence
		if err := godotenv.Load(".env.local", ".env"); err != nil {
			slog.Warn("No .env file found, relying on system environment variables")
		}

		db_user := GetEnv("DB_USER", "")
		db_pass := GetEnv("DB_PASSWORD", "")
		db_name := GetEnv("DB_NAME", "")
		db_port := GetEnv("DB_PORT", "")
		redis_addr := GetEnv("REDIS_ADDR", "") //localhost:6379
		redis_port := GetEnv("REDIS_PORT", "")
		redis_password := GetEnv("REDIS_PASSWORD", "")
		redis_db := getIntEnv("REDIS_DB", 0)
		is_testing := GetEnv("IS_TESTING", "false")

		if is_testing == "true" {
			// testing environment, setup postgres test container
			testDbConfig, _, err := utils.SetupPostgresTestContainer(db_user, db_pass, db_name, db_port)
			if err != nil {
				panic(err)
			}
			db_port = testDbConfig.Port

			redis_addr, _, err = utils.SetupRedisTestContainer(redis_port)
			if err != nil {
				panic(err)
			}
		}

		// "postgres://<username>:<password>@localhost:<port>/<database>?sslmode=disable"
		db_url := fmt.Sprintf("postgres://%s:%s@localhost:%s/%s?sslmode=disable", db_user, db_pass, db_port, db_name)

		cfg = &Config{
			Env:  GetEnv("ENV", "development"),
			Port: GetEnv("PORT", "4000"),
			Database: DatabaseConfig{
				URL: db_url,
			},
			Redis: RedisConfig{
				Addr:     redis_addr,
				Password: redis_password,
				DB:       redis_db,
			},
		}

		// Validation: Ensure critical variables are set
		if cfg.Database.URL == "" {
			slog.Error("DATABASE_URL is not set")
			panic("DATABASE_URL is not set")
		}
	})

	return cfg
}

// getEnv retrieves an environment variable value with a fallback default.
// It first checks the system environment, then returns the default value if not found.
func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getIntEnv retrieves an environment variable as an integer with a fallback default.
// It attempts to parse the environment variable as an integer, returning the default
// value if the variable is not set or cannot be parsed as an integer.
func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

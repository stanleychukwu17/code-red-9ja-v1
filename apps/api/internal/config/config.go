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
		// get the paths to the .env
		envPath, envLocalPath := GetEnvPath()

		// check if we're running in a CI/CD environment
		isCiCd := GetEnv("IS_CI_CD", "false")

		// if we're running in a CI/CD environment, skip loading .env files
		if isCiCd == "true" {
			slog.Info("Running in CI/CD environment, skipping .env file loading")
		} else {
			if err := godotenv.Load(envLocalPath, envPath); err != nil {
				slog.Warn("No .env file found, relying on system environment variables")
			}
		}

		db_user := GetEnv("DB_USER", "")
		db_pass := GetEnv("DB_PASSWORD", "")
		db_name := GetEnv("DB_NAME", "")
		db_port := GetEnv("DB_PORT", "")
		redis_addr := GetEnv("REDIS_ADDR", "") //localhost:6379
		redis_port := GetEnv("REDIS_PORT", "")
		redis_password := GetEnv("REDIS_PASSWORD", "")
		redis_db := GetIntEnv("REDIS_DB", 0)
		is_testing := GetEnv("IS_TESTING", "false")

		if db_name == "" || db_user == "" || db_pass == "" || db_port == "" || redis_addr == "" || redis_port == "" {
			slog.Warn("DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, REDIS_ADDR, and REDIS_PORT must be set")
			fmt.Fprintf(os.Stderr, "exiting the program\n")
			os.Exit(1)
		}

		// if testing, setup test containers for postgres and redis
		if is_testing == "true" {
			// setup postgres test container
			testDbConfig, _, err := utils.SetupPostgresTestContainer(db_user, db_pass, db_name, db_port)
			if err != nil {
				panic(err)
			}
			db_port = testDbConfig.Port

			// setup redis test container
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

// GetIntEnv retrieves an environment variable as an integer with a fallback default.
// It attempts to parse the environment variable as an integer, returning the default
// value if the variable is not set or cannot be parsed as an integer.
func GetIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func GetEnvPath() (envPath string, envLocalPath string) {
	envPath = "D:/Sz-projects/50-main-projects/3-free9ja/apps/api/.env"
	envLocalPath = "D:/Sz-projects/50-main-projects/3-free9ja/apps/api/.env.local"

	// if the user sets a .env custom path, then return the custom path
	if GetEnv("ENV_PATH", "") != "" {
		envPath = GetEnv("ENV_PATH", "")
	}

	// if the user sets a .env.local custom path, then return the custom path
	if GetEnv("ENV_LOCAL_PATH", "") != "" {
		envLocalPath = GetEnv("ENV_LOCAL_PATH", "")
	}

	return
}

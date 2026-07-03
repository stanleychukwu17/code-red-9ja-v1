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
	"time"

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

// R2Config holds Cloudflare R2 object-storage credentials and bucket settings.
// These are used to initialise the S3-compatible R2 client for presigned uploads.
type R2Config struct {
	AccountID       string // Cloudflare Account ID (required)
	AccessKeyID     string // R2 API token access key (required)
	SecretAccessKey string // R2 API token secret (required)
	BucketName      string // Target bucket name (required)
	// PublicURL is the custom domain or r2.dev URL used to build public object URLs.
	// e.g. "https://files.free9ja.com" or "https://pub-xxx.r2.dev"
	PublicURL string
}

// MonnifyConfig holds credentials for the Monnify payment gateway.
// Used for creating reserved virtual accounts and verifying webhook signatures.
type MonnifyConfig struct {
	// BaseURL is the Monnify API root.
	// Sandbox:    https://sandbox.monnify.com
	// Production: https://api.monnify.com
	BaseURL string

	// APIKey and SecretKey are found on the Monnify Dashboard → Settings → API Keys.
	APIKey    string
	SecretKey string

	// ContractCode identifies your business contract on Monnify.
	ContractCode string
}

// Config holds the complete application configuration.
// It includes environment settings, server port, and database configuration.
type Config struct {
	Env                  string         // Application environment (development, staging, production)
	Port                 string         // Server port for HTTP listener
	Database             DatabaseConfig // Database connection configuration
	Redis                RedisConfig    // Redis connection configuration
	R2                   R2Config       // Cloudflare R2 storage configuration
	Monnify              MonnifyConfig  // Monnify payment gateway configuration
	GeminiAPIKey         string
	JWTSecret            string
	JWTAccessExpiration  time.Duration
	JWTRefreshExpiration time.Duration
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
		var err error

		cfg, err = LoadConfig()

		if err != nil {
			slog.Error("Failed to load configuration", "error", err)
			os.Exit(1)
		}
	})

	return cfg
}

func LoadConfig() (*Config, error) {
	// get the paths to the .env
	envPath, envLocalPath := GetEnvPath()

	// check if we're running in a CI/CD environment
	isCiCd := GetEnv("IS_CI_CD", "false")

	// if we're running in a CI/CD environment, skip loading .env files
	if isCiCd == "true" {
		slog.Info("Running in CI/CD environment, skipping .env file loading")
	} else {
		// Load files only if they exist. We load envLocalPath first so that
		// its values take precedence (godotenv.Load does not overwrite existing values).
		var loaded bool
		if _, err := os.Stat(envLocalPath); err == nil {
			if err := godotenv.Load(envLocalPath); err == nil {
				loaded = true
			} else {
				slog.Warn("Error loading .env.local file", "error", err)
			}
		}
		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err == nil {
				loaded = true
			} else {
				slog.Warn("Error loading .env file", "error", err)
			}
		}
		if !loaded {
			slog.Warn("No .env or .env.local files were loaded, relying on system environment variables")
		}
	}

	db_host := GetEnv("DB_HOST", "localhost")
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
		return nil, fmt.Errorf("DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, REDIS_ADDR, and REDIS_PORT must be set")
	}

	// if testing, setup test containers for postgres and redis
	if is_testing == "true" {
		// setup postgres test container
		testDbConfig, _, err := utils.SetupPostgresTestContainer(db_user, db_pass, db_name, db_port)
		if err != nil {
			return nil, fmt.Errorf("failed to setup postgres test container: %w", err)
		}
		db_port = testDbConfig.Port

		// setup redis test container
		redis_addr, _, err = utils.SetupRedisTestContainer(redis_port)
		if err != nil {
			return nil, fmt.Errorf("failed to setup redis test container: %w", err)
		}
	}

	// create db connection url
	db_url := utils.FormatPostgresDSN(db_user, db_pass, db_host, db_port, db_name)

	// jwt secret and expirations
	jwtSecret := GetEnv("JWT_SECRET", "free9ja_jwt_secret_key_for_dev_only")
	jwtAccessExpStr := GetEnv("JWT_ACCESS_EXPIRATION", "15m")
	jwtRefreshExpStr := GetEnv("JWT_REFRESH_EXPIRATION", "720h") // 30 days in hours

	jwtAccessExp, err := time.ParseDuration(jwtAccessExpStr)
	if err != nil {
		jwtAccessExp = 15 * time.Minute
	}

	jwtRefreshExp, err := time.ParseDuration(jwtRefreshExpStr)
	if err != nil {
		jwtRefreshExp = 30 * 24 * time.Hour
	}

	configInstance := &Config{
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
		R2: R2Config{
			AccountID:       GetEnv("R2_ACCOUNT_ID", ""),
			AccessKeyID:     GetEnv("R2_ACCESS_KEY_ID", ""),
			SecretAccessKey: GetEnv("R2_SECRET_ACCESS_KEY", ""),
			BucketName:      GetEnv("R2_BUCKET_NAME", ""),
			PublicURL:       GetEnv("R2_PUBLIC_URL", ""),
		},
		Monnify: MonnifyConfig{
			BaseURL:      GetEnv("MONNIFY_BASE_URL", "https://sandbox.monnify.com"),
			APIKey:       GetEnv("MONNIFY_API_KEY", ""),
			SecretKey:    GetEnv("MONNIFY_SECRET_KEY", ""),
			ContractCode: GetEnv("MONNIFY_CONTRACT_CODE", ""),
		},
		GeminiAPIKey:         GetEnv("GEMINI_API_KEY", ""),
		JWTSecret:            jwtSecret,
		JWTAccessExpiration:  jwtAccessExp,
		JWTRefreshExpiration: jwtRefreshExp,
	}

	// Validation: Ensure critical variables are set
	if configInstance.Database.URL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	return configInstance, nil
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
	// Try local relative path first
	envPath = ".env"
	envLocalPath = ".env.local"

	// If relative path doesn't exist, check apps/api/ relative to root, else fallback to hardcoded Windows path
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		if _, err := os.Stat("apps/api/.env"); err == nil {
			envPath = "apps/api/.env"
			envLocalPath = "apps/api/.env.local"
		} else {
			envPath = "D:/Sz-projects/50-main-projects/3-free9ja/apps/api/.env"
			envLocalPath = "D:/Sz-projects/50-main-projects/3-free9ja/apps/api/.env.local"
		}
	}

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

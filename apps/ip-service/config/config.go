package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	RedisAddr       string        // Address of the Redis server
	RedisPassword   string        // Password for the Redis server
	RedisDB         int           // Redis database index
	Port            string        // Port on which the service will run
	RateLimitReqs   int           // Maximum number of requests allowed per window
	RateLimitWindow time.Duration // Time window for rate limiting
	GeoLite2DBPath  string        // Path to the MaxMind GeoLite2 database file
}

// LoadConfig loads the configuration from .env and environment variables.
func LoadConfig() Config {
	// Only load .env if not in production environment
	if os.Getenv("APP_ENV") != "production" {
		// First try to load the local .env in the ip-service folder
		if err := godotenv.Load(".env"); err != nil {
			// Fallback to loading the parent api folder's .env if local doesn't exist
			_ = godotenv.Load("../api/.env")
		}
	}

	cfg := Config{}

	cfg.RedisAddr = getEnv("REDIS_ADDR", "localhost:6379")
	cfg.RedisPassword = getEnv("REDIS_PASSWORD", "")
	cfg.RedisDB = getEnvInt("REDIS_DB", 0)
	cfg.Port = getEnv("PORT", "8081")

	// Rate limiting defaults: 100 requests per 60 seconds per IP
	cfg.RateLimitReqs = getEnvInt("RATE_LIMIT_REQUESTS", 100)
	windowSecs := getEnvInt("RATE_LIMIT_WINDOW", 60)
	cfg.RateLimitWindow = time.Duration(windowSecs) * time.Second

	cfg.GeoLite2DBPath = getEnv("GEOLITE2_DB_PATH", "GeoLite2-City.mmdb")

	return cfg
}

// getEnv retrieves the value of the environment variable named by the key.
// If the variable is present, the value is returned. Otherwise, defaultVal is returned.
func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// getEnvInt retrieves the integer value of the environment variable named by the key.
// If the variable is present and can be parsed as an integer, the value is returned.
// Otherwise, defaultVal is returned.
func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

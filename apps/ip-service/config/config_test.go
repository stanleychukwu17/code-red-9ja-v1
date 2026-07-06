package config

import (
	"os"
	"testing"
	"time"
)

func TestLoadConfig_Defaults(t *testing.T) {
	// Clear environment variables to ensure we test true defaults
	os.Clearenv()
	
	// Note: godotenv looks for .env in the current working directory.
	// Since tests run in the package directory (apps/ip-service/config),
	// it won't find the .env file in apps/ip-service/ and will safely fall back to our defaults.

	cfg := LoadConfig()

	if cfg.RedisAddr != "localhost:6379" {
		t.Errorf("expected default RedisAddr localhost:6379, got %s", cfg.RedisAddr)
	}
	if cfg.RedisPassword != "" {
		t.Errorf("expected default RedisPassword empty, got %s", cfg.RedisPassword)
	}
	if cfg.RedisDB != 0 {
		t.Errorf("expected default RedisDB 0, got %d", cfg.RedisDB)
	}
	if cfg.Port != "8081" {
		t.Errorf("expected default Port 8081, got %s", cfg.Port)
	}
	if cfg.RateLimitReqs != 100 {
		t.Errorf("expected default RateLimitReqs 100, got %d", cfg.RateLimitReqs)
	}
	if cfg.RateLimitWindow != 60*time.Second {
		t.Errorf("expected default RateLimitWindow 60s, got %v", cfg.RateLimitWindow)
	}
	if cfg.GeoLite2DBPath != "GeoLite2-City.mmdb" {
		t.Errorf("expected default GeoLite2DBPath GeoLite2-City.mmdb, got %s", cfg.GeoLite2DBPath)
	}
}

func TestLoadConfig_Overrides(t *testing.T) {
	os.Clearenv()
	
	// Set custom environment variables
	os.Setenv("REDIS_ADDR", "redis:6380")
	os.Setenv("REDIS_PASSWORD", "secret")
	os.Setenv("REDIS_DB", "5")
	os.Setenv("PORT", "9090")
	os.Setenv("RATE_LIMIT_REQUESTS", "50")
	os.Setenv("RATE_LIMIT_WINDOW", "30")
	os.Setenv("GEOLITE2_DB_PATH", "/var/lib/GeoIP/GeoLite2-City.mmdb")

	cfg := LoadConfig()

	if cfg.RedisAddr != "redis:6380" {
		t.Errorf("expected RedisAddr redis:6380, got %s", cfg.RedisAddr)
	}
	if cfg.RedisPassword != "secret" {
		t.Errorf("expected RedisPassword secret, got %s", cfg.RedisPassword)
	}
	if cfg.RedisDB != 5 {
		t.Errorf("expected RedisDB 5, got %d", cfg.RedisDB)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected Port 9090, got %s", cfg.Port)
	}
	if cfg.RateLimitReqs != 50 {
		t.Errorf("expected RateLimitReqs 50, got %d", cfg.RateLimitReqs)
	}
	if cfg.RateLimitWindow != 30*time.Second {
		t.Errorf("expected RateLimitWindow 30s, got %v", cfg.RateLimitWindow)
	}
	if cfg.GeoLite2DBPath != "/var/lib/GeoIP/GeoLite2-City.mmdb" {
		t.Errorf("expected GeoLite2DBPath /var/lib/GeoIP/GeoLite2-City.mmdb, got %s", cfg.GeoLite2DBPath)
	}
}

func TestGetEnvInt_Invalid(t *testing.T) {
	os.Clearenv()
	os.Setenv("INVALID_INT", "not_an_int")
	
	val := getEnvInt("INVALID_INT", 99)
	if val != 99 {
		t.Errorf("expected getEnvInt to return default 99 on invalid parse, got %d", val)
	}
}

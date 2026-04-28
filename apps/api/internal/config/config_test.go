package config_test

import (
	"free9ja/api/internal/config"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_VAR"
	defaultValue := "default"

	// 1. Test default value
	os.Unsetenv(key)
	assert.Equal(t, defaultValue, config.GetEnv(key, defaultValue))

	// 2. Test override
	expectedValue := "overridden"
	os.Setenv(key, expectedValue)
	defer os.Unsetenv(key)
	assert.Equal(t, expectedValue, config.GetEnv(key, defaultValue))
}

func TestGetIntEnv(t *testing.T) {
	key := "TEST_INT_VAR"
	defaultValue := 42

	// 1. Test default value (not set)
	os.Unsetenv(key)
	assert.Equal(t, defaultValue, config.GetIntEnv(key, defaultValue))

	// 2. Test valid integer override
	os.Setenv(key, "100")
	defer os.Unsetenv(key)
	assert.Equal(t, 100, config.GetIntEnv(key, defaultValue))

	// 3. Test invalid integer override (should return default)
	os.Setenv(key, "not-an-int")
	assert.Equal(t, defaultValue, config.GetIntEnv(key, defaultValue))
}

func TestGetEnvPath(t *testing.T) {
	// Store original values
	origPath := os.Getenv("ENV_PATH")
	origLocalPath := os.Getenv("ENV_LOCAL_PATH")
	defer func() {
		os.Setenv("ENV_PATH", origPath)
		os.Setenv("ENV_LOCAL_PATH", origLocalPath)
	}()

	// 1. Test default paths (or what's currently in env)
	os.Unsetenv("ENV_PATH")
	os.Unsetenv("ENV_LOCAL_PATH")
	path, localPath := config.GetEnvPath()
	assert.Contains(t, path, ".env")
	assert.Contains(t, localPath, ".env.local")

	// 2. Test overrides
	customPath := "/tmp/.env.test"
	customLocalPath := "/tmp/.env.local.test"
	os.Setenv("ENV_PATH", customPath)
	os.Setenv("ENV_LOCAL_PATH", customLocalPath)

	path, localPath = config.GetEnvPath()
	assert.Equal(t, customPath, path)
	assert.Equal(t, customLocalPath, localPath)
}

func TestLoadConfig(t *testing.T) {
	// Set required environment variables
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("REDIS_ADDR", "localhost")
	os.Setenv("REDIS_PORT", "6379")
	os.Setenv("IS_CI_CD", "true") // Skip .env loading

	defer func() {
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("REDIS_ADDR")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("IS_CI_CD")
	}()

	cfg, err := config.LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "4000", cfg.Port) // Default port
	assert.Contains(t, cfg.Database.URL, "testuser:testpass@localhost:5432/testdb")
}

func TestLoadConfig_Error(t *testing.T) {
	// Clear one required variable
	os.Unsetenv("DB_USER")
	os.Setenv("IS_CI_CD", "true")
	defer os.Unsetenv("IS_CI_CD")

	cfg, err := config.LoadConfig()
	assert.Error(t, err)
	assert.Nil(t, cfg)
	assert.Contains(t, err.Error(), "must be set")
}
func TestLoad(t *testing.T) {
	cfg := config.Load()
	assert.NotNil(t, cfg)
}

func TestLoad_Singleton(t *testing.T) {
	cfg1 := config.Load()
	cfg2 := config.Load()
	assert.Same(t, cfg1, cfg2, "Load() should return the same instance")
}

func TestLoadConfig_Testing(t *testing.T) {
	// Set required environment variables
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("REDIS_ADDR", "localhost")
	os.Setenv("REDIS_PORT", "6379")
	os.Setenv("IS_CI_CD", "true")
	os.Setenv("IS_TESTING", "true")

	defer func() {
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("REDIS_ADDR")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("IS_CI_CD")
		os.Unsetenv("IS_TESTING")
	}()

	// This will attempt to spin up test containers via utils.
	cfg, err := config.LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)
}

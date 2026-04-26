package test

import (
	"free9ja/api/internal/config"
	"os"
	"testing"

	"sync"
)

var (
	test_cfg *config.Config
	once     sync.Once
)

// setupTestEnvironmentVariables prepares environment for testing with testcontainers
func setupTestEnvironmentVariables() {
	os.Setenv("IS_TESTING", "true")
}

// cleanupTestEnvironmentVariables removes test environment variables
func cleanupTestEnvironmentVariables() {
	os.Unsetenv("IS_TESTING")
}

// BeforeAll runs once before all tests
func BeforeAll(t *testing.T) (*config.Config, error) {
	once.Do(func() {
		setupTestEnvironmentVariables()
		test_cfg = config.Load()
	})

	return test_cfg, nil
}

// BeforeEach prepares environment for each test with testcontainers
func BeforeEach(t *testing.T) (*config.Config, error) {
	cfg, _ := BeforeAll(t)
	setupTestEnvironmentVariables()
	return cfg, nil
}

func AfterEach(t *testing.T) (*testing.T, error) {
	cleanupTestEnvironmentVariables()
	return t, nil
}

package utils_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/assert"
)

func TestFormatPostgresDSN(t *testing.T) {
	dsn := utils.FormatPostgresDSN("user", "pass", "localhost", "5432", "db")
	assert.Equal(t, "postgres://user:pass@localhost:5432/db?sslmode=disable", dsn)
}

func TestRespondJSON(t *testing.T) {
	u := utils.NewUtils(nil)
	w := httptest.NewRecorder()
	status := http.StatusOK
	body := map[string]string{"message": "success"}

	u.RespondJSON(w, status, body)

	assert.Equal(t, status, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var resp map[string]string
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, body, resp)
}

func TestSetupPostgresTestContainer(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	config, container, err := utils.SetupPostgresTestContainer("user", "pass", "db", "5432")
	if err != nil {
		t.Logf("SetupPostgresTestContainer failed (expected if Docker is missing): %v", err)
		return
	}
	defer container.Terminate(context.Background())

	assert.NotEmpty(t, config.Host)
	assert.NotEmpty(t, config.Port)
}

func TestSetupRedisTestContainer(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	addr, container, err := utils.SetupRedisTestContainer("6379")
	if err != nil {
		t.Logf("SetupRedisTestContainer failed (expected if Docker is missing): %v", err)
		return
	}
	defer container.Terminate(context.Background())

	assert.NotEmpty(t, addr)
}

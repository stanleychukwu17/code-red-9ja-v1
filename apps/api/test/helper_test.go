package test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnvironmentHelpers(t *testing.T) {
	// Test setupTestEnvironmentVariables
	setupTestEnvironmentVariables()
	assert.Equal(t, "true", os.Getenv("IS_TESTING"))

	// Test cleanupTestEnvironmentVariables
	cleanupTestEnvironmentVariables()
	assert.Equal(t, "", os.Getenv("IS_TESTING"))
}

func TestBeforeAfterHelpers(t *testing.T) {
	cfg, err := BeforeAll(t)
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	cfg2, err2 := BeforeEach(t)
	assert.NoError(t, err2)
	assert.Equal(t, cfg, cfg2)
	assert.Equal(t, "true", os.Getenv("IS_TESTING"))

	_, err3 := AfterEach(t)
	assert.NoError(t, err3)
	assert.Equal(t, "", os.Getenv("IS_TESTING"))
}

func TestSendRequest_Helper(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"success"}`))
	}))
	defer ts.Close()

	resp, body := SendRequest(t, "POST", ts.URL, map[string]string{"test": "data"})
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.JSONEq(t, `{"message":"success"}`, string(body))
}

func TestTestNewApp_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// This is an integration test that requires Docker
	ctx := context.Background()
	cfg, err := BeforeEach(t)
	if err != nil {
		t.Logf("BeforeEach failed (expected if Docker is missing): %v", err)
		return
	}
	defer AfterEach(t)

	app := TestNewApp(t, ctx, cfg)
	require.NotNil(t, app)
	defer app.Server.Shutdown(ctx)

	assert.NotNil(t, app.DB)
	assert.NotNil(t, app.RDB)
	assert.NotNil(t, app.Server)
}

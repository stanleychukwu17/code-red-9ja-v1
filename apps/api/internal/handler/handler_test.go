package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"free9ja/api/internal/router"

	"github.com/stretchr/testify/require"
)

func TestHealth(t *testing.T) {
	// Initialize the router
	r := router.New(nil, nil)

	// Create a request to pass to our router.
	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err, "failed to create http request")

	// We create a ResponseRecorder to record the response.
	rr := httptest.NewRecorder()

	// Use the router to serve the request.
	r.ServeHTTP(rr, req)

	// Check the status code is what we expect.
	require.Equal(t, http.StatusOK, rr.Code)

	// Check the response body is what we expect.
	expected := map[string]string{"status": "ok"}
	var actual map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &actual)
	require.NoError(t, err, "failed to unmarshal response body")

	require.Equal(t, expected["status"], actual["status"])
}

func TestRoot(t *testing.T) {
	// Initialize the router
	r := router.New(nil, nil)

	// Create a request to pass to our router.
	// Note: The root route is under /api/v1/
	req, err := http.NewRequest("GET", "/api/v1/", nil)
	require.NoError(t, err, "failed to create http request")

	rr := httptest.NewRecorder()

	// Use the router to serve the request.
	r.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	expected := map[string]string{"message": "free9ja API v1"}
	var actual map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &actual)
	require.NoError(t, err, "failed to unmarshal response body")

	require.Equal(t, expected["message"], actual["message"])
}

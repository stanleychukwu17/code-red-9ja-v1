package handler

import (
	"encoding/json"
	"net/http"
)

// respond writes a JSON response with the given status code and body.
func respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// Health handles GET /health
func Health(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Root handles GET /api/v1/
func Root(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{
		"message": "free9ja API v1",
	})
}

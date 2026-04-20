package handler

import (
	"net/http"

	"free9ja/api/internal/utils"
)

// Health handles GET /health
// @Summary Health check
// @Description get the status of the server
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func Health(w http.ResponseWriter, r *http.Request) {
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Root handles GET /api/v1/
// @Summary API Root
// @Description get the API root message
// @Tags root
// @Produce json
// @Success 200 {object} map[string]string
// @Router / [get]
func Root(w http.ResponseWriter, r *http.Request) {
	utils.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "free9ja API v1",
	})
}

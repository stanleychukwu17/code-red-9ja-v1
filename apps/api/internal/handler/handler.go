package handler

import (
	"fmt"
	"net/http"

	"free9ja/api/internal/utils"
)

var utilsInstance = utils.NewUtils(nil)

// Health handles GET /health
// @Summary Health check
// @Description get the status of the server
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func Health(w http.ResponseWriter, r *http.Request) {
	accessToken, err := r.Cookie("accessToken")
	refreshToken, err := r.Cookie("refreshToken")
	// fmt.Println("accessToken", accessToken)
	// fmt.Println("refreshToken", refreshToken)

	if err != nil {
		// http.Error(w, "Unauthorized", http.StatusUnauthorized)
		utilsInstance.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	accessTokenValue := accessToken.Value
	refreshTokenValue := refreshToken.Value
	_ = fmt.Sprintf("%s:%s", accessTokenValue, refreshTokenValue)

	// utilsInstance.RespondSuccess(w, http.StatusOK, "Server running successfully", nil)
	utilsInstance.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Root handles GET /api/v1/
// @Summary API Root
// @Description get the API root message
// @Tags root
// @Produce json
// @Success 200 {object} map[string]string
// @Router / [get]
func Root(w http.ResponseWriter, r *http.Request) {
	utilsInstance.RespondSuccess(w, http.StatusOK, "free9ja API v1", nil)
}

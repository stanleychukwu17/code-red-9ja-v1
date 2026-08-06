package seedhandler

import (
	"encoding/json"
	"net/http"
	"os"

	seedservice "free9ja/api/internal/service/seed"
	"free9ja/api/internal/utils"
)

type Handler struct {
	seedService *seedservice.SeedService
	utils       *utils.Utils
}

// NewHandler creates a new instance of Handler.
func NewHandler(seedService *seedservice.SeedService, utils *utils.Utils) *Handler {
	return &Handler{
		seedService: seedService,
		utils:       utils,
	}
}

// @Summary Seed testing users
// @Description Batch registers testing users from formatted JSON data
// @Tags Seed
// @Accept json
// @Produce json
// @Param request body []seedservice.SeedUserRequest true "List of users to seed"
// @Success 200 {object} map[string]interface{} "Users seeded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to seed users"
// @Router /seed/users [post]
// SeedUsers handles batch registration of testing users from seed data
func (h *Handler) SeedUsers(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	var req []seedservice.SeedUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	msg, err := h.seedService.SeedUsers(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to seed users: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, nil)
}

// @Summary Seed admins and party admins
// @Description Batch registers roles for admins from formatted JSON data
// @Tags Seed
// @Accept json
// @Produce json
// @Param request body seedservice.SeedAdminsRequest true "List of admins to seed"
// @Success 200 {object} map[string]interface{} "Admins seeded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to seed admins"
// @Router /seed/admins [post]
func (h *Handler) SeedAdmins(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	// de-structure the request
	var req seedservice.SeedAdminsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// call the seed service
	msg, err := h.seedService.SeedAdmins(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to seed admins: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, nil)
}

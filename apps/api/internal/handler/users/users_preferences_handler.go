package usershandler

import (
	"encoding/json"
	"net/http"

	apimiddleware "free9ja/api/internal/middleware"
	usersservice "free9ja/api/internal/service/users"
)

// GetUserPreferences handles GET /api/v1/user_preferences
// @Summary      Get user preferences
// @Description  Fetches the sidebar state, pinned links, and theme for the authenticated user
// @Tags         User Preferences
// @Accept       json
// @Produce      json
// @Success      200      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /user_preferences [get]
func (h *Handler) GetUserPreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	preferences, err := h.usersService.GetUserPreferences(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve user preferences")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User preferences retrieved successfully", map[string]interface{}{
		"sidebar_state":      preferences.SidebarState,
		"pinned_links":       preferences.PinnedLinks,
		"theme":              preferences.Theme,
		"preference_version": preferences.PreferenceVersion,
	})
}

// UpdateUserPreferences handles PUT /api/v1/user_preferences
// @Summary      Update user preferences
// @Description  Updates the sidebar state, pinned links, or theme for the authenticated user
// @Tags         User Preferences
// @Accept       json
// @Produce      json
// @Param        body     body      usersservice.UpdateUserPreferencesParams  true  "Preferences Payload"
// @Success      200      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /user_preferences [put]
func (h *Handler) UpdateUserPreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	var req usersservice.UpdateUserPreferencesParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	updated, err := h.usersService.UpdateUserPreferences(r.Context(), claims.UserID, req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update user preferences")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "User preferences updated successfully", map[string]interface{}{
		"sidebar_state":      updated.SidebarState,
		"pinned_links":       updated.PinnedLinks,
		"theme":              updated.Theme,
		"preference_version": updated.PreferenceVersion,
	})
}

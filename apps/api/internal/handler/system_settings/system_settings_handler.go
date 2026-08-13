package system_settings

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/logger"
	"free9ja/api/internal/utils"
)

type Handler struct {
	q *queries.Queries
	u *utils.Utils
}

func NewHandler(q *queries.Queries, u *utils.Utils) *Handler {
	return &Handler{
		q: q,
		u: u,
	}
}

type SystemSettingResponse struct {
	Key         string      `json:"key"`
	Value       interface{} `json:"value"`
	Description string      `json:"description"`
	CreatedAt   string      `json:"created_at"`
	UpdatedAt   string      `json:"updated_at"`
}

func mapSystemSettingResponse(s queries.SystemSetting) SystemSettingResponse {
	var val interface{}
	_ = json.Unmarshal(s.Value, &val)
	var createdStr, updatedStr string
	if s.CreatedAt.Valid {
		createdStr = s.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}
	if s.UpdatedAt.Valid {
		updatedStr = s.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}
	return SystemSettingResponse{
		Key:         s.Key,
		Value:       val,
		Description: s.Description.String,
		CreatedAt:   createdStr,
		UpdatedAt:   updatedStr,
	}
}

// GetSystemSetting godoc
// @Summary Get a system setting
// @Description Get a system setting by key
// @Tags System Settings
// @Accept json
// @Produce json
// @Param key path string true "Setting Key"
// @Success 200 {object} utils.SuccessResponse{data=SystemSettingResponse}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Security BearerAuth
// @Router /admin/settings/{key} [get]
func (h *Handler) GetSystemSetting(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if key == "" {
		h.u.RespondError(w, http.StatusBadRequest, "Setting key is required")
		return
	}
	fmt.Printf("DEBUG GetSystemSetting called with key: '%s'\n", key)

	setting, err := h.q.GetSystemSetting(r.Context(), key)
	if err != nil {
		log := logger.FromContext(r.Context())
		if errors.Is(err, pgx.ErrNoRows) {
			h.u.RespondError(w, http.StatusNotFound, "System setting not found")
			return
		}
		log.Error("failed to get system setting", "key", key, "err", err)
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to retrieve system setting")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "System setting retrieved successfully", map[string]interface{}{
		"setting": mapSystemSettingResponse(setting),
	})
}

type UpdateSystemSettingRequest struct {
	Value       interface{} `json:"value" validate:"required"`
	Description *string     `json:"description"`
}

// UpdateSystemSetting godoc
// @Summary Update a system setting
// @Description Update a system setting by key
// @Tags System Settings
// @Accept json
// @Produce json
// @Param key path string true "Setting Key"
// @Param request body UpdateSystemSettingRequest true "Update System Setting Request"
// @Success 200 {object} utils.SuccessResponse{data=SystemSettingResponse}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Security BearerAuth
// @Router /admin/settings/{key} [put]
func (h *Handler) UpdateSystemSetting(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if key == "" {
		h.u.RespondError(w, http.StatusBadRequest, "Setting key is required")
		return
	}

	var req UpdateSystemSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Value == nil {
		h.u.RespondError(w, http.StatusBadRequest, "Value is required")
		return
	}
	valBytes, _ := json.Marshal(req.Value)

	var desc pgtype.Text
	if req.Description != nil {
		desc = pgtype.Text{String: *req.Description, Valid: true}
	} else {
		desc = pgtype.Text{Valid: false}
	}

	setting, err := h.q.UpdateSystemSetting(r.Context(), queries.UpdateSystemSettingParams{
		Key:         key,
		Value:       valBytes,
		Description: desc,
	})
	if err != nil {
		log := logger.FromContext(r.Context())
		log.Error("failed to update system setting", "key", key, "err", err)
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to update system setting")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "System setting updated successfully", map[string]interface{}{
		"setting": mapSystemSettingResponse(setting),
	})
}

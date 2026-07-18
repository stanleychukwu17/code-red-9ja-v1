package stateshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type StatesService interface {
	CreateState(ctx context.Context, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error)
	GetStateByID(ctx context.Context, id int16) (queries.CState, error)
	UpdateState(ctx context.Context, id int16, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error)
	DeleteState(ctx context.Context, id int16) error
}

type Handler struct {
	statesService StatesService
	utils         *utils.Utils
}

func NewHandler(statesService StatesService, utils *utils.Utils) *Handler {
	return &Handler{
		statesService: statesService,
		utils:         utils,
	}
}

type CreateStateRequest struct {
	Name        string  `json:"name"`
	CountryID   int16   `json:"country_id"`
	CountryCode string  `json:"country_code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

type UpdateStateRequest struct {
	Name        string  `json:"name"`
	CountryID   int16   `json:"country_id"`
	CountryCode string  `json:"country_code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

// CreateState godoc
// @Summary      Create a new state
// @Description  Creates a state under a specific country
// @Tags         States
// @Accept       json
// @Produce      json
// @Param        request body CreateStateRequest true "Create State request payload"
// @Success      201  {object} map[string]interface{} "State created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /states [post]
func (h *Handler) CreateState(w http.ResponseWriter, r *http.Request) {
	var req CreateStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.CountryID == 0 || req.CountryCode == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "name, country_id, and country_code are required")
		return
	}

	state, err := h.statesService.CreateState(r.Context(), req.Name, req.CountryID, req.CountryCode, req.Latitude, req.Longitude)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "State created successfully", map[string]interface{}{
		"state": state,
	})
}

// GetState godoc
// @Summary      Get a state by ID
// @Description  Retrieves details of a single state using its unique database ID
// @Tags         States
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State ID"
// @Success      200  {object} map[string]interface{} "State fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "State not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /states/{id} [get]
func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID")
		return
	}

	state, err := h.statesService.GetStateByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State fetched successfully", map[string]interface{}{
		"state": state,
	})
}

// UpdateState godoc
// @Summary      Update a state
// @Description  Modifies the details of an existing state
// @Tags         States
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State ID"
// @Param        request body UpdateStateRequest true "Update State request payload"
// @Success      200  {object} map[string]interface{} "State updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "State not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /states/{id} [put]
func (h *Handler) UpdateState(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID")
		return
	}

	var req UpdateStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.CountryID == 0 || req.CountryCode == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "name, country_id, and country_code are required")
		return
	}

	// Verify state exists
	_, err = h.statesService.GetStateByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State not found")
		return
	}

	updatedState, err := h.statesService.UpdateState(r.Context(), int16(id), req.Name, req.CountryID, req.CountryCode, req.Latitude, req.Longitude)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update state: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State updated successfully", map[string]interface{}{
		"state": updatedState,
	})
}

// DeleteState godoc
// @Summary      Delete a state
// @Description  Removes a state from the database by its ID
// @Tags         States
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State ID"
// @Success      200  {object} map[string]interface{} "State deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "State not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /states/{id} [delete]
func (h *Handler) DeleteState(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID")
		return
	}

	// Verify state exists
	_, err = h.statesService.GetStateByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State not found")
		return
	}

	if err := h.statesService.DeleteState(r.Context(), int16(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete state: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State deleted successfully", nil)
}

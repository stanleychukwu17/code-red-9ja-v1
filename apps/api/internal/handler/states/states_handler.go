package stateshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type StatesService interface {
	CreateState(ctx context.Context, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error)
	GetStateByID(ctx context.Context, id int16) (queries.CState, error)
	UpdateState(ctx context.Context, id int16, name string, countryID int16, countryCode string, latitude, longitude float64) (queries.CState, error)
	DeleteState(ctx context.Context, id int16) error
	GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.CState, error)
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

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type StateResponse struct {
	ID   int16  `json:"id"`
	Name string `json:"name"`
}

type GetStatesResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetStatesData   `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetStatesData struct {
	States []StateResponse `json:"states"`
}

func parsePaginationParams(r *http.Request) (int, int64) {
	return parsePaginationParamsWithMax(r, 100)
}

func parsePaginationParamsWithMax(r *http.Request, maxLimit int) (int, int64) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > maxLimit {
				limit = maxLimit
			} else {
				limit = l
			}
		}
	}

	var cursor int64
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = c
		}
	}
	return limit, cursor
}

func parseSortParams(r *http.Request, defaultOrderBy string, defaultOrderDir string) (string, string) {
	orderBy := r.URL.Query().Get("order_by")
	if orderBy == "" {
		orderBy = defaultOrderBy
	}

	orderDir := strings.ToUpper(r.URL.Query().Get("order"))
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = defaultOrderDir
	}

	return orderBy, orderDir
}

// GetStates godoc
// @Summary      Get states by country ID
// @Description  Fetches all states for a specific country by its ID with cursor pagination
// @Tags         States
// @Accept       json
// @Produce      json
// @Param        countryID  path      int     true   "Country ID"
// @Param        limit      query     int     false  "Limit (default 20, max 100)"
// @Param        cursor     query     string  false  "Cursor (ID of last record)"
// @Success      200        {object}  GetStatesResponse
// @Failure      400        {string}  invalid country ID
// @Failure      500        {string}  failed to fetch states
// @Router       /countries/{countryID}/states [get]
func (h *Handler) GetStates(w http.ResponseWriter, r *http.Request) {
	countryIDStr := chi.URLParam(r, "countryID")
	countryID, err := strconv.ParseInt(countryIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid country ID: "+err.Error())
		return
	}

	limit, cursor := parsePaginationParams(r)

	states, err := h.statesService.GetStatesByCountryID(r.Context(), int16(countryID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch states: "+err.Error())
		return
	}

	orderBy, orderDir := parseSortParams(r, "name", "ASC")

	sort.SliceStable(states, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = states[i].Name < states[j].Name
		} else {
			less = states[i].ID < states[j].ID
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	startIndex := 0
	if cursor > 0 {
		for i, s := range states {
			if int64(s.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginatedStates []queries.CState
	hasMore := false
	nextCursor := ""

	if startIndex < len(states) {
		endIndex := startIndex + limit
		if endIndex >= len(states) {
			endIndex = len(states)
			paginatedStates = states[startIndex:endIndex]
		} else {
			paginatedStates = states[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginatedStates[len(paginatedStates)-1].ID), 10)
		}
	} else {
		paginatedStates = []queries.CState{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "States fetched successfully", map[string]interface{}{
		"states": paginatedStates,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

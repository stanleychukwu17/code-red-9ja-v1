package senatorialdistrictshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)
type SenatorialDistrictsService interface {
	CreateSenatorialDistrict(ctx context.Context, name string, code string, description string, coalitionCenter string, stateID int32, stateName string) (queries.SenatorialDistrict, error)
	GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error)
	UpdateSenatorialDistrict(ctx context.Context, id int32, name string, code string, description string, coalitionCenter string, stateID int32, stateName string) (queries.SenatorialDistrict, error)
	DeleteSenatorialDistrict(ctx context.Context, id int32) error
	GetSenatorialDistricts(ctx context.Context, stateID int32) ([]queries.SenatorialDistrict, error)
}

type Handler struct {
	sdService SenatorialDistrictsService
	queries   *queries.Queries
	utils     *utils.Utils
}

func NewHandler(sdService SenatorialDistrictsService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		sdService: sdService,
		queries:   q,
		utils:     utils,
	}
}

type CreateSenatorialDistrictRequest struct {
	Name            string  `json:"name"`
	Code            *string `json:"code"`
	Description     string  `json:"description"`
	CoalitionCenter string  `json:"coalition_center"`
	StateID         int32   `json:"state_id"`
}

type UpdateSenatorialDistrictRequest struct {
	Name            string  `json:"name"`
	Code            *string `json:"code"`
	Description     string  `json:"description"`
	CoalitionCenter string  `json:"coalition_center"`
	StateID         int32   `json:"state_id"`
}

// CreateSenatorialDistrict godoc
// @Summary      Create a new senatorial district
// @Description  Creates a senatorial district under a specific state
// @Tags         Senatorial Districts
// @Accept       json
// @Produce      json
// @Param        request body CreateSenatorialDistrictRequest true "Create request payload"
// @Success      201  {object} map[string]interface{} "Senatorial district created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /senatorial-districts [post]
func (h *Handler) CreateSenatorialDistrict(w http.ResponseWriter, r *http.Request) {
	var req CreateSenatorialDistrictRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name and state_id are required")
		return
	}

	// Resolve state name (Nigeria country_id is 161)
	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	codeStr := ""
	if req.Code != nil {
		codeStr = *req.Code
	}

	sd, err := h.sdService.CreateSenatorialDistrict(r.Context(), req.Name, codeStr, req.Description, req.CoalitionCenter, req.StateID, state.Name)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create senatorial district: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Senatorial district created successfully", map[string]interface{}{
		"senatorial_district": sd,
	})
}

// GetSenatorialDistrict godoc
// @Summary      Get a senatorial district by ID
// @Description  Retrieves details of a single senatorial district using its unique database ID
// @Tags         Senatorial Districts
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Senatorial District ID"
// @Success      200  {object} map[string]interface{} "Senatorial district fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Senatorial district not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /senatorial-districts/{id} [get]
func (h *Handler) GetSenatorialDistrict(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID")
		return
	}

	sd, err := h.sdService.GetSenatorialDistrictByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Senatorial district not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Senatorial district fetched successfully", map[string]interface{}{
		"senatorial_district": sd,
	})
}

// UpdateSenatorialDistrict godoc
// @Summary      Update a senatorial district
// @Description  Modifies the details of an existing senatorial district
// @Tags         Senatorial Districts
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Senatorial District ID"
// @Param        request body UpdateSenatorialDistrictRequest true "Update request payload"
// @Success      200  {object} map[string]interface{} "Senatorial district updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Senatorial district not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /senatorial-districts/{id} [put]
func (h *Handler) UpdateSenatorialDistrict(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID")
		return
	}

	var req UpdateSenatorialDistrictRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name and state_id are required")
		return
	}

	// Verify it exists
	_, err = h.sdService.GetSenatorialDistrictByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Senatorial district not found")
		return
	}

	// Resolve state name (Nigeria country_id is 161)
	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	codeStr := ""
	if req.Code != nil {
		codeStr = *req.Code
	}

	updatedSD, err := h.sdService.UpdateSenatorialDistrict(r.Context(), int32(id), req.Name, codeStr, req.Description, req.CoalitionCenter, req.StateID, state.Name)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update senatorial district: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Senatorial district updated successfully", map[string]interface{}{
		"senatorial_district": updatedSD,
	})
}

// DeleteSenatorialDistrict godoc
// @Summary      Delete a senatorial district
// @Description  Removes a senatorial district from the database by its ID
// @Tags         Senatorial Districts
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Senatorial District ID"
// @Success      200  {object} map[string]interface{} "Senatorial district deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Senatorial district not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /senatorial-districts/{id} [delete]
func (h *Handler) DeleteSenatorialDistrict(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID")
		return
	}

	// Verify it exists
	_, err = h.sdService.GetSenatorialDistrictByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Senatorial district not found")
		return
	}

	if err := h.sdService.DeleteSenatorialDistrict(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete senatorial district: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Senatorial district deleted successfully", nil)
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type SenatorialDistrictResponse struct {
	ID              int32  `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	CoalitionCenter string `json:"coalition_center"`
	StateID         int32  `json:"state_id"`
	StateName       string `json:"state_name"`
}

type GetSenatorialDistrictsResponse struct {
	Success bool                       `json:"success"`
	Message string                     `json:"message"`
	Data    GetSenatorialDistrictsData `json:"data"`
	Meta    *PaginationMeta            `json:"meta,omitempty"`
}

type GetSenatorialDistrictsData struct {
	Districts []SenatorialDistrictResponse `json:"districts"`
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

func parseOptionalQueryInt(r *http.Request, param string) int32 {
	valStr := r.URL.Query().Get(param)
	if valStr == "" {
		return 0
	}
	val, err := strconv.ParseInt(valStr, 10, 32)
	if err != nil {
		return 0
	}
	return int32(val)
}

// GetSenatorialDistricts godoc
// @Summary      Get senatorial districts
// @Description  Fetches senatorial districts with optional stateID filtering and cursor pagination
// @Tags         Senatorial Districts
// @Accept       json
// @Produce      json
// @Param        state_id   query     int     false  "State ID to filter by"
// @Param        limit      query     int     false  "Limit (default 20, max 100)"
// @Param        cursor     query     string  false  "Cursor (ID of last record)"
// @Success      200        {object}  GetSenatorialDistrictsResponse
// @Failure      500        {string}  failed to fetch districts
// @Router       /senatorial-districts [get]
func (h *Handler) GetSenatorialDistricts(w http.ResponseWriter, r *http.Request) {
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParamsWithMax(r, 200)

	districts, err := h.sdService.GetSenatorialDistricts(r.Context(), stateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch senatorial districts: "+err.Error())
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		searchLower := strings.ToLower(search)
		var filtered []queries.SenatorialDistrict
		for _, d := range districts {
			codeVal := ""
			if d.Code.Valid {
				codeVal = d.Code.String
			}
			if strings.Contains(strings.ToLower(d.Name), searchLower) ||
				strings.Contains(strings.ToLower(codeVal), searchLower) ||
				strings.Contains(strings.ToLower(d.Description.String), searchLower) ||
				strings.Contains(strings.ToLower(d.CoalitionCenter.String), searchLower) ||
				strings.Contains(strings.ToLower(d.StateName), searchLower) {
				filtered = append(filtered, d)
			}
		}
		districts = filtered
	}

	startIndex := 0
	if cursor > 0 {
		for i, d := range districts {
			if int64(d.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.SenatorialDistrict
	hasMore := false
	nextCursor := ""

	if startIndex < len(districts) {
		endIndex := startIndex + limit
		if endIndex >= len(districts) {
			endIndex = len(districts)
			paginated = districts[startIndex:endIndex]
		} else {
			paginated = districts[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.SenatorialDistrict{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Senatorial districts fetched successfully", map[string]interface{}{
		"districts": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

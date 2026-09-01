package federalconstituencieshandler

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
type FederalConstituenciesService interface {
	CreateFederalConstituency(ctx context.Context, name string, code string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string) (queries.FederalConstituency, error)
	GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error)
	UpdateFederalConstituency(ctx context.Context, id int32, name string, code string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string) (queries.FederalConstituency, error)
	DeleteFederalConstituency(ctx context.Context, id int32) error
	GetFederalConstituencies(ctx context.Context, stateID, senatorialDistrictID int32) ([]queries.FederalConstituency, error)
}

type Handler struct {
	fcService FederalConstituenciesService
	queries   *queries.Queries
	utils     *utils.Utils
}

func NewHandler(fcService FederalConstituenciesService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		fcService: fcService,
		queries:   q,
		utils:     utils,
	}
}

type CreateFederalConstituencyRequest struct {
	Name                 string  `json:"name"`
	Code                 *string `json:"code"`
	StateID              int32   `json:"state_id"`
	SenatorialDistrictID int32   `json:"senatorial_district_id"`
}

type UpdateFederalConstituencyRequest struct {
	Name                 string  `json:"name"`
	Code                 *string `json:"code"`
	StateID              int32   `json:"state_id"`
	SenatorialDistrictID int32   `json:"senatorial_district_id"`
}

// CreateFederalConstituency godoc
// @Summary      Create a new federal constituency
// @Description  Creates a federal constituency under a state and senatorial district
// @Tags         Federal Constituencies
// @Accept       json
// @Produce      json
// @Param        request body CreateFederalConstituencyRequest true "Create request payload"
// @Success      201  {object} map[string]interface{} "Federal constituency created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /federal-constituencies [post]
func (h *Handler) CreateFederalConstituency(w http.ResponseWriter, r *http.Request) {
	var req CreateFederalConstituencyRequest
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

	districtName := ""
	if req.SenatorialDistrictID > 0 {
		district, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
			return
		}
		districtName = district.Name
	}

	codeStr := ""
	if req.Code != nil {
		codeStr = *req.Code
	}

	fc, err := h.fcService.CreateFederalConstituency(r.Context(), req.Name, codeStr, req.StateID, state.Name, req.SenatorialDistrictID, districtName)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create federal constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Federal constituency created successfully", map[string]interface{}{
		"federal_constituency": fc,
	})
}

// GetFederalConstituency godoc
// @Summary      Get a federal constituency by ID
// @Description  Retrieves details of a single federal constituency using its unique database ID
// @Tags         Federal Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Federal Constituency ID"
// @Success      200  {object} map[string]interface{} "Federal constituency fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Federal constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /federal-constituencies/{id} [get]
func (h *Handler) GetFederalConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID")
		return
	}

	fc, err := h.fcService.GetFederalConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Federal constituency not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Federal constituency fetched successfully", map[string]interface{}{
		"federal_constituency": fc,
	})
}

// UpdateFederalConstituency godoc
// @Summary      Update a federal constituency
// @Description  Modifies the details of an existing federal constituency
// @Tags         Federal Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Federal Constituency ID"
// @Param        request body UpdateFederalConstituencyRequest true "Update request payload"
// @Success      200  {object} map[string]interface{} "Federal constituency updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Federal constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /federal-constituencies/{id} [put]
func (h *Handler) UpdateFederalConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID")
		return
	}

	var req UpdateFederalConstituencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name and state_id are required")
		return
	}

	// Verify it exists
	_, err = h.fcService.GetFederalConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Federal constituency not found")
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

	districtName := ""
	if req.SenatorialDistrictID > 0 {
		district, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
			return
		}
		districtName = district.Name
	}

	codeStr := ""
	if req.Code != nil {
		codeStr = *req.Code
	}

	updatedFC, err := h.fcService.UpdateFederalConstituency(r.Context(), int32(id), req.Name, codeStr, req.StateID, state.Name, req.SenatorialDistrictID, districtName)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update federal constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Federal constituency updated successfully", map[string]interface{}{
		"federal_constituency": updatedFC,
	})
}

// DeleteFederalConstituency godoc
// @Summary      Delete a federal constituency
// @Description  Removes a federal constituency from the database by its ID
// @Tags         Federal Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Federal Constituency ID"
// @Success      200  {object} map[string]interface{} "Federal constituency deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Federal constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /federal-constituencies/{id} [delete]
func (h *Handler) DeleteFederalConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID")
		return
	}

	// Verify it exists
	_, err = h.fcService.GetFederalConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Federal constituency not found")
		return
	}

	if err := h.fcService.DeleteFederalConstituency(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete federal constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Federal constituency deleted successfully", nil)
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type FederalConstituencyResponse struct {
	ID                     int32  `json:"id"`
	Name                   string `json:"name"`
	StateID                int32  `json:"state_id"`
	StateName              string `json:"state_name"`
	SenatorialDistrictID   int32  `json:"senatorial_district_id"`
	SenatorialDistrictName string `json:"senatorial_district_name"`
}

type GetFederalConstituenciesResponse struct {
	Success bool                         `json:"success"`
	Message string                       `json:"message"`
	Data    GetFederalConstituenciesData `json:"data"`
	Meta    *PaginationMeta              `json:"meta,omitempty"`
}

type GetFederalConstituenciesData struct {
	Constituencies []FederalConstituencyResponse `json:"constituencies"`
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

// GetFederalConstituencies godoc
// @Summary      Get federal constituencies
// @Description  Fetches federal constituencies with optional state_id and senatorial_district_id filtering and cursor pagination
// @Tags         Federal Constituencies
// @Accept       json
// @Produce      json
// @Param        state_id                query     int     false  "State ID to filter by"
// @Param        senatorial_district_id  query     int     false  "Senatorial District ID to filter by"
// @Param        limit                   query     int     false  "Limit (default 20, max 100)"
// @Param        cursor                  query     string  false  "Cursor (ID of last record)"
// @Success      200                     {object}  GetFederalConstituenciesResponse
// @Failure      500                     {string}  failed to fetch constituencies
// @Router       /federal-constituencies [get]
func (h *Handler) GetFederalConstituencies(w http.ResponseWriter, r *http.Request) {
	stateID := parseOptionalQueryInt(r, "state_id")
	senatorialDistrictID := parseOptionalQueryInt(r, "senatorial_district_id")
	limit, cursor := parsePaginationParamsWithMax(r, 500)

	constituencies, err := h.fcService.GetFederalConstituencies(r.Context(), stateID, senatorialDistrictID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch federal constituencies: "+err.Error())
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		searchLower := strings.ToLower(search)
		var filtered []queries.FederalConstituency
		for _, c := range constituencies {
			codeVal := ""
			if c.Code.Valid {
				codeVal = c.Code.String
			}
			if strings.Contains(strings.ToLower(c.Name), searchLower) ||
				strings.Contains(strings.ToLower(codeVal), searchLower) ||
				strings.Contains(strings.ToLower(c.StateName), searchLower) ||
				strings.Contains(strings.ToLower(c.SenatorialDistrictName.String), searchLower) {
				filtered = append(filtered, c)
			}
		}
		constituencies = filtered
	}

	startIndex := 0
	if cursor > 0 {
		for i, c := range constituencies {
			if int64(c.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.FederalConstituency
	hasMore := false
	nextCursor := ""

	if startIndex < len(constituencies) {
		endIndex := startIndex + limit
		if endIndex >= len(constituencies) {
			endIndex = len(constituencies)
			paginated = constituencies[startIndex:endIndex]
		} else {
			paginated = constituencies[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.FederalConstituency{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Federal constituencies fetched successfully", map[string]interface{}{
		"constituencies": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

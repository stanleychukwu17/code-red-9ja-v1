package stateassemblyconstituencieshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)
type StateAssemblyConstituenciesService interface {
	CreateStateAssemblyConstituency(ctx context.Context, name string, lgaID int32, lgaName string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.StateAssemblyConstituency, error)
	GetStateAssemblyConstituencyByID(ctx context.Context, id int32) (queries.StateAssemblyConstituency, error)
	UpdateStateAssemblyConstituency(ctx context.Context, id int32, name string, lgaID int32, lgaName string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.StateAssemblyConstituency, error)
	DeleteStateAssemblyConstituency(ctx context.Context, id int32) error
	GetStateAssemblyConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateAssemblyConstituency, error)
}

type Handler struct {
	sacService StateAssemblyConstituenciesService
	queries    *queries.Queries
	utils      *utils.Utils
}

func NewHandler(sacService StateAssemblyConstituenciesService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		sacService: sacService,
		queries:    q,
		utils:      utils,
	}
}

type CreateStateAssemblyConstituencyRequest struct {
	Name                  string `json:"name"`
	LgaID                 int32  `json:"lga_id"`
	StateID               int32  `json:"state_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
}

type UpdateStateAssemblyConstituencyRequest struct {
	Name                  string `json:"name"`
	LgaID                 int32  `json:"lga_id"`
	StateID               int32  `json:"state_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
}

// CreateStateAssemblyConstituency godoc
// @Summary      Create a new state assembly constituency
// @Description  Creates a state assembly constituency under state, district, fed constituency, and LGA
// @Tags         State Assembly Constituencies
// @Accept       json
// @Produce      json
// @Param        request body CreateStateAssemblyConstituencyRequest true "Create request payload"
// @Success      201  {object} map[string]interface{} "State assembly constituency created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /state-assembly-constituencies [post]
func (h *Handler) CreateStateAssemblyConstituency(w http.ResponseWriter, r *http.Request) {
	var req CreateStateAssemblyConstituencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 || req.SenatorialDistrictID == 0 || req.FederalConstituencyID == 0 || req.LgaID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, state_id, senatorial_district_id, federal_constituency_id, and lga_id are required")
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

	// Resolve senatorial district name
	district, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
		return
	}

	// Resolve federal constituency name
	fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
		return
	}

	// Resolve LGA name
	lga, err := h.queries.GetLGAByID(r.Context(), req.LgaID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID: "+err.Error())
		return
	}

	sac, err := h.sacService.CreateStateAssemblyConstituency(
		r.Context(),
		req.Name,
		req.LgaID,
		lga.Name,
		req.StateID,
		state.Name,
		req.SenatorialDistrictID,
		district.Name,
		req.FederalConstituencyID,
		fc.Name,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state assembly constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "State assembly constituency created successfully", map[string]interface{}{
		"state_assembly_constituency": sac,
	})
}

// GetStateAssemblyConstituency godoc
// @Summary      Get a state assembly constituency by ID
// @Description  Retrieves details of a single state assembly constituency using its unique database ID
// @Tags         State Assembly Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State Assembly Constituency ID"
// @Success      200  {object} map[string]interface{} "State assembly constituency fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "State assembly constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /state-assembly-constituencies/{id} [get]
func (h *Handler) GetStateAssemblyConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state assembly constituency ID")
		return
	}

	sac, err := h.sacService.GetStateAssemblyConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State assembly constituency not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State assembly constituency fetched successfully", map[string]interface{}{
		"state_assembly_constituency": sac,
	})
}

// UpdateStateAssemblyConstituency godoc
// @Summary      Update a state assembly constituency
// @Description  Modifies the details of an existing state assembly constituency
// @Tags         State Assembly Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State Assembly Constituency ID"
// @Param        request body UpdateStateAssemblyConstituencyRequest true "Update request payload"
// @Success      200  {object} map[string]interface{} "State assembly constituency updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "State assembly constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /state-assembly-constituencies/{id} [put]
func (h *Handler) UpdateStateAssemblyConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state assembly constituency ID")
		return
	}

	var req UpdateStateAssemblyConstituencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 || req.SenatorialDistrictID == 0 || req.FederalConstituencyID == 0 || req.LgaID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, state_id, senatorial_district_id, federal_constituency_id, and lga_id are required")
		return
	}

	// Verify it exists
	_, err = h.sacService.GetStateAssemblyConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State assembly constituency not found")
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

	// Resolve senatorial district name
	district, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
		return
	}

	// Resolve federal constituency name
	fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
		return
	}

	// Resolve LGA name
	lga, err := h.queries.GetLGAByID(r.Context(), req.LgaID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID: "+err.Error())
		return
	}

	updatedSAC, err := h.sacService.UpdateStateAssemblyConstituency(
		r.Context(),
		int32(id),
		req.Name,
		req.LgaID,
		lga.Name,
		req.StateID,
		state.Name,
		req.SenatorialDistrictID,
		district.Name,
		req.FederalConstituencyID,
		fc.Name,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update state assembly constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State assembly constituency updated successfully", map[string]interface{}{
		"state_assembly_constituency": updatedSAC,
	})
}

// DeleteStateAssemblyConstituency godoc
// @Summary      Delete a state assembly constituency
// @Description  Removes a state assembly constituency from the database by its ID
// @Tags         State Assembly Constituencies
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "State Assembly Constituency ID"
// @Success      200  {object} map[string]interface{} "State assembly constituency deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "State assembly constituency not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /state-assembly-constituencies/{id} [delete]
func (h *Handler) DeleteStateAssemblyConstituency(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state assembly constituency ID")
		return
	}

	// Verify it exists
	_, err = h.sacService.GetStateAssemblyConstituencyByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "State assembly constituency not found")
		return
	}

	if err := h.sacService.DeleteStateAssemblyConstituency(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete state assembly constituency: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State assembly constituency deleted successfully", nil)
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type StateAssemblyConstituencyResponse struct {
	ID                      int32  `json:"id"`
	Name                    string `json:"name"`
	StateID                 int32  `json:"state_id"`
	StateName               string `json:"state_name"`
	SenatorialDistrictID    int32  `json:"senatorial_district_id"`
	SenatorialDistrictName  string `json:"senatorial_district_name"`
	FederalConstituencyID   int32  `json:"federal_constituency_id"`
	FederalConstituencyName string `json:"federal_constituency_name"`
}

type GetStateAssemblyConstituenciesResponse struct {
	Success bool                               `json:"success"`
	Message string                             `json:"message"`
	Data    GetStateAssemblyConstituenciesData `json:"data"`
	Meta    *PaginationMeta                    `json:"meta,omitempty"`
}

type GetStateAssemblyConstituenciesData struct {
	Constituencies []StateAssemblyConstituencyResponse `json:"constituencies"`
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

// GetStateAssemblyConstituencies godoc
// @Summary      Get state constituencies
// @Description  Fetches state constituencies with optional state_id and federal_constituency_id filtering and cursor pagination
// @Tags         State Assembly Constituencies
// @Accept       json
// @Produce      json
// @Param        state_id                 query     int     false  "State ID to filter by"
// @Param        federal_constituency_id  query     int     false  "Federal Constituency ID to filter by"
// @Param        limit                    query     int     false  "Limit (default 20, max 100)"
// @Param        cursor                   query     string  false  "Cursor (ID of last record)"
// @Success      200                      {object}  GetStateAssemblyConstituenciesResponse
// @Failure      500                      {string}  failed to fetch constituencies
// @Router       /state-constituencies [get]
func (h *Handler) GetStateAssemblyConstituencies(w http.ResponseWriter, r *http.Request) {
	stateID := parseOptionalQueryInt(r, "state_id")
	federalConstituencyID := parseOptionalQueryInt(r, "federal_constituency_id")
	limit, cursor := parsePaginationParamsWithMax(r, 1500)

	constituencies, err := h.sacService.GetStateAssemblyConstituencies(r.Context(), stateID, federalConstituencyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch state assembly constituencies: "+err.Error())
		return
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

	var paginated []queries.StateAssemblyConstituency
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
		paginated = []queries.StateAssemblyConstituency{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "State constituencies fetched successfully", map[string]interface{}{
		"constituencies": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

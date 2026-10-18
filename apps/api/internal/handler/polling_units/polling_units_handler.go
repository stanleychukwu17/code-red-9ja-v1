package pollingunitshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"

	pollingunitsservice "free9ja/api/internal/service/polling_units"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type PollingUnitsService interface {
	CreatePollingUnit(ctx context.Context, arg queries.CreatePollingUnitParams) (queries.PollingUnit, error)
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
	UpdatePollingUnit(ctx context.Context, arg queries.UpdatePollingUnitParams) (queries.PollingUnit, error)
	DeletePollingUnit(ctx context.Context, id int32) error
	GetPollingUnitsByWardID(ctx context.Context, wardID int32) ([]queries.PollingUnit, error)
	GetPollingUnitsPaginated(ctx context.Context, arg queries.GetPollingUnitsPaginatedParams) ([]queries.PollingUnit, error)
	GetPollingUnits(ctx context.Context, arg queries.GetPollingUnitsParams) ([]queries.PollingUnit, error)
	GetPollingUnitsWithCapacity(ctx context.Context, wardID, localGovernmentID, stateID int32, partyID int16, electionGroupID int32) ([]pollingunitsservice.PollingUnitWithCapacity, error)
}

type BodiesService interface {
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
}

type Handler struct {
	pollingUnitsService PollingUnitsService
	bodiesService       BodiesService
	queries             *queries.Queries
	utils               *utils.Utils
}

func NewHandler(pollingUnitsService PollingUnitsService, bodiesService BodiesService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		pollingUnitsService: pollingUnitsService,
		bodiesService:       bodiesService,
		queries:             q,
		utils:               utils,
	}
}

type CreatePollingUnitRequest struct {
	Name               string   `json:"name"`
	Code               *string  `json:"code"`
	PUCode             *string  `json:"pu_code"`
	RegistrationAreaID *int32   `json:"registration_area_id"`
	WardID             int32    `json:"ward_id"`
	StateID            int32    `json:"state_id"`
	LgaID              int32    `json:"lga_id"`
	Latitude           *float64 `json:"latitude"`
	Longitude          *float64 `json:"longitude"`
	PreciseLocation    *string  `json:"precise_location"`
	FormattedAddress   *string  `json:"formatted_address"`
	GooglePlaceID      *string  `json:"google_place_id"`
}

type UpdatePollingUnitRequest struct {
	Name               string   `json:"name"`
	Code               *string  `json:"code"`
	PUCode             *string  `json:"pu_code"`
	RegistrationAreaID *int32   `json:"registration_area_id"`
	WardID             int32    `json:"ward_id"`
	StateID            int32    `json:"state_id"`
	LgaID              int32    `json:"lga_id"`
	Latitude           *float64 `json:"latitude"`
	Longitude          *float64 `json:"longitude"`
	PreciseLocation    *string  `json:"precise_location"`
	FormattedAddress   *string  `json:"formatted_address"`
	GooglePlaceID      *string  `json:"google_place_id"`
}

// CreatePollingUnit godoc
// @Summary      Create a new polling unit
// @Description  Creates a polling unit under state, LGA, and ward
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        request body CreatePollingUnitRequest true "Create request payload"
// @Success      201  {object} map[string]interface{} "Polling unit created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /polling-units [post]
func (h *Handler) CreatePollingUnit(w http.ResponseWriter, r *http.Request) {
	var req CreatePollingUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 || req.LgaID == 0 || req.WardID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, state_id, lga_id, and ward_id are required")
		return
	}

	// Resolve state name
	state, err := h.bodiesService.CheckStateByID(r.Context(), int16(req.StateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	// Resolve LGA name
	lga, err := h.queries.GetLGAByID(r.Context(), req.LgaID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID: "+err.Error())
		return
	}

	// Resolve Ward name
	ward, err := h.queries.GetWardByID(r.Context(), req.WardID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid Ward ID: "+err.Error())
		return
	}

	arg := queries.CreatePollingUnitParams{
		Name:                    req.Name,
		Code:                    utils.PgTextFromPtr(req.Code),
		PuCode:                  utils.PgTextFromPtr(req.PUCode),
		RegistrationAreaID:      utils.PgInt4FromPtr(req.RegistrationAreaID),
		WardID:                  req.WardID,
		WardName:                ward.Name,
		LgaID:                   req.LgaID,
		LgaName:                 lga.Name,
		SenatorialDistrictID:    lga.SenatorialDistrictID,
		SenatorialDistrictName:  lga.SenatorialDistrictName,
		FederalConstituencyID:   lga.FederalConstituencyID,
		FederalConstituencyName: lga.FederalConstituencyName,
		StateConstituencyID:     ward.StateConstituencyID,
		StateConstituencyName:   ward.StateConstituencyName,
		StateID:                 req.StateID,
		StateName:               state.Name,
		Latitude:                utils.PgFloat8FromPtr(req.Latitude),
		Longitude:               utils.PgFloat8FromPtr(req.Longitude),
		PreciseLocation:         utils.PgTextFromPtr(req.PreciseLocation),
		FormattedAddress:        utils.PgTextFromPtr(req.FormattedAddress),
		GooglePlaceID:           utils.PgTextFromPtr(req.GooglePlaceID),
	}

	pu, err := h.pollingUnitsService.CreatePollingUnit(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create polling unit: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Polling unit created successfully", map[string]interface{}{
		"polling_unit": pu,
	})
}

// GetPollingUnit godoc
// @Summary      Get a polling unit by ID
// @Description  Retrieves details of a single polling unit using its unique database ID
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Polling Unit ID"
// @Success      200  {object} map[string]interface{} "Polling unit fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Polling unit not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /polling-units/{id} [get]
func (h *Handler) GetPollingUnit(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit ID")
		return
	}

	pu, err := h.pollingUnitsService.GetPollingUnitByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Polling unit not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling unit fetched successfully", map[string]interface{}{
		"polling_unit": pu,
	})
}

// UpdatePollingUnit godoc
// @Summary      Update a polling unit
// @Description  Modifies the details of an existing polling unit
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Polling Unit ID"
// @Param        request body UpdatePollingUnitRequest true "Update request payload"
// @Success      200  {object} map[string]interface{} "Polling unit updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Polling unit not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /polling-units/{id} [put]
func (h *Handler) UpdatePollingUnit(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit ID")
		return
	}

	var req UpdatePollingUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.StateID == 0 || req.LgaID == 0 || req.WardID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, state_id, lga_id, and ward_id are required")
		return
	}

	// Verify it exists
	_, err = h.pollingUnitsService.GetPollingUnitByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Polling unit not found")
		return
	}

	// Resolve state name
	state, err := h.bodiesService.CheckStateByID(r.Context(), int16(req.StateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	// Resolve LGA name
	lga, err := h.queries.GetLGAByID(r.Context(), req.LgaID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID: "+err.Error())
		return
	}

	// Resolve Ward name
	ward, err := h.queries.GetWardByID(r.Context(), req.WardID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid Ward ID: "+err.Error())
		return
	}

	arg := queries.UpdatePollingUnitParams{
		ID:                      int32(id),
		Name:                    req.Name,
		Code:                    utils.PgTextFromPtr(req.Code),
		PuCode:                  utils.PgTextFromPtr(req.PUCode),
		RegistrationAreaID:      utils.PgInt4FromPtr(req.RegistrationAreaID),
		WardID:                  req.WardID,
		WardName:                ward.Name,
		LgaID:                   req.LgaID,
		LgaName:                 lga.Name,
		SenatorialDistrictID:    lga.SenatorialDistrictID,
		SenatorialDistrictName:  lga.SenatorialDistrictName,
		FederalConstituencyID:   lga.FederalConstituencyID,
		FederalConstituencyName: lga.FederalConstituencyName,
		StateConstituencyID:     ward.StateConstituencyID,
		StateConstituencyName:   ward.StateConstituencyName,
		StateID:                 req.StateID,
		StateName:               state.Name,
		Latitude:                utils.PgFloat8FromPtr(req.Latitude),
		Longitude:               utils.PgFloat8FromPtr(req.Longitude),
		PreciseLocation:         utils.PgTextFromPtr(req.PreciseLocation),
		FormattedAddress:        utils.PgTextFromPtr(req.FormattedAddress),
		GooglePlaceID:           utils.PgTextFromPtr(req.GooglePlaceID),
	}

	updatedPU, err := h.pollingUnitsService.UpdatePollingUnit(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update polling unit: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling unit updated successfully", map[string]interface{}{
		"polling_unit": updatedPU,
	})
}

// DeletePollingUnit godoc
// @Summary      Delete a polling unit
// @Description  Removes a polling unit from the database by its ID
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Polling Unit ID"
// @Success      200  {object} map[string]interface{} "Polling unit deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Polling unit not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /polling-units/{id} [delete]
func (h *Handler) DeletePollingUnit(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit ID")
		return
	}

	// Verify it exists
	_, err = h.pollingUnitsService.GetPollingUnitByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Polling unit not found")
		return
	}

	if err := h.pollingUnitsService.DeletePollingUnit(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete polling unit: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling unit deleted successfully", nil)
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type PollingUnitResponse struct {
	ID                  int32   `json:"id"`
	Name                string  `json:"name"`
	Code                string  `json:"code"`
	PUCode              string  `json:"pu_code"`
	RegistrationAreaID  int32   `json:"registration_area_id"`
	WardID              int32   `json:"ward_id"`
	WardName            string  `json:"ward_name"`
	LocalGovernmentID   int32   `json:"lga_id"`
	LocalGovernmentName string  `json:"lga_name"`
	StateID             int32   `json:"state_id"`
	StateName           string  `json:"state_name"`
	Latitude            float64 `json:"latitude"`
	Longitude           float64 `json:"longitude"`
	PreciseLocation     string  `json:"precise_location"`
	FormattedAddress    string  `json:"formatted_address"`
	GooglePlaceID       string  `json:"google_place_id"`
}

type GetPollingUnitsResponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message"`
	Data    GetPollingUnitsData `json:"data"`
	Meta    *PaginationMeta     `json:"meta,omitempty"`
}

type GetPollingUnitsData struct {
	PollingUnits []PollingUnitResponse `json:"polling_units"`
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

// GetPollingUnits godoc
// @Summary      Get polling units
// @Description  Fetches polling units with optional ward_id, lga_id, and state_id filtering and cursor pagination
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        ward_id              query     int     false  "Ward ID to filter by"
// @Param        lga_id               query     int     false  "LGA ID to filter by"
// @Param        state_id             query     int     false  "State ID to filter by"
// @Param        search               query     string  false  "Search query for polling unit name or code"
// @Param        limit                query     int     false  "Limit (default 20, max 100)"
// @Param        cursor               query     string  false  "Cursor (ID of last record)"
// @Success      200                  {object}  GetPollingUnitsResponse
// @Failure      500                  {string}  failed to fetch polling units
// @Router       /polling-units [get]
func (h *Handler) GetPollingUnits(w http.ResponseWriter, r *http.Request) {
	wardID := parseOptionalQueryInt(r, "ward_id")
	localGovernmentID := parseOptionalQueryInt(r, "lga_id")
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParams(r)
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	// Fetch limit + 1 records to check if additional pages exist without an extra COUNT query
	fetchLimit := limit + 1

	// Query PostgreSQL using indexed filters, case-insensitive I-LIKE search, and cursor pagination
	units, err := h.pollingUnitsService.GetPollingUnitsPaginated(r.Context(), queries.GetPollingUnitsPaginatedParams{
		WardID:   wardID,
		LgaID:    localGovernmentID,
		StateID:  stateID,
		Search:   utils.PgTextFromString(search),
		Cursor:   pgtype.Int4{Int32: int32(cursor), Valid: cursor > 0},
		LimitNum: int32(fetchLimit),
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch polling units: "+err.Error())
		return
	}

	// Determine if more records exist and trim the slice back to requested limit
	hasMore := false
	nextCursor := ""
	if len(units) > limit {
		hasMore = true
		units = units[:limit]
	}
	if len(units) > 0 {
		// Use ID of the last record in current page as cursor for next page
		nextCursor = strconv.FormatInt(int64(units[len(units)-1].ID), 10)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling units fetched successfully", map[string]interface{}{
		"polling_units": units,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetPollingUnitsWithCapacity godoc
// @Summary      Get polling units with recruitment capacity
// @Description  Fetches polling units with agent recruitment capacity for a given party and election group
// @Tags         Polling Units
// @Accept       json
// @Produce      json
// @Param        party_id             query     int     true   "Party ID for capacity check"
// @Param        election_group_id    query     int     true   "Election Group ID for capacity check"
// @Param        ward_id              query     int     false  "Ward ID to filter by"
// @Param        lga_id               query     int     false  "LGA ID to filter by"
// @Param        state_id             query     int     false  "State ID to filter by"
// @Param        limit                query     int     false  "Limit (default 20, max 100)"
// @Param        cursor               query     string  false  "Cursor (ID of last record)"
// @Param        order_by             query     string  false  "Sort column (name or id)"
// @Param        order_dir            query     string  false  "Sort direction (ASC or DESC)"
// @Success      200                  {object}  GetPollingUnitsResponse
// @Failure      400                  {string}  party_id and election_group_id are required
// @Failure      500                  {string}  failed to fetch polling units with capacity
// @Router       /polling-units/capacity [get]
func (h *Handler) GetPollingUnitsWithCapacity(w http.ResponseWriter, r *http.Request) {
	partyID := int16(parseOptionalQueryInt(r, "party_id"))
	electionGroupID := int32(parseOptionalQueryInt(r, "election_group_id"))

	if partyID <= 0 || electionGroupID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id and election_group_id are required")
		return
	}

	wardID := parseOptionalQueryInt(r, "ward_id")
	localGovernmentID := parseOptionalQueryInt(r, "lga_id")
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParams(r)

	units, err := h.pollingUnitsService.GetPollingUnitsWithCapacity(r.Context(), wardID, localGovernmentID, stateID, partyID, electionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch polling units with capacity: "+err.Error())
		return
	}

	orderBy, orderDir := parseSortParams(r, "name", "ASC")

	sort.SliceStable(units, func(i, j int) bool {
		if orderDir == "DESC" {
			i, j = j, i
		}

		if orderBy == "name" {
			return units[i].Name < units[j].Name
		}
		return units[i].ID < units[j].ID
	})

	startIndex := 0
	if cursor > 0 {
		for i, pu := range units {
			if int64(pu.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []pollingunitsservice.PollingUnitWithCapacity
	hasMore := false
	nextCursor := ""

	if startIndex < len(units) {
		endIndex := startIndex + limit
		if endIndex >= len(units) {
			endIndex = len(units)
			paginated = units[startIndex:endIndex]
		} else {
			paginated = units[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []pollingunitsservice.PollingUnitWithCapacity{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling units fetched successfully", map[string]interface{}{
		"polling_units": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

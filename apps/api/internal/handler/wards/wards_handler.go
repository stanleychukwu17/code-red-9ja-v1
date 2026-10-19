package wardshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	wardsservice "free9ja/api/internal/service/wards"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type WardsService interface {
	CreateWard(ctx context.Context, params wardsservice.CreateWardParams) (queries.Ward, error)
	GetWardByID(ctx context.Context, id int32) (queries.Ward, error)
	UpdateWard(ctx context.Context, params wardsservice.UpdateWardParams) (queries.Ward, error)
	DeleteWard(ctx context.Context, id int32) error
	GetWards(ctx context.Context, localGovernmentID, stateID int32) ([]queries.Ward, error)
	GetWardsPaginated(ctx context.Context, arg queries.GetWardsPaginatedParams) ([]queries.Ward, error)
}

type BodiesService interface {
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
}

type Handler struct {
	wardService   WardsService
	bodiesService BodiesService
	queries       *queries.Queries
	utils         *utils.Utils
}

func NewHandler(wardService WardsService, bodiesService BodiesService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		wardService:   wardService,
		bodiesService: bodiesService,
		queries:       q,
		utils:         utils,
	}
}

type CreateWardRequest struct {
	Name    string `json:"name"`
	Code    string `json:"code"`
	LgaID   int32  `json:"lga_id"`
	StateID int32  `json:"state_id"`
}

type UpdateWardRequest struct {
	Name    string `json:"name"`
	Code    string `json:"code"`
	LgaID   int32  `json:"lga_id"`
	StateID int32  `json:"state_id"`
}

// CreateWard godoc
// @Summary      Create a new ward
// @Description  Creates a ward under state and LGA
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        request body CreateWardRequest true "Create request payload"
// @Success      201  {object} map[string]interface{} "Ward created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /wards [post]
func (h *Handler) CreateWard(w http.ResponseWriter, r *http.Request) {
	var req CreateWardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Code == "" || req.StateID == 0 || req.LgaID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, code, state_id, and lga_id are required")
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

	ward, err := h.wardService.CreateWard(
		r.Context(),
		wardsservice.CreateWardParams{
			Name:      req.Name,
			Code:      req.Code,
			LgaID:     req.LgaID,
			LgaName:   lga.Name,
			StateID:   req.StateID,
			StateName: state.Name,
		},
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create ward: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Ward created successfully", map[string]interface{}{
		"ward": ward,
	})
}

// GetWard godoc
// @Summary      Get a ward by ID
// @Description  Retrieves details of a single ward using its unique database ID
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Ward ID"
// @Success      200  {object} map[string]interface{} "Ward fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Ward not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /wards/{id} [get]
func (h *Handler) GetWard(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ward ID")
		return
	}

	ward, err := h.wardService.GetWardByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Ward not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Ward fetched successfully", map[string]interface{}{
		"ward": ward,
	})
}

// UpdateWard godoc
// @Summary      Update a ward
// @Description  Modifies the details of an existing ward
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Ward ID"
// @Param        request body UpdateWardRequest true "Update request payload"
// @Success      200  {object} map[string]interface{} "Ward updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Ward not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /wards/{id} [put]
func (h *Handler) UpdateWard(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ward ID")
		return
	}

	var req UpdateWardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Code == "" || req.StateID == 0 || req.LgaID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, code, state_id, and lga_id are required")
		return
	}

	// Verify it exists
	_, err = h.wardService.GetWardByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Ward not found")
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

	updatedWard, err := h.wardService.UpdateWard(
		r.Context(),
		wardsservice.UpdateWardParams{
			ID:        int32(id),
			Name:      req.Name,
			Code:      req.Code,
			LgaID:     req.LgaID,
			LgaName:   lga.Name,
			StateID:   req.StateID,
			StateName: state.Name,
		},
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update ward: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Ward updated successfully", map[string]interface{}{
		"ward": updatedWard,
	})
}

// DeleteWard godoc
// @Summary      Delete a ward
// @Description  Removes a ward from the database by its ID
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Ward ID"
// @Success      200  {object} map[string]interface{} "Ward deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Ward not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /wards/{id} [delete]
func (h *Handler) DeleteWard(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ward ID")
		return
	}

	// Verify it exists
	_, err = h.wardService.GetWardByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Ward not found")
		return
	}

	if err := h.wardService.DeleteWard(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete ward: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Ward deleted successfully", nil)
}

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

type WardResponse struct {
	ID                  int32  `json:"id"`
	Name                string `json:"name"`
	Code                string `json:"code"`
	LocalGovernmentID   int32  `json:"lga_id"`
	LocalGovernmentName string `json:"lga_name"`
	StateID             int32  `json:"state_id"`
	StateName           string `json:"state_name"`
}

type GetWardsResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetWardsData    `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetWardsData struct {
	Wards []WardResponse `json:"wards"`
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

// GetWards godoc
// @Summary      Get wards (dropdown)
// @Description  Fetches wards for a specific LGA or State (cached in Redis, required for dropdown selectors)
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        lga_id               query     int     false  "LGA ID to filter by"
// @Param        state_id             query     int     false  "State ID to filter by"
// @Success      200                  {object}  GetWardsResponse
// @Failure      400                  {string}  at least one geographic filter is required
// @Failure      500                  {string}  failed to fetch wards
// @Router       /wards [get]
func (h *Handler) GetWards(w http.ResponseWriter, r *http.Request) {
	// Parse required geographic filter parameters for dropdown selection
	localGovernmentID := parseOptionalQueryInt(r, "lga_id")
	stateID := parseOptionalQueryInt(r, "state_id")

	// Ensure at least one geographic filter is provided to prevent accidental full-database dumps
	if localGovernmentID <= 0 && stateID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "At least one geographic filter (lga_id or state_id) is required for ward dropdown selection")
		return
	}

	// Fetch cached or database wards for the specified LGA/State
	wards, err := h.wardService.GetWards(r.Context(), localGovernmentID, stateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch wards: "+err.Error())
		return
	}

	// Return response envelope with cached wards
	h.utils.RespondSuccess(w, http.StatusOK, "Wards fetched successfully", map[string]interface{}{
		"wards": wards,
	})
}

// GetWardsPaginated godoc
// @Summary      Get paginated wards (table listing)
// @Description  Fetches paginated wards directly from PostgreSQL with optional filters, search, and cursor pagination
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        lga_id               query     int     false  "LGA ID to filter by"
// @Param        state_id             query     int     false  "State ID to filter by"
// @Param        search               query     string  false  "Search query for ward name, code, LGA, or state"
// @Param        limit                query     int     false  "Limit (default 20, max 100)"
// @Param        cursor               query     string  false  "Cursor (ID of last record)"
// @Success      200                  {object}  GetWardsResponse
// @Failure      500                  {string}  failed to fetch wards
// @Router       /wards/paginated [get]
func (h *Handler) GetWardsPaginated(w http.ResponseWriter, r *http.Request) {
	// Parse optional filter and pagination parameters (up to 100 max for table listing)
	lgaID := parseOptionalQueryInt(r, "lga_id")
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParamsWithMax(r, 100)
	search := strings.TrimSpace(r.URL.Query().Get("search"))

	// Fetch limit + 1 records to check if additional pages exist without an extra COUNT query
	fetchLimit := limit + 1

	// Query PostgreSQL using indexed filters, case-insensitive ILIKE search, and cursor pagination
	wards, err := h.wardService.GetWardsPaginated(r.Context(), queries.GetWardsPaginatedParams{
		LgaID:    lgaID,
		StateID:  stateID,
		Search:   utils.PgTextFromString(search),
		Cursor:   pgtype.Int4{Int32: int32(cursor), Valid: cursor > 0},
		LimitNum: int32(fetchLimit),
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch wards: "+err.Error())
		return
	}

	// Determine if more records exist and trim the slice back to requested limit
	hasMore := false
	nextCursor := ""
	if len(wards) > limit {
		hasMore = true
		wards = wards[:limit]
	}
	if len(wards) > 0 {
		// Use ID of the last record in current page as cursor for next page
		nextCursor = strconv.FormatInt(int64(wards[len(wards)-1].ID), 10)
	}

	// Return response envelope with paginated items and cursor metadata
	h.utils.RespondSuccess(w, http.StatusOK, "Wards fetched successfully", map[string]interface{}{
		"wards": wards,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

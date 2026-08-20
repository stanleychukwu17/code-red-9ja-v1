package wardshandler

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
type WardsService interface {
	CreateWard(ctx context.Context, name string, code string, lgaID int32, lgaName string, stateID int32, stateName string) (queries.Ward, error)
	GetWardByID(ctx context.Context, id int32) (queries.Ward, error)
	UpdateWard(ctx context.Context, id int32, name string, code string, lgaID int32, lgaName string, stateID int32, stateName string) (queries.Ward, error)
	DeleteWard(ctx context.Context, id int32) error
	GetWards(ctx context.Context, localGovernmentID, stateID int32) ([]queries.Ward, error)
}

type Handler struct {
	wardService WardsService
	queries     *queries.Queries
	utils       *utils.Utils
}

func NewHandler(wardService WardsService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		wardService: wardService,
		queries:     q,
		utils:       utils,
	}
}

type CreateWardRequest struct {
	Name string `json:"name"`
	Code string `json:"code"`
	LgaID   int32  `json:"lga_id"`
	StateID int32  `json:"state_id"`
}

type UpdateWardRequest struct {
	Name string `json:"name"`
	Code string `json:"code"`
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

	// Resolve state name (Nigeria country_id is 161)
	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
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
		req.Name,
		req.Code,
		req.LgaID,
		lga.Name,
		req.StateID,
		state.Name,
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

	// Resolve state name (Nigeria country_id is 161)
	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
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
		int32(id),
		req.Name,
		req.Code,
		req.LgaID,
		lga.Name,
		req.StateID,
		state.Name,
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

// GetWards godoc
// @Summary      Get wards
// @Description  Fetches wards with optional lga_id and state_id filtering and cursor pagination
// @Tags         Wards
// @Accept       json
// @Produce      json
// @Param        lga_id  query     int     false  "LGA ID to filter by"
// @Param        state_id             query     int     false  "State ID to filter by"
// @Param        limit                query     int     false  "Limit (default 20, max 100)"
// @Param        cursor               query     string  false  "Cursor (ID of last record)"
// @Success      200                  {object}  GetWardsResponse
// @Failure      500                  {string}  failed to fetch wards
// @Router       /wards [get]
func (h *Handler) GetWards(w http.ResponseWriter, r *http.Request) {
	localGovernmentID := parseOptionalQueryInt(r, "lga_id")
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParamsWithMax(r, 10000)

	wards, err := h.wardService.GetWards(r.Context(), localGovernmentID, stateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch wards: "+err.Error())
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		searchLower := strings.ToLower(search)
		var filtered []queries.Ward
		for _, w := range wards {
			if strings.Contains(strings.ToLower(w.Name), searchLower) ||
				strings.Contains(strings.ToLower(w.Code), searchLower) ||
				strings.Contains(strings.ToLower(w.LgaName), searchLower) ||
				strings.Contains(strings.ToLower(w.StateName), searchLower) {
				filtered = append(filtered, w)
			}
		}
		wards = filtered
	}

	orderBy, orderDir := parseSortParams(r, "name", "ASC")

	sort.SliceStable(wards, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = wards[i].Name < wards[j].Name
		} else {
			less = wards[i].ID < wards[j].ID
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	startIndex := 0
	if cursor > 0 {
		for i, w := range wards {
			if int64(w.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.Ward
	hasMore := false
	nextCursor := ""

	if startIndex < len(wards) {
		endIndex := startIndex + limit
		if endIndex >= len(wards) {
			endIndex = len(wards)
			paginated = wards[startIndex:endIndex]
		} else {
			paginated = wards[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.Ward{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Wards fetched successfully", map[string]interface{}{
		"wards": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

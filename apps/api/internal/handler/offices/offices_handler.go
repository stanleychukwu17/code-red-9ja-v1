package officeshandler

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

type OfficesService interface {
	CreateOffice(ctx context.Context, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error)
	GetOfficeByID(ctx context.Context, id int16) (queries.Office, error)
	GetOfficeByName(ctx context.Context, name string) (queries.Office, error)
	ListOffices(ctx context.Context) ([]queries.Office, error)
	UpdateOffice(ctx context.Context, id int16, name, election, scope string, rank int32, inecElectionTypeID *string) (queries.Office, error)
	DeleteOffice(ctx context.Context, id int16) error
}

type Handler struct {
	service OfficesService
	utils   *utils.Utils
}

func NewHandler(service OfficesService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

func parsePaginationParams(r *http.Request) (int, int16) {
	// 1. Default limit is 20; clamp between 1 and 100
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 100 {
				limit = 100
			} else {
				limit = l
			}
		}
	}

	// 2. Parse optional integer cursor (ID of the last item from previous page)
	var cursor int16
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 16); err == nil {
			cursor = int16(c)
		}
	}
	return limit, cursor
}

type CreateOfficeRequest struct {
	Name               string  `json:"name"`
	Election           string  `json:"election"`
	Scope              string  `json:"scope"`
	Rank               int32   `json:"rank"`
	InecElectionTypeID *string `json:"inec_election_type_id"`
}

type UpdateOfficeRequest struct {
	Name               string  `json:"name"`
	Election           string  `json:"election"`
	Scope              string  `json:"scope"`
	Rank               int32   `json:"rank"`
	InecElectionTypeID *string `json:"inec_election_type_id"`
}

// CreateOffice godoc
// @Summary      Create a new office
// @Description  Creates a new office with name, office, scope, rank, and optional inec_election_type_id
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        request body CreateOfficeRequest true "Create Office payload"
// @Success      201  {object} map[string]interface{} "Office created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices [post]
func (h *Handler) CreateOffice(w http.ResponseWriter, r *http.Request) {
	// 1. Decode incoming JSON request payload
	var req CreateOfficeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 2. Validate mandatory fields (name, election category, scope, and positive rank)
	if req.Name == "" || req.Election == "" || req.Scope == "" || req.Rank <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election, scope, and rank are required")
		return
	}

	// 3. Delegate office creation to service (persists record in DB)
	o, err := h.service.CreateOffice(r.Context(), req.Name, req.Election, req.Scope, req.Rank, req.InecElectionTypeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create office: "+err.Error())
		return
	}

	// 4. Return 201 Created with the new office record
	h.utils.RespondSuccess(w, http.StatusCreated, "Office created successfully", map[string]interface{}{
		"office": o,
	})
}

// ListOffices godoc
// @Summary      List offices
// @Description  Fetches a paginated list of offices using cursor pagination
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        limit  query int    false "Limit (default 20, max 100)"
// @Param        cursor query string false "Cursor (ID of last record)"
// @Success      200  {object} map[string]interface{} "Offices fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices [get]
func (h *Handler) ListOffices(w http.ResponseWriter, r *http.Request) {
	// 1. Parse pagination query parameters (limit and last-seen cursor ID)
	limit, cursor := parsePaginationParams(r)

	// 2. Parse sort parameters (defaulting to rank ASC)
	orderBy := r.URL.Query().Get("orderBy")
	if orderBy == "" {
		orderBy = "rank"
	}
	order := strings.ToUpper(r.URL.Query().Get("order"))
	if order != "DESC" {
		order = "ASC"
	}

	// 3. Fetch all offices from service (reads from DB ordered by ID)
	offices, err := h.service.ListOffices(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch offices: "+err.Error())
		return
	}

	// 4. In-memory sorting based on requested column (name or rank) and direction (ASC/DESC)
	sort.SliceStable(offices, func(i, j int) bool {
		// For descending order, swap indices (j < i) to maintain strict weak ordering without violating equality
		if order == "DESC" {
			i, j = j, i
		}

		switch orderBy {
		case "name":
			return offices[i].Name < offices[j].Name
		default:
			return offices[i].Rank < offices[j].Rank
		}
	})

	// 5. Cursor-based pagination: find the index after the cursor ID
	startIndex := 0
	if cursor > 0 {
		for i, o := range offices {
			if o.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	// 6. Slice the requested page (limit items) and determine next_cursor / has_more
	var paginated []queries.Office
	hasMore := false
	nextCursor := ""

	if startIndex < len(offices) {
		endIndex := startIndex + limit
		if endIndex >= len(offices) {
			endIndex = len(offices)
			paginated = offices[startIndex:endIndex]
		} else {
			paginated = offices[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.Office{}
	}

	// 7. Return paginated offices with pagination metadata
	h.utils.RespondSuccess(w, http.StatusOK, "Offices fetched successfully", map[string]interface{}{
		"offices": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetOffice godoc
// @Summary      Get office by ID
// @Description  Retrieves details of a single office using its ID
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Office ID"
// @Success      200  {object} map[string]interface{} "Office fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Office not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices/{id} [get]
func (h *Handler) GetOffice(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and parse office ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	// 2. Fetch office by ID via service
	o, err := h.service.GetOfficeByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	// 3. Return 200 OK with the office details
	h.utils.RespondSuccess(w, http.StatusOK, "Office fetched successfully", map[string]interface{}{
		"office": o,
	})
}

// UpdateOffice godoc
// @Summary      Update an office
// @Description  Modifies name, election, scope, rank, or inec_election_type_id of an existing office
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Office ID"
// @Param        request body UpdateOfficeRequest true "Update Office payload"
// @Success      200  {object} map[string]interface{} "Office updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      404  {object} map[string]interface{} "Office not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices/{id} [put]
func (h *Handler) UpdateOffice(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and parse office ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	// 2. Decode incoming JSON update payload
	var req UpdateOfficeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 3. Validate mandatory fields
	if req.Name == "" || req.Election == "" || req.Scope == "" || req.Rank <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election, scope, and rank are required")
		return
	}

	// 4. Verify office exists before updating
	_, err = h.service.GetOfficeByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	// 5. Update office details via service
	updated, err := h.service.UpdateOffice(r.Context(), int16(id), req.Name, req.Election, req.Scope, req.Rank, req.InecElectionTypeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update office: "+err.Error())
		return
	}

	// 6. Return 200 OK with the updated office record
	h.utils.RespondSuccess(w, http.StatusOK, "Office updated successfully", map[string]interface{}{
		"office": updated,
	})
}

// DeleteOffice godoc
// @Summary      Delete an office
// @Description  Removes an office from the database by ID
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Office ID"
// @Success      200  {object} map[string]interface{} "Office deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Office not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices/{id} [delete]
func (h *Handler) DeleteOffice(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and parse office ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	// 2. Verify office exists before deletion
	_, err = h.service.GetOfficeByID(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	// 3. Delete office via service
	if err := h.service.DeleteOffice(r.Context(), int16(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete office: "+err.Error())
		return
	}

	// 4. Return 200 OK confirming deletion
	h.utils.RespondSuccess(w, http.StatusOK, "Office deleted successfully", nil)
}

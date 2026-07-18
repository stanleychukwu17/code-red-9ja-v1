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
	CreateOffice(ctx context.Context, name, election, scope string, rank int32) (queries.Office, error)
	GetOfficeByID(ctx context.Context, id int64) (queries.Office, error)
	GetOfficeByName(ctx context.Context, name string) (queries.Office, error)
	ListOffices(ctx context.Context) ([]queries.Office, error)
	UpdateOffice(ctx context.Context, id int64, name, election, scope string, rank int32) (queries.Office, error)
	DeleteOffice(ctx context.Context, id int64) error
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

func parsePaginationParams(r *http.Request) (int, int64) {
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

	var cursor int64
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = c
		}
	}
	return limit, cursor
}

type CreateOfficeRequest struct {
	Name     string `json:"name"`
	Election string `json:"election"`
	Scope    string `json:"scope"`
	Rank     int32  `json:"rank"`
}

type UpdateOfficeRequest struct {
	Name     string `json:"name"`
	Election string `json:"election"`
	Scope    string `json:"scope"`
	Rank     int32  `json:"rank"`
}

// CreateOffice godoc
// @Summary      Create a new office
// @Description  Creates a new office with name, office, scope, and rank
// @Tags         Offices
// @Accept       json
// @Produce      json
// @Param        request body CreateOfficeRequest true "Create Office payload"
// @Success      201  {object} map[string]interface{} "Office created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /offices [post]
func (h *Handler) CreateOffice(w http.ResponseWriter, r *http.Request) {
	var req CreateOfficeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Election == "" || req.Scope == "" || req.Rank <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election, scope, and rank are required")
		return
	}

	o, err := h.service.CreateOffice(r.Context(), req.Name, req.Election, req.Scope, req.Rank)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create office: "+err.Error())
		return
	}

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
	limit, cursor := parsePaginationParams(r)
	orderBy := r.URL.Query().Get("orderBy")
	if orderBy == "" {
		orderBy = "rank"
	}
	order := strings.ToUpper(r.URL.Query().Get("order"))
	if order != "DESC" {
		order = "ASC"
	}

	offices, err := h.service.ListOffices(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch offices: "+err.Error())
		return
	}

	// In-memory sort based on orderBy and order
	if orderBy == "rank" {
		sort.SliceStable(offices, func(i, j int) bool {
			if order == "ASC" {
				return offices[i].Rank < offices[j].Rank
			}
			return offices[i].Rank > offices[j].Rank
		})
	} else if orderBy == "name" {
		sort.SliceStable(offices, func(i, j int) bool {
			if order == "ASC" {
				return offices[i].Name < offices[j].Name
			}
			return offices[i].Name > offices[j].Name
		})
	}

	startIndex := 0
	if cursor > 0 {
		for i, o := range offices {
			if o.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

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
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []queries.Office{}
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	o, err := h.service.GetOfficeByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Office fetched successfully", map[string]interface{}{
		"office": o,
	})
}

// UpdateOffice godoc
// @Summary      Update an office
// @Description  Modifies name, election, scope, or rank of an existing office
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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	var req UpdateOfficeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Election == "" || req.Scope == "" || req.Rank <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election, scope, and rank are required")
		return
	}

	// Verify exists
	_, err = h.service.GetOfficeByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	updated, err := h.service.UpdateOffice(r.Context(), id, req.Name, req.Election, req.Scope, req.Rank)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update office: "+err.Error())
		return
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid office ID")
		return
	}

	// Verify exists
	_, err = h.service.GetOfficeByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Office not found")
		return
	}

	if err := h.service.DeleteOffice(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete office: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Office deleted successfully", nil)
}

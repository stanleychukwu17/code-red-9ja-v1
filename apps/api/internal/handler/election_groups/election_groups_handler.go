package electiongroupshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type ElectionGroupsService interface {
	CreateElectionGroup(ctx context.Context, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error)
	GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error)
	ListElectionGroups(ctx context.Context) ([]queries.ElectionGroup, error)
	UpdateElectionGroup(ctx context.Context, id int64, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error)
	DeleteElectionGroup(ctx context.Context, id int64) error
}

type Handler struct {
	service ElectionGroupsService
	utils   *utils.Utils
}

func NewHandler(service ElectionGroupsService, utils *utils.Utils) *Handler {
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

type CreateElectionGroupRequest struct {
	Name           string         `json:"name"`
	Rank           int32          `json:"rank"`
	ElectionsCount int32          `json:"elections_count"`
	StatesCount    int32          `json:"states_count"`
	ElectionDate   utils.JSONDate `json:"election_date"`
}

type UpdateElectionGroupRequest struct {
	Name           string         `json:"name"`
	Rank           int32          `json:"rank"`
	ElectionsCount int32          `json:"elections_count"`
	StatesCount    int32          `json:"states_count"`
	ElectionDate   utils.JSONDate `json:"election_date"`
}

// CreateElectionGroup godoc
// @Summary      Create a new election group
// @Description  Creates a new election group with name, rank, counts, and election date
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        request body CreateElectionGroupRequest true "Create Election Group payload"
// @Success      201  {object} map[string]interface{} "Election group created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups [post]
func (h *Handler) CreateElectionGroup(w http.ResponseWriter, r *http.Request) {
	var req CreateElectionGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.ElectionDate.IsZero() {
		h.utils.RespondError(w, http.StatusBadRequest, "name and election_date are required")
		return
	}

	eg, err := h.service.CreateElectionGroup(r.Context(), req.Name, req.Rank, req.ElectionsCount, req.StatesCount, req.ElectionDate.Time())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create election group: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Election group created successfully", map[string]interface{}{
		"election_group": eg,
	})
}

// ListElectionGroups godoc
// @Summary      List election groups
// @Description  Fetches a paginated list of election groups using cursor pagination
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        limit  query int    false "Limit (default 20, max 100)"
// @Param        cursor query string false "Cursor (ID of last record)"
// @Success      200  {object} map[string]interface{} "Election groups fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups [get]
func (h *Handler) ListElectionGroups(w http.ResponseWriter, r *http.Request) {
	limit, cursor := parsePaginationParams(r)

	electionGroups, err := h.service.ListElectionGroups(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch election groups: "+err.Error())
		return
	}

	startIndex := 0
	if cursor > 0 {
		for i, eg := range electionGroups {
			if eg.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.ElectionGroup
	hasMore := false
	nextCursor := ""

	if startIndex < len(electionGroups) {
		endIndex := startIndex + limit
		if endIndex >= len(electionGroups) {
			endIndex = len(electionGroups)
			paginated = electionGroups[startIndex:endIndex]
		} else {
			paginated = electionGroups[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []queries.ElectionGroup{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Election groups fetched successfully", map[string]interface{}{
		"election_groups": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetElectionGroup godoc
// @Summary      Get election group by ID
// @Description  Retrieves details of a single election group using its ID
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election Group ID"
// @Success      200  {object} map[string]interface{} "Election group fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Election group not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups/{id} [get]
func (h *Handler) GetElectionGroup(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	eg, err := h.service.GetElectionGroupByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Election group fetched successfully", map[string]interface{}{
		"election_group": eg,
	})
}

// UpdateElectionGroup godoc
// @Summary      Update an election group
// @Description  Modifies name, rank, counts, or election date of an existing election group
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election Group ID"
// @Param        request body UpdateElectionGroupRequest true "Update Election Group payload"
// @Success      200  {object} map[string]interface{} "Election group updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      404  {object} map[string]interface{} "Election group not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups/{id} [put]
func (h *Handler) UpdateElectionGroup(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	var req UpdateElectionGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.ElectionDate.IsZero() {
		h.utils.RespondError(w, http.StatusBadRequest, "name and election_date are required")
		return
	}

	_, err = h.service.GetElectionGroupByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	updated, err := h.service.UpdateElectionGroup(r.Context(), id, req.Name, req.Rank, req.ElectionsCount, req.StatesCount, req.ElectionDate.Time())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update election group: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Election group updated successfully", map[string]interface{}{
		"election_group": updated,
	})
}

// DeleteElectionGroup godoc
// @Summary      Delete an election group
// @Description  Removes an election group from the database by ID
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election Group ID"
// @Success      200  {object} map[string]interface{} "Election group deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Election group not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups/{id} [delete]
func (h *Handler) DeleteElectionGroup(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	_, err = h.service.GetElectionGroupByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	if err := h.service.DeleteElectionGroup(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete election group: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Election group deleted successfully", nil)
}

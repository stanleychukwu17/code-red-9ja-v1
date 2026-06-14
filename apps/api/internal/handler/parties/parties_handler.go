package partieshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type PartiesService interface {
	CreateParty(ctx context.Context, shortName, name, logo string) (queries.Party, error)
	GetPartyByID(ctx context.Context, id int64) (queries.Party, error)
	GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error)
	ListParties(ctx context.Context) ([]queries.Party, error)
	UpdateParty(ctx context.Context, id int64, shortName, name, logo string) (queries.Party, error)
	DeleteParty(ctx context.Context, id int64) error
}

type Handler struct {
	partiesService PartiesService
	utils          *utils.Utils
}

func NewHandler(partiesService PartiesService, utils *utils.Utils) *Handler {
	return &Handler{
		partiesService: partiesService,
		utils:          utils,
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

type CreatePartyRequest struct {
	ShortName string `json:"short_name"`
	Name      string `json:"name"`
	Logo      string `json:"logo"`
}

type UpdatePartyRequest struct {
	ShortName string `json:"short_name"`
	Name      string `json:"name"`
	Logo      string `json:"logo"`
}

// CreateParty godoc
// @Summary      Create a new political party
// @Description  Creates a political party with a unique short name, full name, and logo
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        request body CreatePartyRequest true "Create Party request payload"
// @Success      210  {object} map[string]interface{} "Party created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties [post]
func (h *Handler) CreateParty(w http.ResponseWriter, r *http.Request) {
	var req CreatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	party, err := h.partiesService.CreateParty(r.Context(), req.ShortName, req.Name, req.Logo)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Party created successfully", map[string]interface{}{
		"party": party,
	})
}

// ListParties godoc
// @Summary      List all political parties
// @Description  Fetches a paginated list of political parties ordered by ID using cursor pagination
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        limit  query int    false "Limit (default 20, max 100)"
// @Param        cursor query string false "Cursor (ID of last record)"
// @Success      200  {object} map[string]interface{} "Parties fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties [get]
func (h *Handler) ListParties(w http.ResponseWriter, r *http.Request) {
	limit, cursor := parsePaginationParams(r)

	parties, err := h.partiesService.ListParties(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch parties: "+err.Error())
		return
	}

	startIndex := 0
	if cursor > 0 {
		for i, p := range parties {
			if p.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.Party
	hasMore := false
	nextCursor := ""

	if startIndex < len(parties) {
		endIndex := startIndex + limit
		if endIndex >= len(parties) {
			endIndex = len(parties)
			paginated = parties[startIndex:endIndex]
		} else {
			paginated = parties[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []queries.Party{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Parties fetched successfully", map[string]interface{}{
		"parties": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetParty godoc
// @Summary      Get a political party by ID
// @Description  Retrieves details of a single political party using its unique database ID
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Party fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [get]
func (h *Handler) GetParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	party, err := h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party fetched successfully", map[string]interface{}{
		"party": party,
	})
}

// UpdateParty godoc
// @Summary      Update a political party
// @Description  Modifies the short name, full name, or logo URL of an existing political party
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Param        request body UpdatePartyRequest true "Update Party request payload"
// @Success      200  {object} map[string]interface{} "Party updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [put]
func (h *Handler) UpdateParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req UpdatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	// Verify party exists
	_, err = h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	updatedParty, err := h.partiesService.UpdateParty(r.Context(), id, req.ShortName, req.Name, req.Logo)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party updated successfully", map[string]interface{}{
		"party": updatedParty,
	})
}

// DeleteParty godoc
// @Summary      Delete a political party
// @Description  Removes a political party from the database by its ID
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Party deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [delete]
func (h *Handler) DeleteParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Verify party exists
	_, err = h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	if err := h.partiesService.DeleteParty(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party deleted successfully", nil)
}

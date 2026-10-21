package electiongroupshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/audit"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

type ElectionGroupsService interface {
	CreateElectionGroup(ctx context.Context, name string, year int16) (queries.ElectionGroup, error)
	ListElectionGroups(ctx context.Context, active *bool) ([]queries.ElectionGroup, error)
	UpdateElectionGroup(ctx context.Context, id int32, name string, year int16, active bool) (queries.ElectionGroup, error)
	DeleteElectionGroup(ctx context.Context, id int32) error
	ListElectionGroupsWithPartyStats(ctx context.Context, partyID int16, active *bool) ([]queries.ListElectionGroupsWithPartyStatsRow, error)
	UpsertPartyElectionGroupStats(ctx context.Context, partyID int16, electionGroupID int32, pollingAgentsCoverage []byte, electionsContesting int32) (queries.PartyElectionGroup, error)
	ListGroupElections(ctx context.Context, electionGroupID int32) ([]queries.ElectionGroupListItem, error)
}

type ElectionsService interface {
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
}

type Handler struct {
	service          ElectionGroupsService
	electionsService ElectionsService
	auditService     audit.AuditService
	validate         *validator.Validate
	utils            *utils.Utils
}

func NewHandler(service ElectionGroupsService, electionsService ElectionsService, auditService audit.AuditService, utils *utils.Utils) *Handler {
	return &Handler{
		service:      service,
		electionsService: electionsService,
		auditService:     auditService,
		validate:     validator.New(),
		utils:        utils,
	}
}

type CreateElectionGroupRequest struct {
	Name string `json:"name" validate:"required"`
	Year int16  `json:"year" validate:"required,gt=0"`
}

type UpdateElectionGroupRequest struct {
	Name   *string `json:"name" validate:"omitempty,min=1"`
	Year   *int16  `json:"year" validate:"omitempty,gt=0"`
	Active *bool   `json:"active"`
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
	// 1. Decode incoming JSON request payload
	var req CreateElectionGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 2. Validate mandatory fields (name and year)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// 3. Delegate creation to service (persists group, updates caches, and seeds national metrics in background)
	eg, err := h.service.CreateElectionGroup(r.Context(), req.Name, req.Year)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create election group: "+err.Error())
		return
	}

	// --- Audit Logging ---
	newValuesJSON, _ := json.Marshal(eg)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionCreateElectionGroup,
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(int64(eg.ID), 10),
		NewValues:  newValuesJSON,
	})

	// 4. Return 201 Created with the new election group record
	h.utils.RespondSuccess(w, http.StatusCreated, "Election group created successfully", map[string]interface{}{
		"election_group": eg,
	})
}

type ElectionGroupResponse struct {
	ID                                 int32              `json:"id"`
	Name                               string             `json:"name"`
	Year                               int16              `json:"year"`
	Active                             bool               `json:"active"`
	CreatedAt                          pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                          pgtype.Timestamptz `json:"updated_at"`
	PollingAgentsCoverage              interface{}        `json:"polling_agents_coverage"`
	NumberOfElectionsPartyIsContesting int32              `json:"number_of_elections_party_is_contesting"`
}

// ListElectionGroups godoc
// @Summary      List election groups
// @Description  Fetches all election groups ordered by election date descending
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        party_id query int false "Party ID for stats"
// @Param        active query bool false "Filter by active status"
// @Success      200  {object} map[string]interface{} "Election groups fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups [get]
func (h *Handler) ListElectionGroups(w http.ResponseWriter, r *http.Request) {
	// 1. Check for optional party_id to fetch party-specific stats (e.g. agent coverage)
	var partyID int64
	if partyIDStr := r.URL.Query().Get("party_id"); partyIDStr != "" {
		if pid, err := strconv.ParseInt(partyIDStr, 10, 64); err == nil {
			partyID = pid
		}
	}

	// 2. Check for optional active filter (e.g. ?active=true)
	var activeFilter *bool
	if activeStr := r.URL.Query().Get("active"); activeStr != "" {
		if b, err := strconv.ParseBool(activeStr); err == nil {
			activeFilter = &b
		}
	}

	responseGroups := make([]ElectionGroupResponse, 0)

	// 3. Fetch election groups: enriched with party metrics if partyID is supplied, otherwise standard list
	if partyID > 0 {
		rows, err := h.service.ListElectionGroupsWithPartyStats(r.Context(), int16(partyID), activeFilter)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch election groups with party stats: "+err.Error())
			return
		}
		for _, row := range rows {
			responseGroups = append(responseGroups, ElectionGroupResponse{
				ID:                                 row.ID,
				Name:                               row.Name,
				Year:                               row.Year,
				Active:                             row.Active,
				CreatedAt:                          row.CreatedAt,
				UpdatedAt:                          row.UpdatedAt,
				PollingAgentsCoverage:              json.RawMessage(row.PollingAgentsCoverage),
				NumberOfElectionsPartyIsContesting: row.ElectionsContesting,
			})
		}
	} else {
		groups, err := h.service.ListElectionGroups(r.Context(), activeFilter)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch election groups: "+err.Error())
			return
		}

		for _, g := range groups {
			responseGroups = append(responseGroups, ElectionGroupResponse{
				ID:        g.ID,
				Name:      g.Name,
				Year:      g.Year,
				Active:    g.Active,
				CreatedAt: g.CreatedAt,
				UpdatedAt: g.UpdatedAt,
			})
		}
	}

	// 4. Return the election groups with backward-compatible meta
	h.utils.RespondSuccess(w, http.StatusOK, "Election groups fetched successfully", map[string]interface{}{
		"election_groups": responseGroups,
		"meta": map[string]interface{}{
			"next_cursor": "",
			"has_more":    false,
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
	// 1. Extract and parse election group ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	// 2. Fetch the election group by ID (service checks in-memory cache first, falls back to DB)
	eg, err := h.electionsService.GetElectionGroupByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	// 3. Return 200 OK with the election group details
	h.utils.RespondSuccess(w, http.StatusOK, "Election group fetched successfully", map[string]interface{}{
		"election_group": eg,
	})
}

// UpdateElectionGroup godoc
// @Summary      Update an election group
// @Description  Modifies name or election date of an existing election group
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
	// 1. Extract and parse election group ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	// 2. Decode incoming JSON update payload
	var req UpdateElectionGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate payload fields if provided
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// 3. Verify the election group exists before attempting update
	existingGroup, err := h.electionsService.GetElectionGroupByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	// 4. Resolve update values (fallback to existing values if not provided in payload)
	name := existingGroup.Name
	if req.Name != nil && *req.Name != "" {
		name = *req.Name
	}

	year := existingGroup.Year
	if req.Year != nil && *req.Year > 0 {
		year = *req.Year
	}

	active := existingGroup.Active
	if req.Active != nil {
		active = *req.Active
	}

	// 5. Update election group via service (updates group and invalidates cache)
	updated, err := h.service.UpdateElectionGroup(r.Context(), int32(id), name, year, active)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update election group: "+err.Error())
		return
	}

	// --- Audit Logging ---
	oldValuesJSON, _ := json.Marshal(existingGroup)
	newValuesJSON, _ := json.Marshal(updated)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionUpdateElectionGroup,
		EntityType: db.EntityTypeElections,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	// 6. Return 200 OK with the updated election group
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
	// 1. Extract and parse election group ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	// 2. Verify election group exists before attempting deletion
	existingGroup, err := h.electionsService.GetElectionGroupByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election group not found")
		return
	}

	// 3. Delete election group via service (checks for active candidates, deletes record, and invalidates cache)
	if err := h.service.DeleteElectionGroup(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// --- Audit Logging ---
	oldValuesJSON, _ := json.Marshal(existingGroup)
	newValuesJSON, _ := json.Marshal(map[string]string{"status": "deleted"})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionDeleteElectionGroup,
		EntityType: db.EntityTypeElections,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	// 4. Return 200 OK confirming deletion
	h.utils.RespondSuccess(w, http.StatusOK, "Election group deleted successfully", nil)
}

type UpsertPartyElectionGroupStatsRequest struct {
	PartyID               int64       `json:"party_id" validate:"required,gt=0"`
	PollingAgentsCoverage interface{} `json:"polling_agents_coverage"`
	ElectionsContesting   int32       `json:"elections_contesting"`
}

// UpsertPartyElectionGroupStats godoc
// @Summary      Upsert party election group stats
// @Description  Upserts party-specific statistics for an election group
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        id      path  int  true  "Election Group ID"
// @Param        request body UpsertPartyElectionGroupStatsRequest true "Upsert Stats payload"
// @Success      200  {object} map[string]interface{} "Stats upserted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or parameters"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups/{id}/party-stats [put]
func (h *Handler) UpsertPartyElectionGroupStats(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and parse election group ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	electionGroupID, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	// 2. Decode incoming JSON request payload
	var req UpsertPartyElectionGroupStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 3. Validate required fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// 4. Marshal polling agent coverage into JSON bytes and upsert stats via service
	coverageBytes, _ := json.Marshal(req.PollingAgentsCoverage)
	stats, err := h.service.UpsertPartyElectionGroupStats(r.Context(), int16(req.PartyID), int32(electionGroupID), coverageBytes, req.ElectionsContesting)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to upsert party election group stats: "+err.Error())
		return
	}

	// 5. Return 200 OK with the upserted party election group stats
	h.utils.RespondSuccess(w, http.StatusOK, "Party election group stats upserted successfully", map[string]interface{}{
		"party_election_group": stats,
	})
}

// ListGroupElections godoc
// @Summary      List elections for an election group
// @Description  Fetches the list of elections associated with a specific election group ID
// @Tags         ElectionGroups
// @Produce      json
// @Param        id   path  int  true  "Election Group ID"
// @Success      200  {object} map[string]interface{} "Elections fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid election group ID"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups/{id}/elections [get]
func (h *Handler) ListGroupElections(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and parse election group ID from URL path parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	// 2. Fetch all child elections associated with this election group via service
	elections, err := h.service.ListGroupElections(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch group elections: "+err.Error())
		return
	}

	// 3. Return 200 OK with the list of elections
	h.utils.RespondSuccess(w, http.StatusOK, "Elections fetched successfully", map[string]interface{}{
		"elections": elections,
	})
}

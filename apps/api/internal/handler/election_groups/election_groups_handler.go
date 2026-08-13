package electiongroupshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type ElectionGroupsService interface {
	CreateElectionGroup(ctx context.Context, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error)
	GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error)
	ListElectionGroups(ctx context.Context) ([]queries.ElectionGroup, error)
	UpdateElectionGroup(ctx context.Context, id int64, name string, rank int32, electionsCount, statesCount int32, electionDate time.Time) (queries.ElectionGroup, error)
	DeleteElectionGroup(ctx context.Context, id int64) error
	ListElectionGroupsWithPartyStats(ctx context.Context, partyID int16) ([]queries.ListElectionGroupsWithPartyStatsRow, error)
	UpsertPartyElectionGroupStats(ctx context.Context, partyID int16, electionGroupID int64, pollingAgentsCoverage []byte, electionsContesting int32) (queries.PartyElectionGroup, error)
	ListGroupElections(ctx context.Context, electionGroupID int64) ([]queries.ListElectionsDetailedByGroupIDRow, error)
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

type ElectionGroupResponse struct {
	ID                                 int64              `json:"id"`
	Name                               string             `json:"name"`
	Rank                               int32              `json:"rank"`
	ElectionsCount                     int32              `json:"elections_count"`
	StatesCount                        int32              `json:"states_count"`
	ElectionDate                       pgtype.Date        `json:"election_date"`
	CreatedAt                          pgtype.Timestamptz `json:"created_at"`
	UpdatedAt                          pgtype.Timestamptz `json:"updated_at"`
	PollingAgentsCoverage              interface{}        `json:"polling_agents_coverage"`
	NumberOfElectionsPartyIsContesting int32              `json:"number_of_elections_party_is_contesting"`
}

// ListElectionGroups godoc
// @Summary      List election groups
// @Description  Fetches a paginated list of election groups using cursor pagination
// @Tags         ElectionGroups
// @Accept       json
// @Produce      json
// @Param        limit    query int    false "Limit (default 20, max 100)"
// @Param        cursor   query string false "Cursor (ID of last record)"
// @Param        party_id query int    false "Party ID for stats"
// @Success      200  {object} map[string]interface{} "Election groups fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /election-groups [get]
func (h *Handler) ListElectionGroups(w http.ResponseWriter, r *http.Request) {
	limit, cursor := parsePaginationParams(r)

	var partyID int64
	if partyIDStr := r.URL.Query().Get("party_id"); partyIDStr != "" {
		if pid, err := strconv.ParseInt(partyIDStr, 10, 64); err == nil {
			partyID = pid
		}
	}

	var responseGroups []ElectionGroupResponse
	if partyID > 0 {
		rows, err := h.service.ListElectionGroupsWithPartyStats(r.Context(), int16(partyID))
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch election groups with party stats: "+err.Error())
			return
		}
		for _, row := range rows {
			responseGroups = append(responseGroups, ElectionGroupResponse{
				ID:                                 row.ID,
				Name:                               row.Name,
				Rank:                               row.Rank,
				ElectionsCount:                     row.ElectionsCount,
				StatesCount:                        row.StatesCount,
				ElectionDate:                       row.ElectionDate,
				CreatedAt:                          row.CreatedAt,
				UpdatedAt:                          row.UpdatedAt,
				PollingAgentsCoverage:              json.RawMessage(row.PollingAgentsCoverage),
				NumberOfElectionsPartyIsContesting: row.ElectionsContesting,
			})
		}
	} else {
		groups, err := h.service.ListElectionGroups(r.Context())
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch election groups: "+err.Error())
			return
		}
		for _, g := range groups {
			responseGroups = append(responseGroups, ElectionGroupResponse{
				ID:             g.ID,
				Name:           g.Name,
				Rank:           g.Rank,
				ElectionsCount: g.ElectionsCount,
				StatesCount:    g.StatesCount,
				ElectionDate:   g.ElectionDate,
				CreatedAt:      g.CreatedAt,
				UpdatedAt:      g.UpdatedAt,
			})
		}
	}

	if r.URL.Query().Get("upcoming") == "true" {
		var filteredGroups []ElectionGroupResponse
		now := time.Now()
		// keep only time component zeroed for comparison
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for _, eg := range responseGroups {
			if eg.ElectionDate.Valid && !eg.ElectionDate.Time.Before(today) {
				filteredGroups = append(filteredGroups, eg)
			}
		}
		responseGroups = filteredGroups
	}

	orderBy, orderDir := parseSortParams(r, "rank", "ASC")

	sort.SliceStable(responseGroups, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = responseGroups[i].Name < responseGroups[j].Name
		} else if orderBy == "rank" {
			less = responseGroups[i].Rank < responseGroups[j].Rank
		} else {
			less = responseGroups[i].ID < responseGroups[j].ID
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	startIndex := 0
	if cursor > 0 {
		for i, eg := range responseGroups {
			if eg.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []ElectionGroupResponse
	hasMore := false
	nextCursor := ""

	if startIndex < len(responseGroups) {
		endIndex := startIndex + limit
		if endIndex >= len(responseGroups) {
			endIndex = len(responseGroups)
			paginated = responseGroups[startIndex:endIndex]
		} else {
			paginated = responseGroups[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []ElectionGroupResponse{}
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

type UpsertPartyElectionGroupStatsRequest struct {
	PartyID               int64       `json:"party_id"`
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
	idStr := chi.URLParam(r, "id")
	electionGroupID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	var req UpsertPartyElectionGroupStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.PartyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id is required and must be positive")
		return
	}

	coverageBytes, _ := json.Marshal(req.PollingAgentsCoverage)
	stats, err := h.service.UpsertPartyElectionGroupStats(r.Context(), int16(req.PartyID), electionGroupID, coverageBytes, req.ElectionsContesting)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to upsert party election group stats: "+err.Error())
		return
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	elections, err := h.service.ListGroupElections(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch group elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Elections fetched successfully", map[string]interface{}{
		"elections": elections,
	})
}


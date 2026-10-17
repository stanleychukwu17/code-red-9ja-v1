package electionshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/audit"
	elections "free9ja/api/internal/service/elections"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

type ElectionsService interface {
	CreateNationwideElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32) (queries.Election, error)
	CreateStateElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateIDs []int16) (int, error)
	CreateSenatorialDistrictElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, senatorialDistrictIDs []int32) (int, error)
	CreateFederalConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, federalConstituencyIDs []int32) (int, error)
	CreateStateConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateConstituencyIDs []int32) (int, error)
	CreateLgaElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, lgaIDs []int32) (int, error)
	CreateWardElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, wardIDs []int32) (int, error)
	GetElectionByID(ctx context.Context, id int32) (queries.Election, error)
	ListElections(ctx context.Context, filter elections.ListElectionsFilter) ([]queries.ListElectionInstancesRow, error)
	UpdateElection(ctx context.Context, params elections.UpdateElectionParams) (queries.Election, error)
	DeleteElection(ctx context.Context, id int32) error
	GetElectionCandidates(ctx context.Context, electionID int32) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error)
	SyncElectionCandidates(ctx context.Context, electionID int32, candidates []elections.CandidateInput) error
	FieldPartyCandidate(ctx context.Context, electionID int32, partyID int16, candidateID int64) error
	GetNonVotingReasons(ctx context.Context) ([]queries.NonVotingReason, error)
	CreateDidNotVoteReason(ctx context.Context, arg queries.CreateDidNotVoteReasonParams) (queries.DidNotVoteReason, error)
	GetEligibleElectionsForPollingUnit(ctx context.Context, electionGroupID int32, pollingUnitID int32) ([]elections.ElectionWithCandidates, error)
	SubmitElectionVotes(ctx context.Context, userID int64, electionGroupID int32, pollingUnitID int32, votes []elections.VoteInput, votersCardImage string) error
	GetUserElectionGroupVoteStatus(ctx context.Context, userID int64, electionGroupID int32) (elections.UserVoteStatus, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

type Handler struct {
	service      ElectionsService
	usersService UsersService
	auditService audit.AuditService
	validate     *validator.Validate
	utils        *utils.Utils
}

func NewHandler(service ElectionsService, usersService UsersService, auditService audit.AuditService, utils *utils.Utils) *Handler {
	return &Handler{
		service:      service,
		usersService: usersService,
		auditService: auditService,
		validate:     validator.New(),
		utils:        utils,
	}
}

func (h *Handler) logElectionCreationAudit(r *http.Request, scope string, electionGroupID int32, officeID int16, createdCount int, firstElectionID int32, details any) {
	newValuesJSON, _ := json.Marshal(map[string]interface{}{
		"scope":             scope,
		"election_group_id": electionGroupID,
		"office_id":         officeID,
		"created_count":     createdCount,
		"details":           details,
	})

	entityID := strconv.FormatInt(int64(firstElectionID), 10)
	if firstElectionID == 0 {
		entityID = strconv.FormatInt(int64(electionGroupID), 10)
	}

	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionCreateElection,
		EntityType: db.EntityTypeElections,
		EntityID:   entityID,
		NewValues:  newValuesJSON,
	})
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

func parseCommaSeparatedStrings(val string) []string {
	if val == "" {
		return nil
	}
	var res []string
	for _, s := range strings.Split(val, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			res = append(res, s)
		}
	}
	return res
}

func parseCommaSeparatedInt32(val string) []int32 {
	if val == "" {
		return nil
	}
	var res []int32
	for _, s := range strings.Split(val, ",") {
		s = strings.TrimSpace(s)
		if id, err := strconv.ParseInt(s, 10, 32); err == nil {
			res = append(res, int32(id))
		}
	}
	return res
}

func parseCommaSeparatedInt16(val string) []int16 {
	if val == "" {
		return nil
	}
	var res []int16
	for _, s := range strings.Split(val, ",") {
		s = strings.TrimSpace(s)
		if id, err := strconv.ParseInt(s, 10, 16); err == nil {
			res = append(res, int16(id))
		}
	}
	return res
}

type UpdateElectionRequest struct {
	Name            string         `json:"name" validate:"required"`
	ElectionDate    utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID int32          `json:"election_group_id" validate:"required,gt=0"`
}

type ElectionCandidateInput struct {
	CandidateID    int64  `json:"candidate_id" validate:"required"`
	PartyID        int64  `json:"party_id" validate:"required"`
	PartyShortName string `json:"party_short_name" validate:"required"`
}

type CreateNationwideElectionRequest struct {
	OfficeID        int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate    utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID int32          `json:"election_group_id" validate:"required,gt=0"`
}

type CreateStateElectionRequest struct {
	OfficeID        int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate    utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID int32          `json:"election_group_id" validate:"required,gt=0"`
	StateIDs        []int16        `json:"state_ids" validate:"required,min=1"`
}

type CreateSenatorialDistrictElectionRequest struct {
	OfficeID              int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate          utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID       int32          `json:"election_group_id" validate:"required,gt=0"`
	SenatorialDistrictIDs []int32        `json:"senatorial_district_ids" validate:"required,min=1"`
}

type CreateFederalConstituencyElectionRequest struct {
	OfficeID               int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate           utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID        int32          `json:"election_group_id" validate:"required,gt=0"`
	FederalConstituencyIDs []int32        `json:"federal_constituency_ids" validate:"required,min=1"`
}

type CreateStateConstituencyElectionRequest struct {
	OfficeID             int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate         utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID      int32          `json:"election_group_id" validate:"required,gt=0"`
	StateConstituencyIDs []int32        `json:"state_constituency_ids" validate:"required,min=1"`
}

type CreateLgaElectionRequest struct {
	OfficeID        int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate    utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID int32          `json:"election_group_id" validate:"required,gt=0"`
	LgaIDs          []int32        `json:"lga_ids" validate:"required,min=1"`
}

type CreateWardElectionRequest struct {
	OfficeID        int16          `json:"office_id" validate:"required,gt=0"`
	ElectionDate    utils.JSONDate `json:"election_date" validate:"required"`
	ElectionGroupID int32          `json:"election_group_id" validate:"required,gt=0"`
	WardIDs         []int32        `json:"ward_ids" validate:"required,min=1"`
}

// CreateNationwideElection godoc
// @Summary      Create a new nationwide election
// @Description  Creates a new nationwide election with auto-generated names and associated candidates
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateNationwideElectionRequest true "Create Nationwide Election payload"
// @Success      201  {object} map[string]interface{} "Nationwide election created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/nationwide [post]
func (h *Handler) CreateNationwideElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateNationwideElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Create election instance, resolve election group, and seed skeleton results
	election, err := h.service.CreateNationwideElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create nationwide election: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "nationwide", req.ElectionGroupID, req.OfficeID, 1, election.ID, election)

	// Return successful response with the created election entity
	h.utils.RespondSuccess(w, http.StatusCreated, "Nationwide election created successfully", map[string]interface{}{
		"election": election,
	})
}

// CreateStateElection godoc
// @Summary      Create state elections
// @Description  Creates elections for selected states with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateStateElectionRequest true "Create State Elections payload"
// @Success      201  {object} map[string]interface{} "State elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/state [post]
func (h *Handler) CreateStateElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateStateElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target states list)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create election instances for each state, resolve election group, and seed skeleton results
	count, err := h.service.CreateStateElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.StateIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "state", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"state_ids": req.StateIDs,
	})

	// Return successful response with the count of created state election entities
	h.utils.RespondSuccess(w, http.StatusCreated, "State elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// CreateSenatorialDistrictElection godoc
// @Summary      Create senatorial district elections
// @Description  Creates elections for selected senatorial districts with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateSenatorialDistrictElectionRequest true "Create Senatorial District Elections payload"
// @Success      201  {object} map[string]interface{} "Senatorial district elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/senatorial-district [post]
func (h *Handler) CreateSenatorialDistrictElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateSenatorialDistrictElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target senatorial district IDs)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create elections across selected senatorial districts, resolve group, and seed skeleton results
	count, err := h.service.CreateSenatorialDistrictElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.SenatorialDistrictIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create senatorial district elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "senatorial-district", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"senatorial_district_ids": req.SenatorialDistrictIDs,
	})

	// Return successful response with count of created senatorial district elections
	h.utils.RespondSuccess(w, http.StatusCreated, "Senatorial district elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// CreateFederalConstituencyElection godoc
// @Summary      Create federal constituency elections
// @Description  Creates elections for selected federal constituencies with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateFederalConstituencyElectionRequest true "Create Federal Constituency Elections payload"
// @Success      201  {object} map[string]interface{} "Federal constituency elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/federal-constituency [post]
func (h *Handler) CreateFederalConstituencyElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateFederalConstituencyElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target federal constituency IDs)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create elections across selected federal constituencies, resolve group, and seed skeleton results
	count, err := h.service.CreateFederalConstituencyElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.FederalConstituencyIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create federal constituency elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "federal-constituency", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"federal_constituency_ids": req.FederalConstituencyIDs,
	})

	// Return successful response with count of created federal constituency elections
	h.utils.RespondSuccess(w, http.StatusCreated, "Federal constituency elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// CreateStateConstituencyElection godoc
// @Summary      Create state constituency elections
// @Description  Creates elections for selected state constituencies with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateStateConstituencyElectionRequest true "Create State Constituency Elections payload"
// @Success      201  {object} map[string]interface{} "State constituency elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/state-constituency [post]
func (h *Handler) CreateStateConstituencyElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateStateConstituencyElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target state constituency IDs)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create elections across selected state assembly constituencies, resolve group, and seed skeleton results
	count, err := h.service.CreateStateConstituencyElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.StateConstituencyIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state constituency elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "state-constituency", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"state_constituency_ids": req.StateConstituencyIDs,
	})

	// Return successful response with count of created state constituency elections
	h.utils.RespondSuccess(w, http.StatusCreated, "State constituency elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// CreateLgaElection godoc
// @Summary      Create LGA elections
// @Description  Creates elections for selected LGAs with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateLgaElectionRequest true "Create LGA Elections payload"
// @Success      201  {object} map[string]interface{} "LGA elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/lga [post]
func (h *Handler) CreateLgaElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateLgaElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target LGA IDs)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create elections across selected LGAs, resolve group, and seed skeleton results
	count, err := h.service.CreateLgaElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.LgaIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create LGA elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "lga", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"lga_ids": req.LgaIDs,
	})

	// Return successful response with count of created LGA elections
	h.utils.RespondSuccess(w, http.StatusCreated, "LGA elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// CreateWardElection godoc
// @Summary      Create Ward elections
// @Description  Creates elections for selected Wards with auto-generated names, grouped together
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateWardElectionRequest true "Create Ward Elections payload"
// @Success      201  {object} map[string]interface{} "Ward elections created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/ward [post]
// @Security     BearerAuth
func (h *Handler) CreateWardElection(w http.ResponseWriter, r *http.Request) {
	// Parse and decode incoming JSON request payload
	var req CreateWardElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields (office, date, target election group, and target Ward IDs)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Batch create elections across selected Wards, resolve group, and seed skeleton results
	count, err := h.service.CreateWardElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.WardIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create Ward elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "ward", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"ward_ids": req.WardIDs,
	})

	// Return successful response with count of created Ward elections
	h.utils.RespondSuccess(w, http.StatusCreated, "Ward elections created successfully", map[string]interface{}{
		"count": count,
	})
}

// ListElections godoc
// @Summary      List elections
// @Description  Fetches a paginated list of elections using cursor pagination
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        limit  query int    false "Limit (default 20, max 100)"
// @Param        cursor query string false "Cursor (ID of last record)"
// @Success      200  {object} map[string]interface{} "Elections fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections [get]
func (h *Handler) ListElections(w http.ResponseWriter, r *http.Request) {
	// Parse pagination limit and optional starting cursor ID from query params
	limit, cursor := parsePaginationParams(r)
	query := r.URL.Query()

	electionGroupIDs := parseCommaSeparatedInt32(query.Get("election_group_ids"))
	if len(electionGroupIDs) == 0 {
		if gid := query.Get("group_id"); gid != "" {
			electionGroupIDs = parseCommaSeparatedInt32(gid)
		} else if gid := query.Get("election_group_id"); gid != "" {
			electionGroupIDs = parseCommaSeparatedInt32(gid)
		}
	}

	filter := elections.ListElectionsFilter{
		Limit:            int32(limit),
		Cursor:           cursor,
		Search:           query.Get("search"),
		ElectionGroupIDs: electionGroupIDs,
		Scopes:           parseCommaSeparatedStrings(query.Get("scopes")),
		Statuses:         parseCommaSeparatedStrings(query.Get("statuses")),
		StateIDs:         parseCommaSeparatedInt16(query.Get("state_ids")),
		OfficeIDs:        parseCommaSeparatedInt16(query.Get("office_ids")),
		DateFrom:         query.Get("date_from"),
		DateTo:           query.Get("date_to"),
	}

	// Fetch limit + 1 records from database using keyset cursor pagination with filters
	rows, err := h.service.ListElections(r.Context(), filter)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch elections: "+err.Error())
		return
	}

	hasMore := false
	nextCursor := ""

	// If extra record exists, trim it and capture next cursor ID for infinite scrolling
	if len(rows) > limit {
		hasMore = true
		rows = rows[:limit]
		nextCursor = strconv.FormatInt(int64(rows[len(rows)-1].ID), 10)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Elections fetched successfully", map[string]interface{}{
		"elections": rows,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetElection godoc
// @Summary      Get election by ID
// @Description  Retrieves details of a single election using its ID
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election ID"
// @Success      200  {object} map[string]interface{} "Election fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Election not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/{id} [get]
func (h *Handler) GetElection(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Fetch election entity by primary key
	ei, err := h.service.GetElectionByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	// Return election details
	h.utils.RespondSuccess(w, http.StatusOK, "Election fetched successfully", map[string]interface{}{
		"election": ei,
	})
}

// UpdateElection godoc
// @Summary      Update an election
// @Description  Modifies name, candidates count, date, group ID, or type ID of an existing election
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election ID"
// @Param        request body UpdateElectionRequest true "Update Election payload"
// @Success      200  {object} map[string]interface{} "Election updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      404  {object} map[string]interface{} "Election not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/{id} [put]
func (h *Handler) UpdateElection(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Parse JSON update payload
	var req UpdateElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate mandatory fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Verify election exists prior to executing update and capture previous state for audit logging
	existingElection, err := h.service.GetElectionByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	// Update election fields
	updated, err := h.service.UpdateElection(r.Context(), elections.UpdateElectionParams{
		ID:              int32(id),
		Name:            req.Name,
		ElectionDate:    req.ElectionDate.Time(),
		ElectionGroupID: req.ElectionGroupID,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update election: "+err.Error())
		return
	}

	// Record previous state and updated state in the audit log
	oldValuesJSON, _ := json.Marshal(existingElection)
	newValuesJSON, _ := json.Marshal(updated)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionUpdateElection,
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(int64(id), 10),
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	// Return updated election entity
	h.utils.RespondSuccess(w, http.StatusOK, "Election updated successfully", map[string]interface{}{
		"election": updated,
	})
}

// DeleteElection godoc
// @Summary      Delete an election
// @Description  Removes an election from the database by ID
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election ID"
// @Success      200  {object} map[string]interface{} "Election deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Election not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/{id} [delete]
func (h *Handler) DeleteElection(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Verify election exists prior to deletion and capture state for audit logging
	existingElection, err := h.service.GetElectionByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	// Delete election and cascade associated records
	if err := h.service.DeleteElection(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	oldValuesJSON, _ := json.Marshal(existingElection)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionDeleteElection,
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(int64(id), 10),
		OldValues:  oldValuesJSON,
	})

	// Return successful deletion response
	h.utils.RespondSuccess(w, http.StatusOK, "Election deleted successfully", nil)
}

// GetElectionCandidates godoc
// @Summary      Get detailed candidates for an election
// @Description  Fetches the list of candidates associated with a specific election ID
// @Tags         Elections
// @Produce      json
// @Param        id   path  int  true  "Election ID"
// @Success      200  {object} map[string]interface{} "Candidates fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid election ID"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/{id}/candidates [get]
func (h *Handler) GetElectionCandidates(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Parse pagination parameters
	limit, cursor := parsePaginationParams(r)

	// Fetch full candidate roster for the specified election
	candidates, err := h.service.GetElectionCandidates(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get election candidates: "+err.Error())
		return
	}

	// Find starting index matching the cursor
	startIndex := 0
	if cursor > 0 {
		for i, c := range candidates {
			if int64(c.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.ListElectionCandidatesDetailedByElectionIDRow
	hasMore := false
	nextCursor := ""

	// Slice page items and determine next cursor
	if startIndex < len(candidates) {
		endIndex := startIndex + limit
		if endIndex >= len(candidates) {
			endIndex = len(candidates)
			paginated = candidates[startIndex:endIndex]
		} else {
			paginated = candidates[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.ListElectionCandidatesDetailedByElectionIDRow{}
	}

	// Return paginated candidate list with metadata
	h.utils.RespondSuccess(w, http.StatusOK, "Candidates fetched successfully", map[string]interface{}{
		"candidates": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

type SyncCandidatesRequest struct {
	Candidates []ElectionCandidateInput `json:"candidates"`
}

// SyncElectionCandidates godoc
// @Summary      Sync candidates for an election
// @Description  Overwrites/synchronizes the list of candidate IDs associated with a specific election ID
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Election ID"
// @Param        request body SyncCandidatesRequest true "Candidate IDs payload"
// @Success      200  {object} map[string]interface{} "Candidates synced successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or election ID"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/{id}/candidates [post]
func (h *Handler) SyncElectionCandidates(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Parse JSON candidates payload
	var req SyncCandidatesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Map candidates payload into service input structs
	candidateInputs := make([]elections.CandidateInput, len(req.Candidates))
	for i, c := range req.Candidates {
		candidateInputs[i] = elections.CandidateInput{
			CandidateID:    c.CandidateID,
			PartyID:        int16(c.PartyID),
			PartyShortName: c.PartyShortName,
		}
	}

	// Synchronize full candidate roster for this election in a transaction
	err = h.service.SyncElectionCandidates(r.Context(), int32(id), candidateInputs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to sync candidates: "+err.Error())
		return
	}

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Candidates synced successfully", nil)
}

type FieldCandidateRequest struct {
	CandidateID int64 `json:"candidate_id"`
}

// FieldPartyCandidate handles POST /api/v1/elections/{id}/field-candidate
func (h *Handler) FieldPartyCandidate(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Verify user authentication claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse optional candidate ID payload
	var req FieldCandidateRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}
	}

	// Retrieve user account and verify political party membership
	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}
	if !user.PartyID.Valid {
		h.utils.RespondError(w, http.StatusForbidden, "User is not associated with a party")
		return
	}

	// Field candidate under the authenticated user's party
	err = h.service.FieldPartyCandidate(r.Context(), int32(id), user.PartyID.Int16, req.CandidateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to field candidate: "+err.Error())
		return
	}

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Candidate fielded successfully", nil)
}

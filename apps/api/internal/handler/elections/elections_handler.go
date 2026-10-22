package electionshandler

import (
	"context"
	"encoding/json"
	"fmt"
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
	CreateNationwideElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32) (queries.ElectionDetails, error)
	CreateStateElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateIDs []int16) (int, error)
	CreateSenatorialDistrictElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, senatorialDistrictIDs []int32) (int, error)
	CreateFederalConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, federalConstituencyIDs []int32) (int, error)
	CreateStateConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateConstituencyIDs []int32) (int, error)
	CreateLgaElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, lgaIDs []int32) (int, error)
	CreateWardElection(ctx context.Context, params elections.CreateWardElectionParams) (int, error)
	GetElectionByID(ctx context.Context, id int32) (queries.ElectionDetails, error)
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
	ListElections(ctx context.Context, filter elections.ListElectionsFilter) ([]queries.ElectionListItem, error)
	UpdateElection(ctx context.Context, params elections.UpdateElectionParams) (queries.ElectionDetails, error)
	BulkUpdateElectionGroup(ctx context.Context, params elections.BulkUpdateElectionGroupParams) error
	DeleteElection(ctx context.Context, id int32) error
	BulkDeleteElections(ctx context.Context, params elections.BulkDeleteElectionsParams) (elections.BulkDeleteElectionsResult, error)
	GetElectionCandidates(ctx context.Context, electionID int32) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error)
	FieldPartyCandidate(ctx context.Context, election queries.Election, partyID int16, candidateID int64, slot string) error
	UnfieldPartyCandidate(ctx context.Context, election queries.Election, partyID int16, slot string) error
	CheckIfUserEverContested(ctx context.Context, userID int64) (bool, error)
	GetUserActiveCandidacies(ctx context.Context, candidateID int64) ([]queries.UserActiveCandidacy, error)
	GetNonVotingReasons(ctx context.Context) ([]queries.NonVotingReason, error)
	CreateDidNotVoteReason(ctx context.Context, arg queries.CreateDidNotVoteReasonParams) (queries.DidNotVoteReason, error)
	GetEligibleElectionsForPollingUnit(ctx context.Context, electionGroupID int32, pollingUnitID int32) ([]elections.ElectionWithCandidates, error)
	SubmitElectionVotes(ctx context.Context, userID int64, electionGroupID int32, pollingUnitID int32, votes []elections.VoteInput, votersCardImage string) error
	GetUserElectionGroupVoteStatus(ctx context.Context, userID int64, electionGroupID int32) (elections.UserVoteStatus, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

type PartiesService interface {
	GetActivePartyMemberSuspension(ctx context.Context, partyID int16, userID int64) (*queries.PartyMemberSuspension, error)
	IsPartyMember(ctx context.Context, userID int64, partyID int16) (bool, error)
}

type Handler struct {
	service        ElectionsService
	usersService   UsersService
	partiesService PartiesService
	auditService   audit.AuditService
	validate       *validator.Validate
	utils          *utils.Utils
}

func NewHandler(service ElectionsService, usersService UsersService, auditService audit.AuditService, utils *utils.Utils, partiesService PartiesService) *Handler {
	return &Handler{
		service:        service,
		usersService:   usersService,
		partiesService: partiesService,
		auditService:   auditService,
		validate:       validator.New(),
		utils:          utils,
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

type BulkUpdateElectionGroupRequest struct {
	ElectionIDs         []int32 `json:"election_ids" validate:"required,min=1"`
	ElectionGroupID     int32   `json:"election_group_id" validate:"required,gt=0"`
	FromElectionGroupID *int32  `json:"from_election_group_id,omitempty"`
}

type BulkDeleteElectionsRequest struct {
	ElectionIDs     []int32 `json:"election_ids" validate:"required,min=1"`
	ElectionGroupID *int32  `json:"election_group_id,omitempty"`
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
	AllWards        bool           `json:"all_wards"`
	WardIDs         []int32        `json:"ward_ids"`
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

	// Validate mandatory fields (office, date, target election group)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if !req.AllWards && len(req.WardIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: at least one ward_id must be provided or all_wards must be true")
		return
	}

	// Batch create elections across selected Wards, resolve group, and seed skeleton results
	count, err := h.service.CreateWardElection(r.Context(), elections.CreateWardElectionParams{
		OfficeID:        req.OfficeID,
		ElectionDate:    req.ElectionDate.Time(),
		ElectionGroupID: req.ElectionGroupID,
		AllWards:        req.AllWards,
		WardIDs:         req.WardIDs,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create Ward elections: "+err.Error())
		return
	}

	h.logElectionCreationAudit(r, "ward", req.ElectionGroupID, req.OfficeID, count, 0, map[string]interface{}{
		"all_wards": req.AllWards,
		"ward_ids":  req.WardIDs,
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
		if gid := query.Get("election_group_id"); gid != "" {
			electionGroupIDs = parseCommaSeparatedInt32(gid)
		}
	}

	var candidatePartyID int16
	if partyIDStr := query.Get("party_id"); partyIDStr != "" {
		pid, err := strconv.ParseInt(partyIDStr, 10, 16)
		if err != nil || pid <= 0 {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid party_id")
			return
		}

		// Require authentication to request candidates for a specific party
		claims, ok := apimiddleware.GetClaims(r)
		if !ok || claims == nil {
			h.utils.RespondError(w, http.StatusUnauthorized, "Authentication required to filter candidates by party")
			return
		}

		// Admins can inspect any party's candidates; party admins can only inspect their own party's candidates
		isAdmin := claims.HasAnyRole("admin", "super_admin")
		isPartyAdmin := claims.HasAnyRole("party_admin", "super_party_admin")

		if !isAdmin {
			if !isPartyAdmin || claims.PartyID != int16(pid) {
				h.utils.RespondError(w, http.StatusForbidden, "You do not have permission to access candidates for this party")
				return
			}
		}

		candidatePartyID = int16(pid)
	}

	filter := elections.ListElectionsFilter{
		Limit:            int32(limit),
		Cursor:           cursor,
		Search:           query.Get("search"),
		CandidatePartyID: candidatePartyID,
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

	// Validate election_group_id & scope if provided in query params
	query := r.URL.Query()
	if egStr := query.Get("election_group_id"); egStr != "" {
		if egID, err := strconv.ParseInt(egStr, 10, 32); err == nil && egID > 0 {
			if ei.ElectionGroupID != int32(egID) {
				h.utils.RespondError(w, http.StatusNotFound, "Election not found for the specified election group")
				return
			}
		}
	}
	if scope := query.Get("scope"); scope != "" {
		if !strings.EqualFold(ei.Scope, scope) {
			h.utils.RespondError(w, http.StatusNotFound, "Election not found for the specified scope")
			return
		}
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

// BulkUpdateElectionGroup godoc
// @Summary      Bulk update election group
// @Description  Reassigns multiple elections to a target election group in a single atomic transaction
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body BulkUpdateElectionGroupRequest true "Bulk Update Election Group payload"
// @Success      200  {object} map[string]interface{} "Election group updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or validation failed"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/bulk-group [put]
func (h *Handler) BulkUpdateElectionGroup(w http.ResponseWriter, r *http.Request) {
	var req BulkUpdateElectionGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if err := h.service.BulkUpdateElectionGroup(r.Context(), elections.BulkUpdateElectionGroupParams{
		ElectionIDs:         req.ElectionIDs,
		ElectionGroupID:     req.ElectionGroupID,
		FromElectionGroupID: req.FromElectionGroupID,
	}); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	metadata := map[string]interface{}{
		"election_ids":      req.ElectionIDs,
		"election_group_id": req.ElectionGroupID,
		"count":             len(req.ElectionIDs),
	}
	if req.FromElectionGroupID != nil && *req.FromElectionGroupID > 0 {
		metadata["from_election_group_id"] = *req.FromElectionGroupID
	}
	metadataJSON, _ := json.Marshal(metadata)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionBulkUpdateElectionGroup,
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(int64(req.ElectionGroupID), 10),
		NewValues:  metadataJSON,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Election group updated successfully for selected elections", map[string]interface{}{
		"count": len(req.ElectionIDs),
	})
}

// BulkDeleteElections godoc
// @Summary      Bulk delete elections
// @Description  Deletes multiple elections from the database in a single atomic query
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body BulkDeleteElectionsRequest true "Bulk Delete Elections payload"
// @Success      200  {object} map[string]interface{} "Elections deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or validation failed"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections/bulk [delete]
func (h *Handler) BulkDeleteElections(w http.ResponseWriter, r *http.Request) {
	// Decode incoming JSON request payload
	var req BulkDeleteElectionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate struct constraints (e.g. required election_ids array)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Execute bulk deletion across target elections within the service
	result, err := h.service.BulkDeleteElections(r.Context(), elections.BulkDeleteElectionsParams{
		ElectionIDs:     req.ElectionIDs,
		ElectionGroupID: req.ElectionGroupID,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Build audit metadata and record the primary election group as entity ID
	entityID := strconv.FormatInt(int64(result.ElectionGroupIDs[0]), 10)
	metadata := map[string]interface{}{
		"election_ids":       req.ElectionIDs,
		"count":              len(req.ElectionIDs),
		"election_group_ids": result.ElectionGroupIDs,
	}

	// Asynchronously record the bulk deletion in the administrative audit log
	metadataJSON, _ := json.Marshal(metadata)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionBulkDeleteElections,
		EntityType: db.EntityTypeElections,
		EntityID:   entityID,
		NewValues:  metadataJSON,
	})

	// Return successful deletion response with the count of removed elections
	h.utils.RespondSuccess(w, http.StatusOK, "Elections deleted successfully", map[string]interface{}{
		"count": len(req.ElectionIDs),
	})
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

	query := r.URL.Query()
	egStr := query.Get("election_group_id")
	scope := query.Get("scope")
	if egStr != "" || scope != "" {
		ei, err := h.service.GetElectionByID(r.Context(), int32(id))
		if err != nil {
			h.utils.RespondError(w, http.StatusNotFound, "Election not found")
			return
		}
		if egStr != "" {
			if egID, err := strconv.ParseInt(egStr, 10, 32); err == nil && egID > 0 {
				if ei.ElectionGroupID != int32(egID) {
					h.utils.RespondError(w, http.StatusNotFound, "Election not found for the specified election group")
					return
				}
			}
		}
		if scope != "" && !strings.EqualFold(ei.Scope, scope) {
			h.utils.RespondError(w, http.StatusNotFound, "Election not found for the specified scope")
			return
		}
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

type FieldCandidateRequest struct {
	CandidateID int64  `json:"candidate_id" validate:"required,gt=0"`
	PartyID     int16  `json:"party_id" validate:"required,gt=0"`
	Slot        string `json:"slot" validate:"omitempty,oneof=candidate running_mate"`
}

// FieldPartyCandidate handles POST /api/v1/elections/{id}/field-candidate
func (h *Handler) FieldPartyCandidate(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	electionID, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Verify user authentication claims and enforce party admin roles
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "party_admin", "super_party_admin", "admin", "super_admin")
	if !ok {
		return
	}

	// Parse candidate ID and party ID payload
	var req FieldCandidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Verify election exists
	election, err := h.service.GetElectionByID(r.Context(), int32(electionID))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	// Verify election group is active and nominations are open (can be skipped for platform admins / super_admins)
	if !claims.HasAnyRole("super_admin", "admin") {
		electionGroup, err := h.service.GetElectionGroupByID(r.Context(), election.ElectionGroupID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Failed to verify election group: "+err.Error())
			return
		}
		if !electionGroup.Active {
			h.utils.RespondError(w, http.StatusForbidden, "Election group is not active")
			return
		}

		if !election.NominationsOpen {
			h.utils.RespondError(w, http.StatusForbidden, "Candidate nomination is closed: elections within 15 days cannot be modified")
			return
		}
	}

	// Retrieve administrator account and verify party membership
	adminUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Non-platform admins can only field candidates for their own party
	if !claims.HasAnyRole("super_admin", "admin") && (!adminUser.PartyID.Valid || adminUser.PartyID.Int16 != req.PartyID) {
		h.utils.RespondError(w, http.StatusForbidden, "Party ID does not match user's party")
		return
	}

	// Verify administrator is not suspended from the party
	suspension, err := h.partiesService.GetActivePartyMemberSuspension(r.Context(), req.PartyID, adminUser.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check party suspension status: "+err.Error())
		return
	}
	if suspension != nil && suspension.ID > 0 {
		h.utils.RespondError(w, http.StatusForbidden, "User is suspended from this party")
		return
	}

	// Verify candidate is an active member of the party
	isMember, err := h.partiesService.IsPartyMember(r.Context(), req.CandidateID, req.PartyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check candidate party membership: "+err.Error())
		return
	}
	if !isMember {
		h.utils.RespondError(w, http.StatusBadRequest, "Candidate is not an active member of this political party")
		return
	}

	// Verify candidate is not suspended from the party
	candSuspension, err := h.partiesService.GetActivePartyMemberSuspension(r.Context(), req.PartyID, req.CandidateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check candidate suspension status: "+err.Error())
		return
	}
	if candSuspension != nil && candSuspension.ID > 0 {
		h.utils.RespondError(w, http.StatusForbidden, "Candidate is suspended from this party")
		return
	}

	// Verify candidate is not already running in this election cycle / election group
	candidacies, err := h.service.GetUserActiveCandidacies(r.Context(), req.CandidateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify candidate eligibility: "+err.Error())
		return
	}
	for _, c := range candidacies {
		if c.ElectionGroupID == election.ElectionGroupID && c.ElectionID != int32(electionID) {
			role := "a candidate"
			if c.CandidacyType == "running_mate" {
				role = "a running mate"
			}
			h.utils.RespondError(w, http.StatusConflict, fmt.Sprintf("User is already running as %s in %s for this election cycle", role, c.ElectionName))
			return
		}
	}

	// Field candidate under the party
	err = h.service.FieldPartyCandidate(r.Context(), election.Election, req.PartyID, req.CandidateID, req.Slot)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to field candidate: "+err.Error())
		return
	}

	// Log audit action for the administrator
	moduleName := db.ModulePartyAdmin
	actorRole := db.ActorRolePartyAdmin
	if claims.HasRole(db.ActorRoleSuperAdmin) {
		moduleName = db.ModuleAdmin
		actorRole = db.ActorRoleSuperAdmin
	} else if claims.HasRole(db.ActorRoleAdmin) {
		moduleName = db.ModuleAdmin
		actorRole = db.ActorRoleAdmin
	}

	payloadJSON, _ := json.Marshal(map[string]interface{}{
		"election_id":  electionID,
		"party_id":     req.PartyID,
		"candidate_id": req.CandidateID,
		"slot":         req.Slot,
	})

	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(moduleName),
		Action:     db.ActionFieldPartyCandidate,
		ActorID:    adminUser.ID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(electionID, 10),
		NewValues:  payloadJSON,
	})

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Candidate fielded successfully", nil)
}

type UnfieldCandidateRequest struct {
	PartyID int16  `json:"party_id" validate:"required,gt=0"`
	Slot    string `json:"slot" validate:"required,oneof=candidate running_mate"`
}

// UnfieldPartyCandidate handles POST /api/v1/elections/{id}/unfield-candidate
func (h *Handler) UnfieldPartyCandidate(w http.ResponseWriter, r *http.Request) {
	// Parse and validate election ID from URL parameter
	idStr := chi.URLParam(r, "id")
	electionID, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	// Verify user authentication claims and enforce party admin roles
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "party_admin", "super_party_admin", "admin", "super_admin")
	if !ok {
		return
	}

	// Decode request payload
	var req UnfieldCandidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required party ID and ticket slot
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Verify election exists
	election, err := h.service.GetElectionByID(r.Context(), int32(electionID))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	// Ensure election group is active and nominations are currently open (skipped for platform admins)
	if !claims.HasAnyRole("super_admin", "admin") {
		electionGroup, err := h.service.GetElectionGroupByID(r.Context(), election.ElectionGroupID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Failed to verify election group: "+err.Error())
			return
		}
		if !electionGroup.Active {
			h.utils.RespondError(w, http.StatusForbidden, "Election group is not active")
			return
		}
		if !election.NominationsOpen {
			h.utils.RespondError(w, http.StatusForbidden, "Candidate nomination is closed: elections within 15 days cannot be modified")
			return
		}
	}

	// Retrieve administrator account and verify active standing
	adminUser, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Non-platform admins can only unfield candidates for their own party
	if !claims.HasAnyRole("super_admin", "admin") && (!adminUser.PartyID.Valid || adminUser.PartyID.Int16 != req.PartyID) {
		h.utils.RespondError(w, http.StatusForbidden, "Party ID does not match user's party")
		return
	}

	// Remove assigned candidate/running mate from the election ballot
	err = h.service.UnfieldPartyCandidate(r.Context(), election.Election, req.PartyID, req.Slot)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to unfield candidate: "+err.Error())
		return
	}

	// Log audit trail for party administrator or platform admin
	moduleName := db.ModulePartyAdmin
	actorRole := db.ActorRolePartyAdmin
	if claims.HasRole(db.ActorRoleSuperAdmin) {
		moduleName = db.ModuleAdmin
		actorRole = db.ActorRoleSuperAdmin
	} else if claims.HasRole(db.ActorRoleAdmin) {
		moduleName = db.ModuleAdmin
		actorRole = db.ActorRoleAdmin
	}

	payloadJSON, _ := json.Marshal(map[string]interface{}{
		"election_id": electionID,
		"party_id":    req.PartyID,
		"slot":        req.Slot,
	})

	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(moduleName),
		Action:     db.ActionUnfieldPartyCandidate,
		ActorID:    adminUser.ID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeElections,
		EntityID:   strconv.FormatInt(electionID, 10),
		NewValues:  payloadJSON,
	})

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Candidate removed successfully", nil)
}

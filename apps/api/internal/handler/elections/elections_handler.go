package electionshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	elections "free9ja/api/internal/service/elections"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type ElectionsService interface {
	CreateElection(ctx context.Context, name string, candidatesCount int32, electionDate time.Time, electionGroupID, officeID int64, stateID *int16, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32) (queries.Election, error)
	CreateNationwideElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, candidates []elections.CandidateInput) (queries.Election, error)
	CreateStateElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, stateIDs []int16) ([]queries.Election, error)
	CreateSenatorialDistrictElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, senatorialDistrictIDs []int32) ([]queries.Election, error)
	CreateFederalConstituencyElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, federalConstituencyIDs []int32) ([]queries.Election, error)
	CreateStateConstituencyElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, stateConstituencyIDs []int32) ([]queries.Election, error)
	CreateLgaElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, lgaIDs []int32) ([]queries.Election, error)
	CreateWardElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, wardIDs []int32) ([]queries.Election, error)
	GetElectionByID(ctx context.Context, id int64) (queries.Election, error)
	ListElections(ctx context.Context) ([]queries.Election, error)
	UpdateElection(ctx context.Context, id int64, name string, candidatesCount int32, electionDate time.Time, electionGroupID, officeID int64, stateID *int16, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32) (queries.Election, error)
	DeleteElection(ctx context.Context, id int64) error
	GetElectionCandidates(ctx context.Context, electionID int64) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error)
	SyncElectionCandidates(ctx context.Context, electionID int64, candidates []elections.CandidateInput) error
	FieldPartyCandidate(ctx context.Context, electionID int64, partyID int64, candidateID int64) error
	GetNonVotingReasons(ctx context.Context) ([]queries.NonVotingReason, error)
	CreateDidNotVoteReason(ctx context.Context, arg queries.CreateDidNotVoteReasonParams) (queries.DidNotVoteReason, error)
	GetEligibleElectionsForPollingUnit(ctx context.Context, electionGroupID int64, pollingUnitID int64) ([]elections.ElectionWithCandidates, error)
	SubmitElectionVotes(ctx context.Context, userID int64, electionGroupID int64, pollingUnitID int64, votes []elections.VoteInput, vin string, votersCardImage string) error
	GetUserElectionGroupVoteStatus(ctx context.Context, userID, electionGroupID int64) (elections.UserVoteStatus, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error)
}

type Handler struct {
	service      ElectionsService
	usersService UsersService
	utils        *utils.Utils
}

func NewHandler(service ElectionsService, usersService UsersService, utils *utils.Utils) *Handler {
	return &Handler{
		service:      service,
		usersService: usersService,
		utils:        utils,
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

type CreateElectionRequest struct {
	Name                  string         `json:"name"`
	CandidatesCount       int32          `json:"candidates_count"`
	ElectionDate          utils.JSONDate `json:"election_date"`
	ElectionGroupID       int64          `json:"election_group_id"`
	OfficeID        int64          `json:"office_id"`
	StateID               *int16         `json:"state_id,omitempty"`
	SenatorialDistrictID  *int32         `json:"senatorial_district_id,omitempty"`
	FederalConstituencyID *int32         `json:"federal_constituency_id,omitempty"`
	StateConstituencyID   *int32         `json:"state_constituency_id,omitempty"`
	LgaID                 *int32         `json:"lga_id,omitempty"`
	WardID                *int32         `json:"ward_id,omitempty"`
}

type UpdateElectionRequest struct {
	Name                  string         `json:"name"`
	CandidatesCount       int32          `json:"candidates_count"`
	ElectionDate          utils.JSONDate `json:"election_date"`
	ElectionGroupID       int64          `json:"election_group_id"`
	OfficeID        int64          `json:"office_id"`
	StateID               *int16         `json:"state_id,omitempty"`
	SenatorialDistrictID  *int32         `json:"senatorial_district_id,omitempty"`
	FederalConstituencyID *int32         `json:"federal_constituency_id,omitempty"`
	StateConstituencyID   *int32         `json:"state_constituency_id,omitempty"`
	LgaID                 *int32         `json:"lga_id,omitempty"`
	WardID                *int32         `json:"ward_id,omitempty"`
}

type ElectionCandidateInput struct {
	CandidateID    int64  `json:"candidate_id" validate:"required"`
	PartyID        int64  `json:"party_id" validate:"required"`
	PartyShortName string `json:"party_short_name" validate:"required"`
}

type CreateNationwideElectionRequest struct {
	OfficeID        int64                    `json:"office_id"`
	ElectionDate    utils.JSONDate           `json:"election_date"`
	ElectionGroupID *int64                   `json:"election_group_id,omitempty"`
	Candidates      []ElectionCandidateInput `json:"candidates"`
}

type CreateStateElectionRequest struct {
	OfficeID  int64          `json:"office_id"`
	ElectionDate    utils.JSONDate `json:"election_date"`
	ElectionGroupID *int64         `json:"election_group_id,omitempty"`
	StateIDs        []int16        `json:"state_ids"`
}

type CreateSenatorialDistrictElectionRequest struct {
	OfficeID        int64          `json:"office_id"`
	ElectionDate          utils.JSONDate `json:"election_date"`
	ElectionGroupID       *int64         `json:"election_group_id,omitempty"`
	SenatorialDistrictIDs []int32        `json:"senatorial_district_ids"`
}

type CreateFederalConstituencyElectionRequest struct {
	OfficeID         int64          `json:"office_id"`
	ElectionDate           utils.JSONDate `json:"election_date"`
	ElectionGroupID        *int64         `json:"election_group_id,omitempty"`
	FederalConstituencyIDs []int32        `json:"federal_constituency_ids"`
}

type CreateStateConstituencyElectionRequest struct {
	OfficeID       int64          `json:"office_id"`
	ElectionDate         utils.JSONDate `json:"election_date"`
	ElectionGroupID      *int64         `json:"election_group_id,omitempty"`
	StateConstituencyIDs []int32        `json:"state_constituency_ids"`
}

type CreateLgaElectionRequest struct {
	OfficeID  int64          `json:"office_id"`
	ElectionDate    utils.JSONDate `json:"election_date"`
	ElectionGroupID *int64         `json:"election_group_id,omitempty"`
	LgaIDs          []int32        `json:"lga_ids"`
}

type CreateWardElectionRequest struct {
	OfficeID  int64          `json:"office_id"`
	ElectionDate    utils.JSONDate `json:"election_date"`
	ElectionGroupID *int64         `json:"election_group_id,omitempty"`
	WardIDs         []int32        `json:"ward_ids"`
}

// CreateElection godoc
// @Summary      Create a new election
// @Description  Creates a new election with name, candidates count, date, group ID, and type ID
// @Tags         Elections
// @Accept       json
// @Produce      json
// @Param        request body CreateElectionRequest true "Create Election payload"
// @Success      201  {object} map[string]interface{} "Election created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /elections [post]
func (h *Handler) CreateElection(w http.ResponseWriter, r *http.Request) {
	var req CreateElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.ElectionDate.IsZero() || req.ElectionGroupID <= 0 || req.OfficeID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election_date, election_group_id, and office_id are required")
		return
	}

	ei, err := h.service.CreateElection(
		r.Context(),
		req.Name,
		req.CandidatesCount,
		req.ElectionDate.Time(),
		req.ElectionGroupID,
		req.OfficeID,
		req.StateID,
		req.SenatorialDistrictID,
		req.FederalConstituencyID,
		req.StateConstituencyID,
		req.LgaID,
		req.WardID,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create election: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Election created successfully", map[string]interface{}{
		"election": ei,
	})
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
	var req CreateNationwideElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id and election_date are required")
		return
	}

	candidates := make([]elections.CandidateInput, len(req.Candidates))
	for i, c := range req.Candidates {
		candidates[i] = elections.CandidateInput{
			CandidateID:    c.CandidateID,
			PartyID:        c.PartyID,
			PartyShortName: c.PartyShortName,
		}
	}

	election, err := h.service.CreateNationwideElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, candidates)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create nationwide election: "+err.Error())
		return
	}

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
	var req CreateStateElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.StateIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and state_ids are required")
		return
	}

	elections, err := h.service.CreateStateElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.StateIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "State elections created successfully", map[string]interface{}{
		"elections": elections,
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
	var req CreateSenatorialDistrictElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.SenatorialDistrictIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and senatorial_district_ids are required")
		return
	}

	elections, err := h.service.CreateSenatorialDistrictElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.SenatorialDistrictIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create senatorial district elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Senatorial district elections created successfully", map[string]interface{}{
		"elections": elections,
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
	var req CreateFederalConstituencyElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.FederalConstituencyIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and federal_constituency_ids are required")
		return
	}

	elections, err := h.service.CreateFederalConstituencyElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.FederalConstituencyIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create federal constituency elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Federal constituency elections created successfully", map[string]interface{}{
		"elections": elections,
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
	var req CreateStateConstituencyElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.StateConstituencyIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and state_constituency_ids are required")
		return
	}

	elections, err := h.service.CreateStateConstituencyElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.StateConstituencyIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create state constituency elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "State constituency elections created successfully", map[string]interface{}{
		"elections": elections,
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
	var req CreateLgaElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.LgaIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and lga_ids are required")
		return
	}

	elections, err := h.service.CreateLgaElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.LgaIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create LGA elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "LGA elections created successfully", map[string]interface{}{
		"elections": elections,
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
	var req CreateWardElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.OfficeID <= 0 || req.ElectionDate.IsZero() || len(req.WardIDs) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "office_id, election_date and ward_ids are required")
		return
	}

	elections, err := h.service.CreateWardElection(r.Context(), req.OfficeID, req.ElectionDate.Time(), req.ElectionGroupID, req.WardIDs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create Ward elections: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Ward elections created successfully", map[string]interface{}{
		"elections": elections,
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
	limit, cursor := parsePaginationParams(r)

	elections, err := h.service.ListElections(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch elections: "+err.Error())
		return
	}

	startIndex := 0
	if cursor > 0 {
		for i, ei := range elections {
			if ei.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.Election
	hasMore := false
	nextCursor := ""

	if startIndex < len(elections) {
		endIndex := startIndex + limit
		if endIndex >= len(elections) {
			endIndex = len(elections)
			paginated = elections[startIndex:endIndex]
		} else {
			paginated = elections[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []queries.Election{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Elections fetched successfully", map[string]interface{}{
		"elections": paginated,
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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	ei, err := h.service.GetElectionByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	var req UpdateElectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.ElectionDate.IsZero() || req.ElectionGroupID <= 0 || req.OfficeID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, election_date, election_group_id, and office_id are required")
		return
	}

	_, err = h.service.GetElectionByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	updated, err := h.service.UpdateElection(
		r.Context(),
		id,
		req.Name,
		req.CandidatesCount,
		req.ElectionDate.Time(),
		req.ElectionGroupID,
		req.OfficeID,
		req.StateID,
		req.SenatorialDistrictID,
		req.FederalConstituencyID,
		req.StateConstituencyID,
		req.LgaID,
		req.WardID,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update election: "+err.Error())
		return
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	_, err = h.service.GetElectionByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Election not found")
		return
	}

	if err := h.service.DeleteElection(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete election: "+err.Error())
		return
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	limit, cursor := parsePaginationParams(r)

	candidates, err := h.service.GetElectionCandidates(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get election candidates: "+err.Error())
		return
	}

	startIndex := 0
	if cursor > 0 {
		for i, c := range candidates {
			if c.ID == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.ListElectionCandidatesDetailedByElectionIDRow
	hasMore := false
	nextCursor := ""

	if startIndex < len(candidates) {
		endIndex := startIndex + limit
		if endIndex >= len(candidates) {
			endIndex = len(candidates)
			paginated = candidates[startIndex:endIndex]
		} else {
			paginated = candidates[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(paginated[len(paginated)-1].ID, 10)
		}
	} else {
		paginated = []queries.ListElectionCandidatesDetailedByElectionIDRow{}
	}

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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	var req SyncCandidatesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	candidateInputs := make([]elections.CandidateInput, len(req.Candidates))
	for i, c := range req.Candidates {
		candidateInputs[i] = elections.CandidateInput{
			CandidateID:    c.CandidateID,
			PartyID:        c.PartyID,
			PartyShortName: c.PartyShortName,
		}
	}

	err = h.service.SyncElectionCandidates(r.Context(), id, candidateInputs)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to sync candidates: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Candidates synced successfully", nil)
}

type FieldCandidateRequest struct {
	CandidateID int64 `json:"candidate_id"`
}

// FieldPartyCandidate handles POST /api/v1/elections/{id}/field-candidate
func (h *Handler) FieldPartyCandidate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
		return
	}

	var req FieldCandidateRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}
	if !user.PartyID.Valid {
		h.utils.RespondError(w, http.StatusForbidden, "User is not associated with a party")
		return
	}

	err = h.service.FieldPartyCandidate(r.Context(), id, user.PartyID.Int64, req.CandidateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to field candidate: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Candidate fielded successfully", nil)
}

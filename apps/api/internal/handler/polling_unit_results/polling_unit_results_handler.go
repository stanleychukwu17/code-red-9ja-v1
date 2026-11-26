package polling_unit_results

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"free9ja/api/internal/config"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	collation_results "free9ja/api/internal/service/collation_results"
	pu_results "free9ja/api/internal/service/polling_unit_results"
	supervisorassignmentsservice "free9ja/api/internal/service/supervisor_assignments"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

type PollingUnitResultsService interface {
	HasSubmittedResult(ctx context.Context, electionID int32, partyID int16, pollingUnitID int32, userID int64) (bool, error)
	SubmitResult(ctx context.Context, input pu_results.SubmitResultInput) (queries.PollingUnitResult, error)
	GetResult(ctx context.Context, id int64) (queries.PollingUnitResult, error)
	ListResults(ctx context.Context, params queries.ListPollingUnitResultsParams) ([]queries.PollingUnitResult, error)
	ListPollingUnitFinalResults(ctx context.Context, params queries.ListPollingUnitFinalResultsParams) ([]queries.ListPollingUnitFinalResultsRow, error)
	GetFinalResult(ctx context.Context, electionID int64, pollingUnitID int32) (interface{}, error)
}

type CollationResultsService interface {
	SubmitCollationResult(ctx context.Context, input collation_results.SubmitCollationResultInput) (queries.CollationResult, error)
	GetCollationResultByID(ctx context.Context, id int64) (queries.CollationResult, error)
	ListCollationResults(ctx context.Context, params queries.ListCollationResultsByScopeParams) ([]queries.CollationResult, error)
}

type PollingUnitAssignmentsService interface {
	GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error)
}

type PollingUnitsService interface {
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
}

type SupervisorAssignmentsService interface {
	GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int32) (*supervisorassignmentsservice.SupervisorAssignmentsResponse, error)
}

type ElectionsService interface {
	GetElectionsForWard(ctx context.Context, electionGroupID, wardID int32) ([]queries.GetElectionsForWardRow, error)
	GetElectionsForLGA(ctx context.Context, electionGroupID, lgaID int32) ([]queries.GetElectionsForLGARow, error)
	GetElectionsForState(ctx context.Context, electionGroupID int32, stateID int16) ([]queries.GetElectionsForStateRow, error)
}

type ElectionGroupsService interface {
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
}

type BodiesService interface {
	GetLGAByID(ctx context.Context, id int32) (queries.Lga, error)
}

type WardsService interface {
	GetWardByID(ctx context.Context, id int32) (queries.Ward, error)
}

type Handler struct {
	service               PollingUnitResultsService
	collationService      CollationResultsService
	assignmentsService    PollingUnitAssignmentsService
	supervisorService     SupervisorAssignmentsService
	pollingUnitsService   PollingUnitsService
	electionsService      ElectionsService
	electionGroupsService ElectionGroupsService
	bodiesService         BodiesService
	wardsService          WardsService
	utils                 *utils.Utils
	validate              *validator.Validate
}

func NewHandler(s PollingUnitResultsService, cs CollationResultsService, u *utils.Utils, asgnSvc PollingUnitAssignmentsService, supSvc SupervisorAssignmentsService, puSvc PollingUnitsService, elecSvc ElectionsService, egSvc ElectionGroupsService, bodiesSvc BodiesService, wardsSvc WardsService) *Handler {
	return &Handler{
		service:               s,
		collationService:      cs,
		assignmentsService:    asgnSvc,
		supervisorService:     supSvc,
		pollingUnitsService:   puSvc,
		electionsService:      elecSvc,
		electionGroupsService: egSvc,
		bodiesService:         bodiesSvc,
		wardsService:          wardsSvc,
		utils:                 u,
		validate:              validator.New(),
	}
}

// ── Request/Response types ─────────────────────────────────────────────────

type PollingUnitFinalResultUploaderInfo struct {
	ID                  interface{} `json:"id"`
	ResultSheetImageUrl interface{} `json:"result_sheet_image_url"`
	ResultSheetVideoUrl interface{} `json:"result_sheet_video_url"`
	UploaderFirstName   interface{} `json:"uploader_first_name"`
	UploaderLastName    interface{} `json:"uploader_last_name"`
	UploaderAvatar      interface{} `json:"uploader_avatar"`
}

type PollingUnitFinalResultItemResponse struct {
	ID                    int64                              `json:"id"`
	ElectionID            int32                              `json:"election_id"`
	ElectionGroupID       int32                              `json:"election_group_id"`
	PollingUnitID         int32                              `json:"polling_unit_id"`
	PollingUnitName       string                             `json:"polling_unit_name"`
	StateID               interface{}                        `json:"state_id"`
	StateName             interface{}                        `json:"state_name"`
	LgaID                 interface{}                        `json:"lga_id"`
	LgaName               interface{}                        `json:"lga_name"`
	WardID                interface{}                        `json:"ward_id"`
	SenatorialDistrictID  interface{}                        `json:"senatorial_district_id"`
	FederalConstituencyID interface{}                        `json:"federal_constituency_id"`
	StateConstituencyID   interface{}                        `json:"state_constituency_id"`
	AccreditedVoters      int32                              `json:"accredited_voters"`
	VotesCast             int32                              `json:"votes_cast"`
	ValidVotes            int32                              `json:"valid_votes"`
	RejectedVotes         int32                              `json:"rejected_votes"`
	CandidateResults      json.RawMessage                    `json:"candidate_results"`
	CreatedAt             interface{}                        `json:"created_at"`
	FinalResult           PollingUnitFinalResultUploaderInfo `json:"finalResult"`
}

type PollingUnitFinalResultsListResponse struct {
	Results    []PollingUnitFinalResultItemResponse `json:"results"`
	NextCursor *int64                               `json:"next_cursor"`
}

type SubmitResultRequest struct {
	AssignmentID        *int64 `json:"assignment_id,omitempty"`
	ElectionID          int32  `json:"election_id" validate:"required,gt=0"`
	ElectionGroupID     int32  `json:"election_group_id" validate:"required,gt=0"`
	PollingUnitID       int32  `json:"polling_unit_id"`
	ResultSheetImageURL string `json:"result_sheet_image_url" validate:"required"`
	ResultSheetVideoURL string `json:"result_sheet_video_url"`
}

// ── Handlers ───────────────────────────────────────────────────────────────

// SubmitResult godoc
// @Summary Submit Election Result
// @Description Submit official election results. Assigned polling agents upload EC8A; supervisors upload collation sheets (EC8B, EC8C, EC8D).
// @Tags Results
// @Accept json
// @Produce json
// @Param request body SubmitResultRequest true "Result Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-results [post]
// @Security BearerAuth
func (h *Handler) SubmitResult(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req SubmitResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Verify election group exists and current time is within the election reporting window
	eg, err := h.electionGroupsService.GetElectionGroupByID(r.Context(), req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election_group_id")
		return
	}
	if config.Load().Env == "production" {
		if err := utils.ValidateElectionReportingWindow(eg.ElectionDate.Time, time.Now(), utils.PostElectionCollationGraceDays); err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if req.AssignmentID != nil && *req.AssignmentID > 0 {
		// =========================================================================
		// 1. Polling Unit Agent Flow -> polling_unit_results (Form EC8A)
		// =========================================================================
		if req.PollingUnitID <= 0 {
			h.utils.RespondError(w, http.StatusBadRequest, "polling_unit_id is required for polling unit agent results")
			return
		}

		assignment, err := h.assignmentsService.GetMyAssignment(r.Context(), claims.UserID, req.ElectionGroupID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify assignment: "+err.Error())
			return
		}
		if status, errMsg := utils.ValidateAssignmentMatch(assignment, *req.AssignmentID, req.PollingUnitID); status != 0 {
			h.utils.RespondError(w, status, errMsg)
			return
		}

		pu, err := h.pollingUnitsService.GetPollingUnitByID(r.Context(), req.PollingUnitID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit id: "+err.Error())
			return
		}

		// Verify the requested election applies to this polling unit's ward
		wardElections, err := h.electionsService.GetElectionsForWard(r.Context(), req.ElectionGroupID, pu.WardID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify eligible elections: "+err.Error())
			return
		}

		// Ensure the requested election is actually contested in this PU's ward (blocks cross-ward/constituency submissions)
		electionAllowed := false
		for _, e := range wardElections {
			if e.ID == req.ElectionID {
				electionAllowed = true
				break
			}
		}

		// Reject if the election ID is not part of the PU's eligible ward ballot
		if !electionAllowed {
			h.utils.RespondError(w, http.StatusForbidden, "This election does not apply to your assigned polling unit")
			return
		}

		// Fast-path duplicate check (Redis-cached) before opening a DB transaction
		alreadySubmitted, err := h.service.HasSubmittedResult(r.Context(), req.ElectionID, assignment.PartyID, req.PollingUnitID, claims.UserID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify existing result: "+err.Error())
			return
		}
		if alreadySubmitted {
			h.utils.RespondError(w, http.StatusConflict, "you have already submitted results for this election at your polling unit")
			return
		}

		result, err := h.service.SubmitResult(r.Context(), pu_results.SubmitResultInput{
			UserID:                claims.UserID,
			AssignmentID:          *req.AssignmentID,
			PartyID:               assignment.PartyID,
			ElectionID:            req.ElectionID,
			ElectionGroupID:       req.ElectionGroupID,
			PollingUnitID:         req.PollingUnitID,
			StateID:               pu.StateID,
			LgaID:                 pu.LgaID,
			WardID:                pu.WardID,
			SenatorialDistrictID:  pu.SenatorialDistrictID,
			FederalConstituencyID: pu.FederalConstituencyID,
			StateConstituencyID:   pu.StateConstituencyID,
			ResultSheetImageURL:   req.ResultSheetImageURL,
			ResultSheetVideoURL:   req.ResultSheetVideoURL,
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}

		h.utils.RespondSuccess(w, http.StatusCreated, "Result submitted successfully", map[string]interface{}{
			"result": result,
		})

		return
	}

	// =========================================================================
	// 2. Supervisor Flow -> collation_results (Form EC8B / EC8C / EC8D)
	// =========================================================================
	supRes, err := h.supervisorService.GetUserSupervisorAssignments(r.Context(), claims.UserID, req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify supervisor assignment: "+err.Error())
		return
	}

	var roleType string
	var stateID int16
	var lgaID *int32
	var wardID *int32
	var partyID int16

	if supRes != nil {
		if supRes.WardSupervisor != nil && supRes.WardSupervisor.ID > 0 {
			roleType = constants.RoleWardElectionSupervisor
			partyID = supRes.WardSupervisor.PartyID
			stateID = supRes.WardSupervisor.StateID
			l := supRes.WardSupervisor.LgaID
			lgaID = &l
			w := supRes.WardSupervisor.WardID
			wardID = &w
		} else if supRes.LgaSupervisor != nil && supRes.LgaSupervisor.ID > 0 {
			roleType = constants.RoleLgaElectionSupervisor
			partyID = supRes.LgaSupervisor.PartyID
			stateID = supRes.LgaSupervisor.StateID
			l := supRes.LgaSupervisor.LgaID
			lgaID = &l
		} else if supRes.StateSupervisor != nil && supRes.StateSupervisor.ID > 0 {
			roleType = constants.RoleStateElectionSupervisor
			partyID = supRes.StateSupervisor.PartyID
			stateID = supRes.StateSupervisor.StateID
		}
	}
	if roleType == "" {
		h.utils.RespondError(w, http.StatusForbidden, "You do not have an active assignment for this election")
		return
	}

	// Verify the requested election applies to the supervisor's assigned ward, LGA, or state
	var electionAllowed bool
	switch roleType {
	case constants.RoleWardElectionSupervisor:
		wardElections, wErr := h.electionsService.GetElectionsForWard(r.Context(), req.ElectionGroupID, *wardID)
		if wErr != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify eligible elections: "+wErr.Error())
			return
		}
		for _, e := range wardElections {
			if e.ID == req.ElectionID {
				electionAllowed = true
				break
			}
		}
	case constants.RoleLgaElectionSupervisor:
		lgaElections, lErr := h.electionsService.GetElectionsForLGA(r.Context(), req.ElectionGroupID, *lgaID)
		if lErr != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify eligible elections: "+lErr.Error())
			return
		}
		for _, e := range lgaElections {
			if e.ID == req.ElectionID {
				electionAllowed = true
				break
			}
		}
	case constants.RoleStateElectionSupervisor:
		stateElections, sErr := h.electionsService.GetElectionsForState(r.Context(), req.ElectionGroupID, stateID)
		if sErr != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify eligible elections: "+sErr.Error())
			return
		}
		for _, e := range stateElections {
			if e.ID == req.ElectionID {
				electionAllowed = true
				break
			}
		}
	}
	if !electionAllowed {
		h.utils.RespondError(w, http.StatusForbidden, "This election does not apply to your assigned collation scope")
		return
	}

	// Resolve constituency IDs from the supervisor's assigned ward (EC8B) or LGA (EC8C)
	var senatorialDistrictID, federalConstituencyID, stateConstituencyID pgtype.Int4
	if wardID != nil {
		if ward, wErr := h.wardsService.GetWardByID(r.Context(), *wardID); wErr == nil {
			senatorialDistrictID = ward.SenatorialDistrictID
			federalConstituencyID = ward.FederalConstituencyID
			stateConstituencyID = ward.StateConstituencyID
		}
	} else if lgaID != nil {
		if lga, lErr := h.bodiesService.GetLGAByID(r.Context(), *lgaID); lErr == nil {
			senatorialDistrictID = lga.SenatorialDistrictID
			federalConstituencyID = lga.FederalConstituencyID
		}
	}

	collationResult, err := h.collationService.SubmitCollationResult(r.Context(), collation_results.SubmitCollationResultInput{
		UserID:                claims.UserID,
		ElectionID:            req.ElectionID,
		ElectionGroupID:       req.ElectionGroupID,
		RoleType:              roleType,
		PartyID:               partyID,
		StateID:               stateID,
		SenatorialDistrictID:  senatorialDistrictID,
		FederalConstituencyID: federalConstituencyID,
		StateConstituencyID:   stateConstituencyID,
		LgaID:                 lgaID,
		WardID:                wardID,
		ResultSheetImageURL:   req.ResultSheetImageURL,
		ResultSheetVideoURL:   req.ResultSheetVideoURL,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Collation result submitted successfully", map[string]interface{}{
		"result": collationResult,
	})
}

// GetResult godoc
// @Summary Get Polling Unit Result
// @Description Fetch a single polling unit result by ID
// @Tags Results
// @Produce json
// @Param id path int true "Result ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /polling-unit-results/{id} [get]
// @Security BearerAuth
func (h *Handler) GetResult(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid result ID")
		return
	}

	result, err := h.service.GetResult(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Result not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Result fetched successfully", map[string]interface{}{
		"result": result,
	})
}

// ListResults godoc
// @Summary List Polling Unit Results
// @Description Fetches a cursor-paginated list of polling unit results with filters
// @Tags Results
// @Produce json
// @Param election_id query int false "Filter by Election ID"
// @Param election_group_id query int false "Filter by Election Group ID"
// @Param party_id query int false "Filter by Party ID"
// @Param polling_unit_id query int false "Filter by Polling Unit ID"
// @Param submitted_by query int false "Filter by Submitter User ID"
// @Param state_id query int false "Filter by State ID"
// @Param lga_id query int false "Filter by LGA ID"
// @Param ward_id query int false "Filter by Ward ID"
// @Param status query string false "Filter by status (submitted|ai_verified|confirmed|disputed|nullified)"
// @Param cursor query int false "Cursor (ID to paginate from)"
// @Param limit query int false "Limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-results [get]
// @Security BearerAuth
func (h *Handler) ListResults(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var params queries.ListPollingUnitResultsParams

	if val := r.URL.Query().Get("election_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.ElectionID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.ElectionGroupID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("party_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			params.PartyID = pgtype.Int2{Int16: int16(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("polling_unit_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.PollingUnitID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("submitted_by"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			params.SubmittedBy = pgtype.Int8{Int64: v, Valid: true}
		}
	}
	if val := r.URL.Query().Get("state_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 16); err == nil {
			params.StateID = pgtype.Int2{Int16: int16(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("lga_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.LgaID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("ward_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.WardID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("status"); val != "" {
		params.Status = pgtype.Text{String: val, Valid: true}
	}

	// Scope party-affiliated callers to their own party's results
	if int64(claims.PartyID) > 0 {
		params.PartyID = pgtype.Int2{Int16: int16(claims.PartyID), Valid: true}
	}

	// Cursor pagination
	params.Cursor = math.MaxInt64
	if val := r.URL.Query().Get("cursor"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil && v > 0 {
			params.Cursor = v
		}
	}
	params.Limit = 20
	if val := r.URL.Query().Get("limit"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			params.Limit = int32(v)
		}
	}

	results, err := h.service.ListResults(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch results: "+err.Error())
		return
	}

	var nextCursor *int64
	if len(results) == int(params.Limit) {
		lastID := results[len(results)-1].ID
		nextCursor = &lastID
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Results fetched successfully", map[string]interface{}{
		"results":     results,
		"next_cursor": nextCursor,
	})
}

// ListFinalResults godoc
// @Summary List Polling Unit Final Results
// @Description Fetches a cursor-paginated list of final polling unit results with details
// @Tags Results
// @Produce json
// @Param election_group_id query int false "Filter by Election Group ID"
// @Param state_id query int false "Filter by State ID"
// @Param senatorial_district_id query int false "Filter by Senatorial District ID"
// @Param federal_constituency_id query int false "Filter by Federal Constituency ID"
// @Param state_constituency_id query int false "Filter by State Constituency ID"
// @Param lga_id query int false "Filter by LGA ID"
// @Param ward_id query int false "Filter by Ward ID"
// @Param has_media query bool false "Filter by presence of media"
// @Param cursor query int false "Cursor (ID to paginate from)"
// @Param limit query int false "Limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-final-results [get]
// @Security BearerAuth
func (h *Handler) ListFinalResults(w http.ResponseWriter, r *http.Request) {
	_, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var params queries.ListPollingUnitFinalResultsParams

	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.ElectionGroupID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("state_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 16); err == nil {
			params.StateID = pgtype.Int2{Int16: int16(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("senatorial_district_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.SenatorialDistrictID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("federal_constituency_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.FederalConstituencyID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("state_constituency_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.StateConstituencyID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("lga_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.LgaID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("ward_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.WardID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("has_media"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.HasMedia = pgtype.Bool{Bool: v, Valid: true}
		}
	}

	// Cursor pagination
	params.Cursor = math.MaxInt64
	if val := r.URL.Query().Get("cursor"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil && v > 0 {
			params.Cursor = v
		}
	}
	params.Limit = 20
	if val := r.URL.Query().Get("limit"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			params.Limit = int32(v)
		}
	}

	results, err := h.service.ListPollingUnitFinalResults(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch final results: "+err.Error())
		return
	}

	var nextCursor *int64
	if len(results) == int(params.Limit) {
		lastID := results[len(results)-1].ID
		nextCursor = &lastID
	}

	mappedResults := make([]PollingUnitFinalResultItemResponse, 0, len(results))
	for _, res := range results {
		mappedResults = append(mappedResults, PollingUnitFinalResultItemResponse{
			ID:                    res.ID,
			ElectionID:            res.ElectionID,
			ElectionGroupID:       res.ElectionGroupID,
			PollingUnitID:         res.PollingUnitID,
			PollingUnitName:       res.PollingUnitName,
			StateID:               res.StateID,
			StateName:             res.StateName,
			LgaID:                 res.LgaID,
			LgaName:               res.LgaName,
			WardID:                res.WardID,
			SenatorialDistrictID:  res.SenatorialDistrictID,
			FederalConstituencyID: res.FederalConstituencyID,
			StateConstituencyID:   res.StateConstituencyID,
			AccreditedVoters:      res.AccreditedVoters,
			VotesCast:             res.VotesCast,
			ValidVotes:            res.ValidVotes,
			RejectedVotes:         res.RejectedVotes,
			CandidateResults:      json.RawMessage(res.CandidateResults),
			CreatedAt:             res.CreatedAt,
			FinalResult: PollingUnitFinalResultUploaderInfo{
				ID:                  res.PollingUnitResultID,
				ResultSheetImageUrl: res.ResultSheetImageUrl,
				ResultSheetVideoUrl: res.ResultSheetVideoUrl,
				UploaderFirstName:   res.UploaderFirstName,
				UploaderLastName:    res.UploaderLastName,
				UploaderAvatar:      res.UploaderAvatar,
			},
		})
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Final results fetched successfully", PollingUnitFinalResultsListResponse{
		Results:    mappedResults,
		NextCursor: nextCursor,
	})
}

// GetFinalResult godoc
// @Summary Get Polling Unit Final Result
// @Description Fetch the calculated final result for a given polling unit and election
// @Tags Results
// @Produce json
// @Param election_id query int true "Election ID"
// @Param polling_unit_id query int true "Polling Unit ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /polling-unit-results/final [get]
func (h *Handler) GetFinalResult(w http.ResponseWriter, r *http.Request) {
	electionIDStr := r.URL.Query().Get("election_id")
	pollingUnitIDStr := r.URL.Query().Get("polling_unit_id")

	if electionIDStr == "" || pollingUnitIDStr == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id and polling_unit_id are required")
		return
	}

	electionID, err := strconv.ParseInt(electionIDStr, 10, 64)
	if err != nil || electionID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election_id")
		return
	}

	pollingUnitID, err := strconv.ParseInt(pollingUnitIDStr, 10, 32)
	if err != nil || pollingUnitID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling_unit_id")
		return
	}

	result, err := h.service.GetFinalResult(r.Context(), electionID, int32(pollingUnitID))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Final result not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Final result fetched successfully", map[string]interface{}{
		"final_result": result,
	})
}

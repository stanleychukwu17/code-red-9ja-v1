package polling_unit_results

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strconv"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	pu_results "free9ja/api/internal/service/polling_unit_results"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

type PollingUnitResultsService interface {
	SubmitResult(ctx context.Context, input pu_results.SubmitResultInput) (queries.PollingUnitResult, error)
	GetResult(ctx context.Context, id int64) (queries.PollingUnitResult, error)
	ListResults(ctx context.Context, params queries.ListPollingUnitResultsParams) ([]queries.PollingUnitResult, error)
	ListPollingUnitFinalResults(ctx context.Context, params queries.ListPollingUnitFinalResultsParams) ([]queries.ListPollingUnitFinalResultsRow, error)
	ReviewResult(ctx context.Context, reviewerFakeID int64, input pu_results.ReviewResultInput) (queries.PollingUnitResult, error)
	GetFinalResult(ctx context.Context, electionID int64, pollingUnitID int32) (interface{}, error)
}

type PollingUnitAssignmentsService interface {
	GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error)
}

type PollingUnitsService interface {
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
}

type Handler struct {
	service             PollingUnitResultsService
	assignmentsService  PollingUnitAssignmentsService
	pollingUnitsService PollingUnitsService
	utils               *utils.Utils
	validate            *validator.Validate
}

func NewHandler(s PollingUnitResultsService, u *utils.Utils, asgnSvc PollingUnitAssignmentsService, puSvc PollingUnitsService) *Handler {
	return &Handler{
		service:             s,
		assignmentsService:  asgnSvc,
		pollingUnitsService: puSvc,
		utils:               u,
		validate:            validator.New(),
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
	PartyID             *int16 `json:"party_id,omitempty"`
	ElectionID          int32  `json:"election_id" validate:"required,gt=0"`
	ElectionGroupID     int32  `json:"election_group_id" validate:"required,gt=0"`
	PollingUnitID       int32  `json:"polling_unit_id" validate:"required,gt=0"`
	ResultSheetImageURL string `json:"result_sheet_image_url" validate:"required"`
	ResultSheetVideoURL string `json:"result_sheet_video_url"`
}

type ReviewRequest struct {
	Status         string `json:"status"` // "confirmed" or "nullified"
	DisputedReason string `json:"disputed_reason,omitempty"`
}

// ── Handlers ───────────────────────────────────────────────────────────────

// SubmitResult godoc
// @Summary Submit Polling Unit Result
// @Description Submit official election results for a polling unit. Assigned agents include assignment_id; general users leave it null.
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

	// Derive party_id from JWT if not explicitly provided and caller is a party member
	var partyID *int16
	if claims.PartyID > 0 {
		pid := claims.PartyID
		partyID = &pid
	}
	if req.PartyID != nil {
		partyID = req.PartyID
	}

	if req.AssignmentID != nil && *req.AssignmentID > 0 {
		assignment, err := h.assignmentsService.GetMyAssignment(r.Context(), claims.UserID, req.ElectionGroupID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify assignment: "+err.Error())
			return
		}
		if assignment == nil || assignment.ID <= 0 {
			h.utils.RespondError(w, http.StatusNotFound, "No active assignment found for this election group")
			return
		}
		if assignment.ID != *req.AssignmentID {
			h.utils.RespondError(w, http.StatusForbidden, "Assignment does not belong to you")
			return
		}
		if assignment.PollingUnitID != req.PollingUnitID {
			h.utils.RespondError(w, http.StatusBadRequest, "Polling unit does not match assignment")
			return
		}
		partyID = &assignment.PartyID
	}

	pu, err := h.pollingUnitsService.GetPollingUnitByID(r.Context(), req.PollingUnitID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit id: "+err.Error())
		return
	}

	result, err := h.service.SubmitResult(r.Context(), pu_results.SubmitResultInput{
		UserFakeID:            claims.FakeID,
		AssignmentID:          req.AssignmentID,
		PartyID:               partyID,
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
// @Param uploaded_by_inec query bool false "Filter by INEC upload flag"
// @Param cursor query int false "Cursor (ID to paginate from)"
// @Param limit query int false "Limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-results [get]
// @Security BearerAuth
func (h *Handler) ListResults(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
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
	if val := r.URL.Query().Get("uploaded_by_inec"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.UploadedByInec = pgtype.Bool{Bool: v, Valid: true}
		}
	}

	// Enforce role-based scoping: non-admins can only see their party's results
	if !claims.HasRole("admin") && int64(claims.PartyID) > 0 {
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
	_, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
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

// ReviewResult godoc
// @Summary Review a Polling Unit Result (Admin)
// @Description Platform admin manually confirms or nullifies a polling unit result
// @Tags Results
// @Accept json
// @Produce json
// @Param id path int true "Result ID"
// @Param request body ReviewRequest true "Review Details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-results/{id}/review [patch]
// @Security BearerAuth
func (h *Handler) ReviewResult(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "admin")
	if !ok {
		return
	}

	resultID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || resultID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid result ID")
		return
	}

	var req ReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result, err := h.service.ReviewResult(r.Context(), claims.FakeID, pu_results.ReviewResultInput{
		ResultID:       resultID,
		Status:         req.Status,
		DisputedReason: req.DisputedReason,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to review result: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Result reviewed successfully", map[string]interface{}{
		"result": result,
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

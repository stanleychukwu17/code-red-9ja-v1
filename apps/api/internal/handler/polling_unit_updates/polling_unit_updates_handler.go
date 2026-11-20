package polling_unit_updates

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/polling_unit_updates"
	"free9ja/api/internal/utils"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type Service interface {
	CreateUpdate(ctx context.Context, input polling_unit_updates.CreateUpdateInput) (queries.PollingUnitUpdate, error)
	ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error)
	GetActiveIssues(ctx context.Context, pollingUnitID int32) ([]queries.ListActivePollingUnitIssuesRow, error)
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
}

type PollingUnitAssignmentsService interface {
	GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error)
}

type PollingUnitsService interface {
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
}

type Handler struct {
	service             Service
	assignmentsService  PollingUnitAssignmentsService
	pollingUnitsService PollingUnitsService
	utils               *utils.Utils
}

func NewHandler(s Service, u *utils.Utils, asgnSvc PollingUnitAssignmentsService, puSvc PollingUnitsService) *Handler {
	return &Handler{service: s, utils: u, assignmentsService: asgnSvc, pollingUnitsService: puSvc}
}

type CreateUpdateRequest struct {
	AssignmentID      int64                            `json:"assignment_id"`
	PollingUnitID     int32                            `json:"polling_unit_id"`
	ElectionGroupID   int32                            `json:"election_group_id"`
	StatusCategoryID  *int16                           `json:"status_category_id,omitempty"`
	StatusOptionID    *int16                           `json:"status_option_id,omitempty"`
	HasIssues         bool                             `json:"has_issues"`
	IssueAction       string                           `json:"issue_action,omitempty"`
	ExistingIssueIDs  []int64                          `json:"existing_issue_ids,omitempty"`
	NewIssueOptionIDs []int16                          `json:"new_issue_option_ids,omitempty"`
	Title             *string                          `json:"title,omitempty"`
	Message           string                           `json:"message"`
	Media             []polling_unit_updates.MediaItem `json:"media,omitempty"`
	Latitude          *float64                         `json:"latitude,omitempty"`
	Longitude         *float64                         `json:"longitude,omitempty"`
	AccuracyMeters    *float64                         `json:"accuracy_meters,omitempty"`
	CreatedAt         *time.Time                       `json:"created_at,omitempty"`
}

// CreateUpdate godoc
// @Summary Create Polling Unit Update
// @Description Submit an update or report for a polling unit
// @Tags Updates
// @Accept json
// @Produce json
// @Param request body CreateUpdateRequest true "Update Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-updates [post]
// @Security BearerAuth
func (h *Handler) CreateUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Decode request payload
	var req CreateUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.AssignmentID <= 0 || req.PollingUnitID <= 0 || req.ElectionGroupID <= 0 || req.Message == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "assignment_id, polling_unit_id, election_group_id and message are required")
		return
	}
	if req.StatusCategoryID == nil || *req.StatusCategoryID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "status_category_id is required")
		return
	}

	// Verify assignment using Redis cache
	assignment, err := h.assignmentsService.GetMyAssignment(r.Context(), claims.UserID, req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify assignment: "+err.Error())
		return
	}
	if status, errMsg := validateAssignmentMatch(assignment, req.AssignmentID, req.PollingUnitID); status != 0 {
		h.utils.RespondError(w, status, errMsg)
		return
	}

	// Verify election date: updates can only be submitted starting from election day.
	// A 1-day post-election window is allowed so agents with no/poor connectivity can sync offline outbox items.
	eg, err := h.service.GetElectionGroupByID(r.Context(), req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group: "+err.Error())
		return
	}

	if err := utils.ValidateElectionReportingWindow(eg.ElectionDate.Time, time.Now(), utils.PostElectionCollationGraceDays); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Fetch polling unit details from Redis cache (1 year TTL)
	pu, err := h.pollingUnitsService.GetPollingUnitByID(r.Context(), req.PollingUnitID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid polling unit id: "+err.Error())
		return
	}

	// Validate client created_at timestamp if provided (offline sync)
	var clientCreatedAt *time.Time
	if req.CreatedAt != nil && !req.CreatedAt.IsZero() {
		now := time.Now()
		// Guard: must not be in the future (allow 5m clock skew)
		if req.CreatedAt.After(now.Add(5 * time.Minute)) {
			h.utils.RespondError(w, http.StatusBadRequest, "created_at cannot be in the future")
			return
		}

		// Guard: must not be before election day
		electionDay := time.Date(eg.ElectionDate.Time.Year(), eg.ElectionDate.Time.Month(), eg.ElectionDate.Time.Day(), 0, 0, 0, 0, time.UTC)
		if utils.LagosDate(*req.CreatedAt).Before(electionDay) {
			h.utils.RespondError(w, http.StatusBadRequest, "created_at cannot be prior to election day")
			return
		}

		clientCreatedAt = req.CreatedAt
	}

	// Persist the polling unit update
	update, err := h.service.CreateUpdate(r.Context(), polling_unit_updates.CreateUpdateInput{
		UserID:                      claims.FakeID,
		PollingUnitID:               req.PollingUnitID,
		ElectionGroupID:             req.ElectionGroupID,
		AssignmentID:                req.AssignmentID,
		PartyID:                     &assignment.PartyID,
		StateID:                     pu.StateID,
		LgaID:                       pu.LgaID,
		WardID:                      pu.WardID,
		SenatorialDistrictID:        pu.SenatorialDistrictID,
		FederalConstituencyID:       pu.FederalConstituencyID,
		StateAssemblyConstituencyID: pu.StateConstituencyID,
		StatusCategoryID:            req.StatusCategoryID,
		StatusOptionID:              req.StatusOptionID,
		HasIssues:                   req.HasIssues,
		IssueAction:                 req.IssueAction,
		ExistingIssueIDs:            req.ExistingIssueIDs,
		NewIssueOptionIDs:           req.NewIssueOptionIDs,
		Title:                       req.Title,
		Message:                     req.Message,
		Media:                       req.Media,
		Latitude:                    req.Latitude,
		Longitude:                   req.Longitude,
		AccuracyMeters:              req.AccuracyMeters,
		CreatedAt:                   clientCreatedAt,
		AssignmentArrivedAt:         assignment.ArrivedAt,
		AssignmentElectionStartedAt: assignment.ElectionStartedAt,
		AssignmentElectionEndedAt:   assignment.ElectionEndedAt,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Return response
	h.utils.RespondSuccess(w, http.StatusCreated, "Update submitted successfully", map[string]interface{}{
		"update": update,
	})
}

// ListUpdates godoc
// @Summary List Polling Unit Updates
// @Description Fetches a list of polling unit updates using cursor-based pagination
// @Tags Updates
// @Accept json
// @Produce json
// @Param election_group_id query int false "Filter by Election Group ID"
// @Param party_id query int false "Filter by Party ID"
// @Param polling_unit_id query int false "Filter by Polling Unit ID"
// @Param user_id query int false "Filter by User ID"
// @Param state_id query int false "Filter by State ID"
// @Param lga_id query int false "Filter by LGA ID"
// @Param ward_id query int false "Filter by Ward ID"
// @Param status_category_id query int false "Filter by Status Category ID"
// @Param has_issues query bool false "Filter by Has Issues"
// @Param has_media query bool false "Filter by Has Media"
// @Param cursor query int false "Cursor (ID to paginate from)"
// @Param limit query int false "Limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-updates [get]
// @Security BearerAuth
func (h *Handler) ListUpdates(w http.ResponseWriter, r *http.Request) {
	var params queries.ListPollingUnitUpdatesParams

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
	if val := r.URL.Query().Get("user_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			params.UserID = pgtype.Int8{Int64: v, Valid: true}
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
	if val := r.URL.Query().Get("state_assembly_constituency_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 32); err == nil {
			params.StateAssemblyConstituencyID = pgtype.Int4{Int32: int32(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("status_category_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 16); err == nil {
			params.StatusCategoryID = pgtype.Int2{Int16: int16(v), Valid: true}
		}
	}
	if val := r.URL.Query().Get("has_issues"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.HasIssues = pgtype.Bool{Bool: v, Valid: true}
		}
	} else if val := r.URL.Query().Get("is_report"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.HasIssues = pgtype.Bool{Bool: v, Valid: true}
		}
	}
	if val := r.URL.Query().Get("has_media"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.HasMedia = pgtype.Bool{Bool: v, Valid: true}
		}
	}

	// Pagination
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

	updates, err := h.service.ListUpdates(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list updates: "+err.Error())
		return
	}

	var nextCursor *int64
	if len(updates) > 0 && len(updates) == int(params.Limit) {
		lastItem := updates[len(updates)-1]
		nextCursor = &lastItem.ID
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Updates retrieved successfully", map[string]interface{}{
		"updates":     updates,
		"next_cursor": nextCursor,
	})
}

// ListActiveIssues godoc
// @Summary List Active Polling Unit Issues
// @Description Fetches active issues currently affecting a specific polling unit
// @Tags Updates
// @Accept json
// @Produce json
// @Param polling_unit_id query int true "Polling Unit ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-updates/issues [get]
// @Security BearerAuth
func (h *Handler) ListActiveIssues(w http.ResponseWriter, r *http.Request) {
	val := r.URL.Query().Get("polling_unit_id")
	if val == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "polling_unit_id is required")
		return
	}
	puID, err := strconv.ParseInt(val, 10, 32)
	if err != nil || puID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "invalid polling_unit_id")
		return
	}

	issues, err := h.service.GetActiveIssues(r.Context(), int32(puID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch active issues: "+err.Error())
		return
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Active issues retrieved successfully", issues)
}

// validateAssignmentMatch verifies that the cached assignment exists and matches the request payload.
func validateAssignmentMatch(assignment *queries.GetUserAssignmentRow, expectedAssignmentID int64, expectedPuID int32) (int, string) {
	if assignment == nil || assignment.ID <= 0 {
		return http.StatusNotFound, "No active assignment found for this election group"
	}
	if assignment.ID != expectedAssignmentID {
		return http.StatusForbidden, "Assignment does not belong to you"
	}
	if assignment.PollingUnitID != expectedPuID {
		return http.StatusBadRequest, "Polling unit does not match assignment"
	}
	return 0, ""
}

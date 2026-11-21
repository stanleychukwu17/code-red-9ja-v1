package supervisor_updates

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	supervisorassignmentsservice "free9ja/api/internal/service/supervisor_assignments"
	"free9ja/api/internal/service/supervisor_updates"
	"free9ja/api/internal/utils"
)

type Service interface {
	CreateUpdate(ctx context.Context, input supervisor_updates.CreateSupervisorUpdateInput) (queries.SupervisorUpdate, error)
	ListUpdates(ctx context.Context, params queries.ListSupervisorUpdatesParams) ([]queries.ListSupervisorUpdatesRow, error)
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
}

type SupervisorAssignmentsService interface {
	GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int32) (*supervisorassignmentsservice.SupervisorAssignmentsResponse, error)
}

type Handler struct {
	service             Service
	supervisorAssignSvc SupervisorAssignmentsService
	utils               *utils.Utils
}

func NewHandler(s Service, supAssignSvc SupervisorAssignmentsService, u *utils.Utils) *Handler {
	return &Handler{
		service:             s,
		supervisorAssignSvc: supAssignSvc,
		utils:               u,
	}
}

type CreateSupervisorUpdateRequest struct {
	ElectionGroupID int32                          `json:"election_group_id"`
	CategoryType    string                         `json:"category_type"`
	Stage           string                         `json:"stage"`
	Title           *string                        `json:"title,omitempty"`
	Message         string                         `json:"message"`
	PollingUnitID   *int32                         `json:"polling_unit_id,omitempty"`
	Media           []supervisor_updates.MediaItem `json:"media,omitempty"`
	Latitude        *float64                       `json:"latitude,omitempty"`
	Longitude       *float64                       `json:"longitude,omitempty"`
	AccuracyMeters  *float64                       `json:"accuracy_meters,omitempty"`
}

// CreateUpdate godoc
// @Summary Create Supervisor Update
// @Description Submit a situational update, incident report, or collation status update by an election supervisor
// @Tags Supervisor Updates
// @Accept json
// @Produce json
// @Param request body CreateSupervisorUpdateRequest true "Supervisor Update Details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /supervisor-updates [post]
// @Security BearerAuth
func (h *Handler) CreateUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateSupervisorUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ElectionGroupID <= 0 || req.Message == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id and message are required")
		return
	}

	if req.CategoryType == "" {
		req.CategoryType = "field_monitoring"
	}
	if req.Stage == "" {
		req.Stage = "field_monitoring"
	}

	// Verify active supervisor role for this election group
	supRes, err := h.supervisorAssignSvc.GetUserSupervisorAssignments(r.Context(), claims.UserID, req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify supervisor assignment: "+err.Error())
		return
	}

	var roleType string
	var stateID int16
	var lgaID *int32
	var wardID *int32
	var partyID *int16

	if supRes != nil {
		if supRes.WardSupervisor != nil && supRes.WardSupervisor.ID > 0 {
			roleType = constants.RoleWardElectionSupervisor
			stateID = supRes.WardSupervisor.StateID
			lgaVal := supRes.WardSupervisor.LgaID
			lgaID = &lgaVal
			wardVal := supRes.WardSupervisor.WardID
			wardID = &wardVal
			pVal := supRes.WardSupervisor.PartyID
			partyID = &pVal
		} else if supRes.LgaSupervisor != nil && supRes.LgaSupervisor.ID > 0 {
			roleType = constants.RoleLgaElectionSupervisor
			stateID = supRes.LgaSupervisor.StateID
			lgaVal := supRes.LgaSupervisor.LgaID
			lgaID = &lgaVal
			pVal := supRes.LgaSupervisor.PartyID
			partyID = &pVal
		} else if supRes.StateSupervisor != nil && supRes.StateSupervisor.ID > 0 {
			roleType = constants.RoleStateElectionSupervisor
			stateID = supRes.StateSupervisor.StateID
			pVal := supRes.StateSupervisor.PartyID
			partyID = &pVal
		}
	}

	if roleType == "" {
		h.utils.RespondError(w, http.StatusForbidden, "You do not have an active supervisor assignment for this election")
		return
	}

	// Verify election reporting window
	eg, err := h.service.GetElectionGroupByID(r.Context(), req.ElectionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group: "+err.Error())
		return
	}

	if err := utils.ValidateElectionReportingWindow(eg.ElectionDate.Time, time.Now(), 1); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	update, err := h.service.CreateUpdate(r.Context(), supervisor_updates.CreateSupervisorUpdateInput{
		UserID:          claims.FakeID,
		RoleType:        roleType,
		ElectionGroupID: req.ElectionGroupID,
		PartyID:         partyID,
		StateID:         stateID,
		LgaID:           lgaID,
		WardID:          wardID,
		PollingUnitID:   req.PollingUnitID,
		CategoryType:    req.CategoryType,
		Stage:           req.Stage,
		Title:           req.Title,
		Message:         req.Message,
		Media:           req.Media,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		AccuracyMeters:  req.AccuracyMeters,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Supervisor update submitted successfully", map[string]interface{}{
		"update": update,
	})
}

// ListUpdates godoc
// @Summary List Supervisor Updates
// @Description Fetches a list of supervisor updates using cursor pagination
// @Tags Supervisor Updates
// @Accept json
// @Produce json
// @Param election_group_id query int false "Filter by Election Group ID"
// @Param party_id query int false "Filter by Party ID"
// @Param role_type query string false "Filter by Role Type"
// @Param state_id query int false "Filter by State ID"
// @Param lga_id query int false "Filter by LGA ID"
// @Param ward_id query int false "Filter by Ward ID"
// @Param user_id query int false "Filter by User ID"
// @Param category_type query string false "Filter by Category Type"
// @Param cursor_id query int false "Cursor for pagination"
// @Param limit query int false "Results limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /supervisor-updates [get]
func (h *Handler) ListUpdates(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	limit := int32(20)
	if lStr := q.Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			if l > 100 {
				limit = 100
			} else {
				limit = int32(l)
			}
		}
	}

	params := queries.ListSupervisorUpdatesParams{
		PageLimit: limit,
	}

	if egStr := q.Get("election_group_id"); egStr != "" {
		if eg, err := strconv.Atoi(egStr); err == nil && eg > 0 {
			params.ElectionGroupID = utils.PgInt4FromInt32(int32(eg))
		}
	}

	if pStr := q.Get("party_id"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			params.PartyID = utils.PgInt2FromInt16(int16(p))
		}
	}

	if rType := q.Get("role_type"); rType != "" {
		params.RoleType = utils.PgTextFromString(rType)
	}

	if sStr := q.Get("state_id"); sStr != "" {
		if s, err := strconv.Atoi(sStr); err == nil && s > 0 {
			params.StateID = utils.PgInt2FromInt16(int16(s))
		}
	}

	if lStr := q.Get("lga_id"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			params.LgaID = utils.PgInt4FromInt32(int32(l))
		}
	}

	if wStr := q.Get("ward_id"); wStr != "" {
		if w, err := strconv.Atoi(wStr); err == nil && w > 0 {
			params.WardID = utils.PgInt4FromInt32(int32(w))
		}
	}

	if uStr := q.Get("user_id"); uStr != "" {
		if u, err := strconv.ParseInt(uStr, 10, 64); err == nil && u > 0 {
			params.UserID = utils.PgInt8FromInt64(u)
		}
	}

	if cType := q.Get("category_type"); cType != "" {
		params.CategoryType = utils.PgTextFromString(cType)
	}

	if cStr := q.Get("cursor_id"); cStr != "" {
		if c, err := strconv.ParseInt(cStr, 10, 64); err == nil && c > 0 {
			params.CursorID = utils.PgInt8FromInt64(c)
		}
	}

	updates, err := h.service.ListUpdates(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list supervisor updates: "+err.Error())
		return
	}

	var nextCursor *int64
	if len(updates) > 0 && len(updates) == int(limit) {
		lastID := updates[len(updates)-1].ID
		nextCursor = &lastID
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Supervisor updates retrieved successfully", map[string]interface{}{
		"updates":     updates,
		"next_cursor": nextCursor,
	})
}

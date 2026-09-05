package agentearningshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	earningsservice "free9ja/api/internal/service/earnings"
	"free9ja/api/internal/utils"
)

type Handler struct {
	q       *queries.Queries
	service *earningsservice.Service
	u       *utils.Utils
}

func NewHandler(q *queries.Queries, svc *earningsservice.Service, u *utils.Utils) *Handler {
	return &Handler{q: q, service: svc, u: u}
}

// ─── POST /api/v1/agent-earnings/calculate/{assignment_id} ───────────────────

// CalculateEarnings godoc
// @Summary      Calculate agent earnings for an assignment
// @Description  Computes and upserts the earnings record for a given assignment. Can be called repeatedly to refresh.
// @Tags         AgentEarnings
// @Produce      json
// @Param        assignment_id path int true "Assignment ID"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /agent-earnings/calculate/{assignment_id} [post]
func (h *Handler) CalculateEarnings(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "assignment_id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	result, err := h.service.Calculate(r.Context(), id)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to calculate earnings: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings calculated", map[string]interface{}{
		"earnings": result,
	})
}

// ─── GET /api/v1/agent-earnings ──────────────────────────────────────────────

// ListEarnings godoc
// @Summary      List agent earnings
// @Tags         AgentEarnings
// @Produce      json
// @Param        user_id           query int    false "Filter by user ID"
// @Param        election_group_id query int    false "Filter by election group"
// @Param        party_id          query int    false "Filter by party"
// @Param        status            query string false "Filter by status (pending|approved|paid|disputed)"
// @Param        limit             query int    false "Page size (default 50)"
// @Param        cursor            query int    false "Cursor for pagination"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-earnings [get]
func (h *Handler) ListEarnings(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()
	var userID, electionGroupID, cursor int64
	var partyID int16
	status := q.Get("status")
	limit := int32(50)

	if v := q.Get("user_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 64); err == nil {
			userID = p
		}
	}
	if v := q.Get("election_group_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 64); err == nil {
			electionGroupID = p
		}
	}
	if v := q.Get("party_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 16); err == nil {
			partyID = int16(p)
		}
	}
	if v := q.Get("limit"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 32); err == nil && p > 0 {
			limit = int32(p)
		}
	}
	if v := q.Get("cursor"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 64); err == nil {
			cursor = p
		}
	}

	rows, err := h.q.ListAgentEarnings(r.Context(), queries.ListAgentEarningsParams{
		Column1: userID,
		Column2: electionGroupID,
		Column3: partyID,
		Column4: status,
		Column5: cursor,
		Column6: limit,
	})
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to list earnings")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings retrieved", map[string]interface{}{
		"earnings": rows,
	})
}

// ─── GET /api/v1/agent-earnings/{id} ─────────────────────────────────────────

// GetEarnings godoc
// @Summary      Get a single agent earnings record
// @Tags         AgentEarnings
// @Produce      json
// @Param        id path int true "Earnings ID"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-earnings/{id} [get]
func (h *Handler) GetEarnings(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	row, err := h.q.GetAgentEarningsByID(r.Context(), id)
	if err != nil {
		h.u.RespondError(w, http.StatusNotFound, "Earnings record not found")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings retrieved", map[string]interface{}{
		"earnings": row,
	})
}

// ─── GET /api/v1/agent-earnings/assignment/{assignment_id} ───────────────────

// GetEarningsByAssignment godoc
// @Summary      Get earnings for a specific assignment
// @Tags         AgentEarnings
// @Produce      json
// @Param        assignment_id path int true "Assignment ID"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-earnings/assignment/{assignment_id} [get]
func (h *Handler) GetEarningsByAssignment(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "assignment_id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	asgn, err := h.q.GetAssignmentForEarnings(r.Context(), id)
	if err != nil {
		h.u.RespondError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	roleType := "polling_agent"
	if asgn.RoleType.Valid && asgn.RoleType.String != "" {
		roleType = asgn.RoleType.String
	}

	row, err := h.q.GetAgentEarningsByUserAndElectionGroupAndRole(r.Context(), queries.GetAgentEarningsByUserAndElectionGroupAndRoleParams{
		UserID:          asgn.UserID,
		ElectionGroupID: asgn.ElectionGroupID,
		RoleType:        roleType,
	})
	if err != nil {
		h.u.RespondError(w, http.StatusNotFound, "Earnings record not found")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings retrieved", map[string]interface{}{
		"earnings": row,
	})
}

// ─── PATCH /api/v1/agent-earnings/{id}/approve ───────────────────────────────

// ApproveEarnings godoc
// @Summary      Approve earnings for payout (admin)
// @Tags         AgentEarnings
// @Produce      json
// @Param        id path int true "Earnings ID"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-earnings/{id}/approve [patch]
func (h *Handler) ApproveEarnings(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	row, err := h.q.ApproveAgentEarnings(r.Context(), id)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to approve earnings (already approved or not found)")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings approved", map[string]interface{}{
		"earnings": row,
	})
}

// ─── PATCH /api/v1/agent-earnings/{id}/mark-paid ─────────────────────────────

// MarkPaid godoc
// @Summary      Mark approved earnings as paid (admin)
// @Tags         AgentEarnings
// @Produce      json
// @Param        id path int true "Earnings ID"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-earnings/{id}/mark-paid [patch]
func (h *Handler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	row, err := h.q.MarkAgentEarningsPaid(r.Context(), id)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to mark as paid (not approved or not found)")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Earnings marked as paid", map[string]interface{}{
		"earnings": row,
	})
}

// ─── GET /api/v1/agent-earnings/potential-payout ─────────────────────────────

// GetPotentialPayout godoc
// @Summary      Get potential payout in Kobo for a given task type
// @Tags         AgentEarnings
// @Produce      json
// @Param        assignment_id query int    true  "Assignment ID"
// @Param        task_type     query string true  "Task Type (readiness|results|attendance|election_start|election_end|live_voters_referred|updates)"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /agent-earnings/potential-payout [get]
func (h *Handler) GetPotentialPayout(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()
	assignmentID, err := strconv.ParseInt(q.Get("assignment_id"), 10, 64)
	if err != nil || assignmentID <= 0 {
		h.u.RespondError(w, http.StatusBadRequest, "assignment_id query param is required")
		return
	}

	taskType := q.Get("task_type")
	if taskType == "" {
		h.u.RespondError(w, http.StatusBadRequest, "task_type query param is required")
		return
	}

	result, err := h.service.CalculatePotentialPayout(r.Context(), assignmentID, taskType)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to calculate potential payout: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Potential payout calculated", map[string]interface{}{
		"payout": result,
	})
}

// ─── GET /api/v1/agent-earnings/estimate-payout ───────────────────────────────

// EstimatePotentialPayout godoc
// @Summary      Estimate potential payout in Kobo for a given task type without requiring an assignment ID
// @Tags         AgentEarnings
// @Produce      json
// @Param        task_type         query string true  "Task Type (readiness|results|attendance|election_start|election_end|live_voters_referred|updates)"
// @Param        role              query string false "Role (polling_agent|ward_supervisor|lga_supervisor|state_supervisor)"
// @Param        election_group_id query int    false "Election Group ID"
// @Param        party_id          query int    false "Party ID"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /agent-earnings/estimate-payout [get]
func (h *Handler) EstimatePotentialPayout(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()
	taskType := q.Get("task_type")
	if taskType == "" {
		h.u.RespondError(w, http.StatusBadRequest, "task_type query param is required")
		return
	}

	role := q.Get("role")
	var electionGroupID int64
	var partyID int16

	if v := q.Get("election_group_id"); v != "" {
		electionGroupID, _ = strconv.ParseInt(v, 10, 64)
	}
	if v := q.Get("party_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 16); err == nil {
			partyID = int16(p)
		}
	}

	result, err := h.service.EstimatePotentialPayout(r.Context(), taskType, role, electionGroupID, partyID)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to estimate potential payout: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Potential payout estimated", map[string]interface{}{
		"payout": result,
	})
}

// ─── GET /api/v1/agent-earnings/allocations ───────────────────────────────────

// GetAllocations godoc
// @Summary      Get agent task percentage allocations and potential payouts in Kobo
// @Tags         AgentEarnings
// @Produce      json
// @Param        election_group_id query int    false "Election Group ID"
// @Param        role_type         query string false "Role Type (polling_agent|ward_supervisor|lga_supervisor|state_supervisor)"
// @Param        assignment_id     query int    false "Assignment ID"
// @Success      200 {object} utils.SuccessResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /agent-earnings/allocations [get]
func (h *Handler) GetAllocations(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()
	var electionGroupID, assignmentID int64
	if v := q.Get("election_group_id"); v != "" {
		electionGroupID, _ = strconv.ParseInt(v, 10, 64)
	}
	if v := q.Get("assignment_id"); v != "" {
		assignmentID, _ = strconv.ParseInt(v, 10, 64)
	}
	roleType := q.Get("role_type")

	result, err := h.service.GetAgentAllocations(r.Context(), claims.UserID, electionGroupID, roleType, assignmentID)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to get agent allocations: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Agent allocations retrieved", map[string]interface{}{
		"allocations": result,
	})
}

// ─── Internal trigger ─────────────────────────────────────────────────────────

// TriggerCalculation is called by other handlers (practice tests, assignment tracking)
// to recalculate earnings for a given assignment in the background.
// It never fails the caller's HTTP response.
func TriggerCalculation(svc *earningsservice.Service, assignmentID int64) {
	if assignmentID <= 0 || svc == nil {
		return
	}
	go func() {
		_, _ = svc.Calculate(context.Background(), assignmentID)
	}()
}

type RequestPayoutRequest struct {
	ElectionGroupID int64  `json:"election_group_id"`
	RoleType        string `json:"role_type"`
}

// RequestPayout godoc
// @Summary      Request duty payout for an agent assignment / election group
// @Tags         AgentEarnings
// @Produce      json
// @Param        request body RequestPayoutRequest true "Payout Request"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /agent-earnings/request-payout [post]
func (h *Handler) RequestPayout(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		ElectionGroupID int64  `json:"election_group_id"`
		RoleType        string `json:"role_type"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.ElectionGroupID <= 0 {
		idStr := chi.URLParam(r, "id")
		if idStr != "" {
			asgnID, err := strconv.ParseInt(idStr, 10, 64)
			if err == nil && asgnID > 0 {
				asgn, aErr := h.q.GetAssignmentForEarnings(r.Context(), asgnID)
				if aErr == nil {
					req.ElectionGroupID = asgn.ElectionGroupID
					if asgn.RoleType.Valid {
						req.RoleType = asgn.RoleType.String
					}
				}
			}
		}
	}

	if req.ElectionGroupID <= 0 {
		h.u.RespondError(w, http.StatusBadRequest, "election_group_id or valid assignment_id is required")
		return
	}

	row, err := h.service.RequestPayout(r.Context(), claims.UserID, req.ElectionGroupID, req.RoleType)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to request payout: %v", err))
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Payout requested successfully", map[string]interface{}{
		"earnings": row,
	})
}

// ─── GET /api/v1/agent-performance ───────────────────────────────────────────

// GetAgentPerformanceStats godoc
// @Summary      Get agent and supervisor performance stats with cursor pagination
// @Tags         AgentEarnings
// @Produce      json
// @Param        role_type         query string false "Role type (polling_agent|ward_supervisor|lga_supervisor|state_supervisor)"
// @Param        party_id          query int    false "Filter by party ID"
// @Param        election_group_id query int    false "Filter by election group ID"
// @Param        state_id          query int    false "Filter by state ID"
// @Param        lga_id            query int    false "Filter by LGA ID"
// @Param        ward_id           query int    false "Filter by ward ID"
// @Param        search            query string false "Search agent name or PU code"
// @Param        cursor            query int    false "Cursor ID for keyset pagination"
// @Param        limit             query int    false "Page limit (default 20, max 100)"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /agent-performance [get]
func (h *Handler) GetAgentPerformanceStats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	roleType := q.Get("role_type")
	if roleType == "" {
		roleType = "polling_agent"
	}

	var partyID int16
	var electionGroupID, cursor int64
	var stateID int16
	var lgaID, wardID int32
	limit := int32(20)

	if v := q.Get("party_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 16); err == nil {
			partyID = int16(p)
		}
	}
	if v := q.Get("election_group_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 64); err == nil {
			electionGroupID = p
		}
	}
	if v := q.Get("state_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 16); err == nil {
			stateID = int16(p)
		}
	}
	if v := q.Get("lga_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 32); err == nil {
			lgaID = int32(p)
		}
	}
	if v := q.Get("ward_id"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 32); err == nil {
			wardID = int32(p)
		}
	}
	if v := q.Get("cursor"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 64); err == nil {
			cursor = p
		}
	}
	if v := q.Get("limit"); v != "" {
		if p, err := strconv.ParseInt(v, 10, 32); err == nil && p > 0 {
			limit = int32(p)
			if limit > 100 {
				limit = 100
			}
		}
	}
	search := q.Get("search")

	ctx := r.Context()
	var items interface{}
	var err error

	switch roleType {
	case "polling_agent":
		items, err = h.q.ListPollingAgentPerformanceStats(ctx, queries.ListPollingAgentPerformanceStatsParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
			StateID:         stateID,
			LgaID:           lgaID,
			WardID:          wardID,
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        limit,
		})
	case "ward_supervisor", "ward_election_supervisor":
		items, err = h.q.ListWardSupervisorPerformanceStats(ctx, queries.ListWardSupervisorPerformanceStatsParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
			StateID:         stateID,
			LgaID:           lgaID,
			WardID:          wardID,
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        limit,
		})
	case "lga_supervisor", "lga_election_supervisor":
		items, err = h.q.ListLGASupervisorPerformanceStats(ctx, queries.ListLGASupervisorPerformanceStatsParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
			StateID:         stateID,
			LgaID:           lgaID,
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        limit,
		})
	case "state_supervisor", "state_election_supervisor":
		items, err = h.q.ListStateSupervisorPerformanceStats(ctx, queries.ListStateSupervisorPerformanceStatsParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
			StateID:         stateID,
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        limit,
		})
	default:
		h.u.RespondError(w, http.StatusBadRequest, "Invalid role_type")
		return
	}

	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to retrieve performance stats: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Agent performance stats retrieved", map[string]interface{}{
		"data":  items,
		"limit": limit,
	})
}


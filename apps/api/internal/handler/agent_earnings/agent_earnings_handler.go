package agentearningshandler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"free9ja/api/internal/db/queries"
	earningsservice "free9ja/api/internal/service/earnings"
	apimiddleware "free9ja/api/internal/middleware"
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


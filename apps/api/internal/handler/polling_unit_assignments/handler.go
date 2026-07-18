package puassignmentshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type PollingUnitAssignmentsService interface {
	AssignAgent(ctx context.Context, userID, electionGroupID, partyID, assignedBy int64, pollingUnitID int32, roleType string) (queries.PollingUnitAssignment, error)
	GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error)
	ListAssignments(ctx context.Context, electionGroupID, partyID, userID int64, pollingUnitID int32, limit, offset int32) ([]queries.ListAssignmentsRow, error)
	DeleteAssignment(ctx context.Context, id int64) error
	UpdateAssignmentTracking(ctx context.Context, id int64, arrivedAt, arrivalVideoUrl, electionStartedAt, electionStartedVideoUrl, electionEndedAt, electionEndedVideoUrl *string) (queries.UpdateAssignmentTrackingRow, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error)
	GetUserRoles(ctx context.Context, userID int64) ([]queries.GetUserRolesRow, error)
}

type Handler struct {
	service         PollingUnitAssignmentsService
	usersService    UsersService
	utils           *utils.Utils
	taskDistributor worker.TaskDistributor
}

func NewHandler(service PollingUnitAssignmentsService, usersService UsersService, utils *utils.Utils, taskDistributor worker.TaskDistributor) *Handler {
	return &Handler{
		service:         service,
		usersService:    usersService,
		utils:           utils,
		taskDistributor: taskDistributor,
	}
}

type CreateAssignmentRequest struct {
	FakeID          int64  `json:"fake_id"`
	PollingUnitID   int32  `json:"polling_unit_id"`
	ElectionGroupID int64  `json:"election_group_id"`
	PartyID         int64  `json:"party_id"`
	RoleType        string `json:"role_type"`
}

// CreateAssignment godoc
// @Summary      Assign a user to a polling unit for an election group
// @Description  Creates a polling unit assignment. Role level enforcement ensures party admins can only assign users for their own party.
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        request body CreateAssignmentRequest true "Create Assignment payload"
// @Success      201  {object} map[string]interface{} "Assignment created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      409  {object} map[string]interface{} "Constraint conflict (already assigned)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /polling-unit-assignments [post]
func (h *Handler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	var req CreateAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.FakeID <= 0 || req.PollingUnitID <= 0 || req.ElectionGroupID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "fake_id, polling_unit_id, and election_group_id are required")
		return
	}

	// Enforce role levels
	// Platform admin can assign any party. Party admin can only assign for their own party.
	var finalPartyID int64
	roles, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	isPartyAdmin := false
	for _, r := range roles {
		if r.Code == "admin" {
			isPlatformAdmin = true
		}
		if r.Code == "partyadmin" {
			isPartyAdmin = true
		}
	}

	if isPlatformAdmin {
		if req.PartyID <= 0 {
			h.utils.RespondError(w, http.StatusBadRequest, "party_id is required for platform admins")
			return
		}
		finalPartyID = req.PartyID
	} else {
		if !isPartyAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Only administrators can make assignments")
			return
		}
		if !requester.PartyID.Valid {
			h.utils.RespondError(w, http.StatusForbidden, "Admin is not associated with a party")
			return
		}
		finalPartyID = requester.PartyID.Int64
	}

	// Verify target agent exists and belongs to the correct party if it is a party admin assignment
	targetUser, err := h.usersService.GetUserByFakeID(r.Context(), req.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Target user not found")
		return
	}

	if !isPlatformAdmin {
		if !targetUser.PartyID.Valid || targetUser.PartyID.Int64 != finalPartyID {
			h.utils.RespondError(w, http.StatusForbidden, "Cannot assign a user from a different party")
			return
		}
	}

	roleType := req.RoleType
	if roleType == "" {
		roleType = "polling_agent"
	}

	assignment, err := h.service.AssignAgent(r.Context(), targetUser.ID, req.ElectionGroupID, finalPartyID, requester.ID, req.PollingUnitID, roleType)
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "uq_agent_per_election_day") {
			h.utils.RespondError(w, http.StatusConflict, "Agent is already assigned to a polling unit for this election group")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create assignment: "+errStr)
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Polling unit assignment created successfully", map[string]interface{}{
		"assignment": assignment,
	})
}

// ListAssignments godoc
// @Summary      List polling unit assignments
// @Description  Fetches a list of assignments with optional filters for election_group_id, party_id, polling_unit_id, and user_id. Supports pagination.
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        election_group_id query int    false "Filter by Election Group ID"
// @Param        party_id          query int    false "Filter by Party ID"
// @Param        polling_unit_id   query int    false "Filter by Polling Unit ID"
// @Param        user_id           query int    false "Filter by User ID"
// @Param        limit             query int    false "Pagination Limit (default 20)"
// @Param        offset            query int    false "Pagination Offset (default 0)"
// @Success      200  {object} map[string]interface{} "Assignments fetched successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /polling-unit-assignments [get]
func (h *Handler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Parse filtering query params
	var electionGroupID, partyID, userID int64
	var pollingUnitID int32

	if val := r.URL.Query().Get("election_group_id"); val != "" {
		electionGroupID, _ = strconv.ParseInt(val, 10, 64)
	}
	if val := r.URL.Query().Get("party_id"); val != "" {
		partyID, _ = strconv.ParseInt(val, 10, 64)
	}
	if val := r.URL.Query().Get("polling_unit_id"); val != "" {
		pID, _ := strconv.ParseInt(val, 10, 32)
		pollingUnitID = int32(pID)
	}
	if val := r.URL.Query().Get("user_id"); val != "" {
		userID, _ = strconv.ParseInt(val, 10, 64)
	}

	// Pagination params
	limit := int32(20)
	if val := r.URL.Query().Get("limit"); val != "" {
		if l, err := strconv.Atoi(val); err == nil && l > 0 {
			limit = int32(l)
		}
	}
	offset := int32(0)
	if val := r.URL.Query().Get("offset"); val != "" {
		if o, err := strconv.Atoi(val); err == nil && o >= 0 {
			offset = int32(o)
		}
	}

	// Enforce scoped party-level listing if not platform admin
	roles, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	for _, r := range roles {
		if r.Code == "admin" {
			isPlatformAdmin = true
			break
		}
	}
	if !isPlatformAdmin {
		if !requester.PartyID.Valid {
			h.utils.RespondError(w, http.StatusForbidden, "User is not associated with a party")
			return
		}
		// Force the filter to only their own party
		partyID = requester.PartyID.Int64
	}

	assignments, err := h.service.ListAssignments(r.Context(), electionGroupID, partyID, userID, pollingUnitID, limit, offset)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list assignments: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Assignments retrieved successfully", map[string]interface{}{
		"assignments": assignments,
	})
}

// GetAssignment godoc
// @Summary      Get details of a specific assignment
// @Description  Retrieves an assignment record by its ID.
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Assignment ID"
// @Success      200  {object} map[string]interface{} "Assignment fetched successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      404  {object} map[string]interface{} "Assignment not found"
// @Security     BearerAuth
// @Router       /polling-unit-assignments/{id} [get]
func (h *Handler) GetAssignment(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	assignment, err := h.service.GetAssignmentByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	// Enforce visibility restriction: party admins can only view assignments of their own party
	roles, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	for _, r := range roles {
		if r.Code == "admin" {
			isPlatformAdmin = true
			break
		}
	}
	if !isPlatformAdmin {
		if !requester.PartyID.Valid || assignment.PartyID != requester.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Permission denied")
			return
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Assignment retrieved successfully", map[string]interface{}{
		"assignment": assignment,
	})
}

// DeleteAssignment godoc
// @Summary      Delete an assignment
// @Description  Removes/revokes a polling unit assignment.
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Assignment ID"
// @Success      200  {object} map[string]interface{} "Assignment deleted successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      404  {object} map[string]interface{} "Assignment not found"
// @Router       /polling-unit-assignments/{id} [delete]
func (h *Handler) DeleteAssignment(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	assignment, err := h.service.GetAssignmentByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	// Enforce scope: party admins can only delete assignments for their own party
	roles, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	isPartyAdmin := false
	for _, r := range roles {
		if r.Code == "admin" {
			isPlatformAdmin = true
		}
		if r.Code == "partyadmin" {
			isPartyAdmin = true
		}
	}
	if !isPlatformAdmin {
		if !isPartyAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Only administrators can delete assignments")
			return
		}
		if !requester.PartyID.Valid || assignment.PartyID != requester.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Cannot delete assignment of a different party")
			return
		}
	}

	if err := h.service.DeleteAssignment(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete assignment: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Assignment deleted successfully", nil)
}

type UpdateAssignmentTrackingRequest struct {
	ArrivedAt               *string `json:"arrived_at"`
	ArrivalVideoUrl         *string `json:"arrival_video_url"`
	ElectionStartedAt       *string `json:"election_started_at"`
	ElectionStartedVideoUrl *string `json:"election_started_video_url"`
	ElectionEndedAt         *string `json:"election_ended_at"`
	ElectionEndedVideoUrl   *string `json:"election_ended_video_url"`
}

// UpdateAssignmentTracking godoc
// @Summary      Update polling unit assignment tracking (arrival, phases)
// @Description  Allows agents to submit verification videos and times. Users can only update their own assignments.
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Assignment ID"
// @Param        request body UpdateAssignmentTrackingRequest true "Update Tracking payload"
// @Success      200  {object} map[string]interface{} "Assignment tracking updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      404  {object} map[string]interface{} "Assignment not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /polling-unit-assignments/{id}/tracking [patch]
func (h *Handler) UpdateAssignmentTracking(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	var req UpdateAssignmentTrackingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	assignment, err := h.service.GetAssignmentByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	// Enforce that only the assigned user can update tracking
	if assignment.UserID != requester.ID {
		h.utils.RespondError(w, http.StatusForbidden, "You can only update your own assignments")
		return
	}

	updated, err := h.service.UpdateAssignmentTracking(r.Context(), id, req.ArrivedAt, req.ArrivalVideoUrl, req.ElectionStartedAt, req.ElectionStartedVideoUrl, req.ElectionEndedAt, req.ElectionEndedVideoUrl)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update tracking: "+err.Error())
		return
	}

	// Enqueue debounced polling unit stats refresh
	go func() {
		payload := &worker.RefreshPollingUnitStatsPayload{
			Params: queries.RefreshSingleElectionGroupPollingUnitStatsParams{
				ElectionGroupID: assignment.ElectionGroupID,
				PollingUnitID:   assignment.PollingUnitID,
			},
		}
		if err := h.taskDistributor.DistributeTaskRefreshPollingUnitStats(context.Background(), payload); err != nil {
			// Log error but don't fail the request
		}
	}()

	h.utils.RespondSuccess(w, http.StatusOK, "Assignment tracking updated successfully", map[string]interface{}{
		"assignment": updated,
	})
}

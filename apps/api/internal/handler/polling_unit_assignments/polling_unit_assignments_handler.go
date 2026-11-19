package puassignmentshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	puupdates "free9ja/api/internal/service/polling_unit_updates"
	supervisorassignmentsservice "free9ja/api/internal/service/supervisor_assignments"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type PollingUnitAssignmentsService interface {
	GetAssignmentByID(ctx context.Context, id int64) (queries.GetAssignmentByIDRow, error)
	ListAssignments(ctx context.Context, electionGroupID int32, partyID int16, userID int64, pollingUnitID int32, limit, offset int32) ([]queries.ListAssignmentsRow, error)
	GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error)
	HasActiveAssignment(ctx context.Context, userID int64) (bool, error)
	GetActiveAssignment(ctx context.Context, userID int64) (*queries.GetUserAssignmentRow, error)
	GetActiveSupervisorElectionGroupID(ctx context.Context, userID int64) (int32, error)
	DeleteAssignment(ctx context.Context, id int64) error
	UpdateAssignmentTracking(ctx context.Context, id int64, arrivedAt, electionStartedAt, electionEndedAt *string) (queries.UpdateAssignmentTrackingRow, error)
}

type SupervisorAssignmentsService interface {
	GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int32) (*supervisorassignmentsservice.SupervisorAssignmentsResponse, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
	GetUserRoles(ctx context.Context, userID int64) (queries.CachedUserRoles, error)
}

type PollingUnitUpdatesService interface {
	CreateUpdate(ctx context.Context, input puupdates.CreateUpdateInput) (queries.PollingUnitUpdate, error)
}

type EarningsService interface {
	Calculate(ctx context.Context, assignmentID int64) (queries.AgentEarning, error)
}

type PollingUnitsService interface {
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
}

type Handler struct {
	service                   PollingUnitAssignmentsService
	usersService              UsersService
	pollingUnitUpdatesService PollingUnitUpdatesService
	earningsService           EarningsService
	supervisorService         SupervisorAssignmentsService
	puService                 PollingUnitsService
	utils                     *utils.Utils
}

func NewHandler(service PollingUnitAssignmentsService, usersService UsersService, puUpdatesService PollingUnitUpdatesService, utils *utils.Utils, earningsSvc EarningsService, supervisorSvc SupervisorAssignmentsService, puSvc PollingUnitsService) *Handler {
	return &Handler{
		service:                   service,
		usersService:              usersService,
		pollingUnitUpdatesService: puUpdatesService,
		earningsService:           earningsSvc,
		supervisorService:         supervisorSvc,
		puService:                 puSvc,
		utils:                     utils,
	}
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Parse filtering query params
	var userID int64
	var electionGroupID int32
	var partyID int16
	var pollingUnitID int32

	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if eg, err := strconv.ParseInt(val, 10, 32); err == nil {
			electionGroupID = int32(eg)
		}
	}
	if val := r.URL.Query().Get("party_id"); val != "" {
		if p, err := strconv.ParseInt(val, 10, 16); err == nil {
			partyID = int16(p)
		}
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
	rolesData, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	for _, rCode := range rolesData.RolesCode {
		if rCode == "admin" || rCode == "super_admin" {
			isPlatformAdmin = true
			break
		}
	}
	if !isPlatformAdmin {
		requesterPartyID := int16(0)
		if requester.PartyID.Valid {
			requesterPartyID = requester.PartyID.Int16
		} else if claims.PartyID > 0 {
			requesterPartyID = claims.PartyID
		}
		if requesterPartyID == 0 {
			h.utils.RespondError(w, http.StatusForbidden, "User is not associated with a party")
			return
		}
		// Force the filter to only their own party
		partyID = requesterPartyID
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

// GetMyAssignment godoc
// @Summary      Get current user's polling unit assignment
// @Description  Fetches the active polling unit assignment for the authenticated user (optionally scoped to a specific election group, or discovering any active assignment).
// @Tags         PollingUnitAssignments
// @Accept       json
// @Produce      json
// @Param        election_group_id query int false "Election Group ID (optional; if omitted, checks active upcoming elections)"
// @Success      200  {object} map[string]interface{} "Assignment fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid election_group_id"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /polling-unit-assignments/my-assignment [get]
func (h *Handler) GetMyAssignment(w http.ResponseWriter, r *http.Request) {
	// Authenticate requester
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Parse optional election_group_id filter
	electionGroupIDStr := r.URL.Query().Get("election_group_id")
	var electionGroupID int32
	if electionGroupIDStr != "" {
		egID, err := strconv.ParseInt(electionGroupIDStr, 10, 32)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid election_group_id")
			return
		}

		electionGroupID = int32(egID)
	}

	var assignment *queries.GetUserAssignmentRow
	var supervisorAssignments *supervisorassignmentsservice.SupervisorAssignmentsResponse
	hasActiveAssignment := false

	if electionGroupID > 0 {
		// Specific election group requested
		assignment, err = h.service.GetMyAssignment(r.Context(), requester.ID, electionGroupID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch assignment: "+err.Error())
			return
		}

		if h.supervisorService != nil {
			supervisorAssignments, err = h.supervisorService.GetUserSupervisorAssignments(r.Context(), requester.ID, electionGroupID)
			if err != nil {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch supervisor assignments: "+err.Error())
				return
			}
		}

		hasActiveAssignment = assignment != nil || (supervisorAssignments != nil && (supervisorAssignments.StateSupervisor != nil || supervisorAssignments.LgaSupervisor != nil || supervisorAssignments.WardSupervisor != nil))
	} else {
		// Step 1: Fast EXISTS check across polling unit and supervisor assignments for active/upcoming elections
		hasActive, err := h.service.HasActiveAssignment(r.Context(), requester.ID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check active assignments: "+err.Error())
			return
		}

		hasActiveAssignment = hasActive

		// Step 2: If active assignment exists, fetch the assignment details
		if hasActive {
			assignment, _ = h.service.GetActiveAssignment(r.Context(), requester.ID)

			if assignment != nil && assignment.ElectionGroupID > 0 && h.supervisorService != nil {
				supervisorAssignments, _ = h.supervisorService.GetUserSupervisorAssignments(r.Context(), requester.ID, assignment.ElectionGroupID)
			} else if h.supervisorService != nil {
				// User has an active supervisor assignment
				if supEGID, sErr := h.service.GetActiveSupervisorElectionGroupID(r.Context(), requester.ID); sErr == nil && supEGID > 0 {
					supervisorAssignments, _ = h.supervisorService.GetUserSupervisorAssignments(r.Context(), requester.ID, supEGID)
				}
			}
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Assignment fetched successfully", map[string]interface{}{
		"has_active_assignment":  hasActiveAssignment,
		"assignment":             assignment,
		"supervisor_assignments": supervisorAssignments,
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
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
	rolesData, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	for _, rCode := range rolesData.RolesCode {
		if rCode == "admin" || rCode == "super_admin" {
			isPlatformAdmin = true
			break
		}
	}
	if !isPlatformAdmin {
		requesterPartyID := int16(0)
		if requester.PartyID.Valid {
			requesterPartyID = requester.PartyID.Int16
		} else if claims.PartyID > 0 {
			requesterPartyID = claims.PartyID
		}
		if requesterPartyID == 0 || assignment.PartyID != requesterPartyID {
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
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
	rolesData, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	isPartyAdmin := false
	for _, rCode := range rolesData.RolesCode {
		if rCode == "admin" || rCode == "super_admin" {
			isPlatformAdmin = true
		}
		if rCode == "party_admin" || rCode == "super_party_admin" {
			isPartyAdmin = true
		}
	}
	if !isPlatformAdmin {
		if !isPartyAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Only administrators can delete assignments")
			return
		}
		requesterPartyID := int16(0)
		if requester.PartyID.Valid {
			requesterPartyID = requester.PartyID.Int16
		} else if claims.PartyID > 0 {
			requesterPartyID = claims.PartyID
		}
		if requesterPartyID == 0 || assignment.PartyID != requesterPartyID {
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
	ArrivedAt         *string `json:"arrived_at"`
	ElectionStartedAt *string `json:"election_started_at"`
	ElectionEndedAt   *string `json:"election_ended_at"`
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
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

	updated, err := h.service.UpdateAssignmentTracking(r.Context(), id, req.ArrivedAt, req.ElectionStartedAt, req.ElectionEndedAt)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update tracking: "+err.Error())
		return
	}

	partyID := int16(assignment.PartyID)

	var pu queries.PollingUnit
	if h.puService != nil && ((req.ArrivedAt != nil && !assignment.ArrivedAt.Valid) ||
		(req.ElectionStartedAt != nil && !assignment.ElectionStartedAt.Valid) ||
		(req.ElectionEndedAt != nil && !assignment.ElectionEndedAt.Valid)) {
		pu, _ = h.puService.GetPollingUnitByID(r.Context(), assignment.PollingUnitID)
	}

	if req.ArrivedAt != nil && !assignment.ArrivedAt.Valid {
		statusCat := int16(1)
		_, _ = h.pollingUnitUpdatesService.CreateUpdate(r.Context(), puupdates.CreateUpdateInput{
			UserID:                      claims.FakeID,
			PollingUnitID:               assignment.PollingUnitID,
			ElectionGroupID:             assignment.ElectionGroupID,
			AssignmentID:                assignment.ID,
			PartyID:                     &partyID,
			StateID:                     pu.StateID,
			LgaID:                       pu.LgaID,
			WardID:                      pu.WardID,
			SenatorialDistrictID:        pu.SenatorialDistrictID,
			FederalConstituencyID:       pu.FederalConstituencyID,
			StateAssemblyConstituencyID: pu.StateConstituencyID,
			StatusCategoryID:            &statusCat,
			Message:                     "I just arrived at my polling unit.",
		})
	}

	if req.ElectionStartedAt != nil && !assignment.ElectionStartedAt.Valid {
		statusCat := int16(3)
		_, _ = h.pollingUnitUpdatesService.CreateUpdate(r.Context(), puupdates.CreateUpdateInput{
			UserID:                      claims.FakeID,
			PollingUnitID:               assignment.PollingUnitID,
			ElectionGroupID:             assignment.ElectionGroupID,
			AssignmentID:                assignment.ID,
			PartyID:                     &partyID,
			StateID:                     pu.StateID,
			LgaID:                       pu.LgaID,
			WardID:                      pu.WardID,
			SenatorialDistrictID:        pu.SenatorialDistrictID,
			FederalConstituencyID:       pu.FederalConstituencyID,
			StateAssemblyConstituencyID: pu.StateConstituencyID,
			StatusCategoryID:            &statusCat,
			Message:                     "The election at my polling unit has started.",
		})
	}

	if req.ElectionEndedAt != nil && !assignment.ElectionEndedAt.Valid {
		statusCat := int16(6)
		_, _ = h.pollingUnitUpdatesService.CreateUpdate(r.Context(), puupdates.CreateUpdateInput{
			UserID:                      claims.FakeID,
			PollingUnitID:               assignment.PollingUnitID,
			ElectionGroupID:             assignment.ElectionGroupID,
			AssignmentID:                assignment.ID,
			PartyID:                     &partyID,
			StateID:                     pu.StateID,
			LgaID:                       pu.LgaID,
			WardID:                      pu.WardID,
			SenatorialDistrictID:        pu.SenatorialDistrictID,
			FederalConstituencyID:       pu.FederalConstituencyID,
			StateAssemblyConstituencyID: pu.StateConstituencyID,
			StatusCategoryID:            &statusCat,
			Message:                     "The election at my polling unit has ended.",
		})
	}

	// Trigger earnings recalculation in the background for the tracking events
	if h.earningsService != nil {
		earningsSvc := h.earningsService
		assignmentID := assignment.ID
		go func() {
			_, _ = earningsSvc.Calculate(context.Background(), assignmentID)
		}()
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Assignment tracking updated successfully", map[string]interface{}{
		"assignment": updated,
	})
}

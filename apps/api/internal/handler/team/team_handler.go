package teamhandler

import (
	"context"
	"log/slog"
	"net/http"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	supervisorassignmentsservice "free9ja/api/internal/service/supervisor_assignments"
	teamservice "free9ja/api/internal/service/team"
	"free9ja/api/internal/utils"
)

type PollingUnitAssignmentsService interface {
	HasActiveAssignment(ctx context.Context, userID int64) (bool, error)
	GetMyAssignment(ctx context.Context, userID int64, electionGroupID int32) (*queries.GetUserAssignmentRow, error)
}

type SupervisorAssignmentsService interface {
	GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int32) (*supervisorassignmentsservice.SupervisorAssignmentsResponse, error)
}

type TeamService interface {
	GetPollingAgents(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32, wardID int32, pollingUnitID int32) ([]teamservice.TeamMemberItem, error)
	GetWardSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32, wardID int32) ([]teamservice.TeamMemberItem, error)
	GetLgaSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32) ([]teamservice.TeamMemberItem, error)
	GetStateSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16) ([]teamservice.TeamMemberItem, error)
}

type Handler struct {
	utils             *utils.Utils
	puService         PollingUnitAssignmentsService
	supervisorService SupervisorAssignmentsService
	teamService       TeamService
}

func NewHandler(utils *utils.Utils, puService PollingUnitAssignmentsService, supervisorService SupervisorAssignmentsService, teamService TeamService) *Handler {
	return &Handler{
		utils:             utils,
		puService:         puService,
		supervisorService: supervisorService,
		teamService:       teamService,
	}
}

// GetTeamMembers returns team members for the authenticated user scoped to their active election duty assignment.
func (h *Handler) GetTeamMembers(w http.ResponseWriter, r *http.Request) {
	// Authenticate requester claims
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	userID := claims.UserID
	if userID == 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Validate election group parameter
	qParams := r.URL.Query()
	electionGroupID := utils.ParseQueryInt[int32](qParams, "election_group_id")
	if electionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id is required")
		return
	}

	ctx := r.Context()

	// Check active duty assignment using cached service
	hasActive, err := h.puService.HasActiveAssignment(ctx, userID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check active assignment: "+err.Error())
		return
	}
	if !hasActive {
		h.utils.RespondSuccess(w, http.StatusOK, "You do not have an active assignment", map[string]interface{}{
			"items": []teamservice.TeamMemberItem{},
		})
		return
	}

	// Derive user assignment details and territory scope
	var partyID int16
	var baseStateID int16
	var baseLgaID int32
	var baseWardID int32
	var basePollingUnitID int32
	var userRole string

	// Check polling unit assignment for election group using cached service
	pollingUnitAssignment, err := h.puService.GetMyAssignment(ctx, userID, electionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch polling unit assignment: "+err.Error())
		return
	}

	if pollingUnitAssignment != nil && pollingUnitAssignment.ID > 0 {
		partyID = pollingUnitAssignment.PartyID
		baseStateID = int16(pollingUnitAssignment.StateID)
		baseLgaID = pollingUnitAssignment.LgaID
		baseWardID = pollingUnitAssignment.WardID
		basePollingUnitID = pollingUnitAssignment.PollingUnitID
		userRole = constants.RolePollingAgent
	} else {
		// Resolve supervisor role for election group using cached service
		supAssignments, sErr := h.supervisorService.GetUserSupervisorAssignments(ctx, userID, electionGroupID)
		if sErr != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch supervisor assignments: "+sErr.Error())
			return
		}

		if supAssignments != nil {
			if stateSupervisor := supAssignments.StateSupervisor; stateSupervisor != nil && stateSupervisor.ID > 0 {
				partyID = stateSupervisor.PartyID
				baseStateID = stateSupervisor.StateID
				userRole = constants.RoleStateElectionSupervisor
			} else if lgaSupervisor := supAssignments.LgaSupervisor; lgaSupervisor != nil && lgaSupervisor.ID > 0 {
				partyID = lgaSupervisor.PartyID
				baseStateID = lgaSupervisor.StateID
				baseLgaID = lgaSupervisor.LgaID
				userRole = constants.RoleLgaElectionSupervisor
			} else if wardSupervisor := supAssignments.WardSupervisor; wardSupervisor != nil && wardSupervisor.ID > 0 {
				partyID = wardSupervisor.PartyID
				baseStateID = wardSupervisor.StateID
				baseLgaID = wardSupervisor.LgaID
				baseWardID = wardSupervisor.WardID
				userRole = constants.RoleWardElectionSupervisor
			}
		}
	}

	// If neither, user has no active assignment for this election group
	if userRole == "" {
		h.utils.RespondSuccess(w, http.StatusOK, "You do not have an active assignment", map[string]interface{}{
			"items": []teamservice.TeamMemberItem{},
		})
		return
	}

	paramLgaID := utils.ParseQueryInt[int32](qParams, "lga_id")
	paramWardID := utils.ParseQueryInt[int32](qParams, "ward_id")
	paramPollingUnitID := utils.ParseQueryInt[int32](qParams, "polling_unit_id")

	// Resolve territory bounds based on role hierarchy
	effectiveStateID := baseStateID
	var effectiveLgaID int32
	var effectiveWardID int32
	var effectivePollingUnitID int32

	switch userRole {
	case constants.RolePollingAgent:
		effectiveStateID = baseStateID
		effectiveLgaID = baseLgaID
		effectiveWardID = baseWardID
		effectivePollingUnitID = basePollingUnitID
	case constants.RoleWardElectionSupervisor:
		effectiveLgaID = baseLgaID
		effectiveWardID = baseWardID
		effectivePollingUnitID = paramPollingUnitID
	case constants.RoleLgaElectionSupervisor:
		effectiveLgaID = baseLgaID
		if paramWardID > 0 {
			effectiveWardID = paramWardID
		}
		effectivePollingUnitID = paramPollingUnitID
	case constants.RoleStateElectionSupervisor:
		if paramLgaID > 0 {
			effectiveLgaID = paramLgaID
		}
		if paramWardID > 0 {
			effectiveWardID = paramWardID
		}
		effectivePollingUnitID = paramPollingUnitID
	}

	// Resolve target tab parameter
	tab := qParams.Get("tab")
	if tab == "" {
		tab = constants.RolePollingAgent
	}

	var items []teamservice.TeamMemberItem
	var queryErr error

	// Fetch team members according to requested role type
	switch tab {
	case constants.RolePollingAgent:
		items, queryErr = h.teamService.GetPollingAgents(ctx, partyID, electionGroupID, effectiveStateID, effectiveLgaID, effectiveWardID, effectivePollingUnitID)
	case constants.RoleWardElectionSupervisor:
		items, queryErr = h.teamService.GetWardSupervisors(ctx, partyID, electionGroupID, effectiveStateID, effectiveLgaID, effectiveWardID)
	case constants.RoleLgaElectionSupervisor:
		items, queryErr = h.teamService.GetLgaSupervisors(ctx, partyID, electionGroupID, effectiveStateID, effectiveLgaID)
	case constants.RoleStateElectionSupervisor:
		items, queryErr = h.teamService.GetStateSupervisors(ctx, partyID, electionGroupID, effectiveStateID)
	default:
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid tab parameter: "+tab)
		return
	}

	if queryErr != nil {
		slog.Error("[Team] Failed to fetch team members", "error", queryErr, "tab", tab)
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch team members: "+queryErr.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Team members retrieved successfully", map[string]interface{}{
		"items": items,
	})
}

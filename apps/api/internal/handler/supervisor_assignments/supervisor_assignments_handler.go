package supervisorassignments

import (
	"net/http"
	"strconv"

	supervisorassignments "free9ja/api/internal/service/supervisor_assignments"
	"free9ja/api/internal/utils"
)

type Handler struct {
	service *supervisorassignments.Service
	utils   *utils.Utils
}

func NewHandler(service *supervisorassignments.Service, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

// @Summary Get Supervisor Assignments
// @Description Get supervisor assignments for a user for a specific election group
// @Tags SupervisorAssignments
// @Accept json
// @Produce json
// @Param user_id query int true "User ID"
// @Param election_group_id query int true "Election Group ID"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/supervisor-assignments [get]
func (h *Handler) GetSupervisorAssignments(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.URL.Query().Get("user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil || userID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid or missing user_id")
		return
	}

	electionGroupIDStr := r.URL.Query().Get("election_group_id")
	electionGroupID, err := strconv.ParseInt(electionGroupIDStr, 10, 64)
	if err != nil || electionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid or missing election_group_id")
		return
	}

	assignments, err := h.service.GetUserSupervisorAssignments(r.Context(), userID, electionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch supervisor assignments")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Successfully fetched supervisor assignments", map[string]interface{}{
		"assignments": assignments,
	})
}

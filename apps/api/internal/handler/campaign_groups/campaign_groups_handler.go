package campaigngroupshandler

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	campaigngroupsservice "free9ja/api/internal/service/campaign_groups"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type CampaignGroupsService interface {
	GetCampaignGroupByID(ctx context.Context, id int64) (queries.CampaignGroup, error)
	GetGroupMembers(ctx context.Context, groupID int64) ([]queries.ListCampaignGroupMembersRow, error)
	SyncPartyOfficialsToGroup(ctx context.Context, groupID int64) (*campaigngroupsservice.SyncOfficialsResult, error)
}

type Handler struct {
	service CampaignGroupsService
	utils   *utils.Utils
}

func NewHandler(service CampaignGroupsService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

// SyncGroupOfficials godoc
// @Summary      Synchronize party chapter officials into a campaign group
// @Description  Fetches party officials for the group's scope chapter and enrolls them as group members
// @Tags         CampaignGroups
// @Produce      json
// @Param        id   path      int  true  "Campaign Group ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /campaign-groups/{id}/sync-officials [post]
func (h *Handler) SyncGroupOfficials(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	groupID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || groupID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid campaign group ID")
		return
	}

	result, err := h.service.SyncPartyOfficialsToGroup(r.Context(), groupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			h.utils.RespondError(w, http.StatusNotFound, "Campaign group not found")
			return
		}
		if strings.Contains(err.Error(), "recently synced") {
			h.utils.RespondError(w, http.StatusTooManyRequests, err.Error())
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to sync party officials: %v", err))
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party officials synchronized successfully", map[string]interface{}{
		"result": result,
	})
}

// GetGroupMembers godoc
// @Summary      Get members of a campaign group
// @Description  Lists members enrolled in a campaign group with their roles
// @Tags         CampaignGroups
// @Produce      json
// @Param        id   path      int  true  "Campaign Group ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /campaign-groups/{id}/members [get]
func (h *Handler) GetGroupMembers(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	groupID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || groupID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid campaign group ID")
		return
	}

	members, err := h.service.GetGroupMembers(r.Context(), groupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch group members: %v", err))
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Campaign group members retrieved successfully", map[string]interface{}{
		"members": members,
	})
}

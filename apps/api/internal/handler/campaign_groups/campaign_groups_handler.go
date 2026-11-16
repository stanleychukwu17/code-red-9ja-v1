package campaigngroupshandler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	campaigngroupsservice "free9ja/api/internal/service/campaign_groups"
	"free9ja/api/internal/utils"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5"
)

type CampaignGroupsService interface {
	GetCampaignGroupByID(ctx context.Context, id int64) (queries.GetCampaignGroupByIDRow, error)
	GetGroupMembers(ctx context.Context, groupID int64) ([]queries.ListCampaignGroupMembersRow, error)
	SyncPartyOfficialsToGroup(ctx context.Context, groupID int64) (*campaigngroupsservice.SyncOfficialsResult, error)
	FindCampaignGroupID(ctx context.Context, input campaigngroupsservice.FindCampaignGroupIDInput) (int64, error)
	GetCampaignGroupStats(ctx context.Context, group queries.GetCampaignGroupByIDRow) (*campaigngroupsservice.CampaignGroupStats, error)
	GetUserCampaignGroups(ctx context.Context, userID int64) (*campaigngroupsservice.GetUserCampaignGroupsResponse, error)
}

type Handler struct {
	service  CampaignGroupsService
	utils    *utils.Utils
	validate *validator.Validate
}

func NewHandler(service CampaignGroupsService, utils *utils.Utils) *Handler {
	return &Handler{
		service:  service,
		utils:    utils,
		validate: validator.New(),
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

// GetCampaignGroup godoc
// @Summary      Get campaign group by ID
// @Description  Fetches metadata and configuration for a campaign group
// @Tags         CampaignGroups
// @Produce      json
// @Param        id   path      int  true  "Campaign Group ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /campaign-groups/{id} [get]
func (h *Handler) GetCampaignGroup(w http.ResponseWriter, r *http.Request) {
	group, ok := apimiddleware.GetCampaignGroupFromContext(r.Context())
	if !ok {
		h.utils.RespondError(w, http.StatusInternalServerError, "Campaign group not found in context")
		return
	}

	stats, err := h.service.GetCampaignGroupStats(r.Context(), group)
	if err != nil {
		slog.Warn("failed to fetch campaign group stats", "groupID", group.ID, "error", err)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Campaign group retrieved successfully", map[string]interface{}{
		"group": group,
		"stats": stats,
	})
}

type FindCampaignGroupRequest struct {
	PartyID int16 `json:"party_id" validate:"required,gt=0"`
	StateID int32 `json:"state_id" validate:"omitempty"`
	LgaID   int32 `json:"lga_id" validate:"omitempty"`
	WardID  int32 `json:"ward_id" validate:"omitempty"`
}

// FindCampaignGroup godoc
// @Summary      Find campaign group ID by territory
// @Description  Finds the campaign group ID for a party matching ward, LGA, state, or national scope
// @Tags         CampaignGroups
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /campaign-groups/find [post]
func (h *Handler) FindCampaignGroup(w http.ResponseWriter, r *http.Request) {
	// Decode request body
	var req FindCampaignGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Resolve campaign group ID by territory
	groupID, err := h.service.FindCampaignGroupID(r.Context(), campaigngroupsservice.FindCampaignGroupIDInput{
		PartyID: req.PartyID,
		StateID: req.StateID,
		LgaID:   req.LgaID,
		WardID:  req.WardID,
	})
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			h.utils.RespondError(w, http.StatusNotFound, err.Error())
			return
		}

		h.utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to find campaign group: %v", err))
		return
	}

	// Return resolved group ID
	h.utils.RespondSuccess(w, http.StatusOK, "Campaign group found successfully", map[string]interface{}{
		"group_id": groupID,
	})
}

// GetMyCampaignGroups godoc
// @Summary      Get campaign groups hierarchy for the authenticated user
// @Description  Returns the campaign groups hierarchy (National, State, LGA, Ward) according to the user's active assignment
// @Tags         CampaignGroups
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /campaign-groups/my-groups [get]
func (h *Handler) GetMyCampaignGroups(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimiddleware.GetClaims(r)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	resp, err := h.service.GetUserCampaignGroups(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch user campaign groups: %v", err))
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Campaign groups retrieved successfully", map[string]interface{}{
		"role":   resp.Role,
		"groups": resp.Groups,
	})
}

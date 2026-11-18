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

	"github.com/jackc/pgx/v5/pgtype"
)

type Service interface {
	CreateUpdate(ctx context.Context, input polling_unit_updates.CreateUpdateInput) (queries.PollingUnitUpdate, error)
	ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error)
	GetActiveIssues(ctx context.Context, pollingUnitID int32) ([]queries.ListActivePollingUnitIssuesRow, error)
}

type Handler struct {
	service Service
	utils   *utils.Utils
}

func NewHandler(s Service, u *utils.Utils) *Handler {
	return &Handler{service: s, utils: u}
}

type CreateUpdateRequest struct {
	PollingUnitID     int32                            `json:"polling_unit_id"`
	ElectionGroupID   int32                            `json:"election_group_id"`
	AssignmentID      *int64                           `json:"assignment_id,omitempty"`
	PartyID           *int16                           `json:"party_id,omitempty"`
	StatusCategoryID  *int16                           `json:"status_category_id,omitempty"`
	StatusOptionID    *int16                           `json:"status_option_id,omitempty"`
	HasIssues         bool                             `json:"has_issues"`
	IssueAction       string                           `json:"issue_action,omitempty"`
	ExistingIssueIDs  []int64                          `json:"existing_issue_ids,omitempty"`
	NewIssueOptionIDs []int16                          `json:"new_issue_option_ids,omitempty"`
	Title             *string                          `json:"title,omitempty"`
	Message           string                           `json:"message"`
	Media             []polling_unit_updates.MediaItem `json:"media,omitempty"`
	MediaUrls         []string                         `json:"media_urls,omitempty"`
	IsReport          bool                             `json:"is_report,omitempty"`
	Latitude          *float64                         `json:"latitude,omitempty"`
	Longitude         *float64                         `json:"longitude,omitempty"`
	AccuracyMeters    *float64                         `json:"accuracy_meters,omitempty"`
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	var req CreateUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.PollingUnitID <= 0 || req.ElectionGroupID <= 0 || req.Message == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "polling_unit_id, election_group_id and message are required")
		return
	}

	update, err := h.service.CreateUpdate(r.Context(), polling_unit_updates.CreateUpdateInput{
		UserID:            claims.FakeID,
		PollingUnitID:     req.PollingUnitID,
		ElectionGroupID:   req.ElectionGroupID,
		AssignmentID:      req.AssignmentID,
		PartyID:           req.PartyID,
		StatusCategoryID:  req.StatusCategoryID,
		StatusOptionID:    req.StatusOptionID,
		HasIssues:         req.HasIssues,
		IssueAction:       req.IssueAction,
		ExistingIssueIDs:  req.ExistingIssueIDs,
		NewIssueOptionIDs: req.NewIssueOptionIDs,
		Title:             req.Title,
		Message:           req.Message,
		Media:             req.Media,
		MediaUrls:         req.MediaUrls,
		IsReport:          req.IsReport,
		Latitude:          req.Latitude,
		Longitude:         req.Longitude,
		AccuracyMeters:    req.AccuracyMeters,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create update: "+err.Error())
		return
	}

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
	_, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

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
	_, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

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

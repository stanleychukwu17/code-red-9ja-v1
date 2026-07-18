package polling_unit_updates

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/polling_unit_updates"
	"free9ja/api/internal/utils"

	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service         *polling_unit_updates.Service
	utils           *utils.Utils
	taskDistributor worker.TaskDistributor
}

func NewHandler(s *polling_unit_updates.Service, u *utils.Utils, taskDistributor worker.TaskDistributor) *Handler {
	return &Handler{service: s, utils: u, taskDistributor: taskDistributor}
}

type CreateUpdateRequest struct {
	PollingUnitID   int32    `json:"polling_unit_id"`
	ElectionGroupID int64    `json:"election_group_id"`
	AssignmentID    *int64   `json:"assignment_id,omitempty"`
	PartyID         *int64   `json:"party_id,omitempty"`
	Message         string   `json:"message"`
	MediaUrls       []string `json:"media_urls"`
	IsReport        bool     `json:"is_report"`
	ReportTypes     []string `json:"report_types"`
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
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
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
		UserID:          claims.FakeID,
		PollingUnitID:   req.PollingUnitID,
		ElectionGroupID: req.ElectionGroupID,
		AssignmentID:    req.AssignmentID,
		PartyID:         func() *int16 { if req.PartyID == nil { return nil }; p := int16(*req.PartyID); return &p }(),
		Message:         req.Message,
		MediaUrls:       req.MediaUrls,
		IsReport:        req.IsReport,
		ReportTypes:     req.ReportTypes,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create update: "+err.Error())
		return
	}

	// Enqueue debounced polling unit stats refresh
	go func() {
		payload := &worker.RefreshPollingUnitStatsPayload{
			Params: queries.RefreshSingleElectionGroupPollingUnitStatsParams{
				ElectionGroupID: req.ElectionGroupID,
				PollingUnitID:   req.PollingUnitID,
			},
		}
		if err := h.taskDistributor.DistributeTaskRefreshPollingUnitStats(r.Context(), payload); err != nil {
			// Log error but don't fail the request
		}
	}()

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
// @Param is_report query bool false "Filter by Is Report"
// @Param cursor query int false "Cursor (ID to paginate from)"
// @Param limit query int false "Limit (default 20, max 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /polling-unit-updates [get]
// @Security BearerAuth
func (h *Handler) ListUpdates(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var params queries.ListPollingUnitUpdatesParams

	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			params.ElectionGroupID = pgtype.Int8{Int64: v, Valid: true}
		}
	}
	if val := r.URL.Query().Get("party_id"); val != "" {
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			params.PartyID = pgtype.Int8{Int64: v, Valid: true}
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
	if val := r.URL.Query().Get("is_report"); val != "" {
		if v, err := strconv.ParseBool(val); err == nil {
			params.IsReport = pgtype.Bool{Bool: v, Valid: true}
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

	// Enforce role-based access
	isPlatformAdmin := claims.HasRole("admin")
	if !isPlatformAdmin {
		if int64(claims.PartyID) > 0 {
			// Force filter to user's party
			params.PartyID = pgtype.Int8{Int64: int64(claims.PartyID), Valid: true}
		}
	}

	updates, err := h.service.ListUpdates(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch updates: "+err.Error())
		return
	}

	// Prepare next cursor
	var nextCursor *int64
	if len(updates) == int(params.Limit) {
		lastID := updates[len(updates)-1].ID
		nextCursor = &lastID
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Updates fetched successfully", map[string]interface{}{
		"updates":     updates,
		"next_cursor": nextCursor,
	})
}

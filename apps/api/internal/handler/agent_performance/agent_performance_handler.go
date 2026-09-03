package agentperformancehandler

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
)

type Handler struct {
	q            *queries.Queries
	pool         *pgxpool.Pool
	usersService *usersservice.UsersService
	u            *utils.Utils
	distributor  worker.TaskDistributor
}

func NewHandler(q *queries.Queries, pool *pgxpool.Pool, usersService *usersservice.UsersService, u *utils.Utils, distributor worker.TaskDistributor) *Handler {
	return &Handler{
		q:            q,
		pool:         pool,
		usersService: usersService,
		u:            u,
		distributor:  distributor,
	}
}

func (h *Handler) initiateStatsRollup(ctx context.Context, egID int64, roleType string, puID int32, wardID int32, lgaID int32, stateID int16) {
	if h.distributor == nil || egID <= 0 {
		return
	}
	role := strings.ToLower(strings.TrimSpace(roleType))
	switch role {
	case "polling_agent", "pu_agent", "polling_unit_agent":
		if puID > 0 {
			if err := h.distributor.DistributeTaskRefreshPollingUnitStats(ctx, &worker.RefreshPollingUnitStatsPayload{
				Params: queries.RefreshSingleElectionGroupPollingUnitStatsParams{
					ElectionGroupID: egID,
					PollingUnitID:   puID,
				},
			}); err != nil {
				slog.Warn("failed to enqueue PU stats refresh task", "err", err, "pollingUnitID", puID)
			}
		}
	case "ward_supervisor", "ward_election_supervisor":
		if wardID > 0 {
			if err := h.distributor.DistributeTaskRefreshWardStats(ctx, &worker.RefreshWardStatsPayload{
				ElectionGroupID: egID,
				WardID:          wardID,
				LGAID:           lgaID,
				StateID:         stateID,
			}); err != nil {
				slog.Warn("failed to enqueue Ward stats refresh task", "err", err, "wardID", wardID)
			}
		}
	case "lga_supervisor", "lga_election_supervisor":
		if lgaID > 0 {
			if err := h.distributor.DistributeTaskRefreshLGAStats(ctx, &worker.RefreshLGAStatsPayload{
				ElectionGroupID: egID,
				LGAID:           lgaID,
				StateID:         stateID,
			}); err != nil {
				slog.Warn("failed to enqueue LGA stats refresh task", "err", err, "lgaID", lgaID)
			}
		}
	case "state_supervisor", "state_election_supervisor":
		if stateID > 0 {
			if err := h.distributor.DistributeTaskRefreshStateStats(ctx, &worker.RefreshStateStatsPayload{
				ElectionGroupID: egID,
				StateID:         stateID,
			}); err != nil {
				slog.Warn("failed to enqueue State stats refresh task", "err", err, "stateID", stateID)
			}
		}
	}
}

type AgentPerformanceItem struct {
	ID                 int64   `json:"id"`
	UserID             int64   `json:"user_id"`
	PartyID            int16   `json:"party_id"`
	ElectionGroupID    int64   `json:"election_group_id"`
	StateID            int16   `json:"state_id"`
	LgaID              int32   `json:"lga_id"`
	WardID             int32   `json:"ward_id"`
	PollingUnitID      int32   `json:"polling_unit_id"`
	UserName           string  `json:"user_name"`
	AvatarUrl          string  `json:"avatar_url"`
	RoleType           string  `json:"role_type"`
	ReadinessPct       float64 `json:"readiness_pct"`
	ArrivedAt          *string `json:"arrived_at,omitempty"`
	ElectionStartedAt  *string `json:"election_started_at,omitempty"`
	ElectionEndedAt    *string `json:"election_ended_at,omitempty"`
	UpdatesGiven       *int32  `json:"updates_given,omitempty"`
	ReportsGiven       *int32  `json:"reports_given,omitempty"`
	LiveVotersReferred *int32  `json:"live_voters_referred,omitempty"`
	ResultsUploaded    *string `json:"results_uploaded,omitempty"`
	EarningsKobo       int64   `json:"earnings_kobo"`
	EarningsFormatted  string  `json:"earnings_formatted"`
	CompletionStatus   bool    `json:"completion_status"`
	RequestedPayout    bool    `json:"requested_payout"`
	Paid               bool    `json:"paid"`
	StateName          *string `json:"state_name,omitempty"`
	LgaName            *string `json:"lga_name,omitempty"`
	WardName           *string `json:"ward_name,omitempty"`
	PollingUnitName    *string `json:"polling_unit_name,omitempty"`
	PollingUnitCode    *string `json:"polling_unit_code,omitempty"`
}

type ChangeAgentRoleRequest struct {
	UserID          int64  `json:"user_id"`
	PartyID         int16  `json:"party_id"`
	ElectionGroupID int64  `json:"election_group_id"`
	CurrentRoleType string `json:"current_role_type"`
	NewRoleType     string `json:"new_role_type"`
	StateID         int16  `json:"state_id"`
	LgaID           int32  `json:"lga_id"`
	WardID          int32  `json:"ward_id"`
	PollingUnitID   int32  `json:"polling_unit_id"`
}

// GetAgentPerformance godoc
// @Summary      Get agent & supervisor performance stats
// @Description  Returns cursor-paginated performance stats for polling agents and supervisors.
// @Tags         AgentPerformance
// @Produce      json
// @Param        role_type          query string false "Role type (polling_agent, ward_supervisor, lga_supervisor, state_supervisor)"
// @Param        party_id           query int    false "Party ID filter"
// @Param        election_group_id  query int    false "Election Group ID filter"
// @Param        state_id           query int    false "State ID filter"
// @Param        lga_id             query int    false "LGA ID filter"
// @Param        ward_id            query int    false "Ward ID filter"
// @Param        search             query string false "Search name or code"
// @Param        cursor             query int    false "Pagination cursor ID"
// @Param        limit              query int    false "Page limit (default 20, max 100)"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Router       /agent-performance [get]
func (h *Handler) GetAgentPerformance(w http.ResponseWriter, r *http.Request) {
	qParams := r.URL.Query()

	roleType := qParams.Get("role_type")
	if roleType == "" {
		roleType = "polling_agent"
	}

	partyID, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 16)
	electionGroupID, _ := strconv.ParseInt(qParams.Get("election_group_id"), 10, 64)
	stateID, _ := strconv.ParseInt(qParams.Get("state_id"), 10, 16)
	lgaID, _ := strconv.ParseInt(qParams.Get("lga_id"), 10, 32)
	wardID, _ := strconv.ParseInt(qParams.Get("ward_id"), 10, 32)
	search := qParams.Get("search")
	cursor, _ := strconv.ParseInt(qParams.Get("cursor"), 10, 64)

	limit, _ := strconv.ParseInt(qParams.Get("limit"), 10, 32)
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	slog.Info("[AgentPerformance] Request received",
		"role_type", roleType,
		"party_id", partyID,
		"election_group_id", electionGroupID,
		"state_id", stateID,
		"lga_id", lgaID,
		"ward_id", wardID,
		"search", search,
		"cursor", cursor,
		"limit", limit,
	)

	// Fetch limit + 1 to check for next page
	queryLimit := int32(limit + 1)

	var items []AgentPerformanceItem
	var nextCursor *int64
	hasMore := false

	ctx := r.Context()

	switch roleType {
	case "polling_agent", "polling_unit_agent", "pu_agent":
		rows, err := h.q.ListPollingAgentPerformanceStats(ctx, queries.ListPollingAgentPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			LgaID:           int32(lgaID),
			WardID:          int32(wardID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			slog.Error("[AgentPerformance] ListPollingAgentPerformanceStats query error", "error", err, "role_type", roleType)
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch polling agent performance stats: "+err.Error())
			return
		}

		if len(rows) > int(limit) {
			hasMore = true
			rows = rows[:limit]
		}

		for _, row := range rows {
			var readiness float64
			if row.ReadinessPct.Valid {
				readinessVal, _ := row.ReadinessPct.Float64Value()
				readiness = readinessVal.Float64
			}

			item := AgentPerformanceItem{
				ID:                 row.ID,
				UserID:             row.UserID,
				PartyID:            row.PartyID,
				ElectionGroupID:    row.ElectionGroupID,
				StateID:            row.StateID,
				LgaID:              row.LgaID,
				WardID:             row.WardID,
				PollingUnitID:      row.PollingUnitID,
				UserName:           row.UserName,
				AvatarUrl:          row.AvatarUrl,
				RoleType:           row.RoleType.String,
				ReadinessPct:       math.Round(readiness*100) / 100,
				ArrivedAt:          stringPtr(row.ArrivedAt),
				ElectionStartedAt:  stringPtr(row.ElectionStartedAt),
				ElectionEndedAt:    stringPtr(row.ElectionEndedAt),
				UpdatesGiven:       int32Ptr(row.UpdatesGiven),
				ReportsGiven:       int32Ptr(row.ReportsGiven),
				LiveVotersReferred: int32Ptr(row.LiveVotersReferred),
				ResultsUploaded:    stringPtr(row.ResultsUploaded),
				EarningsKobo:       row.EarningsKobo,
				EarningsFormatted:  row.EarningsFormatted,
				CompletionStatus:   row.CompletionStatus,
				RequestedPayout:    row.RequestedPayout,
				Paid:               row.Paid,
				StateName:          stringPtr(row.StateName),
				LgaName:            stringPtr(row.LgaName),
				WardName:           stringPtr(row.WardName),
				PollingUnitName:    stringPtr(row.PollingUnitName),
				PollingUnitCode:    stringPtr(row.PollingUnitCode),
			}
			items = append(items, item)
		}

	case "ward_supervisor", "ward_election_supervisor":
		rows, err := h.q.ListWardSupervisorPerformanceStats(ctx, queries.ListWardSupervisorPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			LgaID:           int32(lgaID),
			WardID:          int32(wardID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			slog.Error("[AgentPerformance] ListWardSupervisorPerformanceStats query error", "error", err, "role_type", roleType)
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch ward supervisor performance stats: "+err.Error())
			return
		}

		if len(rows) > int(limit) {
			hasMore = true
			rows = rows[:limit]
		}

		for _, row := range rows {
			item := AgentPerformanceItem{
				ID:                row.ID,
				UserID:            row.UserID,
				PartyID:           row.PartyID,
				ElectionGroupID:   row.ElectionGroupID,
				StateID:           row.StateID,
				LgaID:             row.LgaID,
				WardID:            row.WardID,
				PollingUnitID:     row.PollingUnitID,
				UserName:          row.UserName,
				AvatarUrl:         row.AvatarUrl,
				RoleType:          row.RoleType.String,
				ReadinessPct:      100.0,
				ArrivedAt:         stringPtr(row.ArrivedAt),
				ElectionStartedAt: stringPtr(row.ElectionStartedAt),
				ElectionEndedAt:   stringPtr(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         stringPtr(row.StateName),
				LgaName:           stringPtr(row.LgaName),
				WardName:          stringPtr(row.WardName),
			}
			items = append(items, item)
		}

	case "lga_supervisor", "lga_election_supervisor":
		rows, err := h.q.ListLGASupervisorPerformanceStats(ctx, queries.ListLGASupervisorPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			LgaID:           int32(lgaID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			slog.Error("[AgentPerformance] ListLGASupervisorPerformanceStats query error", "error", err, "role_type", roleType)
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch LGA supervisor performance stats: "+err.Error())
			return
		}

		if len(rows) > int(limit) {
			hasMore = true
			rows = rows[:limit]
		}

		for _, row := range rows {
			item := AgentPerformanceItem{
				ID:                row.ID,
				UserID:            row.UserID,
				PartyID:           row.PartyID,
				ElectionGroupID:   row.ElectionGroupID,
				StateID:           row.StateID,
				LgaID:             row.LgaID,
				WardID:            row.WardID,
				PollingUnitID:     row.PollingUnitID,
				UserName:          row.UserName,
				AvatarUrl:         row.AvatarUrl,
				RoleType:          row.RoleType.String,
				ReadinessPct:      100.0,
				ArrivedAt:         stringPtr(row.ArrivedAt),
				ElectionStartedAt: stringPtr(row.ElectionStartedAt),
				ElectionEndedAt:   stringPtr(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         stringPtr(row.StateName),
				LgaName:           stringPtr(row.LgaName),
			}
			items = append(items, item)
		}

	case "state_supervisor", "state_election_supervisor":
		rows, err := h.q.ListStateSupervisorPerformanceStats(ctx, queries.ListStateSupervisorPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			slog.Error("[AgentPerformance] ListStateSupervisorPerformanceStats query error", "error", err, "role_type", roleType)
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch state supervisor performance stats: "+err.Error())
			return
		}

		if len(rows) > int(limit) {
			hasMore = true
			rows = rows[:limit]
		}

		for _, row := range rows {
			item := AgentPerformanceItem{
				ID:                row.ID,
				UserID:            row.UserID,
				PartyID:           row.PartyID,
				ElectionGroupID:   row.ElectionGroupID,
				StateID:           row.StateID,
				LgaID:             row.LgaID,
				WardID:            row.WardID,
				PollingUnitID:     row.PollingUnitID,
				UserName:          row.UserName,
				AvatarUrl:         row.AvatarUrl,
				RoleType:          row.RoleType.String,
				ReadinessPct:      100.0,
				ArrivedAt:         stringPtr(row.ArrivedAt),
				ElectionStartedAt: stringPtr(row.ElectionStartedAt),
				ElectionEndedAt:   stringPtr(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         stringPtr(row.StateName),
			}
			items = append(items, item)
		}

	default:
		slog.Warn("[AgentPerformance] Invalid role_type received", "role_type", roleType)
		h.u.RespondError(w, http.StatusBadRequest, "Invalid role_type parameter: "+roleType)
		return
	}

	if len(items) > 0 {
		lastID := items[len(items)-1].ID
		if hasMore {
			nextCursor = &lastID
		}
	}

	if items == nil {
		items = []AgentPerformanceItem{}
	}

	slog.Info("[AgentPerformance] Returning performance stats successfully",
		"role_type", roleType,
		"item_count", len(items),
		"has_more", hasMore,
	)

	h.u.RespondSuccess(w, http.StatusOK, "Agent performance stats retrieved successfully", map[string]interface{}{
		"items":       items,
		"next_cursor": nextCursor,
		"has_more":    hasMore,
	})
}

// ChangeAgentRole updates an agent's role (promoting to supervisor or reassigning)
func (h *Handler) ChangeAgentRole(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.u.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.u.RespondError(w, http.StatusUnauthorized, "Requester not found")
		return
	}

	var req ChangeAgentRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if req.UserID <= 0 || req.PartyID <= 0 || req.ElectionGroupID <= 0 {
		h.u.RespondError(w, http.StatusBadRequest, "user_id, party_id, and election_group_id are required")
		return
	}

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

	requesterPartyID := int16(0)
	if requester.PartyID.Valid {
		requesterPartyID = requester.PartyID.Int16
	} else if claims.PartyID > 0 {
		requesterPartyID = claims.PartyID
	}

	if !isPlatformAdmin {
		if !isPartyAdmin {
			h.u.RespondError(w, http.StatusForbidden, "Only administrators can change agent roles")
			return
		}
		if requesterPartyID == 0 || req.PartyID != requesterPartyID {
			h.u.RespondError(w, http.StatusForbidden, "Cannot change agent roles of a different party")
			return
		}
	}

	// Normalize role strings
	newRole := strings.ToLower(strings.TrimSpace(req.NewRoleType))
	switch newRole {
	case "polling_agent", "pu_agent", "polling_unit_agent":
		newRole = "polling_agent"
	case "ward_supervisor", "ward_election_supervisor":
		newRole = "ward_election_supervisor"
	case "lga_supervisor", "lga_election_supervisor":
		newRole = "lga_election_supervisor"
	case "state_supervisor", "state_election_supervisor":
		newRole = "state_election_supervisor"
	default:
		h.u.RespondError(w, http.StatusBadRequest, "Invalid new_role_type: "+req.NewRoleType)
		return
	}

	// If new role is polling_agent, polling_unit_id is required
	if newRole == "polling_agent" {
		if req.PollingUnitID <= 0 {
			h.u.RespondError(w, http.StatusBadRequest, "polling_unit_id is required for polling_agent role")
			return
		}
		// If geographic IDs are missing, populate from polling_units
		if req.StateID == 0 || req.LgaID == 0 || req.WardID == 0 {
			_ = h.pool.QueryRow(r.Context(), "SELECT state_id, lga_id, ward_id FROM polling_units WHERE id = $1", req.PollingUnitID).Scan(&req.StateID, &req.LgaID, &req.WardID)
		}
	} else if newRole == "ward_election_supervisor" {
		if req.StateID <= 0 || req.LgaID <= 0 || req.WardID <= 0 {
			h.u.RespondError(w, http.StatusBadRequest, "state_id, lga_id, and ward_id are required for ward supervisor")
			return
		}
	} else if newRole == "lga_election_supervisor" {
		if req.StateID <= 0 || req.LgaID <= 0 {
			h.u.RespondError(w, http.StatusBadRequest, "state_id and lga_id are required for LGA supervisor")
			return
		}
	} else if newRole == "state_election_supervisor" {
		if req.StateID <= 0 {
			h.u.RespondError(w, http.StatusBadRequest, "state_id is required for state supervisor")
			return
		}
	}

	ctx := r.Context()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to begin transaction: "+err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Step 1: Detect old assignment across tables before removal
	var oldRole string
	var oldStateID int16
	var oldLgaID int32
	var oldWardID int32
	var oldPuID int32

	var puID int32
	if errPu := tx.QueryRow(ctx, "SELECT polling_unit_id FROM polling_unit_assignments WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3 LIMIT 1", req.UserID, req.ElectionGroupID, req.PartyID).Scan(&puID); errPu == nil && puID > 0 {
		oldRole = "polling_agent"
		oldPuID = puID
	} else {
		var sID int16
		var lID, wID int32
		if errWard := tx.QueryRow(ctx, "SELECT state_id, lga_id, ward_id FROM ward_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3 LIMIT 1", req.UserID, req.ElectionGroupID, req.PartyID).Scan(&sID, &lID, &wID); errWard == nil {
			oldRole = "ward_election_supervisor"
			oldStateID = sID
			oldLgaID = lID
			oldWardID = wID
		} else if errLga := tx.QueryRow(ctx, "SELECT state_id, lga_id FROM lga_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3 LIMIT 1", req.UserID, req.ElectionGroupID, req.PartyID).Scan(&sID, &lID); errLga == nil {
			oldRole = "lga_election_supervisor"
			oldStateID = sID
			oldLgaID = lID
		} else if errState := tx.QueryRow(ctx, "SELECT state_id FROM state_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3 LIMIT 1", req.UserID, req.ElectionGroupID, req.PartyID).Scan(&sID); errState == nil {
			oldRole = "state_election_supervisor"
			oldStateID = sID
		}
	}

	if _, err := tx.Exec(ctx, "DELETE FROM polling_unit_assignments WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", req.UserID, req.ElectionGroupID, req.PartyID); err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to clear old polling unit assignment: "+err.Error())
		return
	}
	if _, err := tx.Exec(ctx, "DELETE FROM ward_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", req.UserID, req.ElectionGroupID, req.PartyID); err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to clear old ward supervisor assignment: "+err.Error())
		return
	}
	if _, err := tx.Exec(ctx, "DELETE FROM lga_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", req.UserID, req.ElectionGroupID, req.PartyID); err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to clear old LGA supervisor assignment: "+err.Error())
		return
	}
	if _, err := tx.Exec(ctx, "DELETE FROM state_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", req.UserID, req.ElectionGroupID, req.PartyID); err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to clear old state supervisor assignment: "+err.Error())
		return
	}

	txQueries := h.q.WithTx(tx)

	// Decrement stats for previous assignment
	if oldRole != "" {
		adjustAgentStats(ctx, tx, txQueries, oldRole, req.ElectionGroupID, req.PartyID, oldStateID, oldLgaID, oldWardID, oldPuID, false)
	}

	// Step 2: Insert new assignment
	switch newRole {
	case "polling_agent":
		_, err = tx.Exec(ctx, `
			INSERT INTO polling_unit_assignments (user_id, party_id, polling_unit_id, election_group_id, role_type, assigned_by)
			VALUES ($1, $2, $3, $4, 'polling_agent', $5)
			ON CONFLICT (user_id, election_group_id) DO UPDATE
			SET polling_unit_id = EXCLUDED.polling_unit_id,
			    party_id = EXCLUDED.party_id,
			    role_type = 'polling_agent',
			    updated_at = NOW()`,
			req.UserID, req.PartyID, req.PollingUnitID, req.ElectionGroupID, requester.ID)
		if err != nil {
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to assign polling agent: "+err.Error())
			return
		}

	case "ward_election_supervisor":
		_, err = tx.Exec(ctx, `
			INSERT INTO ward_election_supervisors (user_id, state_id, lga_id, ward_id, election_group_id, party_id, role_type, assigned_by)
			VALUES ($1, $2, $3, $4, $5, $6, 'ward_election_supervisor', $7)
			ON CONFLICT (user_id, election_group_id) DO UPDATE
			SET state_id = EXCLUDED.state_id,
			    lga_id = EXCLUDED.lga_id,
			    ward_id = EXCLUDED.ward_id,
			    party_id = EXCLUDED.party_id,
			    updated_at = NOW()`,
			req.UserID, req.StateID, req.LgaID, req.WardID, req.ElectionGroupID, req.PartyID, requester.ID)
		if err != nil {
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to assign ward supervisor: "+err.Error())
			return
		}

	case "lga_election_supervisor":
		_, err = tx.Exec(ctx, `
			INSERT INTO lga_election_supervisors (user_id, state_id, lga_id, election_group_id, party_id, role_type, assigned_by)
			VALUES ($1, $2, $3, $4, $5, 'lga_election_supervisor', $6)
			ON CONFLICT (user_id, election_group_id) DO UPDATE
			SET state_id = EXCLUDED.state_id,
			    lga_id = EXCLUDED.lga_id,
			    party_id = EXCLUDED.party_id,
			    updated_at = NOW()`,
			req.UserID, req.StateID, req.LgaID, req.ElectionGroupID, req.PartyID, requester.ID)
		if err != nil {
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to assign LGA supervisor: "+err.Error())
			return
		}

	case "state_election_supervisor":
		_, err = tx.Exec(ctx, `
			INSERT INTO state_election_supervisors (user_id, state_id, election_group_id, party_id, role_type, assigned_by)
			VALUES ($1, $2, $3, $4, 'state_election_supervisor', $5)
			ON CONFLICT (user_id, election_group_id) DO UPDATE
			SET state_id = EXCLUDED.state_id,
			    party_id = EXCLUDED.party_id,
			    updated_at = NOW()`,
			req.UserID, req.StateID, req.ElectionGroupID, req.PartyID, requester.ID)
		if err != nil {
			h.u.RespondError(w, http.StatusInternalServerError, "Failed to assign state supervisor: "+err.Error())
			return
		}
	}

	// Increment stats for new assignment
	adjustAgentStats(ctx, tx, txQueries, newRole, req.ElectionGroupID, req.PartyID, req.StateID, req.LgaID, req.WardID, req.PollingUnitID, true)

	// Keep party_applications synchronized if an application exists
	var appPuID *int32
	if req.PollingUnitID > 0 && newRole == "polling_agent" {
		puVal := req.PollingUnitID
		appPuID = &puVal
	}
	var appWardID *int32
	if req.WardID > 0 && (newRole == "ward_election_supervisor" || newRole == "polling_agent") {
		wVal := req.WardID
		appWardID = &wVal
	}
	var appLgaID *int32
	if req.LgaID > 0 && (newRole == "lga_election_supervisor" || newRole == "ward_election_supervisor" || newRole == "polling_agent") {
		lVal := req.LgaID
		appLgaID = &lVal
	}
	var appStateID *int16
	if req.StateID > 0 {
		sVal := req.StateID
		appStateID = &sVal
	}

	_, _ = tx.Exec(ctx, `
		UPDATE party_applications
		SET role = $1,
		    state_id = COALESCE($2, state_id),
		    lga_id = $3,
		    ward_id = $4,
		    polling_unit_id = $5,
		    updated_at = NOW()
		WHERE user_id = $6 AND election_group_id = $7 AND party_id = $8`,
		newRole, appStateID, appLgaID, appWardID, appPuID, req.UserID, req.ElectionGroupID, req.PartyID)

	if err := tx.Commit(ctx); err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to commit role change: "+err.Error())
		return
	}

	// Trigger stats rollup for both old assignment and new assignment
	if oldRole != "" {
		h.initiateStatsRollup(ctx, req.ElectionGroupID, oldRole, oldPuID, oldWardID, oldLgaID, oldStateID)
	}
	h.initiateStatsRollup(ctx, req.ElectionGroupID, newRole, req.PollingUnitID, req.WardID, req.LgaID, req.StateID)

	h.u.RespondSuccess(w, http.StatusOK, "Agent role updated successfully", map[string]interface{}{
		"user_id":  req.UserID,
		"new_role": newRole,
	})
}

// RevokeAgent removes an agent from their assigned role
func (h *Handler) RevokeAgent(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.u.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.u.RespondError(w, http.StatusUnauthorized, "Requester not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid ID parameter")
		return
	}

	roleType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("role_type")))
	partyIDParam, _ := strconv.ParseInt(r.URL.Query().Get("party_id"), 10, 16)

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

	requesterPartyID := int16(0)
	if requester.PartyID.Valid {
		requesterPartyID = requester.PartyID.Int16
	} else if claims.PartyID > 0 {
		requesterPartyID = claims.PartyID
	}

	if !isPlatformAdmin {
		if !isPartyAdmin {
			h.u.RespondError(w, http.StatusForbidden, "Only administrators can revoke agent assignments")
			return
		}
		if requesterPartyID == 0 || (partyIDParam > 0 && int16(partyIDParam) != requesterPartyID) {
			h.u.RespondError(w, http.StatusForbidden, "Cannot revoke agent assignments of a different party")
			return
		}
	}

	ctx := r.Context()
	switch roleType {
	case "polling_agent", "pu_agent", "polling_unit_agent":
		var puID int32
		var egID int64
		var partyID int16
		_ = h.pool.QueryRow(ctx, "SELECT polling_unit_id, election_group_id, party_id FROM polling_unit_assignments WHERE id = $1", id).Scan(&puID, &egID, &partyID)
		_, err = h.pool.Exec(ctx, "DELETE FROM polling_unit_assignments WHERE id = $1", id)
		if err == nil && puID > 0 {
			adjustAgentStats(ctx, h.pool, h.q, "polling_agent", egID, partyID, 0, 0, 0, puID, false)
			h.initiateStatsRollup(ctx, egID, "polling_agent", puID, 0, 0, 0)
		}
	case "ward_supervisor", "ward_election_supervisor":
		var stateID int16
		var lgaID, wardID int32
		var egID int64
		var partyID int16
		_ = h.pool.QueryRow(ctx, "SELECT state_id, lga_id, ward_id, election_group_id, party_id FROM ward_election_supervisors WHERE id = $1", id).Scan(&stateID, &lgaID, &wardID, &egID, &partyID)
		_, err = h.pool.Exec(ctx, "DELETE FROM ward_election_supervisors WHERE id = $1", id)
		if err == nil && wardID > 0 {
			adjustAgentStats(ctx, h.pool, h.q, "ward_election_supervisor", egID, partyID, stateID, lgaID, wardID, 0, false)
			h.initiateStatsRollup(ctx, egID, "ward_election_supervisor", 0, wardID, lgaID, stateID)
		}
	case "lga_supervisor", "lga_election_supervisor":
		var stateID int16
		var lgaID int32
		var egID int64
		var partyID int16
		_ = h.pool.QueryRow(ctx, "SELECT state_id, lga_id, election_group_id, party_id FROM lga_election_supervisors WHERE id = $1", id).Scan(&stateID, &lgaID, &egID, &partyID)
		_, err = h.pool.Exec(ctx, "DELETE FROM lga_election_supervisors WHERE id = $1", id)
		if err == nil && lgaID > 0 {
			adjustAgentStats(ctx, h.pool, h.q, "lga_election_supervisor", egID, partyID, stateID, lgaID, 0, 0, false)
			h.initiateStatsRollup(ctx, egID, "lga_election_supervisor", 0, 0, lgaID, stateID)
		}
	case "state_supervisor", "state_election_supervisor":
		var stateID int16
		var egID int64
		var partyID int16
		_ = h.pool.QueryRow(ctx, "SELECT state_id, election_group_id, party_id FROM state_election_supervisors WHERE id = $1", id).Scan(&stateID, &egID, &partyID)
		_, err = h.pool.Exec(ctx, "DELETE FROM state_election_supervisors WHERE id = $1", id)
		if err == nil && stateID > 0 {
			adjustAgentStats(ctx, h.pool, h.q, "state_election_supervisor", egID, partyID, stateID, 0, 0, 0, false)
			h.initiateStatsRollup(ctx, egID, "state_election_supervisor", 0, 0, 0, stateID)
		}
	default:
		h.u.RespondError(w, http.StatusBadRequest, "Invalid role_type parameter")
		return
	}

	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to revoke assignment: "+err.Error())
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Assignment revoked successfully", nil)
}

func adjustAgentStats(ctx context.Context, dbtx queries.DBTX, q *queries.Queries, role string, egID int64, partyID int16, stateID int16, lgaID int32, wardID int32, puID int32, isIncrement bool) {
	if role == "" || egID <= 0 || partyID <= 0 {
		return
	}

	delta := int32(1)
	if !isIncrement {
		delta = -1
	}

	switch role {
	case "polling_agent", "pu_agent", "polling_unit_agent":
		if puID <= 0 {
			return
		}
		var wardID_ int32
		var lgaID_ int32
		var stateID_ int16
		var wardStateConstID, puFedConstID, puSenateID int32
		err := dbtx.QueryRow(ctx, `
			SELECT pu.ward_id, pu.lga_id, pu.state_id,
			       COALESCE(w.state_constituency_id, 0),
			       COALESCE(l.federal_constituency_id, 0),
			       COALESCE(l.senatorial_district_id, 0)
			FROM polling_units pu
			JOIN wards w ON w.id = pu.ward_id
			JOIN lgas  l ON l.id = pu.lga_id
			WHERE pu.id = $1 LIMIT 1`, puID,
		).Scan(&wardID_, &lgaID_, &stateID_, &wardStateConstID, &puFedConstID, &puSenateID)
		if err != nil {
			return
		}

		var count int32
		_ = dbtx.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM polling_unit_assignments
			WHERE election_group_id = $1 AND polling_unit_id = $2 AND party_id = $3`,
			egID, puID, partyID,
		).Scan(&count)

		uniquePuDelta := int32(0)
		if isIncrement {
			if count <= 1 {
				uniquePuDelta = 1
			}
		} else {
			if count == 0 {
				uniquePuDelta = -1
			}
		}

		_ = q.UpsertElectionGroupPUPartyEntry(ctx, queries.UpsertElectionGroupPUPartyEntryParams{
			ElectionGroupID: egID,
			PollingUnitID:   puID,
			PartyID:         partyID,
			Delta:           delta,
		})
		_ = q.UpsertElectionGroupWardPartyEntry(ctx, queries.UpsertElectionGroupWardPartyEntryParams{
			ElectionGroupID: egID,
			WardID:          wardID_,
			PartyID:         partyID,
			AgentsDelta:     delta,
			UniquePuDelta:   uniquePuDelta,
		})
		_ = q.UpsertElectionGroupLGAPartyEntry(ctx, queries.UpsertElectionGroupLGAPartyEntryParams{
			ElectionGroupID: egID,
			LgaID:           lgaID_,
			PartyID:         partyID,
			AgentsDelta:     delta,
			UniquePuDelta:   uniquePuDelta,
		})
		if wardStateConstID > 0 {
			_ = q.UpsertElectionGroupStateConstituencyPartyEntry(ctx, queries.UpsertElectionGroupStateConstituencyPartyEntryParams{
				ElectionGroupID:     egID,
				StateConstituencyID: wardStateConstID,
				PartyID:             partyID,
				AgentsDelta:         delta,
				UniquePuDelta:       uniquePuDelta,
			})
		}
		if puFedConstID > 0 {
			_ = q.UpsertElectionGroupFederalConstituencyPartyEntry(ctx, queries.UpsertElectionGroupFederalConstituencyPartyEntryParams{
				ElectionGroupID:       egID,
				FederalConstituencyID: puFedConstID,
				PartyID:               partyID,
				AgentsDelta:           delta,
				UniquePuDelta:         uniquePuDelta,
			})
		}
		if puSenateID > 0 {
			_ = q.UpsertElectionGroupSenatorialDistrictPartyEntry(ctx, queries.UpsertElectionGroupSenatorialDistrictPartyEntryParams{
				ElectionGroupID:      egID,
				SenatorialDistrictID: puSenateID,
				PartyID:              partyID,
				AgentsDelta:          delta,
				UniquePuDelta:        uniquePuDelta,
			})
		}
		_ = q.UpsertElectionGroupStatePartyEntry(ctx, queries.UpsertElectionGroupStatePartyEntryParams{
			ElectionGroupID: egID,
			StateID:         stateID_,
			PartyID:         partyID,
			AgentsDelta:     delta,
			UniquePuDelta:   uniquePuDelta,
		})
		_ = q.UpsertElectionGroupNationalPartyEntry(ctx, queries.UpsertElectionGroupNationalPartyEntryParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			AgentsDelta:     delta,
			UniquePuDelta:   uniquePuDelta,
		})

	case "ward_election_supervisor", "ward_supervisor":
		if wardID <= 0 {
			return
		}
		var wardStateConstID, lgaFedConstID, lgaSenateID int32
		var sID int16
		var lID int32
		_ = dbtx.QueryRow(ctx, `
			SELECT COALESCE(w.state_constituency_id, 0), COALESCE(l.federal_constituency_id, 0), COALESCE(l.senatorial_district_id, 0),
			       w.state_id, w.lga_id
			FROM wards w JOIN lgas l ON l.id = w.lga_id
			WHERE w.id = $1 LIMIT 1`, wardID,
		).Scan(&wardStateConstID, &lgaFedConstID, &lgaSenateID, &sID, &lID)
		if stateID <= 0 {
			stateID = sID
		}
		if lgaID <= 0 {
			lgaID = lID
		}

		var wardSupCount int32
		_ = dbtx.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM ward_election_supervisors
			WHERE election_group_id = $1 AND ward_id = $2 AND party_id = $3`,
			egID, wardID, partyID,
		).Scan(&wardSupCount)

		uniqueWardSup := int32(0)
		if isIncrement {
			if wardSupCount <= 1 {
				uniqueWardSup = 1
			}
		} else {
			if wardSupCount == 0 {
				uniqueWardSup = -1
			}
		}

		_ = q.AdjustElectionGroupWardWardSupervisorCounts(ctx, queries.AdjustElectionGroupWardWardSupervisorCountsParams{
			ElectionGroupID: egID,
			WardID:          wardID,
			PartyID:         partyID,
			Delta:           delta,
		})
		if lgaID > 0 {
			_ = q.AdjustElectionGroupLGAWardSupervisorCounts(ctx, queries.AdjustElectionGroupLGAWardSupervisorCountsParams{
				ElectionGroupID: egID,
				LgaID:           lgaID,
				PartyID:         partyID,
				Delta:           delta,
				UniqueDelta:     uniqueWardSup,
			})
		}
		if wardStateConstID > 0 {
			_ = q.AdjustElectionGroupStateConstituencyWardSupervisorCounts(ctx, queries.AdjustElectionGroupStateConstituencyWardSupervisorCountsParams{
				ElectionGroupID:     egID,
				StateConstituencyID: wardStateConstID,
				PartyID:             partyID,
				Delta:               delta,
				UniqueDelta:         uniqueWardSup,
			})
		}
		if lgaFedConstID > 0 {
			_ = q.AdjustElectionGroupFederalConstituencyWardSupervisorCounts(ctx, queries.AdjustElectionGroupFederalConstituencyWardSupervisorCountsParams{
				ElectionGroupID:       egID,
				FederalConstituencyID: lgaFedConstID,
				PartyID:               partyID,
				Delta:                 delta,
				UniqueDelta:           uniqueWardSup,
			})
		}
		if lgaSenateID > 0 {
			_ = q.AdjustElectionGroupSenatorialDistrictWardSupervisorCounts(ctx, queries.AdjustElectionGroupSenatorialDistrictWardSupervisorCountsParams{
				ElectionGroupID:      egID,
				SenatorialDistrictID: lgaSenateID,
				PartyID:              partyID,
				Delta:                delta,
				UniqueDelta:          uniqueWardSup,
			})
		}
		if stateID > 0 {
			_ = q.AdjustElectionGroupStateWardSupervisorCounts(ctx, queries.AdjustElectionGroupStateWardSupervisorCountsParams{
				ElectionGroupID: egID,
				StateID:         stateID,
				PartyID:         partyID,
				Delta:           delta,
				UniqueDelta:     uniqueWardSup,
			})
		}
		_ = q.AdjustElectionGroupNationalWardSupervisorCounts(ctx, queries.AdjustElectionGroupNationalWardSupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           delta,
			UniqueDelta:     uniqueWardSup,
		})

	case "lga_election_supervisor", "lga_supervisor":
		if lgaID <= 0 {
			return
		}
		var lgaFedConstID, lgaSenateID int32
		var sID int16
		_ = dbtx.QueryRow(ctx, `SELECT COALESCE(federal_constituency_id, 0), COALESCE(senatorial_district_id, 0), state_id FROM lgas WHERE id = $1 LIMIT 1`, lgaID).Scan(&lgaFedConstID, &lgaSenateID, &sID)
		if stateID <= 0 {
			stateID = sID
		}

		var lgaSupCount int32
		_ = dbtx.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM lga_election_supervisors
			WHERE election_group_id = $1 AND lga_id = $2 AND party_id = $3`,
			egID, lgaID, partyID,
		).Scan(&lgaSupCount)

		uniqueLgaSup := int32(0)
		if isIncrement {
			if lgaSupCount <= 1 {
				uniqueLgaSup = 1
			}
		} else {
			if lgaSupCount == 0 {
				uniqueLgaSup = -1
			}
		}

		_ = q.AdjustElectionGroupLGALGASupervisorCounts(ctx, queries.AdjustElectionGroupLGALGASupervisorCountsParams{
			ElectionGroupID: egID,
			LgaID:           lgaID,
			PartyID:         partyID,
			Delta:           delta,
		})
		if lgaFedConstID > 0 {
			_ = q.AdjustElectionGroupFederalConstituencyLGASupervisorCounts(ctx, queries.AdjustElectionGroupFederalConstituencyLGASupervisorCountsParams{
				ElectionGroupID:       egID,
				FederalConstituencyID: lgaFedConstID,
				PartyID:               partyID,
				Delta:                 delta,
				UniqueDelta:           uniqueLgaSup,
			})
		}
		if lgaSenateID > 0 {
			_ = q.AdjustElectionGroupSenatorialDistrictLGASupervisorCounts(ctx, queries.AdjustElectionGroupSenatorialDistrictLGASupervisorCountsParams{
				ElectionGroupID:      egID,
				SenatorialDistrictID: lgaSenateID,
				PartyID:              partyID,
				Delta:                delta,
				UniqueDelta:          uniqueLgaSup,
			})
		}
		if stateID > 0 {
			_ = q.AdjustElectionGroupStateLGASupervisorCounts(ctx, queries.AdjustElectionGroupStateLGASupervisorCountsParams{
				ElectionGroupID: egID,
				StateID:         stateID,
				PartyID:         partyID,
				Delta:           delta,
				UniqueDelta:     uniqueLgaSup,
			})
		}
		_ = q.AdjustElectionGroupNationalLGASupervisorCounts(ctx, queries.AdjustElectionGroupNationalLGASupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           delta,
			UniqueDelta:     uniqueLgaSup,
		})

	case "state_election_supervisor", "state_supervisor":
		if stateID <= 0 {
			return
		}
		var stateSupCount int32
		_ = dbtx.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM state_election_supervisors
			WHERE election_group_id = $1 AND state_id = $2 AND party_id = $3`,
			egID, stateID, partyID,
		).Scan(&stateSupCount)

		uniqueStateSup := int32(0)
		if isIncrement {
			if stateSupCount <= 1 {
				uniqueStateSup = 1
			}
		} else {
			if stateSupCount == 0 {
				uniqueStateSup = -1
			}
		}

		_ = q.AdjustElectionGroupStateStateSupervisorCounts(ctx, queries.AdjustElectionGroupStateStateSupervisorCountsParams{
			ElectionGroupID: egID,
			StateID:         stateID,
			PartyID:         partyID,
			Delta:           delta,
		})
		_ = q.AdjustElectionGroupNationalStateSupervisorCounts(ctx, queries.AdjustElectionGroupNationalStateSupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           delta,
			UniqueDelta:     uniqueStateSup,
		})
	}
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func int32Ptr(i int32) *int32 {
	return &i
}

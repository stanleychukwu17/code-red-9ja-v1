package agentperformancehandler

import (
	"log/slog"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"free9ja/api/internal/db/queries"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"
)

type Handler struct {
	q            *queries.Queries
	pool         *pgxpool.Pool
	usersService *usersservice.UsersService
	u            *utils.Utils
}

func NewHandler(q *queries.Queries, pool *pgxpool.Pool, usersService *usersservice.UsersService, u *utils.Utils) *Handler {
	return &Handler{
		q:            q,
		pool:         pool,
		usersService: usersService,
		u:            u,
	}
}

type AgentPerformanceItem struct {
	ID                int64   `json:"id"`
	UserID            int64   `json:"user_id"`
	PartyID           int16   `json:"party_id"`
	ElectionGroupID   int32   `json:"election_group_id"`
	StateID           int16   `json:"state_id"`
	LgaID             int32   `json:"lga_id"`
	WardID            int32   `json:"ward_id"`
	PollingUnitID     int32   `json:"polling_unit_id"`
	UserName          string  `json:"user_name"`
	AvatarUrl         string  `json:"avatar_url"`
	RoleType          string  `json:"role_type"`
	ReadinessPct      float64 `json:"readiness_pct"`
	ArrivedAt         *string `json:"arrived_at,omitempty"`
	ElectionStartedAt *string `json:"election_started_at,omitempty"`
	ElectionEndedAt   *string `json:"election_ended_at,omitempty"`
	UpdatesGiven      *int32  `json:"updates_given,omitempty"`
	ReportsGiven      *int32  `json:"reports_given,omitempty"`
	ResultsUploaded   *string `json:"results_uploaded,omitempty"`
	EarningsKobo      int64   `json:"earnings_kobo"`
	EarningsFormatted string  `json:"earnings_formatted"`
	CompletionStatus  bool    `json:"completion_status"`
	RequestedPayout   bool    `json:"requested_payout"`
	Paid              bool    `json:"paid"`
	StateName         *string `json:"state_name,omitempty"`
	LgaName           *string `json:"lga_name,omitempty"`
	WardName          *string `json:"ward_name,omitempty"`
	PollingUnitName   *string `json:"polling_unit_name,omitempty"`
	PollingUnitCode   *string `json:"polling_unit_code,omitempty"`
}

// GetAgentPerformance godoc
// @Summary      Get agent & supervisor performance stats
// @Description  Returns cursor-paginated performance stats for polling agents and supervisors.
// @Tags         AgentPerformance
// @Produce      json
// @Param        role_type          query string false "Role type (polling_agent, ward_election_supervisor, lga_election_supervisor, state_election_supervisor)"
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

	partyID := utils.ParseQueryInt[int16](qParams, "party_id")
	electionGroupID := utils.ParseQueryInt[int32](qParams, "election_group_id")
	stateID := utils.ParseQueryInt[int16](qParams, "state_id")
	lgaID := utils.ParseQueryInt[int32](qParams, "lga_id")
	wardID := utils.ParseQueryInt[int32](qParams, "ward_id")
	search := qParams.Get("search")
	cursor := utils.ParseQueryInt[int64](qParams, "cursor")

	limit := utils.ParseQueryInt[int32](qParams, "limit", 20)
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
				ReadinessPct:      math.Round(readiness*100) / 100,
				ArrivedAt:         utils.PtrFromString(row.ArrivedAt),
				ElectionStartedAt: utils.PtrFromString(row.ElectionStartedAt),
				ElectionEndedAt:   utils.PtrFromString(row.ElectionEndedAt),
				UpdatesGiven:      utils.Ptr(row.UpdatesGiven),
				ReportsGiven:      utils.Ptr(row.ReportsGiven),
				ResultsUploaded:   utils.PtrFromString(row.ResultsUploaded),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         utils.PtrFromString(row.StateName),
				LgaName:           utils.PtrFromString(row.LgaName),
				WardName:          utils.PtrFromString(row.WardName),
				PollingUnitName:   utils.PtrFromString(row.PollingUnitName),
				PollingUnitCode:   utils.PtrFromString(row.PollingUnitCode),
			}
			items = append(items, item)
		}

	case "ward_election_supervisor":
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
				ArrivedAt:         utils.PtrFromString(row.ArrivedAt),
				ElectionStartedAt: utils.PtrFromString(row.ElectionStartedAt),
				ElectionEndedAt:   utils.PtrFromString(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         utils.PtrFromString(row.StateName),
				LgaName:           utils.PtrFromString(row.LgaName),
				WardName:          utils.PtrFromString(row.WardName),
			}
			items = append(items, item)
		}

	case "lga_election_supervisor":
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
				ArrivedAt:         utils.PtrFromString(row.ArrivedAt),
				ElectionStartedAt: utils.PtrFromString(row.ElectionStartedAt),
				ElectionEndedAt:   utils.PtrFromString(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         utils.PtrFromString(row.StateName),
				LgaName:           utils.PtrFromString(row.LgaName),
			}
			items = append(items, item)
		}

	case "state_election_supervisor":
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
				ArrivedAt:         utils.PtrFromString(row.ArrivedAt),
				ElectionStartedAt: utils.PtrFromString(row.ElectionStartedAt),
				ElectionEndedAt:   utils.PtrFromString(row.ElectionEndedAt),
				EarningsKobo:      row.EarningsKobo,
				EarningsFormatted: row.EarningsFormatted,
				CompletionStatus:  row.CompletionStatus,
				RequestedPayout:   row.RequestedPayout,
				Paid:              row.Paid,
				StateName:         utils.PtrFromString(row.StateName),
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

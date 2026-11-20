package agentperformancehandler

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
)

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type Handler struct {
	queries      *queries.Queries
	pool         *pgxpool.Pool
	usersService UsersService
	utils        *utils.Utils
}

func NewHandler(queries *queries.Queries, pool *pgxpool.Pool, usersService UsersService, utils *utils.Utils) *Handler {
	return &Handler{
		queries:      queries,
		pool:         pool,
		usersService: usersService,
		utils:        utils,
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

	items, nextCursor, hasMore, err := h.fetchPerformanceStats(r.Context(), roleType, partyID, electionGroupID, stateID, lgaID, wardID, search, cursor, limit)
	if err != nil {
		slog.Error("[AgentPerformance] Query error", "error", err, "role_type", roleType)
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	slog.Info("[AgentPerformance] Returning performance stats successfully",
		"role_type", roleType,
		"item_count", len(items),
		"has_more", hasMore,
	)

	h.utils.RespondSuccess(w, http.StatusOK, "Agent performance stats retrieved successfully", map[string]interface{}{
		"items":       items,
		"next_cursor": nextCursor,
		"has_more":    hasMore,
	})
}

// fetchPerformanceStats executes the appropriate SQL query according to role type.
func (h *Handler) fetchPerformanceStats(ctx context.Context, roleType string, partyID int16, electionGroupID int32, stateID int16, lgaID int32, wardID int32, search string, cursor int64, limit int32) ([]AgentPerformanceItem, *int64, bool, error) {
	// Fetch limit + 1 to check for next page
	queryLimit := int32(limit + 1)

	var items []AgentPerformanceItem
	var nextCursor *int64
	hasMore := false

	switch roleType {
	case "polling_agent":
		rows, err := h.queries.ListPollingAgentPerformanceStats(ctx, queries.ListPollingAgentPerformanceStatsParams{
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
			return nil, nil, false, fmt.Errorf("failed to fetch polling agent performance stats: %w", err)
		}

		if len(rows) > int(limit) {
			hasMore = true
			rows = rows[:limit]
		}

		expectedCache := make(map[int32]int32)
		for _, row := range rows {
			var readiness float64
			if row.ReadinessPct.Valid {
				readinessVal, _ := row.ReadinessPct.Float64Value()
				readiness = readinessVal.Float64
			}

			expected, ok := expectedCache[row.PollingUnitID]
			if !ok {
				cnt, err := h.queries.CountExpectedElectionsForPollingUnit(ctx, queries.CountExpectedElectionsForPollingUnitParams{
					PollingUnitID:   row.PollingUnitID,
					ElectionGroupID: row.ElectionGroupID,
				})
				if err != nil || cnt <= 0 {
					cnt = 1
				}
				expected = cnt
				expectedCache[row.PollingUnitID] = expected
			}
			resultsUploadedFormatted := fmt.Sprintf("%s/%d", row.ResultsUploaded, expected)

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
				ResultsUploaded:   utils.PtrFromString(resultsUploadedFormatted),
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
		rows, err := h.queries.ListWardSupervisorPerformanceStats(ctx, queries.ListWardSupervisorPerformanceStatsParams{
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
			return nil, nil, false, fmt.Errorf("failed to fetch ward supervisor performance stats: %w", err)
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
		rows, err := h.queries.ListLGASupervisorPerformanceStats(ctx, queries.ListLGASupervisorPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			LgaID:           int32(lgaID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			return nil, nil, false, fmt.Errorf("failed to fetch LGA supervisor performance stats: %w", err)
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
		rows, err := h.queries.ListStateSupervisorPerformanceStats(ctx, queries.ListStateSupervisorPerformanceStatsParams{
			PartyID:         int16(partyID),
			ElectionGroupID: electionGroupID,
			StateID:         int16(stateID),
			SearchQuery:     search,
			CursorID:        cursor,
			LimitVal:        queryLimit,
		})
		if err != nil {
			return nil, nil, false, fmt.Errorf("failed to fetch state supervisor performance stats: %w", err)
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
		return nil, nil, false, fmt.Errorf("invalid role_type parameter: %s", roleType)
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

	return items, nextCursor, hasMore, nil
}

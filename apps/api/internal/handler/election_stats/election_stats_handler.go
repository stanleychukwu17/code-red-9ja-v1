package electionstatshandler

import (
	"context"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	electionstats "free9ja/api/internal/service/election_stats"
	permissionsservice "free9ja/api/internal/service/permissions"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ElectionGroupsService interface {
	GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error)
}

type StatesService interface {
	GetStateByID(ctx context.Context, id int16) (queries.CState, error)
}

type BodiesService interface {
	GetLGAByID(ctx context.Context, id int32) (queries.Lga, error)
}

type WardsService interface {
	GetWardByID(ctx context.Context, id int32) (queries.Ward, error)
}

type PermissionsService interface {
	CheckPartyModificationPermission(claims *utils.JWTClaims, partyID int16) (bool, permissionsservice.PartyModificationPermissions, error)
}

type Handler struct {
	service               electionstats.ElectionStatsService
	electionGroupsService ElectionGroupsService
	statesService         StatesService
	bodiesService         BodiesService
	wardsService          WardsService
	permissionsService    PermissionsService
	pool                  *pgxpool.Pool
	utils                 *utils.Utils
}

type AgentCoverageUnitResponse struct {
	ID               int64       `json:"id"`
	Name             string      `json:"name"`
	Code             string      `json:"code"`
	PollingAgents    string      `json:"polling_agents"`
	WardSupervisors  string      `json:"ward_supervisors"`
	LgaSupervisors   string      `json:"lga_supervisors"`
	StateSupervisors string      `json:"state_supervisors"`
	Supervisors      interface{} `json:"supervisors"`
	PuAgents         interface{} `json:"pu_agents"`
}

type BreakdownListResponse[T any] struct {
	Total           int    `json:"total"`
	UnitTitle       string `json:"unit_title"`
	UnitType        string `json:"unit_type"`
	SupervisorTitle string `json:"supervisor_title"`
	Units           []T    `json:"units"`
}

func NewHandler(
	service electionstats.ElectionStatsService,
	electionGroupsService ElectionGroupsService,
	statesService StatesService,
	bodiesService BodiesService,
	wardsService WardsService,
	permissionsService PermissionsService,
	pool *pgxpool.Pool,
	utils *utils.Utils,
) *Handler {
	return &Handler{
		service:               service,
		electionGroupsService: electionGroupsService,
		statesService:         statesService,
		bodiesService:         bodiesService,
		wardsService:          wardsService,
		permissionsService:    permissionsService,
		pool:                  pool,
		utils:                 utils,
	}
}

func formatPctStr(numerator, denominator int64) string {
	if denominator <= 0 {
		return fmt.Sprintf("%d/0 (0%%)", numerator)
	}
	pct := (float64(numerator) / float64(denominator)) * 100
	return fmt.Sprintf("%d/%d (%.1f%%)", numerator, denominator, pct)
}

// GetAgentCoverageBreakdown godoc
// @Summary      Get agent coverage breakdown
// @Description  Fetches agent and supervisor coverage across political hierarchy (States, LGAs, Wards, Polling Units)
// @Tags         ElectionStats
// @Produce      json
// @Param        election_group_id  query int   true  "Election Group ID"
// @Param        party_id           query int   true  "Party ID"
// @Param        state_id           query int   false "State ID filter"
// @Param        lga_id             query int   false "LGA ID filter"
// @Param        ward_id            query int   false "Ward ID filter"
// @Param        polling_unit_id    query int   false "Polling Unit ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /elections/agent-coverage/breakdown [get]
func (h *Handler) GetAgentCoverageBreakdown(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	// Parse and validate required parameters
	electionGroupID := utils.ParseQueryInt[int16](qParams, "election_group_id")
	if electionGroupID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id is required")
		return
	}
	partyID := utils.ParseQueryInt[int16](qParams, "party_id")
	if partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id is required")
		return
	}

	// Verify authenticated session
	claims, ok := apimiddleware.GetClaims(r)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Verify party access rights
	allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, partyID)
	if !allowed || err != nil {
		errMsg := "Forbidden: insufficient permissions to view or modify this party"
		if err != nil {
			errMsg = err.Error()
		}
		h.utils.RespondError(w, http.StatusForbidden, errMsg)
		return
	}

	// Parse geographic hierarchy scope IDs
	puID := utils.ParseQueryInt[int32](qParams, "polling_unit_id")
	wardID := utils.ParseQueryInt[int32](qParams, "ward_id")
	lgaID := utils.ParseQueryInt[int32](qParams, "lga_id")
	stateID := utils.ParseQueryInt[int16](qParams, "state_id")

	var (
		unitTitle       string
		unitType        string
		supervisorTitle string
		units           []map[string]interface{}
	)

	// Level 1: Polling unit tier (when drilled down to a ward or PU)
	if puID > 0 || wardID > 0 {
		unitTitle = "Polling Units"
		unitType = "polling_units"
		supervisorTitle = "PU Agents"

		targetWardID := wardID
		if puID > 0 && targetWardID == 0 {
			targetWardID, _ = h.service.GetPollingUnitWardID(ctx, puID)
		}

		// Query polling units and assigned PU agents directly from source table
		puRows, err := h.service.GetAgentCoveragePollingUnits(ctx, queries.GetAgentCoveragePollingUnitsParams{
			ElectionGroupID: int32(electionGroupID),
			PartyID:         partyID,
			WardID:          int64(targetWardID),
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query agent coverage breakdown: "+err.Error())
			return
		}

		for _, r := range puRows {
			units = append(units, map[string]interface{}{
				"id":             r.ID,
				"name":           r.Name,
				"code":           r.Code,
				"polling_agents": strconv.FormatInt(r.PuAgentsCount, 10),
				"pu_agents":      []interface{}{},
				"supervisors":    []interface{}{},
			})
		}

		// Level 2: Ward tier (when drilled down to an LGA)
	} else if lgaID > 0 {
		unitTitle = "Wards"
		unitType = "wards"
		supervisorTitle = "Ward Supervisor"

		// Query wards, aggregated PU agent counts, and ward supervisors from source tables
		wardRows, err := h.service.GetAgentCoverageWards(ctx, queries.GetAgentCoverageWardsParams{
			ElectionGroupID: int32(electionGroupID),
			PartyID:         partyID,
			LgaID:           lgaID,
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query agent coverage breakdown: "+err.Error())
			return
		}

		for _, r := range wardRows {
			targetPUAgents := r.TotalPus * 2
			if targetPUAgents <= 0 {
				targetPUAgents = r.TotalPus
			}
			units = append(units, map[string]interface{}{
				"id":                r.ID,
				"name":              r.Name,
				"code":              "",
				"polling_agents":    formatPctStr(r.PuAgentsCount, targetPUAgents),
				"ward_supervisors":  strconv.FormatInt(r.WardSupervisorsCount, 10),
				"lga_supervisors":   "",
				"state_supervisors": "",
				"supervisors":       []interface{}{},
				"pu_agents":         []interface{}{},
			})
		}

		// Level 3: LGA tier (when drilled down to a State)
	} else if stateID > 0 {
		unitTitle = "LGAs"
		unitType = "lgas"
		supervisorTitle = "LGA Supervisor"

		// Query LGAs, aggregated agent/ward counts, and LGA supervisors from source tables
		lgaRows, err := h.service.GetAgentCoverageLGAs(ctx, queries.GetAgentCoverageLGAsParams{
			ElectionGroupID: int32(electionGroupID),
			PartyID:         partyID,
			StateID:         int32(stateID),
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query agent coverage breakdown: "+err.Error())
			return
		}

		for _, r := range lgaRows {
			targetPUAgents := r.TotalPus * 2
			if targetPUAgents <= 0 {
				targetPUAgents = r.TotalPus
			}
			units = append(units, map[string]interface{}{
				"id":                r.ID,
				"name":              r.Name,
				"code":              "",
				"polling_agents":    formatPctStr(r.PuAgentsCount, targetPUAgents),
				"ward_supervisors":  formatPctStr(r.WardSupervisorsCount, r.TotalWards),
				"lga_supervisors":   strconv.FormatInt(r.LgaSupervisorsCount, 10),
				"state_supervisors": "",
				"supervisors":       []interface{}{},
				"pu_agents":         []interface{}{},
			})
		}

		// Level 4: State tier (top-level overview across all Nigerian states)
	} else {
		unitTitle = "States"
		unitType = "states"
		supervisorTitle = "State Supervisor"

		// Query states, aggregated agent counts, and state supervisors from source tables
		stateRows, err := h.service.GetAgentCoverageStates(ctx, queries.GetAgentCoverageStatesParams{
			ElectionGroupID: int32(electionGroupID),
			PartyID:         partyID,
			CountryID:       int32(constants.NigeriaCountryID),
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query agent coverage breakdown: "+err.Error())
			return
		}

		for _, r := range stateRows {
			targetPUAgents := r.TotalPus * 2
			if targetPUAgents <= 0 {
				targetPUAgents = r.TotalPus
			}
			units = append(units, map[string]interface{}{
				"id":                r.ID,
				"name":              r.Name,
				"code":              "",
				"polling_agents":    formatPctStr(r.PuAgentsCount, targetPUAgents),
				"ward_supervisors":  formatPctStr(r.WardSupervisorsCount, r.TotalWards),
				"lga_supervisors":   formatPctStr(r.LgaSupervisorsCount, r.TotalLgas),
				"state_supervisors": strconv.FormatInt(r.StateSupervisorsCount, 10),
				"supervisors":       []interface{}{},
				"pu_agents":         []interface{}{},
			})
		}
	}

	// Send success response with breakdown metadata and units
	h.utils.RespondSuccessData(w, http.StatusOK, "Agent coverage breakdown fetched", BreakdownListResponse[map[string]interface{}]{
		Total:           len(units),
		UnitTitle:       unitTitle,
		UnitType:        unitType,
		SupervisorTitle: supervisorTitle,
		Units:           units,
	})
}

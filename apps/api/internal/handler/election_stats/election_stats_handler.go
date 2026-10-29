package electionstatshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	electionstats "free9ja/api/internal/service/election_stats"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ElectionsService interface {
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

type Handler struct {
	service          electionstats.ElectionStatsService
	electionsService ElectionsService
	statesService    StatesService
	bodiesService    BodiesService
	wardsService     WardsService
	pool             *pgxpool.Pool
	utils            *utils.Utils
}

type OperationsBreakdownUnitResponse struct {
	ID                   int64       `json:"id"`
	Name                 string      `json:"name"`
	Code                 string      `json:"code"`
	AgentsAtPu           string      `json:"agents_at_pu"`
	PuAgentsInAttendance int64       `json:"pu_agents_in_attendance"`
	PuAgentsCount        int64       `json:"pu_agents_count"`
	UpdatesGiven         int64       `json:"updates_given"`
	ReportsGiven         int64       `json:"reports_given"`
	ReportedPus          int64       `json:"reported_pus"`
	PusWithUpdates       int64       `json:"pus_with_updates"`
	ResultsUploaded      int64       `json:"results_uploaded"`
	ResultsExpected      string      `json:"results_expected"`
	PusWithAllResults    int64       `json:"pus_with_all_results"`
	PusWith1Agent        string      `json:"pus_with_1_agent"`
	TotalAgents          string      `json:"total_agents"`
	TotalPus             int64       `json:"total_pus"`
	Supervisors          interface{} `json:"supervisors"`
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
	electionsService ElectionsService,
	statesService StatesService,
	bodiesService BodiesService,
	wardsService WardsService,
	pool *pgxpool.Pool,
	utils *utils.Utils,
) *Handler {
	return &Handler{
		service:          service,
		electionsService: electionsService,
		statesService:    statesService,
		bodiesService:    bodiesService,
		wardsService:     wardsService,
		pool:             pool,
		utils:            utils,
	}
}
func parseOptionalInt(r *http.Request, key string) (int32, bool) {
	valStr := r.URL.Query().Get(key)
	if valStr == "" {
		return 0, false
	}
	val, err := strconv.ParseInt(valStr, 10, 32)
	if err != nil {
		return 0, false
	}
	return int32(val), true
}

func parseOptionalInt16(r *http.Request, key string) (int16, bool) {
	valStr := r.URL.Query().Get(key)
	if valStr == "" {
		return 0, false
	}
	val, err := strconv.ParseInt(valStr, 10, 16)
	if err != nil {
		return 0, false
	}
	return int16(val), true
}

// GetPollingUnitStats godoc
// @Summary      List polling unit stats for an election group
// @Description  Fetches pre-aggregated election statistics at the polling unit level
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  query int  false "State ID filter"
// @Param        lga_id    query int  false "LGA ID filter"
// @Param        ward_id   query int  false "Ward ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/polling-units [get]
func (h *Handler) GetPollingUnitStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupPollingUnitStatsByGroupParams{
		ElectionGroupID: int32(groupID),
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if lgaID, ok := parseOptionalInt(r, "lga_id"); ok {
		arg.LgaID = pgtype.Int4{Int32: lgaID, Valid: true}
	}
	if wardID, ok := parseOptionalInt(r, "ward_id"); ok {
		arg.WardID = pgtype.Int4{Int32: wardID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupPollingUnitStatsByGroup(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetWardStats godoc
// @Summary      List ward stats for an election group
// @Description  Fetches pre-aggregated election statistics at the ward level
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  query int  false "State ID filter"
// @Param        lga_id    query int  false "LGA ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/wards [get]
func (h *Handler) GetWardStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupWardStatsByGroupParams{
		ElectionGroupID: int32(groupID),
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if lgaID, ok := parseOptionalInt(r, "lga_id"); ok {
		arg.LgaID = pgtype.Int4{Int32: lgaID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupWardStatsByGroup(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetLGAStats godoc
// @Summary      List LGA stats for an election group
// @Description  Fetches pre-aggregated election statistics at the LGA level
// @Tags         ElectionStats
// @Produce      json
// @Param        id                     path  int  true  "Election Group ID"
// @Param        state_id               query int  false "State ID filter"
// @Param        senatorial_district_id query int  false "Senatorial District ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/lgas [get]
func (h *Handler) GetLGAStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupLGAStatsByGroupParams{
		ElectionGroupID: int32(groupID),
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if sdID, ok := parseOptionalInt(r, "senatorial_district_id"); ok {
		arg.SenatorialDistrictID = pgtype.Int4{Int32: sdID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupLGAStatsByGroup(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetStateStats godoc
// @Summary      List state stats for an election group
// @Description  Fetches pre-aggregated election statistics at the state level
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/states [get]
func (h *Handler) GetStateStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	stats, err := h.service.ListElectionGroupStateStatsByGroup(r.Context(), int32(groupID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

func partyStatsToMap(raw interface{}, partyID int32) map[string]interface{} {
	if raw == nil {
		return defaultPartyStats(partyID)
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return defaultPartyStats(partyID)
	}
	var m map[string]interface{}
	if err := json.Unmarshal(b, &m); err != nil {
		return defaultPartyStats(partyID)
	}
	return m
}

func defaultPartyStats(partyID int32) map[string]interface{} {
	return map[string]interface{}{
		"party_id":                               partyID,
		"pu_agents_count":                        0,
		"unique_pu_agents_count":                 0,
		"pu_agents_in_attendance_count":          0,
		"pu_reports_count":                       0,
		"pu_updates_count":                       0,
		"pu_final_results_uploaded_count":        0,
		"unique_pu_final_results_uploaded_count": 0,
		"total_pu_with_reports":                  0,
		"total_pu_with_updates":                  0,
		"total_pu_with_agents_in_attendance":     0,
		"total_pu_unique_final_results_uploaded": 0,
	}
}

// sanitizeTargets strips out all internal party/agent aggregate metrics from targets struct
func sanitizeTargets(raw interface{}) map[string]interface{} {
	b, err := json.Marshal(raw)
	if err != nil {
		return map[string]interface{}{}
	}
	var fullMap map[string]interface{}
	if err := json.Unmarshal(b, &fullMap); err != nil {
		return map[string]interface{}{}
	}

	// White-list strictly structural/geographic keys
	allowedKeys := map[string]bool{
		"id":                            true,
		"election_group_id":             true,
		"state_id":                      true,
		"state_name":                    true,
		"lga_id":                        true,
		"lga_name":                      true,
		"ward_id":                       true,
		"ward_name":                     true,
		"senatorial_district_id":        true,
		"senatorial_district_name":      true,
		"federal_constituency_id":       true,
		"federal_constituency_name":     true,
		"state_constituency_id":         true,
		"state_constituency_name":       true,
		"polling_unit_id":               true,
		"polling_unit_name":             true,
		"states_count":                  true,
		"senatorial_districts_count":    true,
		"federal_constituencies_count":  true,
		"lgas_count":                    true,
		"state_constituencies_count":    true,
		"wards_count":                   true,
		"polling_units_count":           true,
		"unique_final_results_expected": true,
		"created_at":                    true,
		"updated_at":                    true,
	}

	cleanMap := make(map[string]interface{})
	for k, v := range fullMap {
		if allowedKeys[k] {
			cleanMap[k] = v
		}
	}
	return cleanMap
}

// GetSingleStateStats godoc
// @Summary      Get party state stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single state unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  path  int  true  "State ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/states/{state_id}/parties/{party_id} [get]
func (h *Handler) GetSingleStateStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	stateID, err := strconv.ParseInt(chi.URLParam(r, "state_id"), 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupStateStatsParams{
		ElectionGroupID: int32(groupID),
		StateID:         int16(stateID),
	}
	stats, err := h.service.GetElectionGroupStateStats(r.Context(), arg)

	var targets map[string]interface{}
	if err != nil {
		st, errState := h.statesService.GetStateByID(r.Context(), int16(stateID))
		if errState != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":             groupID,
			"state_id":                      st.ID,
			"state_name":                    st.Name,
			"senatorial_districts_count":    st.SenatorialDistrictsCount,
			"federal_constituencies_count":  st.FederalConstituenciesCount,
			"lgas_count":                    st.LgasCount,
			"state_constituencies_count":    st.StateConstituenciesCount,
			"wards_count":                   st.WardsCount,
			"polling_units_count":           st.PollingUnitsCount,
			"unique_final_results_expected": st.PollingUnitsCount,
		}
	} else {
		targets = sanitizeTargets(stats)
	}

	partyRow, errParty := h.service.GetElectionGroupPartyStateStats(r.Context(), queries.GetElectionGroupPartyStateStatsParams{
		ElectionGroupID: int32(groupID),
		StateID:         int16(stateID),
		PartyID:         int16(partyID),
	})
	var partyStats map[string]interface{}
	if errParty != nil {
		partyStats = defaultPartyStats(int32(partyID))
	} else {
		partyStats = partyStatsToMap(partyRow, int32(partyID))
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleLGAStats godoc
// @Summary      Get party LGA stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single LGA unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        lga_id    path  int  true  "LGA ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/lgas/{lga_id}/parties/{party_id} [get]
func (h *Handler) GetSingleLGAStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	lgaID, err := strconv.ParseInt(chi.URLParam(r, "lga_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupLGAStatsParams{
		ElectionGroupID: int32(groupID),
		LgaID:           int32(lgaID),
	}
	stats, err := h.service.GetElectionGroupLGAStats(r.Context(), arg)

	var targets map[string]interface{}
	if err != nil {
		lga, errLga := h.bodiesService.GetLGAByID(r.Context(), int32(lgaID))
		if errLga != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":             groupID,
			"lga_id":                        lga.ID,
			"lga_name":                      lga.Name,
			"state_id":                      lga.StateID,
			"state_name":                    lga.StateName,
			"senatorial_district_id":        lga.SenatorialDistrictID,
			"senatorial_district_name":      lga.SenatorialDistrictName,
			"federal_constituency_id":       lga.FederalConstituencyID,
			"federal_constituency_name":     lga.FederalConstituencyName,
			"state_constituencies_count":    lga.StateConstituenciesCount,
			"wards_count":                   lga.WardsCount,
			"polling_units_count":           lga.PollingUnitsCount,
			"unique_final_results_expected": lga.PollingUnitsCount,
		}
	} else {
		targets = sanitizeTargets(stats)
	}

	partyRow, errParty := h.service.GetElectionGroupPartyLGAStats(r.Context(), queries.GetElectionGroupPartyLGAStatsParams{
		ElectionGroupID: int32(groupID),
		LgaID:           int32(lgaID),
		PartyID:         int16(partyID),
	})
	var partyStats map[string]interface{}
	if errParty != nil {
		partyStats = defaultPartyStats(int32(partyID))
	} else {
		partyStats = partyStatsToMap(partyRow, int32(partyID))
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleWardStats godoc
// @Summary      Get party ward stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single ward unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        ward_id   path  int  true  "Ward ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/wards/{ward_id}/parties/{party_id} [get]
func (h *Handler) GetSingleWardStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	wardID, err := strconv.ParseInt(chi.URLParam(r, "ward_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid Ward ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupWardStatsParams{
		ElectionGroupID: int32(groupID),
		WardID:          int32(wardID),
	}
	stats, err := h.service.GetElectionGroupWardStats(r.Context(), arg)

	var targets map[string]interface{}
	if err != nil {
		wrd, errWard := h.wardsService.GetWardByID(r.Context(), int32(wardID))
		if errWard != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":             groupID,
			"ward_id":                       wrd.ID,
			"ward_name":                     wrd.Name,
			"lga_id":                        wrd.LgaID,
			"lga_name":                      wrd.LgaName,
			"state_id":                      wrd.StateID,
			"state_name":                    wrd.StateName,
			"polling_units_count":           wrd.PollingUnitsCount,
			"unique_final_results_expected": wrd.PollingUnitsCount,
		}
	} else {
		targets = sanitizeTargets(stats)
	}

	partyRow, errParty := h.service.GetElectionGroupPartyWardStats(r.Context(), queries.GetElectionGroupPartyWardStatsParams{
		ElectionGroupID: int32(groupID),
		WardID:          int32(wardID),
		PartyID:         int16(partyID),
	})
	var partyStats map[string]interface{}
	if errParty != nil {
		partyStats = defaultPartyStats(int32(partyID))
	} else {
		partyStats = partyStatsToMap(partyRow, int32(partyID))
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleElectionGroupStats godoc
// @Summary      Get global party stats for a single election group
// @Description  Fetches pre-aggregated election statistics for an election group and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/parties/{party_id} [get]
func (h *Handler) GetSingleElectionGroupStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	stats, err := h.electionsService.GetElectionGroupByID(r.Context(), int32(groupID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyRow, errParty := h.service.GetElectionGroupPartyNationalStats(r.Context(), queries.GetElectionGroupPartyNationalStatsParams{
		ElectionGroupID: int32(groupID),
		PartyID:         int16(partyID),
	})
	var partyStats map[string]interface{}
	if errParty != nil {
		partyStats = defaultPartyStats(int32(partyID))
	} else {
		partyStats = partyStatsToMap(partyRow, int32(partyID))
	}

	targets := sanitizeTargets(stats)
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// ─── Operations Breakdown Handler ──────────────────────────────────────────

func formatComma(n int64) string {
	in := strconv.FormatInt(n, 10)
	var out []byte
	l := len(in)
	for i, c := range in {
		if i > 0 && (l-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, byte(c))
	}
	return string(out)
}

func formatPctStr(count int64, total int64) string {
	cStr := formatComma(count)
	if total <= 0 {
		return cStr
	}
	pct := float64(count) / float64(total) * 100.0
	pStr := fmt.Sprintf("%.1f", pct)
	pStr = strings.TrimSuffix(pStr, ".0")
	return fmt.Sprintf("%s (%s%%)", cStr, pStr)
}

// GetOperationsBreakdown returns hierarchical unit stats and supervisors for election race operations.
func (h *Handler) GetOperationsBreakdown(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	electionIDParsed, _ := strconv.ParseInt(qParams.Get("election_id"), 10, 32)
	electionID := int32(electionIDParsed)
	egIDParsed, _ := strconv.ParseInt(qParams.Get("election_group_id"), 10, 16)
	electionGroupID := int16(egIDParsed)
	partyIDParsed, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 16)
	partyID := int16(partyIDParsed)

	if electionGroupID == 0 && electionID > 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT election_group_id FROM elections WHERE id = $1", electionID).Scan(&electionGroupID)
	}
	if electionGroupID == 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT id FROM election_groups ORDER BY id DESC LIMIT 1").Scan(&electionGroupID)
	}

	puIDParsed, _ := strconv.ParseInt(qParams.Get("polling_unit_id"), 10, 32)
	puID := int32(puIDParsed)
	wardIDParsed, _ := strconv.ParseInt(qParams.Get("ward_id"), 10, 32)
	wardID := int32(wardIDParsed)
	lgaIDParsed, _ := strconv.ParseInt(qParams.Get("lga_id"), 10, 32)
	lgaID := int32(lgaIDParsed)
	stateIDParsed, _ := strconv.ParseInt(qParams.Get("state_id"), 10, 16)
	stateID := int16(stateIDParsed)

	var (
		query           string
		args            []interface{}
		unitTitle       string
		unitType        string
		supervisorTitle string
	)

	if puID > 0 || wardID > 0 {
		unitTitle = "Polling Units"
		unitType = "polling_units"
		supervisorTitle = "PU Agents"

		targetWardID := wardID
		if puID > 0 && targetWardID == 0 && h.pool != nil {
			_ = h.pool.QueryRow(ctx, "SELECT ward_id FROM polling_units WHERE id = $1", puID).Scan(&targetWardID)
		}

		query = `
			SELECT
				pu.id,
				pu.name,
				COALESCE(NULLIF(pu.pu_code, ''), pu.code, '') AS code,
				COALESCE(egpu.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egpu.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(egpu.pu_updates_count, 0) AS updates_count,
				COALESCE(egpu.pu_reports_count, 0) AS reports_count,
				COALESCE(egpu.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(NULLIF(egpu.unique_final_results_expected, 0), 1) AS results_expected,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM polling_unit_assignments pua
						JOIN users u ON u.id = pua.user_id
						WHERE pua.polling_unit_id = pu.id
						  AND ($1::bigint = 0 OR pua.election_group_id = $1)
						  AND ($2::int = 0 OR pua.party_id = $2)
						LIMIT 4
					) u
				) AS agents
			FROM polling_units pu
			LEFT JOIN election_group_polling_units egpu
				ON egpu.polling_unit_id = pu.id AND egpu.election_group_id = $1
			WHERE ($3::bigint = 0 OR pu.ward_id = $3)
			ORDER BY pu.id ASC`
		args = []interface{}{electionGroupID, partyID, targetWardID}

	} else if lgaID > 0 {
		unitTitle = "Wards"
		unitType = "wards"
		supervisorTitle = "Ward Supervisors"

		query = `
			SELECT
				w.id,
				w.name,
				'' AS code,
				COALESCE(egw.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egw.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(egw.pu_updates_count, 0) AS updates_count,
				COALESCE(egw.pu_reports_count, 0) AS reports_count,
				COALESCE(egw.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egw.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egw.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egw.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egw.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(w.polling_units_count, 0) AS total_pus,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM ward_election_supervisors wes
						JOIN users u ON u.id = wes.user_id
						WHERE wes.ward_id = w.id
						  AND ($1::bigint = 0 OR wes.election_group_id = $1)
						  AND ($2::int = 0 OR wes.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM wards w
			LEFT JOIN (
				SELECT
					ward_id,
					SUM(pu_agents_in_attendance_count)::bigint AS pu_agents_in_attendance_count,
					SUM(pu_agents_count)::bigint AS pu_agents_count,
					SUM(pu_updates_count)::bigint AS pu_updates_count,
					SUM(pu_reports_count)::bigint AS pu_reports_count,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_reports_count > 0)::bigint AS total_pu_with_reports,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_updates_count > 0)::bigint AS total_pu_with_updates,
					SUM(pu_final_results_uploaded_count)::bigint AS pu_final_results_uploaded_count,
					SUM(unique_final_results_expected)::bigint AS unique_final_results_expected,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE unique_pu_final_results_uploaded_count > 0)::bigint AS total_pu_unique_final_results_uploaded
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY ward_id
			) egw ON egw.ward_id = w.id
			WHERE w.lga_id = $3
			ORDER BY w.name ASC`
		args = []interface{}{electionGroupID, partyID, lgaID}

	} else if stateID > 0 {
		unitTitle = "LGAs"
		unitType = "lgas"
		supervisorTitle = "LGA Supervisors"

		query = `
			SELECT
				l.id,
				l.name,
				'' AS code,
				COALESCE(egl.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egl.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(egl.pu_updates_count, 0) AS updates_count,
				COALESCE(egl.pu_reports_count, 0) AS reports_count,
				COALESCE(egl.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egl.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egl.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egl.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egl.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(l.polling_units_count, 0) AS total_pus,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM lga_election_supervisors les
						JOIN users u ON u.id = les.user_id
						WHERE les.lga_id = l.id
						  AND ($1::bigint = 0 OR les.election_group_id = $1)
						  AND ($2::int = 0 OR les.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM lgas l
			LEFT JOIN (
				SELECT
					lga_id,
					SUM(pu_agents_in_attendance_count)::bigint AS pu_agents_in_attendance_count,
					SUM(pu_agents_count)::bigint AS pu_agents_count,
					SUM(pu_updates_count)::bigint AS pu_updates_count,
					SUM(pu_reports_count)::bigint AS pu_reports_count,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_reports_count > 0)::bigint AS total_pu_with_reports,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_updates_count > 0)::bigint AS total_pu_with_updates,
					SUM(pu_final_results_uploaded_count)::bigint AS pu_final_results_uploaded_count,
					SUM(unique_final_results_expected)::bigint AS unique_final_results_expected,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE unique_pu_final_results_uploaded_count > 0)::bigint AS total_pu_unique_final_results_uploaded
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY lga_id
			) egl ON egl.lga_id = l.id
			WHERE l.state_id = $3
			ORDER BY l.name ASC`
		args = []interface{}{electionGroupID, partyID, stateID}

	} else {
		// Default nationwide states
		unitTitle = "States"
		unitType = "states"
		supervisorTitle = "State Supervisors"

		query = `
			SELECT
				s.id,
				s.name,
				'' AS code,
				COALESCE(egs.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egs.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(egs.pu_updates_count, 0) AS updates_count,
				COALESCE(egs.pu_reports_count, 0) AS reports_count,
				COALESCE(egs.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egs.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egs.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egs.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egs.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(s.polling_units_count, 0) AS total_pus,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM state_election_supervisors ses
						JOIN users u ON u.id = ses.user_id
						WHERE ses.state_id = s.id
						  AND ($1::bigint = 0 OR ses.election_group_id = $1)
						  AND ($2::int = 0 OR ses.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM c_states s
			LEFT JOIN (
				SELECT
					state_id,
					SUM(pu_agents_in_attendance_count)::bigint AS pu_agents_in_attendance_count,
					SUM(pu_agents_count)::bigint AS pu_agents_count,
					SUM(pu_updates_count)::bigint AS pu_updates_count,
					SUM(pu_reports_count)::bigint AS pu_reports_count,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_reports_count > 0)::bigint AS total_pu_with_reports,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE pu_updates_count > 0)::bigint AS total_pu_with_updates,
					SUM(pu_final_results_uploaded_count)::bigint AS pu_final_results_uploaded_count,
					SUM(unique_final_results_expected)::bigint AS unique_final_results_expected,
					COUNT(DISTINCT polling_unit_id) FILTER (WHERE unique_pu_final_results_uploaded_count > 0)::bigint AS total_pu_unique_final_results_uploaded
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY state_id
			) egs ON egs.state_id = s.id
			WHERE s.country_id = $3
			ORDER BY s.name ASC`
		args = []interface{}{electionGroupID, partyID, constants.NigeriaCountryID}
	}

	if h.pool == nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Database connection pool not initialized")
		return
	}

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query operations breakdown: "+err.Error())
		return
	}
	defer rows.Close()

	var units []map[string]interface{}

	if unitType == "polling_units" {
		for rows.Next() {
			var (
				id                 int64
				name, code         string
				agentsInAttendance int64
				puAgentsCount      int64
				updatesCount       int64
				reportsCount       int64
				resultsUploaded    int64
				resultsExpected    int64
				agentsBytes        []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&agentsInAttendance, &puAgentsCount,
				&updatesCount, &reportsCount,
				&resultsUploaded, &resultsExpected,
				&agentsBytes,
			); err != nil {
				continue
			}

			var agents []map[string]interface{}
			if len(agentsBytes) > 0 {
				_ = json.Unmarshal(agentsBytes, &agents)
			}

			uploadedAll := resultsUploaded > 0 && resultsUploaded >= resultsExpected

			// Agents ratio e.g. "2/3"
			targetAgents := puAgentsCount
			if targetAgents <= 0 {
				targetAgents = 3
			}
			agentsAtPu := fmt.Sprintf("%d/%d", agentsInAttendance, targetAgents)

			unit := map[string]interface{}{
				"id":                      id,
				"name":                    name,
				"code":                    code,
				"agents_at_pu":            agentsAtPu,
				"pu_agents_in_attendance": agentsInAttendance,
				"pu_agents_count":         targetAgents,
				"updates_given":           updatesCount,
				"reports_given":           reportsCount,
				"results_uploaded":        resultsUploaded,
				"results_expected":        resultsExpected,
				"uploaded_all_results":    uploadedAll,
				"pu_agents":               agents,
			}
			units = append(units, unit)
		}
	} else {
		for rows.Next() {
			var (
				id                 int64
				name, code         string
				agentsInAttendance int64
				puAgentsCount      int64
				updatesCount       int64
				reportsCount       int64
				reportedPUs        int64
				pusWithUpdates     int64
				resultsUploaded    int64
				resultsExpected    int64
				pusWithAllResults  int64
				totalPUs           int64
				supervisorsBytes   []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&agentsInAttendance, &puAgentsCount,
				&updatesCount, &reportsCount,
				&reportedPUs, &pusWithUpdates,
				&resultsUploaded, &resultsExpected,
				&pusWithAllResults, &totalPUs,
				&supervisorsBytes,
			); err != nil {
				continue
			}

			var supervisors []map[string]interface{}
			if len(supervisorsBytes) > 0 {
				_ = json.Unmarshal(supervisorsBytes, &supervisors)
			}

			agentsAtPuStr := formatPctStr(agentsInAttendance, totalPUs)
			resultsExpectedStr := formatPctStr(resultsExpected, totalPUs)
			pusWith1AgentStr := formatPctStr(agentsInAttendance, totalPUs)
			totalAgentsStr := formatPctStr(puAgentsCount, totalPUs)

			unit := map[string]interface{}{
				"id":                      id,
				"name":                    name,
				"code":                    code,
				"agents_at_pu":            agentsAtPuStr,
				"pu_agents_in_attendance": agentsInAttendance,
				"pu_agents_count":         puAgentsCount,
				"updates_given":           updatesCount,
				"reports_given":           reportsCount,
				"reported_pus":            reportedPUs,
				"pus_with_updates":        pusWithUpdates,
				"results_uploaded":        resultsUploaded,
				"results_expected":        resultsExpectedStr,
				"pus_with_all_results":    pusWithAllResults,
				"pus_with_1_agent":        pusWith1AgentStr,
				"total_agents":            totalAgentsStr,
				"total_pus":               totalPUs,
				"supervisors":             supervisors,
			}
			units = append(units, unit)
		}
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Operations breakdown fetched", BreakdownListResponse[map[string]interface{}]{
		Total:           len(units),
		UnitTitle:       unitTitle,
		UnitType:        unitType,
		SupervisorTitle: supervisorTitle,
		Units:           units,
	})
}

// GetAgentCoverageBreakdown returns hierarchical agent coverage statistics and supervisor avatars.
func (h *Handler) GetAgentCoverageBreakdown(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	electionIDParsed, _ := strconv.ParseInt(qParams.Get("election_id"), 10, 32)
	electionID := int32(electionIDParsed)
	egIDParsed, _ := strconv.ParseInt(qParams.Get("election_group_id"), 10, 16)
	electionGroupID := int16(egIDParsed)
	partyIDParsed, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 16)
	partyID := int16(partyIDParsed)

	if electionGroupID == 0 && electionID > 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT election_group_id FROM elections WHERE id = $1", electionID).Scan(&electionGroupID)
	}
	if electionGroupID == 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT id FROM election_groups ORDER BY id DESC LIMIT 1").Scan(&electionGroupID)
	}

	puIDParsed, _ := strconv.ParseInt(qParams.Get("polling_unit_id"), 10, 32)
	puID := int32(puIDParsed)
	wardIDParsed, _ := strconv.ParseInt(qParams.Get("ward_id"), 10, 32)
	wardID := int32(wardIDParsed)
	lgaIDParsed, _ := strconv.ParseInt(qParams.Get("lga_id"), 10, 32)
	lgaID := int32(lgaIDParsed)
	stateIDParsed, _ := strconv.ParseInt(qParams.Get("state_id"), 10, 16)
	stateID := int16(stateIDParsed)

	var (
		query           string
		args            []interface{}
		unitTitle       string
		unitType        string
		supervisorTitle string
	)

	if puID > 0 || wardID > 0 {
		unitTitle = "Polling Units"
		unitType = "polling_units"
		supervisorTitle = "PU Agents"

		targetWardID := wardID
		if puID > 0 && targetWardID == 0 && h.pool != nil {
			_ = h.pool.QueryRow(ctx, "SELECT ward_id FROM polling_units WHERE id = $1", puID).Scan(&targetWardID)
		}

		query = `
			SELECT
				pu.id,
				pu.name,
				COALESCE(NULLIF(pu.pu_code, ''), pu.code, '') AS code,
				COALESCE(egpu.pu_agents_count, (
					SELECT COUNT(*) FROM polling_unit_assignments pua
					WHERE pua.polling_unit_id = pu.id
					  AND ($1::bigint = 0 OR pua.election_group_id = $1)
					  AND ($2::int = 0 OR pua.party_id = $2)
				), 0) AS pu_agents_count,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM polling_unit_assignments pua
						JOIN users u ON u.id = pua.user_id
						WHERE pua.polling_unit_id = pu.id
						  AND ($1::bigint = 0 OR pua.election_group_id = $1)
						  AND ($2::int = 0 OR pua.party_id = $2)
						LIMIT 4
					) u
				) AS agents
			FROM polling_units pu
			LEFT JOIN election_group_polling_units egpu
				ON egpu.polling_unit_id = pu.id AND egpu.election_group_id = $1
			WHERE ($3::bigint = 0 OR pu.ward_id = $3)
			ORDER BY pu.id ASC`
		args = []interface{}{electionGroupID, partyID, targetWardID}

	} else if lgaID > 0 {
		unitTitle = "Wards"
		unitType = "wards"
		supervisorTitle = "Ward Supervisor"

		query = `
			SELECT
				w.id,
				w.name,
				'' AS code,
				COALESCE(egw.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(w.polling_units_count, 0) AS total_pus,
				(
					SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
					WHERE wes.ward_id = w.id
					  AND ($1::bigint = 0 OR wes.election_group_id = $1)
					  AND ($2::int = 0 OR wes.party_id = $2)
				) AS ward_supervisors_count,
				1::bigint AS total_wards,
				0::bigint AS lga_supervisors_count,
				0::bigint AS total_lgas,
				0::bigint AS state_supervisors_count,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM ward_election_supervisors wes
						JOIN users u ON u.id = wes.user_id
						WHERE wes.ward_id = w.id
						  AND ($1::bigint = 0 OR wes.election_group_id = $1)
						  AND ($2::int = 0 OR wes.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM wards w
			LEFT JOIN (
				SELECT
					ward_id,
					SUM(pu_agents_count)::bigint AS pu_agents_count
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY ward_id
			) egw ON egw.ward_id = w.id
			WHERE w.lga_id = $3
			ORDER BY w.name ASC`
		args = []interface{}{electionGroupID, partyID, lgaID}

	} else if stateID > 0 {
		unitTitle = "LGAs"
		unitType = "lgas"
		supervisorTitle = "LGA Supervisor"

		query = `
			SELECT
				l.id,
				l.name,
				'' AS code,
				COALESCE(egl.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(l.polling_units_count, 0) AS total_pus,
				(
					SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
					JOIN wards w ON w.id = wes.ward_id
					WHERE w.lga_id = l.id
					  AND ($1::bigint = 0 OR wes.election_group_id = $1)
					  AND ($2::int = 0 OR wes.party_id = $2)
				) AS ward_supervisors_count,
				COALESCE(l.wards_count, 0) AS total_wards,
				(
					SELECT COUNT(*)::bigint FROM lga_election_supervisors les
					WHERE les.lga_id = l.id
					  AND ($1::bigint = 0 OR les.election_group_id = $1)
					  AND ($2::int = 0 OR les.party_id = $2)
				) AS lga_supervisors_count,
				1::bigint AS total_lgas,
				0::bigint AS state_supervisors_count,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM lga_election_supervisors les
						JOIN users u ON u.id = les.user_id
						WHERE les.lga_id = l.id
						  AND ($1::bigint = 0 OR les.election_group_id = $1)
						  AND ($2::int = 0 OR les.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM lgas l
			LEFT JOIN (
				SELECT
					lga_id,
					SUM(pu_agents_count)::bigint AS pu_agents_count
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY lga_id
			) egl ON egl.lga_id = l.id
			WHERE l.state_id = $3
			ORDER BY l.name ASC`
		args = []interface{}{electionGroupID, partyID, stateID}

	} else {
		unitTitle = "States"
		unitType = "states"
		supervisorTitle = "State Supervisor"

		query = `
			SELECT
				s.id,
				s.name,
				'' AS code,
				COALESCE(egs.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(s.polling_units_count, 0) AS total_pus,
				(
					SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
					JOIN wards w ON w.id = wes.ward_id
					JOIN lgas l ON l.id = w.lga_id
					WHERE l.state_id = s.id
					  AND ($1::bigint = 0 OR wes.election_group_id = $1)
					  AND ($2::int = 0 OR wes.party_id = $2)
				) AS ward_supervisors_count,
				COALESCE(s.wards_count, 0) AS total_wards,
				(
					SELECT COUNT(*)::bigint FROM lga_election_supervisors les
					JOIN lgas l ON l.id = les.lga_id
					WHERE l.state_id = s.id
					  AND ($1::bigint = 0 OR les.election_group_id = $1)
					  AND ($2::int = 0 OR les.party_id = $2)
				) AS lga_supervisors_count,
				COALESCE(s.lgas_count, 0) AS total_lgas,
				(
					SELECT COUNT(*)::bigint FROM state_election_supervisors ses
					WHERE ses.state_id = s.id
					  AND ($1::bigint = 0 OR ses.election_group_id = $1)
					  AND ($2::int = 0 OR ses.party_id = $2)
				) AS state_supervisors_count,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM state_election_supervisors ses
						JOIN users u ON u.id = ses.user_id
						WHERE ses.state_id = s.id
						  AND ($1::bigint = 0 OR ses.election_group_id = $1)
						  AND ($2::int = 0 OR ses.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM c_states s
			LEFT JOIN (
				SELECT
					state_id,
					SUM(pu_agents_count)::bigint AS pu_agents_count
				FROM election_group_polling_units
				WHERE ($1::bigint = 0 OR election_group_id = $1)
				GROUP BY state_id
			) egs ON egs.state_id = s.id
			WHERE s.country_id = $3
			ORDER BY s.name ASC`
		args = []interface{}{electionGroupID, partyID, constants.NigeriaCountryID}
	}

	if h.pool == nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Database connection pool not initialized")
		return
	}

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query agent coverage breakdown: "+err.Error())
		return
	}
	defer rows.Close()

	var units []map[string]interface{}

	if unitType == "polling_units" {
		for rows.Next() {
			var (
				id            int64
				name, code    string
				puAgentsCount int64
				agentsBytes   []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&puAgentsCount,
				&agentsBytes,
			); err != nil {
				continue
			}

			var agents []map[string]interface{}
			if len(agentsBytes) > 0 {
				_ = json.Unmarshal(agentsBytes, &agents)
			}

			unit := map[string]interface{}{
				"id":             id,
				"name":           name,
				"code":           code,
				"polling_agents": strconv.FormatInt(puAgentsCount, 10),
				"pu_agents":      agents,
				"supervisors":    agents,
			}
			units = append(units, unit)
		}
	} else {
		for rows.Next() {
			var (
				id                    int64
				name, code            string
				puAgentsCount         int64
				totalPUs              int64
				wardSupervisorsCount  int64
				totalWards            int64
				lgaSupervisorsCount   int64
				totalLGAs             int64
				stateSupervisorsCount int64
				supervisorsBytes      []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&puAgentsCount, &totalPUs,
				&wardSupervisorsCount, &totalWards,
				&lgaSupervisorsCount, &totalLGAs,
				&stateSupervisorsCount,
				&supervisorsBytes,
			); err != nil {
				continue
			}

			var supervisors []map[string]interface{}
			if len(supervisorsBytes) > 0 {
				_ = json.Unmarshal(supervisorsBytes, &supervisors)
			}

			targetPUAgents := totalPUs * 2
			if targetPUAgents <= 0 {
				targetPUAgents = totalPUs
			}
			puAgentsStr := formatPctStr(puAgentsCount, targetPUAgents)

			var wardSupervisorsStr string
			if unitType == "wards" {
				wardSupervisorsStr = strconv.FormatInt(wardSupervisorsCount, 10)
			} else {
				wardSupervisorsStr = formatPctStr(wardSupervisorsCount, totalWards)
			}

			var lgaSupervisorsStr string
			if unitType == "lgas" {
				lgaSupervisorsStr = strconv.FormatInt(lgaSupervisorsCount, 10)
			} else if unitType == "wards" {
				lgaSupervisorsStr = ""
			} else {
				lgaSupervisorsStr = formatPctStr(lgaSupervisorsCount, totalLGAs)
			}

			var stateSupervisorsStr string
			if unitType == "states" {
				stateSupervisorsStr = strconv.FormatInt(stateSupervisorsCount, 10)
			} else {
				stateSupervisorsStr = ""
			}

			unit := map[string]interface{}{
				"id":                id,
				"name":              name,
				"code":              code,
				"polling_agents":    puAgentsStr,
				"ward_supervisors":  wardSupervisorsStr,
				"lga_supervisors":   lgaSupervisorsStr,
				"state_supervisors": stateSupervisorsStr,
				"supervisors":       supervisors,
				"pu_agents":         supervisors,
			}
			units = append(units, unit)
		}
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Agent coverage breakdown fetched", BreakdownListResponse[map[string]interface{}]{
		Total:           len(units),
		UnitTitle:       unitTitle,
		UnitType:        unitType,
		SupervisorTitle: supervisorTitle,
		Units:           units,
	})
}

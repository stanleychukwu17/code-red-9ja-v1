package electionstatshandler

import (
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db/queries"
	electionstats "free9ja/api/internal/service/election_stats"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	service electionstats.ElectionStatsService
	pool    *pgxpool.Pool
	utils   *utils.Utils
}

func NewHandler(service electionstats.ElectionStatsService, pool *pgxpool.Pool, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		pool:    pool,
		utils:   utils,
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupPollingUnitStatsByGroupParams{
		ElectionGroupID: groupID,
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupWardStatsByGroupParams{
		ElectionGroupID: groupID,
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupLGAStatsByGroupParams{
		ElectionGroupID: groupID,
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

// GetStateConstituencyStats godoc
// @Summary      List state constituency stats for an election group
// @Description  Fetches pre-aggregated election statistics at the state constituency level
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  query int  false "State ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/state-constituencies [get]
func (h *Handler) GetStateConstituencyStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupStateConstituencyStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupStateConstituencyStatsByGroup(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetFederalConstituencyStats godoc
// @Summary      List federal constituency stats for an election group
// @Description  Fetches pre-aggregated election statistics at the federal constituency level
// @Tags         ElectionStats
// @Produce      json
// @Param        id                     path  int  true  "Election Group ID"
// @Param        state_id               query int  false "State ID filter"
// @Param        senatorial_district_id query int  false "Senatorial District ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/federal-constituencies [get]
func (h *Handler) GetFederalConstituencyStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupFederalConstituencyStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if sdID, ok := parseOptionalInt(r, "senatorial_district_id"); ok {
		arg.SenatorialDistrictID = pgtype.Int4{Int32: sdID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupFederalConstituencyStatsByGroup(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSenatorialDistrictStats godoc
// @Summary      List senatorial district stats for an election group
// @Description  Fetches pre-aggregated election statistics at the senatorial district level
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  query int  false "State ID filter"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/senatorial-districts [get]
func (h *Handler) GetSenatorialDistrictStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	arg := queries.ListElectionGroupSenatorialDistrictStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}

	stats, err := h.service.ListElectionGroupSenatorialDistrictStatsByGroup(r.Context(), arg)
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	stats, err := h.service.ListElectionGroupStateStatsByGroup(r.Context(), groupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// extractPartyStats parses a JSONB array of party stats and returns the object for the given party ID.
// If party_id is not present in the array, it returns a default zeroed party_stats map.
func extractPartyStats(parties []byte, targetPartyID int32) map[string]interface{} {
	if len(parties) > 0 {
		var partySlice []map[string]interface{}
		if err := json.Unmarshal(parties, &partySlice); err == nil {
			for _, p := range partySlice {
				if pid, ok := p["party_id"].(float64); ok && int32(pid) == targetPartyID {
					return p
				}
			}
		}
	}
	return defaultPartyStats(targetPartyID)
}

func defaultPartyStats(partyID int32) map[string]interface{} {
	return map[string]interface{}{
		"party_id":                                         partyID,
		"pu_agents_count":                                  0,
		"unique_pu_agents_count":                           0,
		"pu_agents_in_attendance_count":                    0,
		"pu_reports_count":                                 0,
		"pu_updates_count":                                 0,
		"pu_average_arrival_time":                          nil,
		"pu_average_election_started_at":                   nil,
		"pu_average_election_ended_at":                     nil,
		"pu_election_practice_test_readiness_percentage": 0,
		"pu_final_results_uploaded_count":                  0,
		"unique_pu_final_results_uploaded_count":            0,
		"pu_average_update_time_interval_in_seconds":       0,
		"pu_live_voters_referred_by_agent_count":           0,
		"total_pu_with_reports":                            0,
		"total_pu_with_updates":                            0,
		"total_pu_with_agents_in_attendance":                0,
		"total_pu_where_election_has_started":               0,
		"total_pu_where_election_has_ended":                 0,
		"total_pu_unique_final_results_uploaded":            0,
		"total_pu_where_agents_referred_live_voters":       0,
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
		"id":                           true,
		"election_group_id":            true,
		"state_id":                     true,
		"state_name":                   true,
		"lga_id":                       true,
		"lga_name":                     true,
		"ward_id":                      true,
		"ward_name":                    true,
		"senatorial_district_id":       true,
		"senatorial_district_name":     true,
		"federal_constituency_id":      true,
		"federal_constituency_name":     true,
		"state_constituency_id":        true,
		"state_constituency_name":      true,
		"polling_unit_id":              true,
		"polling_unit_name":            true,
		"states_count":                 true,
		"senatorial_districts_count":   true,
		"federal_constituencies_count": true,
		"lgas_count":                   true,
		"state_constituencies_count":   true,
		"wards_count":                  true,
		"polling_units_count":          true,
		"unique_final_results_expected": true,
		"created_at":                   true,
		"updated_at":                   true,
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
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
		ElectionGroupID: groupID,
		StateID:         int16(stateID),
	}
	stats, err := h.service.GetElectionGroupStateStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		st, errState := h.service.GetStateByID(r.Context(), int16(stateID))
		if errState != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"state_id":                     st.ID,
			"state_name":                   st.Name,
			"senatorial_districts_count":   st.SenatorialDistrictsCount,
			"federal_constituencies_count": st.FederalConstituenciesCount,
			"lgas_count":                   st.LgasCount,
			"state_constituencies_count":   st.StateConstituenciesCount,
			"wards_count":                  st.WardsCount,
			"polling_units_count":          st.PollingUnitsCount,
			"unique_final_results_expected": st.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
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
		ElectionGroupID: groupID,
		LgaID:           int32(lgaID),
	}
	stats, err := h.service.GetElectionGroupLGAStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		lga, errLga := h.service.GetLGAByID(r.Context(), int32(lgaID))
		if errLga != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"lga_id":                       lga.ID,
			"lga_name":                     lga.Name,
			"state_id":                     lga.StateID,
			"state_name":                   lga.StateName,
			"senatorial_district_id":       lga.SenatorialDistrictID,
			"senatorial_district_name":     lga.SenatorialDistrictName,
			"federal_constituency_id":      lga.FederalConstituencyID,
			"federal_constituency_name":     lga.FederalConstituencyName,
			"state_constituencies_count":   lga.StateConstituenciesCount,
			"wards_count":                  lga.WardsCount,
			"polling_units_count":          lga.PollingUnitsCount,
			"unique_final_results_expected": lga.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
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
		ElectionGroupID: groupID,
		WardID:          int32(wardID),
	}
	stats, err := h.service.GetElectionGroupWardStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		wrd, errWard := h.service.GetWardByID(r.Context(), int32(wardID))
		if errWard != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"ward_id":                      wrd.ID,
			"ward_name":                    wrd.Name,
			"lga_id":                       wrd.LgaID,
			"lga_name":                     wrd.LgaName,
			"state_id":                     wrd.StateID,
			"state_name":                   wrd.StateName,
			"polling_units_count":          wrd.PollingUnitsCount,
			"unique_final_results_expected": wrd.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleFederalConstituencyStats godoc
// @Summary      Get party federal constituency stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single federal constituency unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        fc_id     path  int  true  "Federal Constituency ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/federal-constituencies/{fc_id}/parties/{party_id} [get]
func (h *Handler) GetSingleFederalConstituencyStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	fcID, err := strconv.ParseInt(chi.URLParam(r, "fc_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid Federal Constituency ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupFederalConstituencyStatsParams{
		ElectionGroupID: groupID,
		FederalConstituencyID: int32(fcID),
	}
	stats, err := h.service.GetElectionGroupFederalConstituencyStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		fc, errFc := h.service.GetFederalConstituencyByID(r.Context(), int32(fcID))
		if errFc != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"federal_constituency_id":      fc.ID,
			"federal_constituency_name":     fc.Name,
			"state_id":                     fc.StateID,
			"state_name":                   fc.StateName,
			"senatorial_district_id":       fc.SenatorialDistrictID,
			"senatorial_district_name":     fc.SenatorialDistrictName,
			"lgas_count":                   fc.LgasCount,
			"state_constituencies_count":   fc.StateConstituenciesCount,
			"wards_count":                  fc.WardsCount,
			"polling_units_count":          fc.PollingUnitsCount,
			"unique_final_results_expected": fc.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleStateConstituencyStats godoc
// @Summary      Get party state constituency stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single state constituency unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        sc_id     path  int  true  "State Constituency ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/state-constituencies/{sc_id}/parties/{party_id} [get]
func (h *Handler) GetSingleStateConstituencyStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	scID, err := strconv.ParseInt(chi.URLParam(r, "sc_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid State Constituency ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupStateConstituencyStatsParams{
		ElectionGroupID: groupID,
		StateConstituencyID: int32(scID),
	}
	stats, err := h.service.GetElectionGroupStateConstituencyStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		sc, errSc := h.service.GetStateConstituencyByID(r.Context(), int32(scID))
		if errSc != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"state_constituency_id":        sc.ID,
			"state_constituency_name":      sc.Name,
			"lga_id":                       sc.LgaID,
			"lga_name":                     sc.LgaName,
			"state_id":                     sc.StateID,
			"state_name":                   sc.StateName,
			"senatorial_district_id":       sc.SenatorialDistrictID,
			"senatorial_district_name":     sc.SenatorialDistrictName,
			"federal_constituency_id":      sc.FederalConstituencyID,
			"federal_constituency_name":     sc.FederalConstituencyName,
			"wards_count":                  sc.WardsCount,
			"polling_units_count":          sc.PollingUnitsCount,
			"unique_final_results_expected": sc.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// GetSingleSenatorialDistrictStats godoc
// @Summary      Get party senatorial district stats for a single geographic unit
// @Description  Fetches pre-aggregated election statistics for a single senatorial district unit and party, extracting party stats from the parties JSONB array.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        sd_id     path  int  true  "Senatorial District ID"
// @Param        party_id  path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /election-groups/{id}/stats/senatorial-districts/{sd_id}/parties/{party_id} [get]
func (h *Handler) GetSingleSenatorialDistrictStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	sdID, err := strconv.ParseInt(chi.URLParam(r, "sd_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid Senatorial District ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	arg := queries.GetElectionGroupSenatorialDistrictStatsParams{
		ElectionGroupID: groupID,
		SenatorialDistrictID: int32(sdID),
	}
	stats, err := h.service.GetElectionGroupSenatorialDistrictStats(r.Context(), arg)

	var targets map[string]interface{}
	var partiesBytes []byte

	if err != nil {
		sd, errSd := h.service.GetSenatorialDistrictByID(r.Context(), int32(sdID))
		if errSd != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
			return
		}
		targets = map[string]interface{}{
			"election_group_id":            groupID,
			"senatorial_district_id":       sd.ID,
			"senatorial_district_name":     sd.Name,
			"state_id":                     sd.StateID,
			"state_name":                   sd.StateName,
			"federal_constituencies_count": sd.FederalConstituenciesCount,
			"lgas_count":                   sd.LgasCount,
			"state_constituencies_count":   sd.StateConstituenciesCount,
			"wards_count":                  sd.WardsCount,
			"polling_units_count":          sd.PollingUnitsCount,
			"unique_final_results_expected": sd.PollingUnitsCount,
		}
	} else {
		partiesBytes = stats.Parties
		targets = sanitizeTargets(stats)
	}

	partyStats := extractPartyStats(partiesBytes, int32(partyID))
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
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}
	partyID, err := strconv.ParseInt(chi.URLParam(r, "party_id"), 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	stats, err := h.service.GetElectionGroupByID(r.Context(), groupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyStats := extractPartyStats(stats.Parties, int32(partyID))
	targets := sanitizeTargets(stats)
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
		"party_stats": partyStats,
		"targets":     targets,
	})
}

// ─── Operations Breakdown Handler ──────────────────────────────────────────

func formatWATTime(t pgtype.Timestamptz) string {
	if !t.Valid {
		return "—"
	}
	wat := time.FixedZone("WAT", 3600)
	return t.Time.In(wat).Format("3:04 PM")
}

func formatIntervalMin(sec float64) string {
	if sec <= 0 {
		return "1.4 minutes"
	}
	return fmt.Sprintf("%.1f minutes", sec/60.0)
}

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

	electionID, _ := strconv.ParseInt(qParams.Get("election_id"), 10, 64)
	electionGroupID, _ := strconv.ParseInt(qParams.Get("election_group_id"), 10, 64)
	partyID, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 32)

	if electionGroupID == 0 && electionID > 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT election_group_id FROM elections WHERE id = $1", electionID).Scan(&electionGroupID)
	}
	if electionGroupID == 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT id FROM election_groups ORDER BY id DESC LIMIT 1").Scan(&electionGroupID)
	}

	puID, _ := strconv.ParseInt(qParams.Get("polling_unit_id"), 10, 64)
	wardID, _ := strconv.ParseInt(qParams.Get("ward_id"), 10, 64)
	stateConstID, _ := strconv.ParseInt(qParams.Get("state_constituency_id"), 10, 64)
	lgaID, _ := strconv.ParseInt(qParams.Get("lga_id"), 10, 64)
	fedConstID, _ := strconv.ParseInt(qParams.Get("federal_constituency_id"), 10, 64)
	senatorialID, _ := strconv.ParseInt(qParams.Get("senatorial_district_id"), 10, 64)
	stateID, _ := strconv.ParseInt(qParams.Get("state_id"), 10, 64)

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
				egpu.pu_average_arrival_time,
				egpu.pu_average_election_started_at,
				egpu.pu_average_election_ended_at,
				COALESCE(egpu.pu_updates_count, 0) AS updates_count,
				COALESCE(egpu.pu_reports_count, 0) AS reports_count,
				COALESCE(egpu.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egpu.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
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

	} else if stateConstID > 0 && lgaID == 0 {
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
				egw.pu_average_arrival_time,
				COALESCE(egw.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egw.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egw.pu_average_election_started_at,
				egw.pu_average_election_ended_at,
				COALESCE(egw.pu_updates_count, 0) AS updates_count,
				COALESCE(egw.pu_reports_count, 0) AS reports_count,
				COALESCE(egw.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egw.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egw.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egw.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egw.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egw.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egw.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(w.polling_units_count, egw.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egw.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_wards egw
				ON egw.ward_id = w.id AND egw.election_group_id = $1
			WHERE w.state_constituency_id = $3
			ORDER BY w.name ASC`
		args = []interface{}{electionGroupID, partyID, stateConstID}

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
				egw.pu_average_arrival_time,
				COALESCE(egw.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egw.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egw.pu_average_election_started_at,
				egw.pu_average_election_ended_at,
				COALESCE(egw.pu_updates_count, 0) AS updates_count,
				COALESCE(egw.pu_reports_count, 0) AS reports_count,
				COALESCE(egw.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egw.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egw.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egw.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egw.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egw.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egw.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(w.polling_units_count, egw.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egw.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_wards egw
				ON egw.ward_id = w.id AND egw.election_group_id = $1
			WHERE w.lga_id = $3
			ORDER BY w.name ASC`
		args = []interface{}{electionGroupID, partyID, lgaID}

	} else if fedConstID > 0 {
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
				egl.pu_average_arrival_time,
				COALESCE(egl.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egl.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egl.pu_average_election_started_at,
				egl.pu_average_election_ended_at,
				COALESCE(egl.pu_updates_count, 0) AS updates_count,
				COALESCE(egl.pu_reports_count, 0) AS reports_count,
				COALESCE(egl.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egl.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egl.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egl.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egl.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egl.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egl.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(l.polling_units_count, egl.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egl.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_lgas egl
				ON egl.lga_id = l.id AND egl.election_group_id = $1
			WHERE l.federal_constituency_id = $3
			ORDER BY l.name ASC`
		args = []interface{}{electionGroupID, partyID, fedConstID}

	} else if senatorialID > 0 {
		unitTitle = "Federal Constituencies"
		unitType = "federal_constituencies"
		supervisorTitle = "State Supervisors"

		query = `
			SELECT
				fc.id,
				fc.name,
				'' AS code,
				COALESCE(egfc.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egfc.pu_agents_count, 0) AS pu_agents_count,
				egfc.pu_average_arrival_time,
				COALESCE(egfc.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egfc.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egfc.pu_average_election_started_at,
				egfc.pu_average_election_ended_at,
				COALESCE(egfc.pu_updates_count, 0) AS updates_count,
				COALESCE(egfc.pu_reports_count, 0) AS reports_count,
				COALESCE(egfc.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egfc.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egfc.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egfc.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egfc.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egfc.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egfc.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(fc.polling_units_count, egfc.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egfc.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
						WHERE ses.state_id = fc.state_id
						  AND ($1::bigint = 0 OR ses.election_group_id = $1)
						  AND ($2::int = 0 OR ses.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM federal_constituencies fc
			LEFT JOIN election_group_federal_constituencies egfc
				ON egfc.federal_constituency_id = fc.id AND egfc.election_group_id = $1
			WHERE fc.senatorial_district_id = $3
			ORDER BY fc.name ASC`
		args = []interface{}{electionGroupID, partyID, senatorialID}

	} else if stateID > 0 {
		unitTitle = "Senatorial Districts"
		unitType = "senatorial_districts"
		supervisorTitle = "State Supervisors"

		query = `
			SELECT
				sd.id,
				sd.name,
				'' AS code,
				COALESCE(egsd.pu_agents_in_attendance_count, 0) AS pu_agents_in_attendance,
				COALESCE(egsd.pu_agents_count, 0) AS pu_agents_count,
				egsd.pu_average_arrival_time,
				COALESCE(egsd.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egsd.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egsd.pu_average_election_started_at,
				egsd.pu_average_election_ended_at,
				COALESCE(egsd.pu_updates_count, 0) AS updates_count,
				COALESCE(egsd.pu_reports_count, 0) AS reports_count,
				COALESCE(egsd.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egsd.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egsd.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egsd.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egsd.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egsd.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egsd.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(sd.polling_units_count, egsd.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egsd.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
						WHERE ses.state_id = sd.state_id
						  AND ($1::bigint = 0 OR ses.election_group_id = $1)
						  AND ($2::int = 0 OR ses.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM senatorial_districts sd
			LEFT JOIN election_group_senatorial_districts egsd
				ON egsd.senatorial_district_id = sd.id AND egsd.election_group_id = $1
			WHERE sd.state_id = $3
			ORDER BY sd.name ASC`
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
				egs.pu_average_arrival_time,
				COALESCE(egs.total_pu_where_election_has_started, 0) AS election_started_in,
				COALESCE(egs.total_pu_where_election_has_ended, 0) AS election_ended_in,
				egs.pu_average_election_started_at,
				egs.pu_average_election_ended_at,
				COALESCE(egs.pu_updates_count, 0) AS updates_count,
				COALESCE(egs.pu_reports_count, 0) AS reports_count,
				COALESCE(egs.total_pu_with_reports, 0) AS reported_pus,
				COALESCE(egs.total_pu_with_updates, 0) AS pus_with_updates,
				COALESCE(egs.pu_average_update_time_interval_in_seconds, 0) AS update_interval_seconds,
				COALESCE(egs.pu_live_voters_referred_by_agent_count, 0) AS live_voters,
				COALESCE(egs.pu_final_results_uploaded_count, 0) AS results_uploaded,
				COALESCE(egs.unique_final_results_expected, 0) AS results_expected,
				COALESCE(egs.total_pu_unique_final_results_uploaded, 0) AS pus_with_all_results,
				COALESCE(s.polling_units_count, egs.polling_units_count, 0) AS total_pus,
				COALESCE(ROUND(egs.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_states egs
				ON egs.state_id = s.id AND egs.election_group_id = $1
			WHERE s.country_id = 161
			ORDER BY s.name ASC`
		args = []interface{}{electionGroupID, partyID}
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
				id                    int64
				name, code            string
				agentsInAttendance    int64
				puAgentsCount         int64
				arrivalTime           pgtype.Timestamptz
				startTime             pgtype.Timestamptz
				endTime               pgtype.Timestamptz
				updatesCount          int64
				reportsCount          int64
				updateIntervalSeconds float64
				liveVoters            int64
				resultsUploaded       int64
				resultsExpected       int64
				agentsBytes           []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&agentsInAttendance, &puAgentsCount,
				&arrivalTime, &startTime, &endTime,
				&updatesCount, &reportsCount,
				&updateIntervalSeconds, &liveVoters,
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
				"id":                       id,
				"name":                     name,
				"code":                     code,
				"agents_at_pu":             agentsAtPu,
				"pu_agents_in_attendance":  agentsInAttendance,
				"pu_agents_count":          targetAgents,
				"avg_agent_arrival_time":   formatWATTime(arrivalTime),
				"avg_ele_start_time":       formatWATTime(startTime),
				"avg_ele_end_time":         formatWATTime(endTime),
				"updates_given":            updatesCount,
				"reports_given":            reportsCount,
				"avg_update_time_interval": formatIntervalMin(updateIntervalSeconds),
				"live_voters_referred":     liveVoters,
				"results_uploaded":         resultsUploaded,
				"results_expected":         resultsExpected,
				"uploaded_all_results":     uploadedAll,
				"pu_agents":                agents,
			}
			units = append(units, unit)
		}
	} else {
		for rows.Next() {
			var (
				id                    int64
				name, code            string
				agentsInAttendance    int64
				puAgentsCount         int64
				arrivalTime           pgtype.Timestamptz
				eleStartedIn          int64
				eleEndedIn            int64
				startTime             pgtype.Timestamptz
				endTime               pgtype.Timestamptz
				updatesCount          int64
				reportsCount          int64
				reportedPUs           int64
				pusWithUpdates        int64
				updateIntervalSeconds float64
				liveVoters            int64
				resultsUploaded       int64
				resultsExpected       int64
				pusWithAllResults     int64
				totalPUs              int64
				overallReadiness      float64
				supervisorsBytes      []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&agentsInAttendance, &puAgentsCount,
				&arrivalTime,
				&eleStartedIn, &eleEndedIn,
				&startTime, &endTime,
				&updatesCount, &reportsCount,
				&reportedPUs, &pusWithUpdates,
				&updateIntervalSeconds, &liveVoters,
				&resultsUploaded, &resultsExpected,
				&pusWithAllResults, &totalPUs,
				&overallReadiness,
				&supervisorsBytes,
			); err != nil {
				continue
			}

			var supervisors []map[string]interface{}
			if len(supervisorsBytes) > 0 {
				_ = json.Unmarshal(supervisorsBytes, &supervisors)
			}

			agentsAtPuStr := formatPctStr(agentsInAttendance, totalPUs)
			eleStartedStr := formatPctStr(eleStartedIn, totalPUs)
			eleEndedStr := formatPctStr(eleEndedIn, totalPUs)
			resultsExpectedStr := formatPctStr(resultsExpected, totalPUs)
			pusWith1AgentStr := formatPctStr(agentsInAttendance, totalPUs)
			totalAgentsStr := formatPctStr(puAgentsCount, totalPUs)

			unit := map[string]interface{}{
				"id":                          id,
				"name":                        name,
				"code":                        code,
				"agents_at_pu":                agentsAtPuStr,
				"pu_agents_in_attendance":     agentsInAttendance,
				"pu_agents_count":             puAgentsCount,
				"avg_agent_arrival_time":      formatWATTime(arrivalTime),
				"election_started_in":         eleStartedStr,
				"election_ended_in":           eleEndedStr,
				"avg_ele_start_time":          formatWATTime(startTime),
				"avg_ele_end_time":            formatWATTime(endTime),
				"updates_given":               updatesCount,
				"reports_given":               reportsCount,
				"reported_pus":                reportedPUs,
				"pus_with_updates":            pusWithUpdates,
				"avg_update_time_interval":    formatIntervalMin(updateIntervalSeconds),
				"live_voters_referred":        liveVoters,
				"results_uploaded":            resultsUploaded,
				"results_expected":            resultsExpectedStr,
				"pus_with_all_results":        pusWithAllResults,
				"pus_with_1_agent":            pusWith1AgentStr,
				"total_agents":                totalAgentsStr,
				"total_pus":                   totalPUs,
				"overall_readiness":           overallReadiness,
				"supervisors":                 supervisors,
			}
			units = append(units, unit)
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Operations breakdown fetched", map[string]interface{}{
		"total":            len(units),
		"unit_title":       unitTitle,
		"unit_type":        unitType,
		"supervisor_title": supervisorTitle,
		"units":            units,
	})
}

// GetAgentCoverageBreakdown returns hierarchical agent coverage statistics and supervisor avatars.
func (h *Handler) GetAgentCoverageBreakdown(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	electionID, _ := strconv.ParseInt(qParams.Get("election_id"), 10, 64)
	electionGroupID, _ := strconv.ParseInt(qParams.Get("election_group_id"), 10, 64)
	partyID, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 32)

	if electionGroupID == 0 && electionID > 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT election_group_id FROM elections WHERE id = $1", electionID).Scan(&electionGroupID)
	}
	if electionGroupID == 0 && h.pool != nil {
		_ = h.pool.QueryRow(ctx, "SELECT id FROM election_groups ORDER BY id DESC LIMIT 1").Scan(&electionGroupID)
	}

	puID, _ := strconv.ParseInt(qParams.Get("polling_unit_id"), 10, 64)
	wardID, _ := strconv.ParseInt(qParams.Get("ward_id"), 10, 64)
	stateConstID, _ := strconv.ParseInt(qParams.Get("state_constituency_id"), 10, 64)
	lgaID, _ := strconv.ParseInt(qParams.Get("lga_id"), 10, 64)
	fedConstID, _ := strconv.ParseInt(qParams.Get("federal_constituency_id"), 10, 64)
	senatorialID, _ := strconv.ParseInt(qParams.Get("senatorial_district_id"), 10, 64)
	stateID, _ := strconv.ParseInt(qParams.Get("state_id"), 10, 64)

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
				COALESCE(ROUND(egpu.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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

	} else if stateConstID > 0 {
		unitTitle = "Wards"
		unitType = "wards"
		supervisorTitle = "Ward Supervisor"

		query = `
			SELECT
				w.id,
				w.name,
				'' AS code,
				COALESCE(egw.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(w.polling_units_count, egw.polling_units_count, 0) AS total_pus,
				COALESCE(egw.ward_supervisors_count, 0) AS ward_supervisors_count,
				1::bigint AS total_wards,
				0::bigint AS lga_supervisors_count,
				0::bigint AS total_lgas,
				0::bigint AS state_supervisors_count,
				COALESCE(ROUND(egw.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_wards egw
				ON egw.ward_id = w.id AND egw.election_group_id = $1
			WHERE w.state_constituency_id = $3
			ORDER BY w.name ASC`
		args = []interface{}{electionGroupID, partyID, stateConstID}

	} else if lgaID > 0 {
		var hasStateConst bool
		if h.pool != nil {
			var count int
			_ = h.pool.QueryRow(ctx, "SELECT COUNT(*) FROM state_constituencies WHERE lga_id = $1", lgaID).Scan(&count)
			hasStateConst = count > 0
		}

		if hasStateConst {
			unitTitle = "State Constituencies"
			unitType = "state_constituencies"
			supervisorTitle = "Ward Supervisor"

			query = `
				SELECT
					sc.id,
					sc.name,
					COALESCE(sc.code, '') AS code,
					COALESCE(egsc.pu_agents_count, 0) AS pu_agents_count,
					COALESCE(sc.polling_units_count, egsc.polling_units_count, 0) AS total_pus,
					COALESCE(egsc.ward_supervisors_count, 0) AS ward_supervisors_count,
					COALESCE(sc.wards_count, egsc.wards_count, 0) AS total_wards,
					0::bigint AS lga_supervisors_count,
					0::bigint AS total_lgas,
					0::bigint AS state_supervisors_count,
					COALESCE(ROUND(egsc.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
					(
						SELECT COALESCE(json_agg(json_build_object(
							'id', u.id,
							'name', CONCAT(u.first_name, ' ', u.last_name),
							'avatar', COALESCE(u.avatar, '')
						)), '[]'::json)
						FROM (
							SELECT u.id, u.first_name, u.last_name, u.avatar
							FROM ward_election_supervisors wes
							JOIN wards w ON w.id = wes.ward_id
							JOIN users u ON u.id = wes.user_id
							WHERE w.state_constituency_id = sc.id
							  AND ($1::bigint = 0 OR wes.election_group_id = $1)
							  AND ($2::int = 0 OR wes.party_id = $2)
							LIMIT 4
						) u
					) AS supervisors
				FROM state_constituencies sc
				LEFT JOIN election_group_state_constituencies egsc
					ON egsc.state_constituency_id = sc.id AND egsc.election_group_id = $1
				WHERE sc.lga_id = $3
				ORDER BY sc.name ASC`
			args = []interface{}{electionGroupID, partyID, lgaID}
		} else {
			unitTitle = "Wards"
			unitType = "wards"
			supervisorTitle = "Ward Supervisor"

			query = `
				SELECT
					w.id,
					w.name,
					'' AS code,
					COALESCE(egw.pu_agents_count, 0) AS pu_agents_count,
					COALESCE(w.polling_units_count, egw.polling_units_count, 0) AS total_pus,
					COALESCE(egw.ward_supervisors_count, 0) AS ward_supervisors_count,
					1::bigint AS total_wards,
					0::bigint AS lga_supervisors_count,
					0::bigint AS total_lgas,
					0::bigint AS state_supervisors_count,
					COALESCE(ROUND(egw.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
				LEFT JOIN election_group_wards egw
					ON egw.ward_id = w.id AND egw.election_group_id = $1
				WHERE w.lga_id = $3
				ORDER BY w.name ASC`
			args = []interface{}{electionGroupID, partyID, lgaID}
		}

	} else if fedConstID > 0 {
		unitTitle = "LGAs"
		unitType = "lgas"
		supervisorTitle = "LGA Supervisor"

		query = `
			SELECT
				l.id,
				l.name,
				'' AS code,
				COALESCE(egl.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(l.polling_units_count, egl.polling_units_count, 0) AS total_pus,
				COALESCE(egl.ward_supervisors_count, 0) AS ward_supervisors_count,
				COALESCE(l.wards_count, egl.wards_count, 0) AS total_wards,
				COALESCE(egl.lga_supervisors_count, (
					SELECT COUNT(*) FROM lga_election_supervisors les
					WHERE les.lga_id = l.id
					  AND ($1::bigint = 0 OR les.election_group_id = $1)
					  AND ($2::int = 0 OR les.party_id = $2)
				), 0) AS lga_supervisors_count,
				1::bigint AS total_lgas,
				0::bigint AS state_supervisors_count,
				COALESCE(ROUND(egl.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_lgas egl
				ON egl.lga_id = l.id AND egl.election_group_id = $1
			WHERE l.federal_constituency_id = $3
			ORDER BY l.name ASC`
		args = []interface{}{electionGroupID, partyID, fedConstID}

	} else if senatorialID > 0 {
		unitTitle = "Federal Constituencies"
		unitType = "federal_constituencies"
		supervisorTitle = "LGA Supervisor"

		query = `
			SELECT
				fc.id,
				fc.name,
				COALESCE(fc.code, '') AS code,
				COALESCE(egfc.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(fc.polling_units_count, egfc.polling_units_count, 0) AS total_pus,
				COALESCE(egfc.ward_supervisors_count, 0) AS ward_supervisors_count,
				COALESCE(fc.wards_count, egfc.wards_count, 0) AS total_wards,
				COALESCE(egfc.lga_supervisors_count, 0) AS lga_supervisors_count,
				COALESCE(fc.lgas_count, egfc.lgas_count, 0) AS total_lgas,
				0::bigint AS state_supervisors_count,
				COALESCE(ROUND(egfc.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM lga_election_supervisors les
						JOIN lgas l ON l.id = les.lga_id
						JOIN users u ON u.id = les.user_id
						WHERE l.federal_constituency_id = fc.id
						  AND ($1::bigint = 0 OR les.election_group_id = $1)
						  AND ($2::int = 0 OR les.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM federal_constituencies fc
			LEFT JOIN election_group_federal_constituencies egfc
				ON egfc.federal_constituency_id = fc.id AND egfc.election_group_id = $1
			WHERE fc.senatorial_district_id = $3
			ORDER BY fc.name ASC`
		args = []interface{}{electionGroupID, partyID, senatorialID}

	} else if stateID > 0 {
		unitTitle = "Senatorial Districts"
		unitType = "senatorial_districts"
		supervisorTitle = "LGA Supervisor"

		query = `
			SELECT
				sd.id,
				sd.name,
				COALESCE(sd.code, '') AS code,
				COALESCE(egsd.pu_agents_count, 0) AS pu_agents_count,
				COALESCE(sd.polling_units_count, egsd.polling_units_count, 0) AS total_pus,
				COALESCE(egsd.ward_supervisors_count, 0) AS ward_supervisors_count,
				COALESCE(sd.wards_count, egsd.wards_count, 0) AS total_wards,
				COALESCE(egsd.lga_supervisors_count, 0) AS lga_supervisors_count,
				COALESCE(sd.lgas_count, egsd.lgas_count, 0) AS total_lgas,
				0::bigint AS state_supervisors_count,
				COALESCE(ROUND(egsd.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
				(
					SELECT COALESCE(json_agg(json_build_object(
						'id', u.id,
						'name', CONCAT(u.first_name, ' ', u.last_name),
						'avatar', COALESCE(u.avatar, '')
					)), '[]'::json)
					FROM (
						SELECT u.id, u.first_name, u.last_name, u.avatar
						FROM lga_election_supervisors les
						JOIN lgas l ON l.id = les.lga_id
						JOIN users u ON u.id = les.user_id
						WHERE l.senatorial_district_id = sd.id
						  AND ($1::bigint = 0 OR les.election_group_id = $1)
						  AND ($2::int = 0 OR les.party_id = $2)
						LIMIT 4
					) u
				) AS supervisors
			FROM senatorial_districts sd
			LEFT JOIN election_group_senatorial_districts egsd
				ON egsd.senatorial_district_id = sd.id AND egsd.election_group_id = $1
			WHERE sd.state_id = $3
			ORDER BY sd.name ASC`
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
				COALESCE(s.polling_units_count, egs.polling_units_count, 0) AS total_pus,
				COALESCE(egs.ward_supervisors_count, 0) AS ward_supervisors_count,
				COALESCE(s.wards_count, egs.wards_count, 0) AS total_wards,
				COALESCE(egs.lga_supervisors_count, 0) AS lga_supervisors_count,
				COALESCE(s.lgas_count, egs.lgas_count, 0) AS total_lgas,
				COALESCE(egs.state_supervisors_count, (
					SELECT COUNT(*) FROM state_election_supervisors ses
					WHERE ses.state_id = s.id
					  AND ($1::bigint = 0 OR ses.election_group_id = $1)
					  AND ($2::int = 0 OR ses.party_id = $2)
				), 0) AS state_supervisors_count,
				COALESCE(ROUND(egs.pu_election_practice_test_readiness_percentage::numeric, 1), 0) AS overall_readiness,
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
			LEFT JOIN election_group_states egs
				ON egs.state_id = s.id AND egs.election_group_id = $1
			WHERE s.country_id = 161
			ORDER BY s.name ASC`
		args = []interface{}{electionGroupID, partyID}
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
				id               int64
				name, code       string
				puAgentsCount    int64
				overallReadiness float64
				agentsBytes      []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&puAgentsCount,
				&overallReadiness,
				&agentsBytes,
			); err != nil {
				continue
			}

			var agents []map[string]interface{}
			if len(agentsBytes) > 0 {
				_ = json.Unmarshal(agentsBytes, &agents)
			}

			unit := map[string]interface{}{
				"id":                id,
				"name":              name,
				"code":              code,
				"polling_agents":    strconv.FormatInt(puAgentsCount, 10),
				"overall_readiness": overallReadiness,
				"pu_agents":         agents,
				"supervisors":       agents,
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
				overallReadiness      float64
				supervisorsBytes      []byte
			)

			if err := rows.Scan(
				&id, &name, &code,
				&puAgentsCount, &totalPUs,
				&wardSupervisorsCount, &totalWards,
				&lgaSupervisorsCount, &totalLGAs,
				&stateSupervisorsCount,
				&overallReadiness,
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
			} else if unitType == "state_constituencies" || unitType == "wards" {
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
				"overall_readiness": overallReadiness,
				"supervisors":       supervisors,
				"pu_agents":         supervisors,
			}
			units = append(units, unit)
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Agent coverage breakdown fetched", map[string]interface{}{
		"total":            len(units),
		"unit_title":       unitTitle,
		"unit_type":        unitType,
		"supervisor_title": supervisorTitle,
		"units":            units,
	})
}



package electionstatshandler

import (
	"encoding/json"
	"free9ja/api/internal/db/queries"
	electionstats "free9ja/api/internal/service/election_stats"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service electionstats.ElectionStatsService
	utils   *utils.Utils
}

func NewHandler(service electionstats.ElectionStatsService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
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

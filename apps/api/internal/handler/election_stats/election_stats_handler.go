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
func extractPartyStats(parties []byte, targetPartyID int32) map[string]interface{} {
	if len(parties) == 0 {
		return nil
	}
	var partySlice []map[string]interface{}
	if err := json.Unmarshal(parties, &partySlice); err != nil {
		return nil
	}
	for _, p := range partySlice {
		if pid, ok := p["party_id"].(float64); ok && int32(pid) == targetPartyID {
			return p
		}
	}
	return nil
}

// GetSingleStateStats godoc
// @Summary      Get state stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single state unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        state_id  path  int  true  "State ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/states/{state_id} [get]
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

	arg := queries.GetElectionGroupStateStatsParams{
		ElectionGroupID: groupID,
		StateID:         int16(stateID),
	}
	stats, err := h.service.GetElectionGroupStateStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleLGAStats godoc
// @Summary      Get LGA stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single LGA unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        lga_id    path  int  true  "LGA ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/lgas/{lga_id} [get]
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

	arg := queries.GetElectionGroupLGAStatsParams{
		ElectionGroupID: groupID,
		LgaID:           int32(lgaID),
	}
	stats, err := h.service.GetElectionGroupLGAStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleWardStats godoc
// @Summary      Get ward stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single ward unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        ward_id   path  int  true  "Ward ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/wards/{ward_id} [get]
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

	arg := queries.GetElectionGroupWardStatsParams{
		ElectionGroupID: groupID,
		WardID:          int32(wardID),
	}
	stats, err := h.service.GetElectionGroupWardStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleFederalConstituencyStats godoc
// @Summary      Get federal constituency stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single federal constituency unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        fc_id     path  int  true  "Federal Constituency ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/federal-constituencies/{fc_id} [get]
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

	arg := queries.GetElectionGroupFederalConstituencyStatsParams{
		ElectionGroupID: groupID,
		FederalConstituencyID: int32(fcID),
	}
	stats, err := h.service.GetElectionGroupFederalConstituencyStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleStateConstituencyStats godoc
// @Summary      Get state constituency stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single state constituency unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        sc_id     path  int  true  "State Constituency ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/state-constituencies/{sc_id} [get]
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

	arg := queries.GetElectionGroupStateConstituencyStatsParams{
		ElectionGroupID: groupID,
		StateConstituencyID: int32(scID),
	}
	stats, err := h.service.GetElectionGroupStateConstituencyStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleSenatorialDistrictStats godoc
// @Summary      Get senatorial district stats for a single geographic unit and optionally a single party
// @Description  Fetches pre-aggregated election statistics for a single senatorial district unit, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        sd_id     path  int  true  "Senatorial District ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats/senatorial-districts/{sd_id} [get]
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

	arg := queries.GetElectionGroupSenatorialDistrictStatsParams{
		ElectionGroupID: groupID,
		SenatorialDistrictID: int32(sdID),
	}
	stats, err := h.service.GetElectionGroupSenatorialDistrictStats(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

// GetSingleElectionGroupStats godoc
// @Summary      Get global stats for a single election group and optionally a single party
// @Description  Fetches pre-aggregated election statistics for an election group, extracting a single party from the parties JSONB array if party_id is provided.
// @Tags         ElectionStats
// @Produce      json
// @Param        id        path  int  true  "Election Group ID"
// @Param        party_id  query int  false "Party ID filter"
// @Success      200  {object} map[string]interface{}
// @Router       /election-groups/{id}/stats [get]
func (h *Handler) GetSingleElectionGroupStats(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	stats, err := h.service.GetElectionGroupByID(r.Context(), groupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}

	partyID, hasPartyID := parseOptionalInt(r, "party_id")
	if hasPartyID {
		partyStats := extractPartyStats(stats.Parties, partyID)
		h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{
			"party_stats": partyStats,
			"targets":     stats,
		})
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

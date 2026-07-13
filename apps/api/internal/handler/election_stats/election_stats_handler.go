package electionstatshandler

import (
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

	arg := queries.ListElectionPollingUnitStatsByGroupParams{
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

	stats, err := h.service.ListElectionPollingUnitStatsByGroup(r.Context(), arg)
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

	arg := queries.ListElectionWardStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if lgaID, ok := parseOptionalInt(r, "lga_id"); ok {
		arg.LgaID = pgtype.Int4{Int32: lgaID, Valid: true}
	}

	stats, err := h.service.ListElectionWardStatsByGroup(r.Context(), arg)
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

	arg := queries.ListElectionLGAStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if sdID, ok := parseOptionalInt(r, "senatorial_district_id"); ok {
		arg.SenatorialDistrictID = pgtype.Int4{Int32: sdID, Valid: true}
	}

	stats, err := h.service.ListElectionLGAStatsByGroup(r.Context(), arg)
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

	arg := queries.ListElectionStateConstituencyStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}

	stats, err := h.service.ListElectionStateConstituencyStatsByGroup(r.Context(), arg)
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

	arg := queries.ListElectionFederalConstituencyStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}
	if sdID, ok := parseOptionalInt(r, "senatorial_district_id"); ok {
		arg.SenatorialDistrictID = pgtype.Int4{Int32: sdID, Valid: true}
	}

	stats, err := h.service.ListElectionFederalConstituencyStatsByGroup(r.Context(), arg)
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

	arg := queries.ListElectionSenatorialDistrictStatsByGroupParams{
		ElectionGroupID: groupID,
	}
	if stateID, ok := parseOptionalInt16(r, "state_id"); ok {
		arg.StateID = pgtype.Int2{Int16: stateID, Valid: true}
	}

	stats, err := h.service.ListElectionSenatorialDistrictStatsByGroup(r.Context(), arg)
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

	stats, err := h.service.ListElectionStateStatsByGroup(r.Context(), groupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch stats: "+err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Stats fetched", map[string]interface{}{"stats": stats})
}

package electionresultshandler

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool  *pgxpool.Pool
	utils *utils.Utils
}

func NewHandler(pool *pgxpool.Pool, utils *utils.Utils) *Handler {
	return &Handler{pool: pool, utils: utils}
}

func parsePaginationParams(r *http.Request) (int, int64) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 200 {
				limit = 200
			} else {
				limit = l
			}
		}
	}
	cursor := int64(math.MaxInt32)
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil && c > 0 {
			cursor = c
		}
	}
	return limit, cursor
}

func parseQueryInt64(r *http.Request, key string) (int64, bool) {
	val := r.URL.Query().Get(key)
	if val == "" {
		return 0, false
	}
	v, err := strconv.ParseInt(val, 10, 64)
	return v, err == nil
}

// GetStatesWithResults returns all Nigerian states with their state_final_result for the given election_id.
// @Summary Get states with results
// @Description Returns all Nigerian states with their state_final_result for the given election_id.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/states [get]
func (h *Handler) GetStatesWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	rows, err := h.pool.Query(r.Context(), `
		SELECT
			s.id,
			s.name,
			fr.id                 AS fr_id,
			fr.election_id        AS fr_election_id,
			fr.state_id           AS fr_state_id,
			fr.accredited_voters,
			fr.votes_cast,
			fr.valid_votes,
			fr.rejected_votes,
			fr.candidate_results,
			fr.lgas_counted,
			fr.total_lgas,
			fr.created_at,
			fr.updated_at
		FROM c_states s
		LEFT JOIN state_final_result fr ON fr.state_id = s.id AND fr.election_id = $1
		WHERE s.country_id = 161 AND s.id::int < $2
		ORDER BY s.id DESC
		LIMIT $3
	`, electionID, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch states: "+err.Error())
		return
	}
	defer rows.Close()

	type StateFR struct {
		ID               int64            `json:"id"`
		ElectionID       int64            `json:"election_id"`
		StateID          int16            `json:"state_id"`
		AccreditedVoters int32            `json:"accredited_voters"`
		VotesCast        int32            `json:"votes_cast"`
		ValidVotes       int32            `json:"valid_votes"`
		RejectedVotes    int32            `json:"rejected_votes"`
		CandidateResults json.RawMessage  `json:"candidate_results"`
		LgasCounted      int32            `json:"lgas_counted"`
		TotalLgas        int32            `json:"total_lgas"`
		CreatedAt        *time.Time       `json:"created_at"`
		UpdatedAt        *time.Time       `json:"updated_at"`
	}
	type Row struct {
		ID               int16    `json:"id"`
		Name             string   `json:"name"`
		StateFinalResult *StateFR `json:"state_final_result"`
	}

	var results []Row
	var lastID int16
	for rows.Next() {
		var (
			sID   int16
			sName string
			frID, frElectionID *int64
			frStateID          *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults []byte
			frLgasCounted, frTotalLgas *int32
			frCreatedAt, frUpdatedAt   *time.Time
		)
		if err := rows.Scan(
			&sID, &sName,
			&frID, &frElectionID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frLgasCounted, &frTotalLgas,
			&frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = sID
		row := Row{ID: sID, Name: sName}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.StateFinalResult = &StateFR{
				ID: *frID, ElectionID: *frElectionID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr,
				LgasCounted: *frLgasCounted, TotalLgas: *frTotalLgas,
				CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "States with results fetched successfully", map[string]interface{}{
		"states": results,
		"meta":   map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetSenatorialDistrictsWithResults returns senatorial districts for a state with their final result.
// @Summary Get senatorial districts with results
// @Description Returns senatorial districts for a state with their senatorial_district_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param state_id query int true "State ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/senatorial-districts [get]
func (h *Handler) GetSenatorialDistrictsWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	stateID, ok := parseQueryInt64(r, "state_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "state_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	rows, err := h.pool.Query(r.Context(), `
		SELECT
			sd.id, sd.name, sd.state_id, sd.state_name,
			fr.id, fr.election_id, fr.senatorial_district_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM senatorial_districts sd
		LEFT JOIN senatorial_district_final_result fr
			ON fr.senatorial_district_id = sd.id AND fr.election_id = $1
		WHERE sd.state_id = $2 AND sd.id < $3
		ORDER BY sd.id DESC
		LIMIT $4
	`, electionID, stateID, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch senatorial districts: "+err.Error())
		return
	}
	defer rows.Close()

	type SDFR struct {
		ID                   int64           `json:"id"`
		ElectionID           int64           `json:"election_id"`
		SenatorialDistrictID int32           `json:"senatorial_district_id"`
		StateID              int16           `json:"state_id"`
		AccreditedVoters     int32           `json:"accredited_voters"`
		VotesCast            int32           `json:"votes_cast"`
		ValidVotes           int32           `json:"valid_votes"`
		RejectedVotes        int32           `json:"rejected_votes"`
		CandidateResults     json.RawMessage `json:"candidate_results"`
		CreatedAt        *time.Time      `json:"created_at"`
		UpdatedAt        *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                              int32   `json:"id"`
		Name                            string  `json:"name"`
		StateID                         int32   `json:"state_id"`
		StateName                       string  `json:"state_name"`
		SenatorialDistrictFinalResult   *SDFR   `json:"senatorial_district_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			sdID      int32
			sdName    string
			sdStateID int32
			sdStateName string
			frID, frElectionID *int64
			frSDID             *int32
			frStateID          *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&sdID, &sdName, &sdStateID, &sdStateName,
			&frID, &frElectionID, &frSDID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = sdID
		row := Row{ID: sdID, Name: sdName, StateID: sdStateID, StateName: sdStateName}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.SenatorialDistrictFinalResult = &SDFR{
				ID: *frID, ElectionID: *frElectionID,
				SenatorialDistrictID: *frSDID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr, CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Senatorial districts with results fetched successfully", map[string]interface{}{
		"senatorial_districts": results,
		"meta":                 map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetFederalConstituenciesWithResults returns federal constituencies for a senatorial district with their final result.
// @Summary Get federal constituencies with results
// @Description Returns federal constituencies for a senatorial district with their federal_constituency_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param senatorial_district_id query int true "Senatorial District ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/federal-constituencies [get]
func (h *Handler) GetFederalConstituenciesWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	senatorialDistrictID, ok := parseQueryInt64(r, "senatorial_district_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "senatorial_district_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	rows, err := h.pool.Query(r.Context(), `
		SELECT
			fc.id, fc.name, fc.senatorial_district_id, fc.state_id,
			fr.id, fr.election_id, fr.federal_constituency_id, fr.senatorial_district_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM federal_constituencies fc
		LEFT JOIN federal_constituency_final_result fr
			ON fr.federal_constituency_id = fc.id AND fr.election_id = $1
		WHERE fc.senatorial_district_id = $2 AND fc.id < $3
		ORDER BY fc.id DESC
		LIMIT $4
	`, electionID, senatorialDistrictID, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch federal constituencies: "+err.Error())
		return
	}
	defer rows.Close()

	type FCFR struct {
		ID                    int64           `json:"id"`
		ElectionID            int64           `json:"election_id"`
		FederalConstituencyID int32           `json:"federal_constituency_id"`
		SenatorialDistrictID  int32           `json:"senatorial_district_id"`
		StateID               int16           `json:"state_id"`
		AccreditedVoters      int32           `json:"accredited_voters"`
		VotesCast             int32           `json:"votes_cast"`
		ValidVotes            int32           `json:"valid_votes"`
		RejectedVotes         int32           `json:"rejected_votes"`
		CandidateResults      json.RawMessage `json:"candidate_results"`
		CreatedAt        *time.Time      `json:"created_at"`
		UpdatedAt        *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                             int32  `json:"id"`
		Name                           string `json:"name"`
		SenatorialDistrictID           int32  `json:"senatorial_district_id"`
		StateID                        int16  `json:"state_id"`
		FederalConstituencyFinalResult  *FCFR  `json:"federal_constituency_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			fcID      int32
			fcName    string
			fcSDID    int32
			fcStateID int16
			frID, frElectionID *int64
			frFCID, frFCSDID   *int32
			frStateID          *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&fcID, &fcName, &fcSDID, &fcStateID,
			&frID, &frElectionID, &frFCID, &frFCSDID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = fcID
		row := Row{ID: fcID, Name: fcName, SenatorialDistrictID: fcSDID, StateID: fcStateID}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.FederalConstituencyFinalResult = &FCFR{
				ID: *frID, ElectionID: *frElectionID,
				FederalConstituencyID: *frFCID, SenatorialDistrictID: *frFCSDID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr, CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Federal constituencies with results fetched successfully", map[string]interface{}{
		"federal_constituencies": results,
		"meta":                   map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetLGAsWithResults returns LGAs for a federal constituency with their lga_final_result.
// @Summary Get LGAs with results
// @Description Returns LGAs for a federal constituency with their lga_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param federal_constituency_id query int true "Federal Constituency ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/lgas [get]
func (h *Handler) GetLGAsWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	federalConstituencyID, ok := parseQueryInt64(r, "federal_constituency_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "federal_constituency_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	rows, err := h.pool.Query(r.Context(), `
		SELECT
			l.id, l.name, l.state_id, l.federal_constituency_id,
			fr.id, fr.election_id, fr.lga_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM lgas l
		LEFT JOIN lga_final_result fr ON fr.lga_id = l.id AND fr.election_id = $1
		WHERE l.federal_constituency_id = $2 AND l.id < $3
		ORDER BY l.id DESC
		LIMIT $4
	`, electionID, federalConstituencyID, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch LGAs: "+err.Error())
		return
	}
	defer rows.Close()

	type LGAFR struct {
		ID               int64           `json:"id"`
		ElectionID       int64           `json:"election_id"`
		LgaID            int32           `json:"lga_id"`
		StateID          int16           `json:"state_id"`
		AccreditedVoters int32           `json:"accredited_voters"`
		VotesCast        int32           `json:"votes_cast"`
		ValidVotes       int32           `json:"valid_votes"`
		RejectedVotes    int32           `json:"rejected_votes"`
		CandidateResults json.RawMessage `json:"candidate_results"`
		CreatedAt        *time.Time      `json:"created_at"`
		UpdatedAt        *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                    int32   `json:"id"`
		Name                  string  `json:"name"`
		StateID               int16   `json:"state_id"`
		FederalConstituencyID int32   `json:"federal_constituency_id"`
		LgaFinalResult        *LGAFR  `json:"lga_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			lID      int32
			lName    string
			lStateID int16
			lFCID    int32
			frID, frElectionID *int64
			frLgaID            *int32
			frStateID          *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&lID, &lName, &lStateID, &lFCID,
			&frID, &frElectionID, &frLgaID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = lID
		row := Row{ID: lID, Name: lName, StateID: lStateID, FederalConstituencyID: lFCID}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.LgaFinalResult = &LGAFR{
				ID: *frID, ElectionID: *frElectionID,
				LgaID: *frLgaID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr, CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "LGAs with results fetched successfully", map[string]interface{}{
		"lgas": results,
		"meta": map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetWardsWithResults returns wards for a given LGA or state_assembly_constituency with their ward_final_result.
// @Summary Get wards with results
// @Description Returns wards for a given LGA or state_assembly_constituency with their ward_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param lga_id query int false "LGA ID"
// @Param state_assembly_constituency_id query int false "State Assembly Constituency ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/wards [get]
func (h *Handler) GetWardsWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	lgaID, hasLGA := parseQueryInt64(r, "lga_id")
	stateConstID, hasStateCons := parseQueryInt64(r, "state_assembly_constituency_id")
	if !hasLGA && !hasStateCons {
		h.utils.RespondError(w, http.StatusBadRequest, "lga_id or state_assembly_constituency_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	var filterCol string
	var filterVal int64
	if hasLGA {
		filterCol = "w.lga_id"
		filterVal = lgaID
	} else {
		filterCol = "w.state_assembly_constituency_id"
		filterVal = stateConstID
	}

	query := `
		SELECT
			w.id, w.name, w.lga_id, w.state_id, w.state_assembly_constituency_id,
			fr.id, fr.election_id, fr.ward_id, fr.lga_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM wards w
		LEFT JOIN ward_final_result fr ON fr.ward_id = w.id AND fr.election_id = $1
		WHERE ` + filterCol + ` = $2 AND w.id < $3
		ORDER BY w.id DESC
		LIMIT $4`

	rows, err := h.pool.Query(r.Context(), query, electionID, filterVal, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch wards: "+err.Error())
		return
	}
	defer rows.Close()

	type WardFR struct {
		ID               int64           `json:"id"`
		ElectionID       int64           `json:"election_id"`
		WardID           int32           `json:"ward_id"`
		LgaID            int32           `json:"lga_id"`
		StateID          int16           `json:"state_id"`
		AccreditedVoters int32           `json:"accredited_voters"`
		VotesCast        int32           `json:"votes_cast"`
		ValidVotes       int32           `json:"valid_votes"`
		RejectedVotes    int32           `json:"rejected_votes"`
		CandidateResults json.RawMessage `json:"candidate_results"`
		CreatedAt        *time.Time      `json:"created_at"`
		UpdatedAt        *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                            int32   `json:"id"`
		Name                          string  `json:"name"`
		LgaID                         *int32  `json:"lga_id"`
		StateID                       int16   `json:"state_id"`
		StateAssemblyConstituencyID   *int32  `json:"state_assembly_constituency_id"`
		WardFinalResult               *WardFR `json:"ward_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			wID      int32
			wName    string
			wLgaID   *int32
			wStateID int16
			wSACID   *int32
			frID, frElectionID      *int64
			frWardID, frLgaID       *int32
			frStateID               *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&wID, &wName, &wLgaID, &wStateID, &wSACID,
			&frID, &frElectionID, &frWardID, &frLgaID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = wID
		row := Row{ID: wID, Name: wName, LgaID: wLgaID, StateID: wStateID, StateAssemblyConstituencyID: wSACID}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.WardFinalResult = &WardFR{
				ID: *frID, ElectionID: *frElectionID,
				WardID: *frWardID, LgaID: *frLgaID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr, CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Wards with results fetched successfully", map[string]interface{}{
		"wards": results,
		"meta":  map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetPollingUnitsWithResults returns polling units for a ward with their polling_unit_final_result.
// @Summary Get polling units with results
// @Description Returns polling units for a ward with their polling_unit_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param ward_id query int true "Ward ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/polling-units [get]
func (h *Handler) GetPollingUnitsWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}
	wardID, ok := parseQueryInt64(r, "ward_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "ward_id is required")
		return
	}
	limit, cursor := parsePaginationParams(r)

	rows, err := h.pool.Query(r.Context(), `
		SELECT
			pu.id, pu.name, pu.ward_id, pu.lga_id, pu.state_id,
			fr.id, fr.election_id, fr.polling_unit_id, fr.ward_id, fr.lga_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM polling_units pu
		LEFT JOIN polling_unit_final_results fr ON fr.polling_unit_id = pu.id AND fr.election_id = $1
		WHERE pu.ward_id = $2 AND pu.id < $3
		ORDER BY pu.id DESC
		LIMIT $4
	`, electionID, wardID, cursor, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch polling units: "+err.Error())
		return
	}
	defer rows.Close()

	type PUFR struct {
		ID               int64           `json:"id"`
		ElectionID       int64           `json:"election_id"`
		PollingUnitID    int32           `json:"polling_unit_id"`
		WardID           int32           `json:"ward_id"`
		LgaID            *int32          `json:"lga_id"`
		StateID          *int16          `json:"state_id"`
		AccreditedVoters int32           `json:"accredited_voters"`
		VotesCast        int32           `json:"votes_cast"`
		ValidVotes       int32           `json:"valid_votes"`
		RejectedVotes    int32           `json:"rejected_votes"`
		CandidateResults json.RawMessage `json:"candidate_results"`
		CreatedAt        *time.Time      `json:"created_at"`
		UpdatedAt        *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                     int32  `json:"id"`
		Name                   string `json:"name"`
		WardID                 int32  `json:"ward_id"`
		LgaID                  *int32 `json:"lga_id"`
		StateID                *int16 `json:"state_id"`
		PollingUnitFinalResult *PUFR  `json:"polling_unit_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			puID      int32
			puName    string
			puWardID  int32
			puLgaID   *int32
			puStateID *int16
			frID, frElectionID   *int64
			frPUID, frWardID     *int32
			frLgaID              *int32
			frStateID            *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&puID, &puName, &puWardID, &puLgaID, &puStateID,
			&frID, &frElectionID, &frPUID, &frWardID, &frLgaID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = puID
		row := Row{ID: puID, Name: puName, WardID: puWardID, LgaID: puLgaID, StateID: puStateID}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.PollingUnitFinalResult = &PUFR{
				ID: *frID, ElectionID: *frElectionID,
				PollingUnitID: *frPUID, WardID: *frWardID, LgaID: frLgaID, StateID: frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr, CreatedAt: frCreatedAt, UpdatedAt: frUpdatedAt,
			}
		}
		results = append(results, row)
	}
	if rows.Err() != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "rows error: "+rows.Err().Error())
		return
	}
	if results == nil {
		results = []Row{}
	}
	hasMore := len(results) == limit
	nextCursor := ""
	if hasMore {
		nextCursor = strconv.FormatInt(int64(lastID), 10)
	}
	h.utils.RespondSuccess(w, http.StatusOK, "Polling units with results fetched successfully", map[string]interface{}{
		"polling_units": results,
		"meta":          map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

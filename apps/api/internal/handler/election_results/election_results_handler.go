package electionresultshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
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

func parseAnyInt64(r *http.Request, keys ...string) (int64, bool) {
	for _, key := range keys {
		if val := r.URL.Query().Get(key); val != "" {
			if v, err := strconv.ParseInt(val, 10, 64); err == nil && v > 0 {
				return v, true
			}
		}
		if val := chi.URLParam(r, key); val != "" {
			if v, err := strconv.ParseInt(val, 10, 64); err == nil && v > 0 {
				return v, true
			}
		}
	}
	return 0, false
}

// GetStatesWithResults returns all Nigerian states with their election_state_final_result for the given election_id.
// @Summary Get states with results
// @Description Returns all Nigerian states with their election_state_final_result for the given election_id.
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
			fr.senatorial_districts_counted,
			fr.total_senatorial_districts,
			fr.created_at,
			fr.updated_at
		FROM c_states s
		LEFT JOIN election_state_final_result fr ON fr.state_id = s.id AND fr.election_id = $1
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
		ID                         int64            `json:"id"`
		ElectionID                 int64            `json:"election_id"`
		StateID                    int16            `json:"state_id"`
		AccreditedVoters           int32            `json:"accredited_voters"`
		VotesCast                  int32            `json:"votes_cast"`
		ValidVotes                 int32            `json:"valid_votes"`
		RejectedVotes              int32            `json:"rejected_votes"`
		CandidateResults           json.RawMessage  `json:"candidate_results"`
		SenatorialDistrictsCounted int32            `json:"senatorial_districts_counted"`
		TotalSenatorialDistricts   int32            `json:"total_senatorial_districts"`
		CreatedAt                  *time.Time       `json:"created_at"`
		UpdatedAt                  *time.Time       `json:"updated_at"`
	}
	type Row struct {
		ID               int16    `json:"id"`
		Name             string   `json:"name"`
		ElectionStateFinalResult *StateFR `json:"election_state_final_result"`
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
			frSDCounted, frTotalSD *int32
			frCreatedAt, frUpdatedAt   *time.Time
		)
		if err := rows.Scan(
			&sID, &sName,
			&frID, &frElectionID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frSDCounted, &frTotalSD,
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
			row.ElectionStateFinalResult = &StateFR{
				ID: *frID, ElectionID: *frElectionID, StateID: *frStateID,
				AccreditedVoters: *frAccredited, VotesCast: *frVotesCast,
				ValidVotes: *frValidVotes, RejectedVotes: *frRejectedVotes,
				CandidateResults: cr,
				SenatorialDistrictsCounted: *frSDCounted, TotalSenatorialDistricts: *frTotalSD,
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
// @Description Returns senatorial districts for a state with their election_senatorial_district_final_result.
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
		LEFT JOIN election_senatorial_district_final_result fr
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
		ElectionSenatorialDistrictFinalResult   *SDFR   `json:"election_senatorial_district_final_result"`
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
			row.ElectionSenatorialDistrictFinalResult = &SDFR{
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
// @Description Returns federal constituencies for a senatorial district with their election_federal_constituency_final_result.
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
		LEFT JOIN election_federal_constituency_final_result fr
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
		ElectionFederalConstituencyFinalResult  *FCFR  `json:"election_federal_constituency_final_result"`
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
			row.ElectionFederalConstituencyFinalResult = &FCFR{
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

// GetStateConstituenciesWithResults returns state assembly constituencies with their election_state_constituency_final_result.
// @Summary Get state constituencies with results
// @Description Returns state assembly constituencies with their election_state_constituency_final_result.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param state_id query int false "State ID"
// @Param federal_constituency_id query int false "Federal Constituency ID"
// @Param senatorial_district_id query int false "Senatorial District ID"
// @Param lga_id query int false "LGA ID"
// @Param limit query int false "Limit"
// @Param cursor query int false "Cursor"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/state-constituencies [get]
func (h *Handler) GetStateConstituenciesWithResults(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseQueryInt64(r, "election_id")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}

	stateID, hasState := parseQueryInt64(r, "state_id")
	fedConstID, hasFedConst := parseQueryInt64(r, "federal_constituency_id")
	senatorialID, hasSenatorial := parseQueryInt64(r, "senatorial_district_id")
	lgaID, hasLGA := parseQueryInt64(r, "lga_id")

	if !hasState && !hasFedConst && !hasSenatorial && !hasLGA {
		h.utils.RespondError(w, http.StatusBadRequest, "state_id, federal_constituency_id, senatorial_district_id, or lga_id is required")
		return
	}

	limit, cursor := parsePaginationParams(r)

	var filterClauses []string
	var args []interface{}
	args = append(args, electionID) // $1

	if hasState {
		args = append(args, stateID)
		filterClauses = append(filterClauses, fmt.Sprintf("sc.state_id = $%d", len(args)))
	}
	if hasFedConst {
		args = append(args, fedConstID)
		filterClauses = append(filterClauses, fmt.Sprintf("sc.federal_constituency_id = $%d", len(args)))
	}
	if hasSenatorial {
		args = append(args, senatorialID)
		filterClauses = append(filterClauses, fmt.Sprintf("sc.senatorial_district_id = $%d", len(args)))
	}
	if hasLGA {
		args = append(args, lgaID)
		filterClauses = append(filterClauses, fmt.Sprintf("sc.lga_id = $%d", len(args)))
	}

	args = append(args, cursor)
	cursorParam := len(args)
	args = append(args, limit)
	limitParam := len(args)

	whereSQL := strings.Join(filterClauses, " AND ")

	query := fmt.Sprintf(`
		SELECT
			sc.id, sc.name, sc.code, sc.lga_id, sc.lga_name, sc.state_id, sc.state_name,
			sc.senatorial_district_id, sc.federal_constituency_id,
			fr.id, fr.election_id, fr.state_constituency_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.wards_counted, fr.total_wards, fr.created_at, fr.updated_at
		FROM state_constituencies sc
		LEFT JOIN election_state_constituency_final_result fr
			ON fr.state_constituency_id = sc.id AND fr.election_id = $1
		WHERE %s AND sc.id < $%d
		ORDER BY sc.id DESC
		LIMIT $%d
	`, whereSQL, cursorParam, limitParam)

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch state constituencies: "+err.Error())
		return
	}
	defer rows.Close()

	type SCFR struct {
		ID                  int64           `json:"id"`
		ElectionID          int64           `json:"election_id"`
		StateConstituencyID int32           `json:"state_constituency_id"`
		StateID             *int16          `json:"state_id"`
		AccreditedVoters    int32           `json:"accredited_voters"`
		VotesCast           int32           `json:"votes_cast"`
		ValidVotes          int32           `json:"valid_votes"`
		RejectedVotes       int32           `json:"rejected_votes"`
		CandidateResults    json.RawMessage `json:"candidate_results"`
		WardsCounted        int32           `json:"wards_counted"`
		TotalWards          int32           `json:"total_wards"`
		CreatedAt           *time.Time      `json:"created_at"`
		UpdatedAt           *time.Time      `json:"updated_at"`
	}
	type Row struct {
		ID                                   int32   `json:"id"`
		Name                                 string  `json:"name"`
		Code                                 string  `json:"code"`
		LgaID                                int32   `json:"lga_id"`
		LgaName                              string  `json:"lga_name"`
		StateID                              int32   `json:"state_id"`
		StateName                            string  `json:"state_name"`
		SenatorialDistrictID                 *int32  `json:"senatorial_district_id,omitempty"`
		FederalConstituencyID                *int32  `json:"federal_constituency_id,omitempty"`
		ElectionStateConstituencyFinalResult *SCFR   `json:"election_state_constituency_final_result"`
	}

	var results []Row
	var lastID int32
	for rows.Next() {
		var (
			scID        int32
			scName      string
			scCode      *string
			scLgaID     int32
			scLgaName   string
			scStateID   int32
			scStateName string
			scSDID      *int32
			scFCID      *int32
			frID, frElectionID *int64
			frSCID             *int32
			frStateID          *int16
			frAccredited, frVotesCast, frValidVotes, frRejectedVotes *int32
			frCandidateResults                                         []byte
			frWardsCounted, frTotalWards                               *int32
			frCreatedAt, frUpdatedAt                                   *time.Time
		)
		if err := rows.Scan(
			&scID, &scName, &scCode, &scLgaID, &scLgaName, &scStateID, &scStateName,
			&scSDID, &scFCID,
			&frID, &frElectionID, &frSCID, &frStateID,
			&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
			&frCandidateResults, &frWardsCounted, &frTotalWards, &frCreatedAt, &frUpdatedAt,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}
		lastID = scID
		codeStr := ""
		if scCode != nil {
			codeStr = *scCode
		}
		row := Row{
			ID:                   scID,
			Name:                 scName,
			Code:                 codeStr,
			LgaID:                scLgaID,
			LgaName:              scLgaName,
			StateID:              scStateID,
			StateName:            scStateName,
			SenatorialDistrictID: scSDID,
			FederalConstituencyID: scFCID,
		}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			wc := int32(0)
			if frWardsCounted != nil {
				wc = *frWardsCounted
			}
			tw := int32(0)
			if frTotalWards != nil {
				tw = *frTotalWards
			}
			row.ElectionStateConstituencyFinalResult = &SCFR{
				ID:                  *frID,
				ElectionID:          *frElectionID,
				StateConstituencyID: *frSCID,
				StateID:             frStateID,
				AccreditedVoters:    *frAccredited,
				VotesCast:           *frVotesCast,
				ValidVotes:          *frValidVotes,
				RejectedVotes:       *frRejectedVotes,
				CandidateResults:    cr,
				WardsCounted:        wc,
				TotalWards:          tw,
				CreatedAt:           frCreatedAt,
				UpdatedAt:           frUpdatedAt,
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
	h.utils.RespondSuccess(w, http.StatusOK, "State constituencies with results fetched successfully", map[string]interface{}{
		"state_constituencies": results,
		"meta":                 map[string]interface{}{"has_more": hasMore, "next_cursor": nextCursor},
	})
}

// GetLGAsWithResults returns LGAs for a federal constituency with their election_lga_final_result.
// @Summary Get LGAs with results
// @Description Returns LGAs for a federal constituency with their election_lga_final_result.
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
		LEFT JOIN election_lga_final_result fr ON fr.lga_id = l.id AND fr.election_id = $1
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
		ElectionLgaFinalResult        *LGAFR  `json:"election_lga_final_result"`
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
			row.ElectionLgaFinalResult = &LGAFR{
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

// GetWardsWithResults returns wards for a given LGA or state_assembly_constituency with their election_ward_final_result.
// @Summary Get wards with results
// @Description Returns wards for a given LGA or state_assembly_constituency with their election_ward_final_result.
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
		filterCol = "w.state_constituency_id"
		filterVal = stateConstID
	}

	query := `
		SELECT
			w.id, w.name, w.lga_id, w.state_id, w.state_constituency_id,
			fr.id, fr.election_id, fr.ward_id, fr.lga_id, fr.state_id,
			fr.accredited_voters, fr.votes_cast, fr.valid_votes, fr.rejected_votes,
			fr.candidate_results, fr.created_at, fr.updated_at
		FROM wards w
		LEFT JOIN election_ward_final_result fr ON fr.ward_id = w.id AND fr.election_id = $1
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
		StateConstituencyID   *int32  `json:"state_constituency_id"`
		ElectionWardFinalResult               *WardFR `json:"election_ward_final_result"`
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
		row := Row{ID: wID, Name: wName, LgaID: wLgaID, StateID: wStateID, StateConstituencyID: wSACID}
		if frID != nil {
			cr := json.RawMessage("[]")
			if frCandidateResults != nil {
				cr = json.RawMessage(frCandidateResults)
			}
			row.ElectionWardFinalResult = &WardFR{
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
		LEFT JOIN election_polling_unit_final_results fr ON fr.polling_unit_id = pu.id AND fr.election_id = $1
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
		ElectionPollingUnitFinalResult *PUFR  `json:"polling_unit_final_result"`
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
			row.ElectionPollingUnitFinalResult = &PUFR{
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

// GetElectionFinalResult returns a single final result record for the provided scope.
// @Summary Get scoped final result
// @Description Returns the specific final result for the provided scope parameters.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
type CandidateDetail struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type PartyDetail struct {
	ID           int16  `json:"id"`
	ShortName    string `json:"short_name"`
	Name         string `json:"name"`
	Logo         string `json:"logo"`
	ColorHex     string `json:"color_hex,omitempty"`
	DarkColorHex string `json:"dark_color_hex,omitempty"`
}

func (h *Handler) loadPartyAndCandidateMetadata(ctx context.Context, electionID int64) (map[string]PartyDetail, []PartyDetail, map[string]CandidateDetail, []string) {
	partiesMap := make(map[string]PartyDetail)
	var allParties []PartyDetail

	pRows, err := h.pool.Query(ctx, "SELECT id, short_name, name, COALESCE(logo, ''), COALESCE(color_hex, ''), COALESCE(dark_color_hex, '') FROM parties WHERE status = 'active' ORDER BY display_order ASC, id ASC")
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var p PartyDetail
			if err := pRows.Scan(&p.ID, &p.ShortName, &p.Name, &p.Logo, &p.ColorHex, &p.DarkColorHex); err == nil {
				partiesMap[strings.ToUpper(strings.TrimSpace(p.ShortName))] = p
				allParties = append(allParties, p)
			}
		}
	}

	candidatesMap := make(map[string]CandidateDetail)
	cRows, err := h.pool.Query(ctx, `
		SELECT 
			COALESCE(NULLIF(ec.party_short_name, 'N/A'), p.short_name, '') AS party_short_name,
			u.id,
			TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
			COALESCE(u.avatar, '') AS avatar
		FROM election_candidates ec
		JOIN users u ON u.id = ec.candidate_id
		LEFT JOIN parties p ON p.id = ec.party_id
		WHERE ec.election_id = $1
	`, electionID)
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var partyShort string
			var c CandidateDetail
			if err := cRows.Scan(&partyShort, &c.ID, &c.Name, &c.Avatar); err == nil {
				candidatesMap[strings.ToUpper(strings.TrimSpace(partyShort))] = c
			}
		}
	}

	var contestingPartyShortNames []string
	var contestingJSON []byte
	if err := h.pool.QueryRow(ctx, "SELECT contesting_parties FROM elections WHERE id = $1", electionID).Scan(&contestingJSON); err == nil && len(contestingJSON) > 0 {
		var rawList []map[string]interface{}
		if err := json.Unmarshal(contestingJSON, &rawList); err == nil {
			for _, p := range rawList {
				sn, _ := p["party_short_name"].(string)
				if sn == "" {
					sn, _ = p["short_name"].(string)
				}
				cleanSN := strings.TrimSpace(sn)
				if cleanSN != "" {
					contestingPartyShortNames = append(contestingPartyShortNames, cleanSN)
					pUpper := strings.ToUpper(cleanSN)
					if existing, found := partiesMap[pUpper]; !found || existing.Name == "" || existing.Logo == "" {
						var pID int16
						if idVal, ok := p["party_id"].(float64); ok {
							pID = int16(idVal)
						} else if idVal, ok := p["id"].(float64); ok {
							pID = int16(idVal)
						} else if found {
							pID = existing.ID
						}
						pName, _ := p["party_name"].(string)
						if pName == "" {
							pName, _ = p["name"].(string)
						}
						if pName == "" && found {
							pName = existing.Name
						}
						pLogo, _ := p["party_logo"].(string)
						if pLogo == "" {
							pLogo, _ = p["logo"].(string)
						}
						if pLogo == "" && found {
							pLogo = existing.Logo
						}
						pColor, _ := p["color_hex"].(string)
						if pColor == "" && found {
							pColor = existing.ColorHex
						}
						pDarkColor, _ := p["dark_color_hex"].(string)
						if pDarkColor == "" && found {
							pDarkColor = existing.DarkColorHex
						}
						partiesMap[pUpper] = PartyDetail{
							ID:           pID,
							ShortName:    cleanSN,
							Name:         pName,
							Logo:         pLogo,
							ColorHex:     pColor,
							DarkColorHex: pDarkColor,
						}
					}
				}
			}
		}
	}

	if len(contestingPartyShortNames) == 0 {
		for _, p := range allParties {
			contestingPartyShortNames = append(contestingPartyShortNames, p.ShortName)
		}
	}

	return partiesMap, allParties, candidatesMap, contestingPartyShortNames
}

func buildDefaultCandidateResults(
	contestingPartyShortNames []string,
	partiesMap map[string]PartyDetail,
	candidatesMap map[string]CandidateDetail,
) []map[string]interface{} {
	list := make([]map[string]interface{}, 0, len(contestingPartyShortNames))
	seen := make(map[string]bool)

	for _, pShort := range contestingPartyShortNames {
		pUpper := strings.ToUpper(strings.TrimSpace(pShort))
		if pUpper == "" || seen[pUpper] {
			continue
		}
		seen[pUpper] = true

		var candPtr *CandidateDetail
		if cand, ok := candidatesMap[pUpper]; ok {
			candCopy := cand
			candPtr = &candCopy
		}

		var partyPtr *PartyDetail
		var colorHex, darkColorHex string
		if pDetail, ok := partiesMap[pUpper]; ok {
			pCopy := pDetail
			partyPtr = &pCopy
			colorHex = pDetail.ColorHex
			darkColorHex = pDetail.DarkColorHex
		} else {
			partyPtr = &PartyDetail{
				ShortName: pShort,
				Name:      pShort,
			}
		}

		var candName, candAvatar string
		if candPtr != nil && candPtr.Name != "" {
			candName = candPtr.Name
			candAvatar = candPtr.Avatar
			if candAvatar == "" && partyPtr != nil {
				candAvatar = partyPtr.Logo
			}
		} else if partyPtr != nil {
			candName = partyPtr.Name
			candAvatar = partyPtr.Logo
		}

		item := map[string]interface{}{
			"party_short_name":                     pShort,
			"party_name":                           partyPtr.Name,
			"party_logo":                           partyPtr.Logo,
			"candidate_name":                       candName,
			"candidate_avatar":                     candAvatar,
			"color_hex":                            colorHex,
			"dark_color_hex":                       darkColorHex,
			"vote_count":                           0,
			"vote_share":                           0.0,
			"polling_units_winning_count":          0,
			"wards_winning_count":                  0,
			"lgas_winning_count":                   0,
			"state_constituency_winning_count":     0,
			"federal_constituencies_winning_count": 0,
			"senatorial_districts_winning_count":   0,
			"states_winning_count":                 0,
			"candidate":                            candPtr,
			"party":                                partyPtr,
		}
		list = append(list, item)
	}
	return list
}

func enrichCandidateList(
	raw []byte,
	partiesMap map[string]PartyDetail,
	candidatesMap map[string]CandidateDetail,
) []map[string]interface{} {
	if len(raw) == 0 {
		return nil
	}
	var items []map[string]interface{}
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil
	}
	if len(items) == 0 {
		return nil
	}

	for _, item := range items {
		partyShortName, _ := item["party_short_name"].(string)
		pUpper := strings.ToUpper(strings.TrimSpace(partyShortName))

		var candPtr *CandidateDetail
		if cand, ok := candidatesMap[pUpper]; ok {
			candCopy := cand
			candPtr = &candCopy
		}
		item["candidate"] = candPtr

		var partyPtr *PartyDetail
		if pDetail, ok := partiesMap[pUpper]; ok {
			pCopy := pDetail
			partyPtr = &pCopy
			item["color_hex"] = pDetail.ColorHex
			item["dark_color_hex"] = pDetail.DarkColorHex
		} else if partyShortName != "" {
			partyPtr = &PartyDetail{
				ShortName: partyShortName,
				Name:      partyShortName,
			}
		}
		item["party"] = partyPtr

		var candName, candAvatar string
		if candPtr != nil && candPtr.Name != "" {
			candName = candPtr.Name
			candAvatar = candPtr.Avatar
			if candAvatar == "" && partyPtr != nil {
				candAvatar = partyPtr.Logo
			}
		} else if partyPtr != nil {
			candName = partyPtr.Name
			candAvatar = partyPtr.Logo
		}
		item["candidate_name"] = candName
		item["candidate_avatar"] = candAvatar
		if partyPtr != nil {
			item["party_name"] = partyPtr.Name
			item["party_logo"] = partyPtr.Logo
		}
	}
	return items
}

// GetElectionFinalResult returns the final result for a specific scope (Polling Unit, Ward, LGA, State, etc.).
// @Summary Get scoped final result
// @Description Returns the specific final result for the provided scope parameters.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param polling_unit_id query int false "Polling Unit ID"
// @Param ward_id query int false "Ward ID"
// @Param state_constituency_id query int false "State Constituency ID"
// @Param lga_id query int false "LGA ID"
// @Param federal_constituency_id query int false "Federal Constituency ID"
// @Param senatorial_district_id query int false "Senatorial District ID"
// @Param state_id query int false "State ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results [get]
func (h *Handler) GetElectionFinalResult(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseAnyInt64(r, "election_id", "electionId", "election")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}

	puID, _ := parseAnyInt64(r, "polling_unit_id", "polling_unit", "pollingUnitId", "pu_id", "pu")
	wardID, _ := parseAnyInt64(r, "ward_id", "ward", "wardId")
	stateConstID, _ := parseAnyInt64(r, "state_constituency_id", "state_constituency", "stateConstituencyId", "state_assembly_constituency_id")
	lgaID, _ := parseAnyInt64(r, "lga_id", "lga", "lgaId")
	fedConstID, _ := parseAnyInt64(r, "federal_constituency_id", "federal_constituency", "federalConstituencyId", "fed_const_id")
	senatorialID, _ := parseAnyInt64(r, "senatorial_district_id", "senatorial_district", "senatorialDistrictId", "district_id", "district")
	stateID, _ := parseAnyInt64(r, "state_id", "state", "stateId")

	var query string
	var args []interface{}

	if puID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_polling_unit_final_results WHERE election_id = $1 AND polling_unit_id = $2 LIMIT 1"
		args = []interface{}{electionID, puID}
	} else if wardID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_ward_final_result WHERE election_id = $1 AND ward_id = $2 LIMIT 1"
		args = []interface{}{electionID, wardID}
	} else if stateConstID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_state_constituency_final_result WHERE election_id = $1 AND state_constituency_id = $2 LIMIT 1"
		args = []interface{}{electionID, stateConstID}
	} else if lgaID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_lga_final_result WHERE election_id = $1 AND lga_id = $2 LIMIT 1"
		args = []interface{}{electionID, lgaID}
	} else if fedConstID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_federal_constituency_final_result WHERE election_id = $1 AND federal_constituency_id = $2 LIMIT 1"
		args = []interface{}{electionID, fedConstID}
	} else if senatorialID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_senatorial_district_final_result WHERE election_id = $1 AND senatorial_district_id = $2 LIMIT 1"
		args = []interface{}{electionID, senatorialID}
	} else if stateID > 0 {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_state_final_result WHERE election_id = $1 AND state_id = $2 LIMIT 1"
		args = []interface{}{electionID, stateID}
	} else {
		query = "SELECT id, election_id, accredited_voters, votes_cast, valid_votes, rejected_votes, candidate_results, candidate_results_live FROM election_final_result WHERE election_id = $1 LIMIT 1"
		args = []interface{}{electionID}
	}

	partiesMap, _, candidatesMap, contestingPartyShortNames := h.loadPartyAndCandidateMetadata(r.Context(), electionID)

	var (
		frID, frElectionID                                       int64
		frAccredited, frVotesCast, frValidVotes, frRejectedVotes int32
		cr, crl                                                  []byte
	)

	err := h.pool.QueryRow(r.Context(), query, args...).Scan(
		&frID, &frElectionID,
		&frAccredited, &frVotesCast, &frValidVotes, &frRejectedVotes,
		&cr, &crl,
	)

	if err != nil {
		// No result found in DB for this scope: populate 0-vote entries for all contesting parties
		defaultList := buildDefaultCandidateResults(contestingPartyShortNames, partiesMap, candidatesMap)
		h.utils.RespondSuccess(w, http.StatusOK, "Final result fetched successfully", map[string]interface{}{
			"final_result": map[string]interface{}{
				"id":                     0,
				"election_id":            electionID,
				"accredited_voters":      0,
				"votes_cast":             0,
				"valid_votes":            0,
				"rejected_votes":         0,
				"candidate_results":      defaultList,
				"candidate_results_live": defaultList,
			},
		})
		return
	}

	enrichedCR := enrichCandidateList(cr, partiesMap, candidatesMap)
	enrichedCRL := enrichCandidateList(crl, partiesMap, candidatesMap)

	// Populate candidate_results with 0-vote contesting/active parties if empty
	if len(enrichedCR) == 0 {
		enrichedCR = buildDefaultCandidateResults(contestingPartyShortNames, partiesMap, candidatesMap)
	}
	// Populate candidate_results_live with 0-vote contesting/active parties if empty
	if len(enrichedCRL) == 0 {
		enrichedCRL = buildDefaultCandidateResults(contestingPartyShortNames, partiesMap, candidatesMap)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Final result fetched successfully", map[string]interface{}{
		"final_result": map[string]interface{}{
			"id":                     frID,
			"election_id":            frElectionID,
			"accredited_voters":      frAccredited,
			"votes_cast":             frVotesCast,
			"valid_votes":            frValidVotes,
			"rejected_votes":         frRejectedVotes,
			"candidate_results":      enrichedCR,
			"candidate_results_live": enrichedCRL,
		},
	})
}

func finalizeCandidateResults(
	raw []byte,
	validVotes int32,
	partiesMap map[string]PartyDetail,
	candidatesMap map[string]CandidateDetail,
	contestingPartyShortNames []string,
) []map[string]interface{} {
	enriched := enrichCandidateList(raw, partiesMap, candidatesMap)
	if len(enriched) == 0 {
		enriched = buildDefaultCandidateResults(contestingPartyShortNames, partiesMap, candidatesMap)
	}

	totalVotes := float64(validVotes)
	if totalVotes <= 0 {
		for _, item := range enriched {
			if v, ok := item["vote_count"].(float64); ok {
				totalVotes += v
			} else if v, ok := item["vote_count"].(int64); ok {
				totalVotes += float64(v)
			} else if v, ok := item["votes"].(float64); ok {
				totalVotes += v
			} else if v, ok := item["votes"].(int64); ok {
				totalVotes += float64(v)
			}
		}
	}

	for _, item := range enriched {
		var vc float64
		if v, ok := item["vote_count"].(float64); ok {
			vc = v
		} else if v, ok := item["vote_count"].(int64); ok {
			vc = float64(v)
		} else if v, ok := item["votes"].(float64); ok {
			vc = v
		} else if v, ok := item["votes"].(int64); ok {
			vc = float64(v)
		}
		item["vote_count"] = int64(vc)
		item["votes"] = int64(vc)
		if totalVotes > 0 {
			item["percentage"] = math.Round((vc/totalVotes)*1000) / 10
		} else {
			item["percentage"] = 0.0
		}
	}

	// Sort descending by vote_count
	sort.SliceStable(enriched, func(i, j int) bool {
		vI, _ := enriched[i]["vote_count"].(int64)
		vJ, _ := enriched[j]["vote_count"].(int64)
		return vI > vJ
	})

	return enriched
}

// GetElectoralUnitsBreakdown returns child electoral units with results based on scope.
// @Summary Get electoral units results breakdown
// @Description Returns a collection of child electoral units (states, LGAs, wards, polling units) joined with results for a given scope.
// @Tags ElectionResults
// @Accept json
// @Produce json
// @Param election_id query int true "Election ID"
// @Param state_id query int false "State ID"
// @Param senatorial_district_id query int false "Senatorial District ID"
// @Param federal_constituency_id query int false "Federal Constituency ID"
// @Param state_constituency_id query int false "State Constituency ID"
// @Param lga_id query int false "LGA ID"
// @Param ward_id query int false "Ward ID"
// @Param unit_type query string false "Override child unit type (e.g. 'lgas')"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /elections/results/breakdown [get]
func (h *Handler) GetElectoralUnitsBreakdown(w http.ResponseWriter, r *http.Request) {
	electionID, ok := parseAnyInt64(r, "election_id", "electionId", "election")
	if !ok {
		h.utils.RespondError(w, http.StatusBadRequest, "election_id is required")
		return
	}

	puID, _ := parseAnyInt64(r, "polling_unit_id", "polling_unit", "pollingUnitId", "pu_id", "pu")
	wardID, _ := parseAnyInt64(r, "ward_id", "ward", "wardId")
	stateConstID, _ := parseAnyInt64(r, "state_constituency_id", "state_constituency", "stateConstituencyId", "state_assembly_constituency_id")
	lgaID, _ := parseAnyInt64(r, "lga_id", "lga", "lgaId")
	fedConstID, _ := parseAnyInt64(r, "federal_constituency_id", "federal_constituency", "federalConstituencyId", "fed_const_id")
	senatorialID, _ := parseAnyInt64(r, "senatorial_district_id", "senatorial_district", "senatorialDistrictId", "district_id", "district")
	stateID, _ := parseAnyInt64(r, "state_id", "state", "stateId")
	requestedUnitType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("unit_type")))

	var (
		query     string
		args      []interface{}
		unitTitle string
		unitType  string
	)

	if puID > 0 {
		unitTitle = "Polling Units"
		unitType = "polling_units"
		query = `
			SELECT
				pu.id, pu.name, COALESCE(NULLIF(pu.pu_code, ''), pu.code, '') AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				0 AS sub_units_counted,
				0 AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM polling_units pu
			LEFT JOIN election_polling_unit_final_results fr
				ON fr.polling_unit_id = pu.id AND fr.election_id = $1
			WHERE pu.id = $2
			ORDER BY pu.id ASC`
		args = []interface{}{electionID, puID}
	} else if wardID > 0 {
		unitTitle = "Polling Units"
		unitType = "polling_units"
		query = `
			SELECT
				pu.id, pu.name, COALESCE(NULLIF(pu.pu_code, ''), pu.code, '') AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				0 AS sub_units_counted,
				0 AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM polling_units pu
			LEFT JOIN election_polling_unit_final_results fr
				ON fr.polling_unit_id = pu.id AND fr.election_id = $1
			WHERE pu.ward_id = $2
			ORDER BY pu.id ASC`
		args = []interface{}{electionID, wardID}
	} else if stateConstID > 0 && lgaID == 0 {
		unitTitle = "Wards"
		unitType = "wards"
		query = `
			SELECT
				w.id, w.name, '' AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				COALESCE(fr.polling_units_counted, 0) AS sub_units_counted,
				COALESCE(fr.total_polling_units, 0) AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM wards w
			LEFT JOIN election_ward_final_result fr
				ON fr.ward_id = w.id AND fr.election_id = $1
			WHERE w.state_constituency_id = $2
			ORDER BY w.id ASC`
		args = []interface{}{electionID, stateConstID}
	} else if lgaID > 0 {
		unitTitle = "Wards"
		unitType = "wards"
		query = `
			SELECT
				w.id, w.name, '' AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				COALESCE(fr.polling_units_counted, 0) AS sub_units_counted,
				COALESCE(fr.total_polling_units, 0) AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM wards w
			LEFT JOIN election_ward_final_result fr
				ON fr.ward_id = w.id AND fr.election_id = $1
			WHERE w.lga_id = $2
			ORDER BY w.id ASC`
		args = []interface{}{electionID, lgaID}
	} else if fedConstID > 0 {
		unitTitle = "LGAs"
		unitType = "lgas"
		query = `
			SELECT
				l.id, l.name, '' AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				COALESCE(fr.wards_counted, 0) AS sub_units_counted,
				COALESCE(fr.total_wards, 0) AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM lgas l
			LEFT JOIN election_lga_final_result fr
				ON fr.lga_id = l.id AND fr.election_id = $1
			WHERE l.federal_constituency_id = $2
			ORDER BY l.id ASC`
		args = []interface{}{electionID, fedConstID}
	} else if senatorialID > 0 {
		unitTitle = "Federal Constituencies"
		unitType = "federal_constituencies"
		query = `
			SELECT
				fc.id, fc.name, '' AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				COALESCE(fr.lgas_counted, 0) AS sub_units_counted,
				COALESCE(fr.total_lgas, 0) AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM federal_constituencies fc
			LEFT JOIN election_federal_constituency_final_result fr
				ON fr.federal_constituency_id = fc.id AND fr.election_id = $1
			WHERE fc.senatorial_district_id = $2
			ORDER BY fc.id ASC`
		args = []interface{}{electionID, senatorialID}
	} else if stateID > 0 {
		if requestedUnitType == "lgas" {
			unitTitle = "LGAs"
			unitType = "lgas"
			query = `
				SELECT
					l.id, l.name, '' AS code,
					COALESCE(fr.accredited_voters, 0),
					COALESCE(fr.votes_cast, 0),
					COALESCE(fr.valid_votes, 0),
					COALESCE(fr.rejected_votes, 0),
					COALESCE(fr.wards_counted, 0) AS sub_units_counted,
					COALESCE(fr.total_wards, 0) AS total_sub_units,
					COALESCE(fr.candidate_results, '[]'::jsonb),
					COALESCE(fr.candidate_results_live, '[]'::jsonb)
				FROM lgas l
				LEFT JOIN election_lga_final_result fr
					ON fr.lga_id = l.id AND fr.election_id = $1
				WHERE l.state_id = $2
				ORDER BY l.id ASC`
			args = []interface{}{electionID, stateID}
		} else {
			unitTitle = "Senatorial Districts"
			unitType = "senatorial_districts"
			query = `
				SELECT
					sd.id, sd.name, '' AS code,
					COALESCE(fr.accredited_voters, 0),
					COALESCE(fr.votes_cast, 0),
					COALESCE(fr.valid_votes, 0),
					COALESCE(fr.rejected_votes, 0),
					COALESCE(fr.lgas_counted, 0) AS sub_units_counted,
					COALESCE(fr.total_lgas, 0) AS total_sub_units,
					COALESCE(fr.candidate_results, '[]'::jsonb),
					COALESCE(fr.candidate_results_live, '[]'::jsonb)
				FROM senatorial_districts sd
				LEFT JOIN election_senatorial_district_final_result fr
					ON fr.senatorial_district_id = sd.id AND fr.election_id = $1
				WHERE sd.state_id = $2
				ORDER BY sd.id ASC`
			args = []interface{}{electionID, stateID}
		}
	} else {
		// Nationwide: return all 36 Nigerian states + FCT
		unitTitle = "States"
		unitType = "states"
		query = `
			SELECT
				s.id, s.name, '' AS code,
				COALESCE(fr.accredited_voters, 0),
				COALESCE(fr.votes_cast, 0),
				COALESCE(fr.valid_votes, 0),
				COALESCE(fr.rejected_votes, 0),
				COALESCE(fr.senatorial_districts_counted, 0) AS sub_units_counted,
				COALESCE(NULLIF(fr.total_senatorial_districts, 0), (SELECT count(*)::int FROM senatorial_districts sd WHERE sd.state_id = s.id), 3) AS total_sub_units,
				COALESCE(fr.candidate_results, '[]'::jsonb),
				COALESCE(fr.candidate_results_live, '[]'::jsonb)
			FROM c_states s
			LEFT JOIN election_state_final_result fr
				ON fr.state_id = s.id AND fr.election_id = $1
			WHERE s.country_id = 161
			ORDER BY s.name ASC`
		args = []interface{}{electionID}
	}

	partiesMap, _, candidatesMap, contestingPartyShortNames := h.loadPartyAndCandidateMetadata(r.Context(), electionID)

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query electoral units: "+err.Error())
		return
	}
	defer rows.Close()

	var units []map[string]interface{}
	for rows.Next() {
		var (
			uID                                              int64
			uName                                            string
			uCode                                            string
			accredited, votesCast, validVotes, rejectedVotes int32
			subCounted, totalSub                             int32
			crBytes, crlBytes                                []byte
		)
		if err := rows.Scan(
			&uID, &uName, &uCode,
			&accredited, &votesCast, &validVotes, &rejectedVotes,
			&subCounted, &totalSub,
			&crBytes, &crlBytes,
		); err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "scan error: "+err.Error())
			return
		}

		crEnriched := finalizeCandidateResults(crBytes, validVotes, partiesMap, candidatesMap, contestingPartyShortNames)
		crlEnriched := finalizeCandidateResults(crlBytes, validVotes, partiesMap, candidatesMap, contestingPartyShortNames)

		var leadingName, leadingAvatar, leadingParty, leadingPartyColor, leadingPartyDarkColor string
		var leadingVotes int64
		var leadingPercentage float64

		if len(crEnriched) > 0 {
			first := crEnriched[0]
			leadingParty, _ = first["party_short_name"].(string)
			leadingVotes, _ = first["vote_count"].(int64)
			leadingPercentage, _ = first["percentage"].(float64)
			leadingPartyColor, _ = first["color_hex"].(string)
			leadingPartyDarkColor, _ = first["dark_color_hex"].(string)

			if cand, ok := first["candidate"].(*CandidateDetail); ok && cand != nil && cand.Name != "" {
				leadingName = cand.Name
				leadingAvatar = cand.Avatar
			} else if candMap, ok := first["candidate"].(map[string]interface{}); ok && candMap["name"] != nil && candMap["name"] != "" {
				leadingName, _ = candMap["name"].(string)
				leadingAvatar, _ = candMap["avatar"].(string)
			}

			if leadingName == "" {
				if p, ok := first["party"].(*PartyDetail); ok && p != nil && p.Name != "" {
					leadingName = p.Name
					if leadingAvatar == "" {
						leadingAvatar = p.Logo
					}
				} else if pMap, ok := first["party"].(map[string]interface{}); ok && pMap["name"] != nil && pMap["name"] != "" {
					leadingName, _ = pMap["name"].(string)
					if leadingAvatar == "" {
						leadingAvatar, _ = pMap["logo"].(string)
					}
				} else if pName, ok := first["party_name"].(string); ok && pName != "" {
					leadingName = pName
				} else {
					leadingName = leadingParty
				}
			}

			if leadingAvatar == "" {
				if p, ok := first["party"].(*PartyDetail); ok && p != nil && p.Logo != "" {
					leadingAvatar = p.Logo
				} else if pMap, ok := first["party"].(map[string]interface{}); ok && pMap["logo"] != nil {
					leadingAvatar, _ = pMap["logo"].(string)
				} else if pLogo, ok := first["party_logo"].(string); ok {
					leadingAvatar = pLogo
				}
			}
		}

		unitItem := map[string]interface{}{
			"id":                           uID,
			"name":                         uName,
			"code":                         uCode,
			"accredited_voters":            accredited,
			"votes_cast":                   votesCast,
			"valid_votes":                  validVotes,
			"rejected_votes":               rejectedVotes,
			"sub_units_counted":            subCounted,
			"total_sub_units":              totalSub,
			"leading_candidate_name":       leadingName,
			"leading_candidate_avatar":     leadingAvatar,
			"leading_party_short_name":     leadingParty,
			"leading_party_color_hex":      leadingPartyColor,
			"leading_party_dark_color_hex": leadingPartyDarkColor,
			"leading_votes":                leadingVotes,
			"leading_percentage":           leadingPercentage,
			"candidate_results":            crEnriched,
			"candidate_results_live":       crlEnriched,
		}
		units = append(units, unitItem)
	}

	if units == nil {
		units = []map[string]interface{}{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Electoral units breakdown fetched successfully", map[string]interface{}{
		"unit_title": unitTitle,
		"unit_type":  unitType,
		"units":      units,
		"total":      len(units),
	})
}



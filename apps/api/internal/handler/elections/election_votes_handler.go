package electionshandler

import (
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	electionsservice "free9ja/api/internal/service/elections"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// EligibleElectionResponse is the response shape for a single eligible election including its candidates.
type EligibleElectionResponse struct {
	ID                     int64                                             `json:"id"`
	Name                   string                                            `json:"name"`
	Rank                   int32                                             `json:"rank"`
	CandidatesCount        int32                                             `json:"candidates_count"`
	ElectionDate           interface{}                                       `json:"election_date"`
	ElectionGroupID        int64                                             `json:"election_group_id"`
	ElectionGroupName      string                                            `json:"election_group_name"`
	OfficeID               int64                                             `json:"office_id"`
	OfficeName             string                                            `json:"office_name"`
	Scope                  string                                            `json:"scope"`
	Candidates             []queries.ListElectionCandidatesDetailedByElectionIDRow `json:"candidates"`
}

// GetEligibleElectionsForPollingUnit godoc
// @Summary      Get eligible elections with candidates for a polling unit
// @Description  Returns all elections eligible for a given polling unit and election group, each enriched with their list of candidates (name, avatar, party info). Candidates may be empty if none have been set up.
// @Tags         Elections
// @Produce      json
// @Param        election_group_id  query  int  true  "Election Group ID"
// @Param        polling_unit_id    query  int  true  "Polling Unit ID"
// @Success      200  {object}  map[string]interface{}  "Eligible elections fetched successfully"
// @Failure      400  {object}  map[string]interface{}  "Missing or invalid query parameters"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /elections/eligible [get]
func (h *Handler) GetEligibleElectionsForPollingUnit(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	electionGroupIDStr := r.URL.Query().Get("election_group_id")
	pollingUnitIDStr := r.URL.Query().Get("polling_unit_id")

	if electionGroupIDStr == "" || pollingUnitIDStr == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id and polling_unit_id are required")
		return
	}

	electionGroupID, err := strconv.ParseInt(electionGroupIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "invalid election_group_id")
		return
	}

	pollingUnitID, err := strconv.ParseInt(pollingUnitIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "invalid polling_unit_id")
		return
	}

	elections, err := h.service.GetEligibleElectionsForPollingUnit(ctx, electionGroupID, int32(pollingUnitID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch eligible elections")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Eligible elections fetched successfully", map[string]interface{}{
		"elections": elections,
	})
}

type SubmitElectionVotesRequest struct {
	ElectionGroupID int64                        `json:"election_group_id"`
	PollingUnitID   int64                        `json:"polling_unit_id"`
	Votes           []electionsservice.VoteInput `json:"votes"`
	VotersCardImage string                       `json:"voters_card_image"`
}

// SubmitElectionVotes saves the user's votes and updates PVC info.
func (h *Handler) SubmitElectionVotes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, ok := ctx.Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
		return
	}

	var req SubmitElectionVotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ElectionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id is required")
		return
	}
	if req.PollingUnitID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "polling_unit_id is required")
		return
	}
	if len(req.Votes) == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "votes array is required")
		return
	}

	err := h.service.SubmitElectionVotes(ctx, claims.UserID, req.ElectionGroupID, int32(req.PollingUnitID), req.Votes, req.VotersCardImage)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to submit election votes: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Votes submitted successfully", nil)
}

// GetUserElectionGroupVoteStatus godoc
// @Summary      Get user's vote status for an election group
// @Description  Returns the vote status (voted, did_not_vote, none) and associated data (votes or reason).
// @Tags         Elections
// @Produce      json
// @Param        id   path      int  true  "Election Group ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /election-groups/{id}/vote-status [get]
func (h *Handler) GetUserElectionGroupVoteStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, ok := ctx.Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
		return
	}

	idStr := chi.URLParam(r, "id")
	electionGroupID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election group ID")
		return
	}

	status, err := h.service.GetUserElectionGroupVoteStatus(ctx, claims.UserID, electionGroupID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch vote status: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Vote status fetched successfully", map[string]interface{}{
		"status": status,
	})
}

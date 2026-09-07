package seedhandler

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi/v5"

	seedservice "free9ja/api/internal/service/seed"
	"free9ja/api/internal/utils"
)

type Handler struct {
	seedService *seedservice.SeedService
	utils       *utils.Utils
}

// NewHandler creates a new instance of Handler.
func NewHandler(seedService *seedservice.SeedService, utils *utils.Utils) *Handler {
	return &Handler{
		seedService: seedService,
		utils:       utils,
	}
}

// @Summary Seed testing users
// @Description Batch registers testing users from formatted JSON data
// @Tags Seed
// @Accept json
// @Produce json
// @Param request body seedservice.SeedUserRequest true "List of users to seed"
// @Success 200 {object} map[string]interface{} "Users seeded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to seed users"
// @Router /seed/users [post]
// SeedUsers handles batch registration of testing users from seed data
func (h *Handler) SeedUsers(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	var req []seedservice.SeedUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	msg, err := h.seedService.SeedUsers(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to seed users: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, nil)
}

// @Summary Seed admins and party admins
// @Description Batch registers roles for admins from formatted JSON data
// @Tags Seed
// @Accept json
// @Produce json
// @Param request body seedservice.SeedAdminsRequest true "List of admins to seed"
// @Success 200 {object} map[string]interface{} "Admins seeded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to seed admins"
// @Router /seed/admins [post]
func (h *Handler) SeedAdmins(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	var req seedservice.SeedAdminsRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		var reqSlice []seedservice.SeedAdminsRequest
		if errSlice := json.Unmarshal(bodyBytes, &reqSlice); errSlice == nil && len(reqSlice) > 0 {
			req = reqSlice[0]
		} else {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
			return
		}
	}

	// call the seed service
	msg, err := h.seedService.SeedAdmins(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to seed admins: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, nil)
}

// SimulatePartyShare specifies a target vote share for one party.
type SimulatePartyShare struct {
	PartyShortName string  `json:"party_short_name" example:"APC"`
	VoteShare      float64 `json:"vote_share"       example:"35"`
}

// SimulateElectionRequest is the request body for SimulateElectionResults.
type SimulateElectionRequest struct {
	Limit           int32                `json:"limit"            example:"1000"`
	MinVotesPerPU   int32                `json:"min_votes_per_pu" example:"100"`
	MaxVotesPerPU   int32                `json:"max_votes_per_pu" example:"750"`
	TriggerRealtime *bool                `json:"trigger_realtime"`
	RunFullRollup   bool                 `json:"run_full_rollup"`
	PartyShares     []SimulatePartyShare `json:"party_shares"`
}

// @Summary Simulate election polling unit results
// @Description Populates mock consensus final results for all eligible polling units of an election with optional party target vote shares and triggers rollups
// @Tags Seed
// @Accept json
// @Produce json
// @Param id path integer true "Election ID"
// @Param request body SimulateElectionRequest false "Simulation options including optional party target vote shares"
// @Success 200 {object} map[string]interface{} "Results simulated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to simulate election results"
// @Router /seed/elections/{id}/simulate-results [post]
func (h *Handler) SimulateElectionResults(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	idStr := chi.URLParam(r, "id")
	electionID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid election ID")
		return
	}

	var req seedservice.SimulateElectionResultsRequest
	if r.Body != nil {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
			return
		}
	}

	res, err := h.seedService.SimulateElectionResults(r.Context(), electionID, req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to simulate election results: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, res.Message, map[string]interface{}{
		"election_id":             res.ElectionID,
		"election_name":           res.ElectionName,
		"scope":                   res.Scope,
		"simulated_polling_units": res.SimulatedPollingUnits,
		"parties_count":           res.PartiesCount,
	})
}


// @Summary Flush Redis Cache
// @Description Clears and flushes all application-managed keys from Redis cache using pipelines
// @Tags Seed
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Redis database cleared successfully"
// @Failure 500 {object} map[string]interface{} "Failed to flush Redis"
// @Router /seed/flush-redis [post]
func (h *Handler) FlushRedis(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENV") == "production" {
		h.utils.RespondError(w, http.StatusForbidden, "This endpoint is disabled in production")
		return
	}

	msg, err := h.seedService.FlushRedis(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to flush Redis: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, nil)
}


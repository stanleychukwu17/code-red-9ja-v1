package electionshandler

import (
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
)

// GetNonVotingReasons fetches all standard reasons why users do not vote.
func (h *Handler) GetNonVotingReasons(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reasons, err := h.service.GetNonVotingReasons(ctx)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch non-voting reasons")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Non-voting reasons fetched successfully", map[string]interface{}{
		"reasons": reasons,
	})
}

type CreateDidNotVoteReasonRequest struct {
	ElectionGroupID   int64   `json:"election_group_id"`
	NonVotingReasonID *int16  `json:"non_voting_reason_id,omitempty"`
	Explanation       *string `json:"explanation,omitempty"`
}

// CreateDidNotVoteReason creates a record indicating why a user didn't vote.
func (h *Handler) CreateDidNotVoteReason(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, ok := ctx.Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: invalid claims")
		return
	}

	var req CreateDidNotVoteReasonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ElectionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id is required")
		return
	}

	// Fetch the user using the fake ID (hits Redis cache)
	user, err := h.usersService.GetUserByFakeID(ctx, claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	arg := queries.CreateDidNotVoteReasonParams{
		UserID:          user.ID, // Or claims.UserID, but this ensures consistency
		ElectionGroupID: req.ElectionGroupID,
		StateID:         pgtype.Int2{Int16: user.CurrentState, Valid: true},
		LgaID:           user.CurrentLga,
		WardID:          user.CurrentWard,
		PollingUnitID:   user.PollingUnitID,
	}

	if req.NonVotingReasonID != nil {
		arg.NonVotingReasonID = pgtype.Int2{Int16: *req.NonVotingReasonID, Valid: true}
	}
	if req.Explanation != nil {
		arg.Explanation = pgtype.Text{String: *req.Explanation, Valid: true}
	}

	reason, err := h.service.CreateDidNotVoteReason(ctx, arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to record non-voting reason")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Non-voting reason recorded successfully", map[string]interface{}{
		"reason": reason,
	})
}

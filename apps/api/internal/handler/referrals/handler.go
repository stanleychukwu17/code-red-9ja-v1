package referrals

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/middleware"
	"free9ja/api/internal/service/referrals"
	"free9ja/api/internal/utils"
)

type Handler struct {
	referralsService *referrals.ReferralsService
	utils            *utils.Utils
}

func NewHandler(svc *referrals.ReferralsService, utils *utils.Utils) *Handler {
	return &Handler{
		referralsService: svc,
		utils:            utils,
	}
}

// Request structs

type createReferralRequest struct {
	PartyID        *int16 `json:"party_id"`
	ReferrerUserID int64  `json:"referrer_user_id" validate:"required"`
	ReferredUserID int64  `json:"referred_user_id" validate:"required"`
	Milestone      string `json:"milestone" validate:"required"`
	Status         string `json:"status"`
}

type updateReferralRequest struct {
	Milestone *string `json:"milestone"`
	Status    *string `json:"status"`
	PartyID   *int16  `json:"party_id"`
	PaidAt    *string `json:"paid_at"` // ISO8601 string
}

// @Summary Create a referral (Admin)
// @Description manually insert a referral record
// @Tags referrals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body createReferralRequest true "Referral Data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/referrals [post]
func (h *Handler) CreateReferral(w http.ResponseWriter, r *http.Request) {
	var req createReferralRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	var partyID pgtype.Int2
	if req.PartyID != nil {
		partyID = pgtype.Int2{Int16: *req.PartyID, Valid: true}
	}

	status := "pending"
	if req.Status != "" {
		status = req.Status
	}

	params := queries.CreateReferralParams{
		PartyID:        partyID,
		ReferrerUserID: req.ReferrerUserID,
		ReferredUserID: req.ReferredUserID,
		Milestone:      req.Milestone,
		Status:         pgtype.Text{String: status, Valid: true},
	}

	referral, err := h.referralsService.CreateReferral(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create referral")
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Referral created successfully", map[string]interface{}{"referral": referral})
}

// @Summary Get a referral
// @Description get referral by ID
// @Tags referrals
// @Produce json
// @Security BearerAuth
// @Param id path int true "Referral ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /referrals/{id} [get]
func (h *Handler) GetReferral(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	referral, err := h.referralsService.GetReferral(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Referral not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referral fetched successfully", map[string]interface{}{"referral": referral})
}

// @Summary List referrals (Admin)
// @Description list all referrals
// @Tags referrals
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {object} map[string]interface{}
// @Router /admin/referrals [get]
func (h *Handler) ListReferrals(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	referrals, err := h.referralsService.ListReferrals(r.Context(), int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list referrals")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referrals fetched successfully", map[string]interface{}{"referrals": referrals})
}

// @Summary List my referrals
// @Description list referrals referred by the authenticated user
// @Tags referrals
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {object} map[string]interface{}
// @Router /users/me/referrals [get]
func (h *Handler) ListMyReferrals(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	userID := claims.UserID

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	referralsList, err := h.referralsService.ListReferralsByReferrer(r.Context(), userID, int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list referrals")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referrals fetched successfully", map[string]interface{}{"referrals": referralsList})
}

// @Summary Update a referral (Admin)
// @Description update referral milestone or status
// @Tags referrals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Referral ID"
// @Param request body updateReferralRequest true "Update Data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /admin/referrals/{id} [put]
func (h *Handler) UpdateReferral(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	var req updateReferralRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	params := queries.UpdateReferralParams{
		ID: id,
	}

	if req.Milestone != nil {
		params.Milestone = pgtype.Text{String: *req.Milestone, Valid: true}
	}
	if req.Status != nil {
		params.Status = pgtype.Text{String: *req.Status, Valid: true}
	}
	if req.PartyID != nil {
		params.PartyID = pgtype.Int2{Int16: *req.PartyID, Valid: true}
	}
	if req.PaidAt != nil {
		t, err := time.Parse(time.RFC3339, *req.PaidAt)
		if err == nil {
			params.PaidAt = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	updated, err := h.referralsService.UpdateReferral(r.Context(), params)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update referral")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referral updated successfully", map[string]interface{}{"referral": updated})
}

package pageverificationshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

type PageVerificationsService interface {
	VerifyPage(ctx context.Context, forWho string, pageID int64, verificationTypeID int16, actorID int64) (queries.PagesVerified, error)
	RemoveVerification(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) error
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
	ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error)
	GetUserDetails(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	GetPartyDetails(ctx context.Context, partyID int64) (*queries.Party, error)
}

type Handler struct {
	service  PageVerificationsService
	validate *validator.Validate
	utils    *utils.Utils
}

func NewHandler(service PageVerificationsService, utilsInstance *utils.Utils) *Handler {
	return &Handler{
		service:  service,
		validate: validator.New(),
		utils:    utilsInstance,
	}
}

type AssignVerificationRequest struct {
	ForWho              string  `json:"for_who" validate:"required"`
	PageID              int64   `json:"page_id" validate:"required"`
	VerificationTypeIDs []int16 `json:"verification_type_ids" validate:"required,min=1"`
}

// AssignVerification godoc
// @Summary      Assign verifications to a page
// @Description  Assign multiple verifications to a page
// @Tags         Page Verifications
// @Accept       json
// @Produce      json
// @Param        request body AssignVerificationRequest true "Assign Verification request payload"
// @Success      200  {object} map[string]interface{} "Verifications assigned successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request body"
// @Failure      500  {object} map[string]interface{} "Failed to assign verifications"
// @Security     BearerAuth
// @Router       /admin/verifications [post]
func (h *Handler) AssignVerification(w http.ResponseWriter, r *http.Request) {

	// Ensure the user has the required roles
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "super_admin", "admin")
	if !ok {
		return
	}

	// Parse the request body
	var req AssignVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate the request body
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Assign the verifications to the page
	var pvs []queries.PagesVerified
	for _, verificationTypeID := range req.VerificationTypeIDs {
		pv, err := h.service.VerifyPage(r.Context(), req.ForWho, req.PageID, verificationTypeID, claims.UserID)
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to assign verification: "+err.Error())
			return
		}
		pvs = append(pvs, pv)
	}

	// Fetch updated user or party details
	var pageDetails interface{}
	switch req.ForWho {
	case db.PageTypeUser:
		pageDetails, _ = h.service.GetUserDetails(r.Context(), req.PageID)
	case db.PageTypeParty:
		pageDetails, _ = h.service.GetPartyDetails(r.Context(), req.PageID)
	}

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Verifications assigned successfully", map[string]interface{}{
		"verifications": pvs,
		"page_details":  pageDetails,
	})
}

// RemoveVerification godoc
// @Summary      Remove a verification from a page
// @Description  Remove a verification from a page
// @Tags         Page Verifications
// @Accept       json
// @Produce      json
// @Param        page_type query string true "Page Type"
// @Param        page_id query integer true "Page ID"
// @Param        verification_type_id query integer true "Verification Type ID"
// @Success      200  {object} map[string]interface{} "Verification removed successfully"
// @Failure      400  {object} map[string]interface{} "Bad request"
// @Failure      500  {object} map[string]interface{} "Failed to remove verification"
// @Security     BearerAuth
// @Router       /admin/verifications [delete]
func (h *Handler) RemoveVerification(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "super_admin", "admin")
	if !ok {
		return
	}

	pageType := r.URL.Query().Get("page_type")
	pageIDStr := r.URL.Query().Get("page_id")
	typeIDStr := r.URL.Query().Get("verification_type_id")

	if pageType == "" || pageIDStr == "" || typeIDStr == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "page_type, page_id, and verification_type_id are required")
		return
	}

	pageID, err := strconv.ParseInt(pageIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid page_id")
		return
	}

	typeID, err := strconv.ParseInt(typeIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid verification_type_id")
		return
	}

	err = h.service.RemoveVerification(r.Context(), pageType, pageID, int16(typeID), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to remove verification: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Verification removed successfully", nil)
}

// GetPageVerifications godoc
// @Summary      Get verifications for a page
// @Description  Get verifications for a page
// @Tags         Page Verifications
// @Accept       json
// @Produce      json
// @Param        pageType path string true "Page Type"
// @Param        pageID path integer true "Page ID"
// @Success      200  {object} map[string]interface{} "Verifications fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid page ID"
// @Failure      500  {object} map[string]interface{} "Failed to fetch verifications"
// @Router       /verifications/{pageType}/{pageID} [get]
func (h *Handler) GetPageVerifications(w http.ResponseWriter, r *http.Request) {
	pageType := chi.URLParam(r, "pageType")
	pageIDStr := chi.URLParam(r, "pageID")

	pageID, err := strconv.ParseInt(pageIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid page ID")
		return
	}

	verifications, err := h.service.GetPageVerifications(r.Context(), pageType, pageID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch verifications")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Verifications fetched successfully", map[string]interface{}{
		"verifications": verifications,
	})
}

// ListVerificationTypes godoc
// @Summary      List verification types
// @Description  List verification types
// @Tags         Page Verifications
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Verification types fetched successfully"
// @Failure      500  {object} map[string]interface{} "Failed to fetch verification types"
// @Router       /verifications/types [get]
func (h *Handler) ListVerificationTypes(w http.ResponseWriter, r *http.Request) {
	types, err := h.service.ListVerificationTypes(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch verification types")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Verification types fetched successfully", map[string]interface{}{
		"types": types,
	})
}

package pageverificationshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

type PageVerificationsService interface {
	VerifyPage(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) (queries.PagesVerified, error)
	RemoveVerification(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) error
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
	ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error)
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
	PageType           string `json:"page_type" validate:"required"`
	PageID             int64  `json:"page_id" validate:"required"`
	VerificationTypeID int16  `json:"verification_type_id" validate:"required"`
}

// AssignVerification handles POST /api/v1/admin/verifications
func (h *Handler) AssignVerification(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "super_admin", "admin")
	if !ok {
		return
	}

	var req AssignVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	pv, err := h.service.VerifyPage(r.Context(), req.PageType, req.PageID, req.VerificationTypeID, claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to assign verification: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Verification assigned successfully", map[string]interface{}{
		"verification": pv,
	})
}

// RemoveVerification handles DELETE /api/v1/admin/verifications
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

// GetPageVerifications handles GET /api/v1/verifications/{pageType}/{pageID}
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

// ListVerificationTypes handles GET /api/v1/verifications/types
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

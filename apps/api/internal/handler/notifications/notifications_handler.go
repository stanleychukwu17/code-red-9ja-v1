package notifications

import (
	"encoding/json"
	"net/http"
	"strconv"

	apimiddleware "free9ja/api/internal/middleware"
	notificationsservice "free9ja/api/internal/service/notifications"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service notificationsservice.NotificationsService
	utils   *utils.Utils
}

func NewHandler(service notificationsservice.NotificationsService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

// ----------------------------------------------------------------------------
// USER NOTIFICATIONS HANDLERS
// ----------------------------------------------------------------------------

// ListUserNotifications godoc
// @Summary List current user notifications
// @Description Returns paginated in-app notifications for the logged-in user with unread count
// @Tags Notifications
// @Security BearerAuth
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Limit per page (default: 20)"
// @Success 200 {object} notificationsservice.PaginatedNotificationsResponse
// @Router /api/v1/notifications [get]
func (h *Handler) ListUserNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	page := int32(1)
	if pStr := r.URL.Query().Get("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = int32(p)
		}
	}

	limit := int32(20)
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = int32(l)
		}
	}

	res, err := h.service.ListUserNotifications(r.Context(), claims.UserID, page, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Notifications retrieved successfully", map[string]interface{}{
		"notifications": res.Data,
		"unread_count":  res.UnreadCount,
		"page":          res.Page,
		"limit":         res.Limit,
	})
}

// GetUnreadCount godoc
// @Summary Get user unread notification badge count
// @Tags Notifications
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/notifications/unread-count [get]
func (h *Handler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	count, err := h.service.GetUnreadCount(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Unread count retrieved", map[string]interface{}{
		"unread_count": count,
	})
}

// MarkAsRead godoc
// @Summary Mark a single notification as read
// @Tags Notifications
// @Security BearerAuth
// @Param id path int true "Notification ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/notifications/{id}/read [patch]
func (h *Handler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || notifID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	if err := h.service.MarkAsRead(r.Context(), notifID, claims.UserID); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Notification marked as read", nil)
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read for current user
// @Tags Notifications
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/notifications/mark-all-read [patch]
func (h *Handler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if err := h.service.MarkAllAsRead(r.Context(), claims.UserID); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "All notifications marked as read", nil)
}

// DeleteNotification godoc
// @Summary Delete a notification
// @Tags Notifications
// @Security BearerAuth
// @Param id path int true "Notification ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/notifications/{id} [delete]
func (h *Handler) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || notifID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	if err := h.service.DeleteNotification(r.Context(), notifID, claims.UserID); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Notification deleted", nil)
}

// ----------------------------------------------------------------------------
// PARTY NOTIFICATIONS HANDLERS
// ----------------------------------------------------------------------------

// ListPartyNotifications godoc
// @Summary List notifications for a party
// @Description Returns notifications visible to the authenticated party official
// @Tags Party Notifications
// @Security BearerAuth
// @Param id path int true "Party ID"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Limit per page (default: 20)"
// @Success 200 {object} notificationsservice.PaginatedPartyNotificationsResponse
// @Router /api/v1/parties/{id}/notifications [get]
func (h *Handler) ListPartyNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	partyIDStr := chi.URLParam(r, "id")
	partyID64, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID64 <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}
	partyID := int16(partyID64)

	page := int32(1)
	if pStr := r.URL.Query().Get("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = int32(p)
		}
	}

	limit := int32(20)
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = int32(l)
		}
	}

	res, err := h.service.ListPartyNotificationsForUser(r.Context(), claims.UserID, partyID, page, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party notifications retrieved successfully", map[string]interface{}{
		"notifications": res.Data,
		"unread_count":  res.UnreadCount,
		"page":          res.Page,
		"limit":         res.Limit,
	})
}

// GetPartyUnreadCount godoc
// @Summary Get party unread notifications count for current official
// @Tags Party Notifications
// @Security BearerAuth
// @Param id path int true "Party ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/parties/{id}/notifications/unread-count [get]
func (h *Handler) GetPartyUnreadCount(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	partyIDStr := chi.URLParam(r, "id")
	partyID64, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID64 <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	count, err := h.service.GetPartyUnreadCount(r.Context(), claims.UserID, int16(partyID64))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party unread count retrieved", map[string]interface{}{
		"unread_count": count,
	})
}

// MarkPartyNotificationAsRead godoc
// @Summary Mark a party notification as read for current official
// @Tags Party Notifications
// @Security BearerAuth
// @Param id path int true "Party ID"
// @Param notification_id path int true "Notification ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/parties/{id}/notifications/{notification_id}/read [patch]
func (h *Handler) MarkPartyNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	notifIDStr := chi.URLParam(r, "notification_id")
	notifID, err := strconv.ParseInt(notifIDStr, 10, 64)
	if err != nil || notifID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	if err := h.service.MarkPartyNotificationAsRead(r.Context(), notifID, claims.UserID); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party notification marked as read", nil)
}

// ----------------------------------------------------------------------------
// PREFERENCES HANDLERS
// ----------------------------------------------------------------------------

// GetPreferences godoc
// @Summary Get notification preferences for logged-in user
// @Tags Notification Preferences
// @Security BearerAuth
// @Success 200 {object} notificationsservice.NotificationPreferencesResponse
// @Router /api/v1/users/me/notification-preferences [get]
func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	pref, err := h.service.GetPreferences(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Preferences retrieved", map[string]interface{}{
		"preferences": pref,
	})
}

// UpdatePreferences godoc
// @Summary Update notification preferences for logged-in user
// @Tags Notification Preferences
// @Security BearerAuth
// @Param body body notificationsservice.UpdatePreferencesInput true "Update Preferences Payload"
// @Success 200 {object} notificationsservice.NotificationPreferencesResponse
// @Router /api/v1/users/me/notification-preferences [put]
func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil || claims.UserID <= 0 {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req notificationsservice.UpdatePreferencesInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	pref, err := h.service.UpdatePreferences(r.Context(), claims.UserID, req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Preferences updated successfully", map[string]interface{}{
		"preferences": pref,
	})
}

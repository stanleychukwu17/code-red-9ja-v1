package inecgrabber

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	inecservice "free9ja/api/internal/service/inec_grabber"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
)

type INECGrabberHandler struct {
	svc   *inecservice.INECGrabberService
	utils *utils.Utils
}

func NewINECGrabberHandler(svc *inecservice.INECGrabberService, u *utils.Utils) *INECGrabberHandler {
	return &INECGrabberHandler{
		svc:   svc,
		utils: u,
	}
}

// SyncGrabber godoc
// @Summary      Manually trigger INEC result grabber sync
// @Description  Triggers a manual sync run for the specified INEC result grabber
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "INEC Result Grabber ID"
// @Param        upload_to_r2 query bool false "Upload result sheet images to R2 (default from config)"
// @Param        ai_extract query bool false "Extract candidate results via AI (default from config)"
// @Success      200 {object} map[string]interface{} "Sync completed successfully"
// @Failure      400 {object} map[string]interface{} "Invalid request params"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/inec-result-grabbers/{id}/sync [post]
func (h *INECGrabberHandler) SyncGrabber(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	grabberID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		slog.Warn("SyncGrabber request received with invalid ID", "id", idStr, "err", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid grabber ID")
		return
	}

	var opts inecservice.SyncOptions
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&opts)
	}

	q := r.URL.Query()
	if r2Val := q.Get("upload_to_r2"); r2Val != "" {
		b, err := strconv.ParseBool(r2Val)
		if err == nil {
			opts.UploadToR2 = &b
		}
	}
	if aiVal := q.Get("ai_extract"); aiVal != "" {
		b, err := strconv.ParseBool(aiVal)
		if err == nil {
			opts.AIExtract = &b
		}
	}
	if forceVal := q.Get("force"); forceVal != "" {
		b, err := strconv.ParseBool(forceVal)
		if err == nil {
			opts.Force = &b
		}
	}

	slog.Info("INEC SyncGrabber API hit",
		"grabber_id", grabberID,
		"upload_to_r2", opts.UploadToR2,
		"ai_extract", opts.AIExtract,
		"force", opts.Force,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	logRecord, syncErr := h.svc.SyncGrabber(ctx, grabberID, opts)
	if syncErr != nil {
		slog.Error("INEC SyncGrabber API execution failed", "grabber_id", grabberID, "err", syncErr)
		if logRecord == nil {
			h.utils.RespondError(w, http.StatusBadRequest, syncErr.Error())
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, syncErr.Error())
		return
	}

	slog.Info("INEC SyncGrabber API execution completed successfully",
		"grabber_id", grabberID,
		"log_id", logRecord.ID,
		"results_collected", logRecord.ResultsCollectedCount,
		"status", logRecord.Status,
	)

	h.utils.RespondSuccess(w, http.StatusOK, "INEC result grabber sync completed", map[string]interface{}{
		"log": logRecord,
	})
}

// TogglePause godoc
// @Summary      Toggle pause/resume status of INEC result grabber
// @Tags         INEC Result Grabber
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "INEC Result Grabber ID"
// @Success      200 {object} map[string]interface{}
// @Router       /admin/inec-result-grabbers/{id}/toggle-pause [post]
func (h *INECGrabberHandler) TogglePause(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	grabberID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid grabber ID")
		return
	}

	grabber, err := h.svc.TogglePause(r.Context(), grabberID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	msg := "INEC grabber paused"
	if grabber.SyncStatus != "paused" {
		msg = "INEC grabber resumed"
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, map[string]interface{}{
		"grabber": grabber,
	})
}

// ListLogs godoc
// @Summary      List INEC result grabber sync logs
// @Description  Retrieves paginated execution logs for a specific INEC result grabber
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "INEC Result Grabber ID"
// @Param        limit query int false "Limit results (default 20)"
// @Param        offset query int false "Offset results (default 0)"
// @Success      200 {object} map[string]interface{} "Logs retrieved successfully"
// @Failure      400 {object} map[string]interface{} "Invalid grabber ID"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/inec-result-grabbers/{id}/logs [get]
func (h *INECGrabberHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	grabberID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid grabber ID")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	logs, err := h.svc.ListLogs(r.Context(), grabberID, int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Logs retrieved successfully", map[string]interface{}{
		"logs": logs,
	})
}

// ListUnmatchedResults godoc
// @Summary      List unmatched polling unit results
// @Description  Retrieves paginated queue of results submitted without a matching polling unit in the system
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        election_id query int false "Filter by election ID"
// @Param        resolution_status query string false "Filter by status (pending, resolved_mapped, resolved_created_pu, rejected)"
// @Param        limit query int false "Limit results (default 20)"
// @Param        offset query int false "Offset results (default 0)"
// @Success      200 {object} map[string]interface{} "Unmatched results retrieved successfully"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/unmatched-polling-unit-results [get]
func (h *INECGrabberHandler) ListUnmatchedResults(w http.ResponseWriter, r *http.Request) {
	var electionID *int64
	if eStr := r.URL.Query().Get("election_id"); eStr != "" {
		if id, err := strconv.ParseInt(eStr, 10, 64); err == nil {
			electionID = &id
		}
	}

	var status *string
	if st := r.URL.Query().Get("resolution_status"); st != "" {
		status = &st
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	results, err := h.svc.ListUnmatchedResults(r.Context(), electionID, status, int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Unmatched results retrieved successfully", map[string]interface{}{
		"unmatched_results": results,
	})
}

type ResolveUnmatchedRequest struct {
	Status        string `json:"status"` // resolved_mapped, resolved_created_pu, rejected
	Notes         string `json:"notes"`
	PollingUnitID *int32 `json:"polling_unit_id"`
}

// ResolveUnmatchedResult godoc
// @Summary      Resolve unmatched polling unit result
// @Description  Resolves an unmatched result by mapping to an existing/new polling unit or rejecting it
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Unmatched Result ID"
// @Param        request body ResolveUnmatchedRequest true "Resolution payload"
// @Success      200 {object} map[string]interface{} "Unmatched result resolved successfully"
// @Failure      400 {object} map[string]interface{} "Invalid request payload or ID"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/unmatched-polling-unit-results/{id}/resolve [post]
func (h *INECGrabberHandler) ResolveUnmatchedResult(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	unmatchedID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid unmatched result ID")
		return
	}

	var body ResolveUnmatchedRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if body.Status != "resolved_mapped" && body.Status != "resolved_created_pu" && body.Status != "rejected" {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid resolution status")
		return
	}

	adminUserID := int64(1) // Placeholder system admin user ID

	res, err := h.svc.ResolveUnmatchedResult(r.Context(), unmatchedID, body.Status, body.Notes, body.PollingUnitID, adminUserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Unmatched result resolved successfully", map[string]interface{}{
		"result": res,
	})
}

// ListGrabbers godoc
// @Summary      List INEC result grabbers
// @Description  Retrieves paginated INEC result grabbers with election details and metrics
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        limit query int false "Limit results (default 20)"
// @Param        cursor query int false "Cursor for pagination"
// @Success      200 {object} map[string]interface{} "INEC result grabbers retrieved successfully"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/inec-result-grabbers [get]
func (h *INECGrabberHandler) ListGrabbers(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	var cursor *int64
	if cStr := r.URL.Query().Get("cursor"); cStr != "" {
		if c, err := strconv.ParseInt(cStr, 10, 64); err == nil {
			cursor = &c
		}
	}

	grabbers, err := h.svc.ListGrabbersPaginated(r.Context(), cursor, int32(limit))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var nextCursor *int64
	hasMore := false
	if len(grabbers) > 0 {
		lastID := grabbers[len(grabbers)-1].ID
		nextCursor = &lastID
		if len(grabbers) >= limit {
			hasMore = true
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "INEC result grabbers retrieved successfully", map[string]interface{}{
		"inec_result_grabbers": grabbers,
		"meta": map[string]interface{}{
			"has_more":    hasMore,
			"next_cursor": nextCursor,
			"limit":       limit,
		},
	})
}

// ListAllLogs godoc
// @Summary      List all INEC result grabber logs
// @Description  Retrieves paginated execution logs across grabbers
// @Tags         INEC Result Grabber
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        grabber_id query int false "Filter by grabber ID"
// @Param        limit query int false "Limit results (default 20)"
// @Param        cursor query int false "Cursor for pagination"
// @Success      200 {object} map[string]interface{} "Logs retrieved successfully"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /admin/inec-result-grabber-logs [get]
func (h *INECGrabberHandler) ListAllLogs(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	var grabberID *int64
	if gStr := r.URL.Query().Get("grabber_id"); gStr != "" {
		if g, err := strconv.ParseInt(gStr, 10, 64); err == nil {
			grabberID = &g
		}
	}
	var cursor *int64
	if cStr := r.URL.Query().Get("cursor"); cStr != "" {
		if c, err := strconv.ParseInt(cStr, 10, 64); err == nil {
			cursor = &c
		}
	}

	logs, err := h.svc.ListLogsPaginated(r.Context(), grabberID, cursor, int32(limit))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var nextCursor *int64
	hasMore := false
	if len(logs) > 0 {
		lastID := logs[len(logs)-1].ID
		nextCursor = &lastID
		if len(logs) >= limit {
			hasMore = true
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Logs retrieved successfully", map[string]interface{}{
		"logs": logs,
		"meta": map[string]interface{}{
			"has_more":    hasMore,
			"next_cursor": nextCursor,
			"limit":       limit,
		},
	})
}

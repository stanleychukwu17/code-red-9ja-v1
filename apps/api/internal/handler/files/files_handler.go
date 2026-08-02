// Package fileshandler provides HTTP handlers for managing file uploads via
// Cloudflare R2. The upload flow uses presigned PUT URLs so files travel
// directly from the client to R2 — never through the API server — keeping
// the API latency-free and minimising egress costs.
//
// Upload flow:
//  1. Client calls POST /api/v1/files/upload-url to get a presigned URL.
//  2. Client PUTs the file directly to R2 using the presigned URL.
//  3. Client calls POST /api/v1/files/{id}/confirm to mark the upload complete.
//
// Authenticated endpoints require a valid JWT cookie or Authorization header.
// File metadata is persisted to PostgreSQL via SQLC-generated queries.
package fileshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	r2service "free9ja/api/internal/service/r2"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// FilesDB is the narrow interface for file-related database operations.
// Satisfied by *queries.Queries, but mockable in tests.
type FilesDB interface {
	GetUserByFakeID(ctx context.Context, fakeID pgtype.Int8) (queries.User, error)
	CreateFile(ctx context.Context, arg queries.CreateFileParams) (queries.File, error)
	ConfirmUpload(ctx context.Context, arg queries.ConfirmUploadParams) (queries.File, error)
	GetFileByID(ctx context.Context, id int64) (queries.File, error)
	GetFileByKey(ctx context.Context, fileKey string) (queries.File, error)
	ListFiles(ctx context.Context, arg queries.ListFilesParams) ([]queries.File, error)
	MarkFileDeleted(ctx context.Context, id int64) (queries.File, error)
	HardDeleteFile(ctx context.Context, id int64) error
}

// Handler holds the dependencies needed to service file-related HTTP requests.
type Handler struct {
	db    FilesDB
	r2    *r2service.R2Service
	utils *utils.Utils
}

// NewHandler returns a Handler wired up with the provided database, R2 service,
// and shared utilities instance.
func NewHandler(db FilesDB, r2Svc *r2service.R2Service, u *utils.Utils) *Handler {
	return &Handler{db: db, r2: r2Svc, utils: u}
}

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

type GenerateUploadURLRequest struct {
	OriginalName string `json:"original_name"`
	MimeType     string `json:"mime_type"`
	FileSize     int64  `json:"file_size"`
	Folder       string `json:"folder"`
	IsPublic     bool   `json:"is_public"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

// GenerateUploadURL godoc
// @Summary      Generate a presigned upload URL
// @Description  Creates a file record and returns a 15-minute presigned PUT URL.
//               The client uploads the file directly to Cloudflare R2 using that
//               URL, then calls the confirm endpoint to update the record status.
// @Tags         Files
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body GenerateUploadURLRequest true "Upload URL request"
// @Success      200 {object} map[string]interface{} "Upload URL generated"
// @Failure      400 {object} map[string]interface{} "Invalid request payload"
// @Failure      401 {object} map[string]interface{} "Unauthorized"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /files/upload-url [post]
func (h *Handler) GenerateUploadURL(w http.ResponseWriter, r *http.Request) {
	var req GenerateUploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if strings.TrimSpace(req.OriginalName) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "original_name is required")
		return
	}
	if strings.TrimSpace(req.MimeType) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "mime_type is required")
		return
	}
	if req.FileSize <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "file_size must be greater than zero")
		return
	}
	const maxFileSizeBytes = 50 * 1024 * 1024 // 50 MB
	if req.FileSize > maxFileSizeBytes {
		h.utils.RespondError(w, http.StatusBadRequest, "file exceeds the 50 MB size limit")
		return
	}

	folder := strings.TrimSpace(req.Folder)
	if folder == "" {
		folder = "uploads"
	}

	// Generate a unique object key for R2 (e.g., folder/date/sanitized-name-uuid.ext)
	key := r2service.BuildKey(folder, req.OriginalName, uuid.New().String())

	// Request a presigned URL that allows the client to upload directly to R2
	const presignTTL = 15 * time.Minute
	presignURL, err := h.r2.PresignedUploadURL(r.Context(), key, req.MimeType, presignTTL)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to generate upload URL: "+err.Error())
		return
	}

	// Determine the public URL where the file will be accessible after a successful upload
	publicURL := h.r2.PublicURL(key)

	// Resolve the authenticated user from the JWT claims (optional — set null if absent).
	// If the DB lookup fails (e.g. admin accounts whose fake_id is not set), we log a warning
	// and continue — uploadedBy remains null. This is intentional: the JWT has already been
	// verified by AuthMiddleware so we trust the caller is authenticated.
	uploadedBy := pgtype.Int8{Valid: false}
	if claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims); ok && claims != nil {
		user, err := h.db.GetUserByFakeID(r.Context(), pgtype.Int8{Int64: claims.FakeID, Valid: true})
		if err == nil {
			uploadedBy = pgtype.Int8{Int64: user.ID, Valid: true}
		}
		// If err != nil the user lookup failed (e.g. admin with no fake_id) — uploadedBy stays null.
	}

	file, err := h.db.CreateFile(r.Context(), queries.CreateFileParams{
		OriginalName: req.OriginalName,
		MimeType:     req.MimeType,
		FileSize:     req.FileSize,
		FileKey:      key,
		PublicUrl:    publicURL,
		Folder:       folder,
		IsPublic:     req.IsPublic,
		UploadedBy:   uploadedBy,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create file record: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Upload URL generated successfully", map[string]interface{}{
		"upload_url": presignURL,
		"file_key":   key,
		"public_url": publicURL,
		"file_id":    file.ID,
		"expires_at": time.Now().Add(presignTTL).UTC().Format(time.RFC3339),
	})
}

// ConfirmUpload godoc
// @Summary      Confirm file upload status
// @Description  Marks a pending file record as 'uploaded' or 'failed' after the
//               client finishes writing to R2. Pass ?success=false to mark failure.
// @Tags         Files
// @Produce      json
// @Security     BearerAuth
// @Param        id      path  int   true  "File ID returned by upload-url"
// @Param        success query bool  false "Set to false if the upload failed (default: true)"
// @Success      200 {object} map[string]interface{} "File status updated"
// @Failure      400 {object} map[string]interface{} "Invalid ID"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /files/{id}/confirm [post]
func (h *Handler) ConfirmUpload(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}

	success := true
	if r.URL.Query().Get("success") == "false" {
		success = false
	}

	file, err := h.db.ConfirmUpload(r.Context(), queries.ConfirmUploadParams{
		ID:      id,
		Success: success,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to confirm upload: "+err.Error())
		return
	}

	msg := "File upload confirmed successfully"
	if !success {
		msg = "File upload marked as failed"
	}

	h.utils.RespondSuccess(w, http.StatusOK, msg, map[string]interface{}{
		"file": file,
	})
}

// GetFile godoc
// @Summary      Get file metadata by ID
// @Description  Returns the stored metadata for a single uploaded file.
// @Tags         Files
// @Produce      json
// @Param        id path int true "File ID"
// @Success      200 {object} map[string]interface{} "File fetched"
// @Failure      400 {object} map[string]interface{} "Invalid ID"
// @Failure      404 {object} map[string]interface{} "File not found"
// @Router       /files/{id} [get]
func (h *Handler) GetFile(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}

	file, err := h.db.GetFileByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "File not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "File fetched successfully", map[string]interface{}{
		"file": file,
	})
}

// ListFiles godoc
// @Summary      List files (cursor-paginated)
// @Description  Returns a cursor-paginated list of uploaded files, newest first.
//               Pass the ID of the last returned item as `cursor` for the next page.
// @Tags         Files
// @Produce      json
// @Security     BearerAuth
// @Param        cursor      query int    false "Cursor (ID of last record on previous page)"
// @Param        limit       query int    false "Page size (default 20, max 100)"
// @Param        folder      query string false "Filter by folder name"
// @Param        uploaded_by query int    false "Filter by uploader user ID"
// @Success      200 {object} map[string]interface{} "Files fetched"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /files [get]
func (h *Handler) ListFiles(w http.ResponseWriter, r *http.Request) {
	limit := int32(20)
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			if n > 100 {
				limit = 100
			} else {
				limit = int32(n)
			}
		}
	}

	var cursor int64
	if c := r.URL.Query().Get("cursor"); c != "" {
		if n, err := strconv.ParseInt(c, 10, 64); err == nil {
			cursor = n
		}
	}

	var uploadedBy int64
	if u := r.URL.Query().Get("uploaded_by"); u != "" {
		if n, err := strconv.ParseInt(u, 10, 64); err == nil {
			uploadedBy = n
		}
	}

	files, err := h.db.ListFiles(r.Context(), queries.ListFilesParams{
		Column1:    cursor,
		Limit:      limit,
		Folder:     r.URL.Query().Get("folder"),
		UploadedBy: uploadedBy,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list files: "+err.Error())
		return
	}

	hasMore := false
	var nextCursor string
	if int32(len(files)) == limit {
		hasMore = true
		nextCursor = strconv.FormatInt(files[len(files)-1].ID, 10)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Files fetched successfully", map[string]interface{}{
		"files": files,
		"meta": map[string]interface{}{
			"has_more":    hasMore,
			"next_cursor": nextCursor,
		},
	})
}

// DeleteFile godoc
// @Summary      Delete a file
// @Description  Soft-deletes the file record in the database, then removes the
//               object from Cloudflare R2. If the R2 deletion succeeds the DB
//               row is hard-deleted. A failed R2 deletion does not cause an
//               HTTP error — the record is already hidden from the application.
// @Tags         Files
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "File ID"
// @Success      200 {object} map[string]interface{} "File deleted"
// @Failure      400 {object} map[string]interface{} "Invalid ID"
// @Failure      404 {object} map[string]interface{} "File not found"
// @Failure      500 {object} map[string]interface{} "Internal server error"
// @Router       /files/{id} [delete]
func (h *Handler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid file ID")
		return
	}

	// Fetch record first so we have the R2 key.
	file, err := h.db.GetFileByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "File not found")
		return
	}

	// Soft-delete first — prevents any new reads from seeing the record.
	if _, err = h.db.MarkFileDeleted(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete file: "+err.Error())
		return
	}

	// Purge from R2; only hard-delete the DB row once the bucket object is gone.
	// If R2 deletion fails we swallow the error — a cleanup job can handle it later.
	if err = h.r2.DeleteObject(r.Context(), file.FileKey); err == nil {
		_ = h.db.HardDeleteFile(r.Context(), id)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "File deleted successfully", nil)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func parseID(r *http.Request, param string) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, param), 10, 64)
}

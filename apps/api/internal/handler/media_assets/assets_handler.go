package media_assets

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	apimiddleware "free9ja/api/internal/middleware"
	mediaassetsservice "free9ja/api/internal/service/media_assets"
	"free9ja/api/internal/utils"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service mediaassetsservice.MediaAssetsService
	utils   *utils.Utils
}

func NewHandler(service mediaassetsservice.MediaAssetsService, utils *utils.Utils) *Handler {
	return &Handler{
		service: service,
		utils:   utils,
	}
}

// ----------------------------------------------------------------------------
// FOLDERS
// ----------------------------------------------------------------------------

type CreateFolderRequest struct {
	Name        string `json:"name"`
	ParentID    *int32 `json:"parent_id"`
	Description string `json:"description"`
}

func (h *Handler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "Folder name is required")
		return
	}

	var createdBy *int64
	claims, _ := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if claims != nil && claims.UserID > 0 {
		uID := claims.UserID
		createdBy = &uID
	}

	folder, err := h.service.CreateFolder(r.Context(), req.Name, req.ParentID, req.Description, createdBy)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusCreated, folder)
}

func (h *Handler) ListFolders(w http.ResponseWriter, r *http.Request) {
	var parentID *int32
	parentIDStr := r.URL.Query().Get("parent_id")
	if parentIDStr != "" {
		if id, err := strconv.Atoi(parentIDStr); err == nil && id > 0 {
			pID := int32(id)
			parentID = &pID
		}
	}

	folders, err := h.service.ListFolders(r.Context(), parentID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list folders: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"folders": folders,
	})
}

func (h *Handler) GetFolder(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid folder ID")
		return
	}

	folder, err := h.service.GetFolderByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Folder not found")
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, folder)
}

func (h *Handler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid folder ID")
		return
	}

	if err := h.service.DeleteFolder(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete folder: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Folder deleted successfully",
	})
}

// ----------------------------------------------------------------------------
// ASSETS
// ----------------------------------------------------------------------------

type PresignUploadRequest struct {
	FolderID    *int32 `json:"folder_id"`
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
}

func (h *Handler) GetUploadPresignedURL(w http.ResponseWriter, r *http.Request) {
	var req PresignUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if strings.TrimSpace(req.FileName) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "file_name is required")
		return
	}

	var uploadedBy *int64
	claims, _ := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if claims != nil && claims.UserID > 0 {
		uID := claims.UserID
		uploadedBy = &uID
	}

	resp, err := h.service.GetUploadPresignedURL(r.Context(), req.FolderID, req.FileName, req.ContentType, uploadedBy)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to generate presigned upload URL: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, resp)
}

func (h *Handler) ConfirmUpload(w http.ResponseWriter, r *http.Request) {
	var req mediaassetsservice.ConfirmUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.R2Key) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "name and r2_key are required")
		return
	}

	claims, _ := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if claims != nil && claims.UserID > 0 {
		uID := claims.UserID
		req.UploadedBy = &uID
	}

	asset, err := h.service.ConfirmAssetUpload(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to confirm upload: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusCreated, asset)
}

func (h *Handler) ListAssets(w http.ResponseWriter, r *http.Request) {
	var folderID *int32
	folderIDStr := r.URL.Query().Get("folder_id")
	if folderIDStr != "" && folderIDStr != "0" {
		if id, err := strconv.Atoi(folderIDStr); err == nil && id > 0 {
			fID := int32(id)
			folderID = &fID
		}
	}

	fileType := r.URL.Query().Get("file_type")
	search := r.URL.Query().Get("search")

	page := int32(1)
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = int32(p)
		}
	}

	limit := int32(30)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = int32(l)
		}
	}

	res, err := h.service.ListAssets(r.Context(), folderID, fileType, search, page, limit)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list assets: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, res)
}

func (h *Handler) GetAsset(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid asset ID")
		return
	}

	asset, err := h.service.GetAssetByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Asset not found")
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, asset)
}

func (h *Handler) DeleteAsset(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid asset ID")
		return
	}

	if err := h.service.DeleteAsset(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete asset: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Asset deleted successfully",
	})
}

// ----------------------------------------------------------------------------
// SYNC FROM CLOUDFLARE R2
// ----------------------------------------------------------------------------

type SyncRequest struct {
	Prefix string `json:"prefix"` // optional, defaults to "assets/"
}

func (h *Handler) SyncR2(w http.ResponseWriter, r *http.Request) {
	var req SyncRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	stats, err := h.service.SyncFromR2(r.Context(), req.Prefix)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Sync failed: "+err.Error())
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Sync completed successfully",
		"stats":   stats,
	})
}

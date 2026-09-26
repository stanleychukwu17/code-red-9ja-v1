package media_assets

import (
	"context"
	"fmt"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"free9ja/api/internal/db/queries"
	r2service "free9ja/api/internal/service/r2"

	"github.com/jackc/pgx/v5/pgtype"
)

// MediaAssetsService provides domain logic for asset folders, media assets, and Cloudflare R2 sync.
type MediaAssetsService interface {
	// Folder Operations
	CreateFolder(ctx context.Context, name string, parentID *int32, description string, createdBy *int64) (queries.AssetFolder, error)
	ListFolders(ctx context.Context, parentID *int32) ([]queries.AssetFolder, error)
	GetFolderByID(ctx context.Context, id int32) (queries.AssetFolder, error)
	DeleteFolder(ctx context.Context, id int32) error

	// Asset Operations
	GetUploadPresignedURL(ctx context.Context, folderID *int32, filename string, contentType string, uploadedBy *int64) (*UploadPresignResponse, error)
	ConfirmAssetUpload(ctx context.Context, req ConfirmUploadRequest) (queries.MediaAsset, error)
	ListAssets(ctx context.Context, folderID *int32, fileType string, search string, page, limit int32) (*PaginatedAssetsResponse, error)
	GetAssetByID(ctx context.Context, id int32) (queries.MediaAsset, error)
	DeleteAsset(ctx context.Context, id int32) error

	// Reconciliation & Cloudflare R2 Sync
	SyncFromR2(ctx context.Context, rootPrefix string) (*SyncStats, error)
}

type UploadPresignResponse struct {
	UploadURL string `json:"upload_url"`
	R2Key     string `json:"r2_key"`
	PublicURL string `json:"public_url"`
	FileName  string `json:"file_name"`
	FileType  string `json:"file_type"`
	MimeType  string `json:"mime_type"`
}

type ConfirmUploadRequest struct {
	FolderID        *int32   `json:"folder_id"`
	Name            string   `json:"name"`
	R2Key           string   `json:"r2_key"`
	PublicURL       string   `json:"public_url"`
	FileType        string   `json:"file_type"`
	Extension       string   `json:"extension"`
	MimeType        string   `json:"mime_type"`
	FileSizeBytes   int64    `json:"file_size_bytes"`
	Dimensions      string   `json:"dimensions"`
	DurationSeconds *int32   `json:"duration_seconds"`
	Tags            []string `json:"tags"`
	UploadedBy      *int64   `json:"uploaded_by"`
}

type PaginatedAssetsResponse struct {
	Items      []queries.MediaAsset `json:"items"`
	TotalCount int64                `json:"total_count"`
	Page       int32                `json:"page"`
	Limit      int32                `json:"limit"`
	TotalPages int32                `json:"total_pages"`
}

type SyncStats struct {
	FoldersCreated int `json:"folders_created"`
	AssetsCreated  int `json:"assets_created"`
	AssetsUpdated  int `json:"assets_updated"`
}

type mediaAssetsService struct {
	queries *queries.Queries
	r2Svc   *r2service.R2Service
}

func NewMediaAssetsService(q *queries.Queries, r2 *r2service.R2Service) MediaAssetsService {
	return &mediaAssetsService{
		queries: q,
		r2Svc:   r2,
	}
}

// slugify converts a human folder name into a clean URL-safe slug.
func slugify(name string) string {
	lower := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	for _, r := range lower {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			if b.Len() > 0 && !strings.HasSuffix(b.String(), "-") {
				b.WriteRune('-')
			}
		}
	}
	res := strings.Trim(b.String(), "-")
	if res == "" {
		res = "folder"
	}
	return res
}

// DetectFileType categorizes a file extension into visual groupings.
func DetectFileType(ext string) string {
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	switch ext {
	case "png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "ico":
		return "image"
	case "mp4", "webm", "mov", "mkv", "avi", "wmv", "m4v":
		return "video"
	case "ai", "eps", "svg", "cdr":
		return "vector"
	case "blend", "fbx", "obj", "gltf", "glb", "3ds", "c4d":
		return "3d"
	case "psd", "fig", "sketch", "xd":
		return "design"
	case "pdf", "doc", "docx", "txt", "md", "csv", "xlsx":
		return "document"
	case "zip", "tar", "gz", "7z", "rar":
		return "archive"
	case "mp3", "wav", "ogg", "aac", "flac":
		return "audio"
	default:
		return "other"
	}
}

// CreateFolder creates both a database record and an empty .keep marker in Cloudflare R2.
func (s *mediaAssetsService) CreateFolder(ctx context.Context, name string, parentID *int32, description string, createdBy *int64) (queries.AssetFolder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return queries.AssetFolder{}, fmt.Errorf("folder name cannot be empty")
	}

	slug := slugify(name)
	prefix := "assets/" + slug + "/"

	var parentPID pgtype.Int4
	if parentID != nil && *parentID > 0 {
		parent, err := s.queries.GetAssetFolderByID(ctx, *parentID)
		if err != nil {
			return queries.AssetFolder{}, fmt.Errorf("parent folder not found: %w", err)
		}
		parentPID = pgtype.Int4{Int32: *parentID, Valid: true}
		prefix = strings.TrimSuffix(parent.R2Prefix, "/") + "/" + slug + "/"
	}

	var createdByVal pgtype.Int8
	if createdBy != nil && *createdBy > 0 {
		createdByVal = pgtype.Int8{Int64: *createdBy, Valid: true}
	}

	// 1. Create in DB
	folder, err := s.queries.CreateAssetFolder(ctx, queries.CreateAssetFolderParams{
		Name:        name,
		Slug:        slug,
		ParentID:    parentPID,
		R2Prefix:    prefix,
		Description: pgtype.Text{String: description, Valid: description != ""},
		CreatedBy:   createdByVal,
	})
	if err != nil {
		return queries.AssetFolder{}, fmt.Errorf("failed to create asset folder in db: %w", err)
	}

	// 2. Persist in Cloudflare R2
	if err := s.r2Svc.CreateFolderMarker(ctx, prefix); err != nil {
		// Log error, but proceed as database record is primary
		_ = err
	}

	return folder, nil
}

func (s *mediaAssetsService) ListFolders(ctx context.Context, parentID *int32) ([]queries.AssetFolder, error) {
	if parentID == nil || *parentID <= 0 {
		return s.queries.ListRootAssetFolders(ctx)
	}
	return s.queries.ListSubFolders(ctx, pgtype.Int4{Int32: *parentID, Valid: true})
}

func (s *mediaAssetsService) GetFolderByID(ctx context.Context, id int32) (queries.AssetFolder, error) {
	return s.queries.GetAssetFolderByID(ctx, id)
}

func (s *mediaAssetsService) DeleteFolder(ctx context.Context, id int32) error {
	folder, err := s.queries.GetAssetFolderByID(ctx, id)
	if err != nil {
		return fmt.Errorf("folder not found: %w", err)
	}

	// 1. Delete in DB (CASCADE will delete subfolders and nullify folder_id in media_assets)
	if err := s.queries.DeleteAssetFolder(ctx, id); err != nil {
		return fmt.Errorf("failed to delete folder from db: %w", err)
	}

	// 2. Clean up R2 objects under this prefix
	go func(prefix string) {
		_ = s.r2Svc.DeletePrefix(context.Background(), prefix)
	}(folder.R2Prefix)

	return nil
}

func (s *mediaAssetsService) GetUploadPresignedURL(ctx context.Context, folderID *int32, filename string, contentType string, uploadedBy *int64) (*UploadPresignResponse, error) {
	cleanName := filepath.Base(filename)
	ext := filepath.Ext(cleanName)
	if ext == "" {
		ext = ".bin"
	}
	fileType := DetectFileType(ext)

	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}

	prefix := "assets/"
	if folderID != nil && *folderID > 0 {
		folder, err := s.queries.GetAssetFolderByID(ctx, *folderID)
		if err == nil {
			prefix = folder.R2Prefix
		}
	}

	key := strings.TrimSuffix(prefix, "/") + "/" + cleanName

	// Generate 15-minute presigned PUT URL
	url, err := s.r2Svc.PresignedUploadURL(ctx, key, contentType, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("failed to generate upload URL: %w", err)
	}

	return &UploadPresignResponse{
		UploadURL: url,
		R2Key:     key,
		PublicURL: s.r2Svc.PublicURL(key),
		FileName:  cleanName,
		FileType:  fileType,
		MimeType:  contentType,
	}, nil
}

func (s *mediaAssetsService) ConfirmAssetUpload(ctx context.Context, req ConfirmUploadRequest) (queries.MediaAsset, error) {
	var folderPID pgtype.Int4
	if req.FolderID != nil && *req.FolderID > 0 {
		folderPID = pgtype.Int4{Int32: *req.FolderID, Valid: true}
	}

	var durationVal pgtype.Int4
	if req.DurationSeconds != nil {
		durationVal = pgtype.Int4{Int32: *req.DurationSeconds, Valid: true}
	}

	var uploadedByVal pgtype.Int8
	if req.UploadedBy != nil && *req.UploadedBy > 0 {
		uploadedByVal = pgtype.Int8{Int64: *req.UploadedBy, Valid: true}
	}

	ext := req.Extension
	if ext == "" {
		ext = filepath.Ext(req.Name)
	}
	if req.FileType == "" {
		req.FileType = DetectFileType(ext)
	}
	if req.PublicURL == "" {
		req.PublicURL = s.r2Svc.PublicURL(req.R2Key)
	}

	asset, err := s.queries.CreateMediaAsset(ctx, queries.CreateMediaAssetParams{
		FolderID:        folderPID,
		Name:            req.Name,
		R2Key:           req.R2Key,
		PublicUrl:       req.PublicURL,
		FileType:        req.FileType,
		Extension:       ext,
		MimeType:        req.MimeType,
		FileSizeBytes:   req.FileSizeBytes,
		Dimensions:      pgtype.Text{String: req.Dimensions, Valid: req.Dimensions != ""},
		DurationSeconds: durationVal,
		Tags:            req.Tags,
		UploadedBy:      uploadedByVal,
	})
	if err != nil {
		return queries.MediaAsset{}, fmt.Errorf("failed to save asset to db: %w", err)
	}

	return asset, nil
}

func (s *mediaAssetsService) ListAssets(ctx context.Context, folderID *int32, fileType string, search string, page, limit int32) (*PaginatedAssetsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	offset := (page - 1) * limit

	var folderPID pgtype.Int4
	if folderID != nil && *folderID > 0 {
		folderPID = pgtype.Int4{Int32: *folderID, Valid: true}
	}

	var fType pgtype.Text
	if fileType != "" && fileType != "all" {
		fType = pgtype.Text{String: fileType, Valid: true}
	}

	var sTerm pgtype.Text
	if search != "" {
		sTerm = pgtype.Text{String: search, Valid: true}
	}

	items, err := s.queries.ListMediaAssetsByFolder(ctx, queries.ListMediaAssetsByFolderParams{
		FolderID:    folderPID,
		FileType:    fType,
		Search:      sTerm,
		LimitCount:  limit,
		OffsetCount: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list assets: %w", err)
	}

	totalCount, err := s.queries.CountMediaAssetsByFolder(ctx, queries.CountMediaAssetsByFolderParams{
		FolderID: folderPID,
		FileType: fType,
		Search:   sTerm,
	})
	if err != nil {
		totalCount = int64(len(items))
	}

	totalPages := int32((totalCount + int64(limit) - 1) / int64(limit))

	return &PaginatedAssetsResponse{
		Items:      items,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (s *mediaAssetsService) GetAssetByID(ctx context.Context, id int32) (queries.MediaAsset, error) {
	return s.queries.GetMediaAssetByID(ctx, id)
}

func (s *mediaAssetsService) DeleteAsset(ctx context.Context, id int32) error {
	asset, err := s.queries.GetMediaAssetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("asset not found: %w", err)
	}

	if err := s.queries.DeleteMediaAsset(ctx, id); err != nil {
		return fmt.Errorf("failed to delete asset from db: %w", err)
	}

	// Purge from R2 & Cloudflare edge CDN
	go func(key string) {
		_ = s.r2Svc.DeleteObject(context.Background(), key)
		_ = s.r2Svc.PurgeCloudflareCache(context.Background(), key)
	}(asset.R2Key)

	return nil
}

// SyncFromR2 crawls Cloudflare R2 bucket under the given rootPrefix (defaults to "assets/")
// and automatically reconciles folders and files into PostgreSQL.
func (s *mediaAssetsService) SyncFromR2(ctx context.Context, rootPrefix string) (*SyncStats, error) {
	if rootPrefix == "" {
		rootPrefix = "assets/"
	}
	rootPrefix = strings.TrimSuffix(rootPrefix, "/") + "/"

	stats := &SyncStats{}
	folderCache := make(map[string]int32) // prefix -> folder_id

	var continuationToken string
	for {
		res, err := s.r2Svc.ListObjects(ctx, rootPrefix, "", continuationToken, 1000)
		if err != nil {
			return nil, fmt.Errorf("failed listing objects from r2: %w", err)
		}

		for _, obj := range res.Objects {
			// Skip empty folder markers themselves
			isMarker := strings.HasSuffix(obj.Key, "/.keep") || strings.HasSuffix(obj.Key, "/.gitkeep")

			dir := filepath.Dir(obj.Key)
			if dir == "." {
				dir = ""
			} else {
				dir = strings.Trim(dir, "/") + "/"
			}

			// Ensure folder hierarchy exists in DB
			var currentFolderID *int32
			if dir != "" {
				currentFolderID, err = s.ensureFolderChain(ctx, dir, folderCache, stats)
				if err != nil {
					continue
				}
			}

			if isMarker {
				continue
			}

			// Upsert file
			filename := filepath.Base(obj.Key)
			ext := filepath.Ext(filename)
			fileType := DetectFileType(ext)
			mimeType := mime.TypeByExtension(ext)
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			var fID pgtype.Int4
			if currentFolderID != nil {
				fID = pgtype.Int4{Int32: *currentFolderID, Valid: true}
			}

			_, err = s.queries.CreateMediaAsset(ctx, queries.CreateMediaAssetParams{
				FolderID:      fID,
				Name:          filename,
				R2Key:         obj.Key,
				PublicUrl:     s.r2Svc.PublicURL(obj.Key),
				FileType:      fileType,
				Extension:     ext,
				MimeType:      mimeType,
				FileSizeBytes: obj.Size,
				Tags:          []string{},
			})
			if err == nil {
				stats.AssetsCreated++
			}
		}

		if !res.IsTruncated || res.NextToken == "" {
			break
		}
		continuationToken = res.NextToken
	}

	return stats, nil
}

// ensureFolderChain creates all parent and intermediate folders for an R2 key prefix.
func (s *mediaAssetsService) ensureFolderChain(ctx context.Context, fullPrefix string, cache map[string]int32, stats *SyncStats) (*int32, error) {
	fullPrefix = strings.Trim(fullPrefix, "/") + "/"
	if id, ok := cache[fullPrefix]; ok {
		return &id, nil
	}

	parts := strings.Split(strings.Trim(fullPrefix, "/"), "/")
	var currentParentID *int32
	var currentPrefix string

	for _, part := range parts {
		currentPrefix += part + "/"
		if id, ok := cache[currentPrefix]; ok {
			pID := id
			currentParentID = &pID
			continue
		}

		// Check if exists in DB
		existing, err := s.queries.GetAssetFolderByPrefix(ctx, currentPrefix)
		if err == nil {
			cache[currentPrefix] = existing.ID
			pID := existing.ID
			currentParentID = &pID
			continue
		}

		// Create in DB
		var parentPID pgtype.Int4
		if currentParentID != nil {
			parentPID = pgtype.Int4{Int32: *currentParentID, Valid: true}
		}

		created, err := s.queries.CreateAssetFolder(ctx, queries.CreateAssetFolderParams{
			Name:     part,
			Slug:     slugify(part),
			ParentID: parentPID,
			R2Prefix: currentPrefix,
		})
		if err != nil {
			return nil, err
		}

		stats.FoldersCreated++
		cache[currentPrefix] = created.ID
		pID := created.ID
		currentParentID = &pID
	}

	return currentParentID, nil
}

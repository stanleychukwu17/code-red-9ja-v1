package files

import (
	"context"
	"free9ja/api/internal/db/queries"
	r2service "free9ja/api/internal/service/r2"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// FilesService provides business logic for file-related operations.
type FilesService interface {
	CreateFile(ctx context.Context, arg queries.CreateFileParams) (queries.File, error)
	ConfirmUpload(ctx context.Context, arg queries.ConfirmUploadParams) (queries.File, error)
	GetFileByID(ctx context.Context, id int64) (queries.File, error)
	GetFileByKey(ctx context.Context, fileKey string) (queries.File, error)
	ListFiles(ctx context.Context, arg queries.ListFilesParams) ([]queries.File, error)
	MarkFileDeleted(ctx context.Context, id int64) (queries.File, error)
	HardDeleteFile(ctx context.Context, id int64) error
	CheckFileOwner(ctx context.Context, fileID int64, ownerID int64) (bool, error)
	UpdateFileOwner(ctx context.Context, fileID int64, ownerID int64) (queries.File, error)
	DeleteAssetAsync(rawURL string, fileID int64)
}

type filesService struct {
	queries *queries.Queries
	r2Svc   *r2service.R2Service
}

// NewFilesService creates a new instance of FilesService.
func NewFilesService(q *queries.Queries, r2Svc *r2service.R2Service) FilesService {
	return &filesService{
		queries: q,
		r2Svc:   r2Svc,
	}
}

// DeleteAssetAsync extracts an R2 object key from a URL and asynchronously deletes
// the object from Cloudflare R2, purges the CDN cache, and hard-deletes the DB file record.
func (s *filesService) DeleteAssetAsync(rawURL string, fileID int64) {
	if (rawURL == "" && fileID <= 0) || s.r2Svc == nil {
		return
	}

	// Example URL: https://pub-xxx.r2.dev/parties/2026-07-13/A.webp
	// We can extract the key by stripping the domain prefix. We'll find ".dev/" or ".com/" and take the rest.
	var key string
	if idx := strings.Index(rawURL, ".dev/"); idx != -1 {
		key = rawURL[idx+5:]
	} else if idx := strings.Index(rawURL, ".com/"); idx != -1 {
		key = rawURL[idx+5:]
	}

	if key == "" && fileID <= 0 {
		return
	}

	go func(k string, fID int64) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if k != "" {
			if delErr := s.r2Svc.DeleteObject(ctx, k); delErr == nil {
				_ = s.r2Svc.PurgeCloudflareCache(ctx, k)
			}
		}

		if fID > 0 {
			_ = s.HardDeleteFile(ctx, fID)
		} else if k != "" {
			if oldFile, err := s.GetFileByKey(ctx, k); err == nil && oldFile.ID > 0 {
				_ = s.HardDeleteFile(ctx, oldFile.ID)
			}
		}
	}(key, fileID)
}

// CreateFile creates a new file record with uploading status.
func (s *filesService) CreateFile(ctx context.Context, arg queries.CreateFileParams) (queries.File, error) {
	return s.queries.CreateFile(ctx, arg)
}

// ConfirmUpload marks a file upload as complete or failed.
func (s *filesService) ConfirmUpload(ctx context.Context, arg queries.ConfirmUploadParams) (queries.File, error) {
	return s.queries.ConfirmUpload(ctx, arg)
}

// GetFileByID returns a file by its ID.
func (s *filesService) GetFileByID(ctx context.Context, id int64) (queries.File, error) {
	return s.queries.GetFileByID(ctx, id)
}

// GetFileByKey returns a file by its unique storage key.
func (s *filesService) GetFileByKey(ctx context.Context, fileKey string) (queries.File, error) {
	return s.queries.GetFileByKey(ctx, fileKey)
}

// ListFiles lists files matching the provided filter parameters.
func (s *filesService) ListFiles(ctx context.Context, arg queries.ListFilesParams) ([]queries.File, error) {
	return s.queries.ListFiles(ctx, arg)
}

// MarkFileDeleted marks a file as deleted (soft delete).
func (s *filesService) MarkFileDeleted(ctx context.Context, id int64) (queries.File, error) {
	return s.queries.MarkFileDeleted(ctx, id)
}

// HardDeleteFile permanently deletes a file record from the database.
func (s *filesService) HardDeleteFile(ctx context.Context, id int64) error {
	return s.queries.HardDeleteFile(ctx, id)
}

// CheckFileOwner checks if a file exists with the given ID and owner ID.
func (s *filesService) CheckFileOwner(ctx context.Context, fileID int64, ownerID int64) (bool, error) {
	if fileID <= 0 || ownerID <= 0 {
		return false, nil
	}

	return s.queries.CheckFileOwner(ctx, queries.CheckFileOwnerParams{
		ID:      fileID,
		OwnerID: pgtype.Int8{Int64: ownerID, Valid: true},
	})
}

// UpdateFileOwner updates the owner of a file.
func (s *filesService) UpdateFileOwner(ctx context.Context, fileID int64, ownerID int64) (queries.File, error) {
	return s.queries.UpdateFileOwner(ctx, queries.UpdateFileOwnerParams{
		ID:      fileID,
		OwnerID: pgtype.Int8{Int64: ownerID, Valid: true},
	})
}

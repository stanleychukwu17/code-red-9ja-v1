package files

import (
	"context"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
)

// FilesService provides business logic for file-related operations.
type FilesService interface {
	CheckFileOwner(ctx context.Context, fileID int64, ownerID int64) (bool, error)
	GetFileByID(ctx context.Context, id int64) (queries.File, error)
}

type filesService struct {
	db *queries.Queries
}

// NewFilesService creates a new instance of FilesService.
func NewFilesService(db *queries.Queries) FilesService {
	return &filesService{
		db: db,
	}
}

// CheckFileOwner checks if a file exists with the given ID and owner ID.
func (s *filesService) CheckFileOwner(ctx context.Context, fileID int64, ownerID int64) (bool, error) {
	if fileID <= 0 || ownerID <= 0 {
		return false, nil
	}

	return s.db.CheckFileOwner(ctx, queries.CheckFileOwnerParams{
		ID:      fileID,
		OwnerID: pgtype.Int8{Int64: ownerID, Valid: true},
	})
}

// GetFileByID returns a file by its ID.
func (s *filesService) GetFileByID(ctx context.Context, id int64) (queries.File, error) {
	return s.db.GetFileByID(ctx, id)
}

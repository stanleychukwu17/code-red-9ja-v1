package feedservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Allowed target types
const (
	TargetCampaignGroup = "campaign_group"
	TargetParty         = "party"
	TargetPartyChapter  = "party_chapter"
	TargetUserWall      = "user_wall"
	TargetGeneralGroup  = "general_group"
)

type CreatePostMediaInput struct {
	FileID          *int64  `json:"file_id"`
	MediaType       string  `json:"media_type"`
	URL             string  `json:"url"`
	ThumbnailURL    *string `json:"thumbnail_url"`
	Width           *int32  `json:"width"`
	Height          *int32  `json:"height"`
	DurationSeconds *int32  `json:"duration_seconds"`
	FileSizeBytes   *int64  `json:"file_size_bytes"`
	SortOrder       int16   `json:"sort_order"`
}

type CreatePostInput struct {
	AuthorID   int64                  `json:"-"`
	TargetType string                 `json:"target_type"`
	TargetID   int64                  `json:"target_id"`
	PostType   string                 `json:"post_type"`
	Visibility string                 `json:"visibility"`
	Content    string                 `json:"content"`
	Metadata   map[string]interface{} `json:"metadata"`
	Media      []CreatePostMediaInput `json:"media"`
}

type CreatePostResponse struct {
	Post  queries.FeedPost         `json:"post"`
	Media []queries.FeedPostMedium `json:"media"`
}

type FeedService struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
}

func NewFeedService(q *queries.Queries, pool *pgxpool.Pool) *FeedService {
	return &FeedService{
		queries: q,
		pool:    pool,
	}
}

// CreatePost creates a new post with optional media attachments in an atomic transaction.
func (s *FeedService) CreatePost(ctx context.Context, input CreatePostInput) (*CreatePostResponse, error) {
	if input.AuthorID <= 0 {
		return nil, errors.New("unauthorized: valid author required")
	}

	targetType := strings.TrimSpace(input.TargetType)
	if targetType == "" {
		return nil, errors.New("target_type is required")
	}

	if input.TargetID <= 0 {
		return nil, errors.New("target_id must be a positive identifier")
	}

	content := strings.TrimSpace(input.Content)
	if content == "" && len(input.Media) == 0 {
		return nil, errors.New("post must contain text content or at least one media item")
	}

	postType := strings.TrimSpace(input.PostType)
	if postType == "" {
		postType = "standard"
	}

	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = "public"
	}

	// Prepare metadata JSON bytes
	metadataBytes := []byte("{}")
	if input.Metadata != nil && len(input.Metadata) > 0 {
		b, err := json.Marshal(input.Metadata)
		if err == nil {
			metadataBytes = b
		}
	}

	hasMedia := len(input.Media) > 0

	// Execute post creation and media attachments within an atomic database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start database transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	postParams := queries.CreateFeedPostParams{
		AuthorID:   input.AuthorID,
		TargetType: targetType,
		TargetID:   input.TargetID,
		Content:    content,
		HasMedia:   hasMedia,
		PostType:   pgtype.Text{String: postType, Valid: true},
		Visibility: pgtype.Text{String: visibility, Valid: true},
		Metadata:   metadataBytes,
	}

	post, err := qtx.CreateFeedPost(ctx, postParams)
	if err != nil {
		return nil, fmt.Errorf("failed to insert feed post: %w", err)
	}

	createdMedia := make([]queries.FeedPostMedium, 0, len(input.Media))
	for idx, m := range input.Media {
		mediaType := strings.TrimSpace(m.MediaType)
		if mediaType == "" {
			mediaType = "image"
		}

		sortOrder := m.SortOrder
		if sortOrder == 0 {
			sortOrder = int16(idx)
		}

		mediaParams := queries.CreateFeedPostMediaParams{
			PostID:    post.ID,
			MediaType: mediaType,
			Url:       m.URL,
			SortOrder: pgtype.Int2{Int16: sortOrder, Valid: true},
		}

		if m.FileID != nil {
			mediaParams.FileID = pgtype.Int8{Int64: *m.FileID, Valid: true}
		}
		if m.ThumbnailURL != nil {
			mediaParams.ThumbnailUrl = pgtype.Text{String: *m.ThumbnailURL, Valid: true}
		}
		if m.Width != nil {
			mediaParams.Width = pgtype.Int4{Int32: *m.Width, Valid: true}
		}
		if m.Height != nil {
			mediaParams.Height = pgtype.Int4{Int32: *m.Height, Valid: true}
		}
		if m.DurationSeconds != nil {
			mediaParams.DurationSeconds = pgtype.Int4{Int32: *m.DurationSeconds, Valid: true}
		}
		if m.FileSizeBytes != nil {
			mediaParams.FileSizeBytes = pgtype.Int8{Int64: *m.FileSizeBytes, Valid: true}
		}

		med, err := qtx.CreateFeedPostMedia(ctx, mediaParams)
		if err != nil {
			return nil, fmt.Errorf("failed to insert feed post media at index %d: %w", idx, err)
		}
		createdMedia = append(createdMedia, med)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit feed post transaction: %w", err)
	}

	return &CreatePostResponse{
		Post:  post,
		Media: createdMedia,
	}, nil
}

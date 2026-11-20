package supervisor_updates

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type usersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	rdb         *redis.Client
	distributor worker.TaskDistributor
	usersSvc    usersService
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, distributor worker.TaskDistributor, usersSvc usersService) *Service {
	return &Service{
		queries:     q,
		pool:        pool,
		rdb:         rdb,
		distributor: distributor,
		usersSvc:    usersSvc,
	}
}

type MediaItem struct {
	FileID          *int64 `json:"file_id,omitempty"`
	URL             string `json:"url"`
	MediaType       string `json:"media_type"`
	ThumbnailURL    string `json:"thumbnail_url,omitempty"`
	DurationSeconds *int32 `json:"duration_seconds,omitempty"`
	FileSizeBytes   *int64 `json:"file_size_bytes,omitempty"`
}

type CreateSupervisorUpdateInput struct {
	UserID          int64       `json:"user_id"`
	RoleType        string      `json:"role_type"`
	ElectionGroupID int32       `json:"election_group_id"`
	PartyID         *int16      `json:"party_id,omitempty"`
	StateID         int16       `json:"state_id"`
	LgaID           *int32      `json:"lga_id,omitempty"`
	WardID          *int32      `json:"ward_id,omitempty"`
	PollingUnitID   *int32      `json:"polling_unit_id,omitempty"`
	CategoryType    string      `json:"category_type"`
	Stage           string      `json:"stage"`
	Title           *string     `json:"title,omitempty"`
	Message         string      `json:"message"`
	Media           []MediaItem `json:"media,omitempty"`
	Latitude        *float64    `json:"latitude,omitempty"`
	Longitude       *float64    `json:"longitude,omitempty"`
	AccuracyMeters  *float64    `json:"accuracy_meters,omitempty"`
}

func (s *Service) CreateUpdate(ctx context.Context, input CreateSupervisorUpdateInput) (queries.SupervisorUpdate, error) {
	user, err := s.usersSvc.GetUserByFakeID(ctx, input.UserID)
	if err != nil {
		return queries.SupervisorUpdate{}, errors.New("user not found")
	}

	if input.ElectionGroupID <= 0 {
		return queries.SupervisorUpdate{}, errors.New("election_group_id is required")
	}

	if input.Message == "" {
		return queries.SupervisorUpdate{}, errors.New("message is required")
	}

	if input.RoleType == "" {
		return queries.SupervisorUpdate{}, errors.New("role_type is required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.SupervisorUpdate{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	hasMedia := len(input.Media) > 0
	partyID := utils.PgInt2FromPtrNullable(input.PartyID)

	var puID pgtype.Int4
	if input.PollingUnitID != nil && *input.PollingUnitID > 0 {
		puID = utils.PgInt4FromInt32(*input.PollingUnitID)
	}

	var lgaID pgtype.Int4
	if input.LgaID != nil && *input.LgaID > 0 {
		lgaID = utils.PgInt4FromInt32(*input.LgaID)
	}

	var wardID pgtype.Int4
	if input.WardID != nil && *input.WardID > 0 {
		wardID = utils.PgInt4FromInt32(*input.WardID)
	}

	update, err := qtx.CreateSupervisorUpdate(ctx, queries.CreateSupervisorUpdateParams{
		ElectionGroupID: input.ElectionGroupID,
		PartyID:         partyID,
		UserID:          user.ID,
		RoleType:        input.RoleType,
		StateID:         utils.PgInt2FromInt16(input.StateID),
		LgaID:           lgaID,
		WardID:          wardID,
		PollingUnitID:   puID,
		CategoryType:    input.CategoryType,
		Stage:           input.Stage,
		Title:           utils.PgTextFromPtr(input.Title),
		Message:         input.Message,
		HasMedia:        hasMedia,
		Latitude:        utils.PgFloat8FromPtr(input.Latitude),
		Longitude:       utils.PgFloat8FromPtr(input.Longitude),
		AccuracyMeters:  utils.PgFloat8FromPtr(input.AccuracyMeters),
	})
	if err != nil {
		return queries.SupervisorUpdate{}, fmt.Errorf("failed to create supervisor update: %w", err)
	}

	// Persist media attachments if present
	for _, m := range input.Media {
		mediaType := strings.ToLower(m.MediaType)
		if mediaType == "" {
			if isVideoURL(m.URL) {
				mediaType = "video"
			} else {
				mediaType = "image"
			}
		}

		var fileSizeBytes int64
		if m.FileSizeBytes != nil {
			fileSizeBytes = *m.FileSizeBytes
		}

		_, err = qtx.CreateSupervisorUpdateMedia(ctx, queries.CreateSupervisorUpdateMediaParams{
			UpdateID:        update.ID,
			FileID:          utils.PgInt8FromPtr(m.FileID),
			MediaType:       mediaType,
			Url:             m.URL,
			ThumbnailUrl:    utils.PgTextFromString(m.ThumbnailURL),
			DurationSeconds: utils.PgInt4FromPtr(m.DurationSeconds),
			FileSizeBytes:   fileSizeBytes,
		})
		if err != nil {
			return queries.SupervisorUpdate{}, fmt.Errorf("failed to save supervisor media: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.SupervisorUpdate{}, err
	}

	// Track collation milestones if applicable
	nowPg := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	if input.CategoryType == "collation_centre" {
		switch input.Stage {
		case "arrival_at_collation":
			switch input.RoleType {
			case "ward_election_supervisor":
				_, _ = s.queries.UpdateWardSupervisorTracking(ctx, queries.UpdateWardSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					ArrivedAt:       nowPg,
				})
			case "lga_election_supervisor":
				_, _ = s.queries.UpdateLgaSupervisorTracking(ctx, queries.UpdateLgaSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					ArrivedAt:       nowPg,
				})
			case "state_election_supervisor":
				_, _ = s.queries.UpdateStateSupervisorTracking(ctx, queries.UpdateStateSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					ArrivedAt:       nowPg,
				})
			}
		case "collation_concluded":
			switch input.RoleType {
			case "ward_election_supervisor":
				_, _ = s.queries.UpdateWardSupervisorTracking(ctx, queries.UpdateWardSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					CompletedAt:     nowPg,
				})
			case "lga_election_supervisor":
				_, _ = s.queries.UpdateLgaSupervisorTracking(ctx, queries.UpdateLgaSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					CompletedAt:     nowPg,
				})
			case "state_election_supervisor":
				_, _ = s.queries.UpdateStateSupervisorTracking(ctx, queries.UpdateStateSupervisorTrackingParams{
					UserID:          user.ID,
					ElectionGroupID: input.ElectionGroupID,
					CompletedAt:     nowPg,
				})
			}
		}
	}

	slog.Info("supervisor_updates: created update", "id", update.ID, "role", input.RoleType, "user_id", user.ID)
	return update, nil
}

func (s *Service) ListUpdates(ctx context.Context, params queries.ListSupervisorUpdatesParams) ([]queries.ListSupervisorUpdatesRow, error) {
	return s.queries.ListSupervisorUpdates(ctx, params)
}

func (s *Service) GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupByID, id)
	if eg, ok := utils.GetCachedJSON[queries.ElectionGroup](ctx, s.rdb, cacheKey); ok && eg.ID > 0 {
		return eg, nil
	}

	eg, err := s.queries.GetElectionGroupByID(ctx, id)
	if err != nil {
		return queries.ElectionGroup{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, eg, db.RedisNinetyDaysTTL)
	return eg, nil
}

func isVideoURL(url string) bool {
	exts := []string{".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"}
	lower := strings.ToLower(url)
	for _, ext := range exts {
		if strings.HasSuffix(lower, ext) || strings.Contains(lower, "/video/upload/") {
			return true
		}
	}
	return false
}

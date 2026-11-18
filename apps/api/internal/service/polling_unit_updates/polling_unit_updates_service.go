package polling_unit_updates

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type usersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	earningsSvc earningsService
	usersSvc    usersService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, earningsSvc earningsService, usersSvc usersService) *Service {
	return &Service{
		queries:     q,
		pool:        pool,
		earningsSvc: earningsSvc,
		usersSvc:    usersSvc,
	}
}

type MediaItem struct {
	URL             string `json:"url"`
	MediaType       string `json:"media_type"`
	ThumbnailURL    string `json:"thumbnail_url,omitempty"`
	DurationSeconds *int32 `json:"duration_seconds,omitempty"`
	FileSizeBytes   *int64 `json:"file_size_bytes,omitempty"`
}

type CreateUpdateInput struct {
	UserID            int64       `json:"user_id"`
	PollingUnitID     int32       `json:"polling_unit_id"`
	ElectionGroupID   int32       `json:"election_group_id"`
	AssignmentID      *int64      `json:"assignment_id,omitempty"`
	PartyID           *int16      `json:"party_id,omitempty"`
	StatusCategoryID  *int16      `json:"status_category_id,omitempty"`
	StatusOptionID    *int16      `json:"status_option_id,omitempty"`
	HasIssues         bool        `json:"has_issues"`
	IssueAction       string      `json:"issue_action,omitempty"`
	ExistingIssueIDs  []int64     `json:"existing_issue_ids,omitempty"`
	NewIssueOptionIDs []int16     `json:"new_issue_option_ids,omitempty"`
	Title             *string     `json:"title,omitempty"`
	Message           string      `json:"message"`
	Media             []MediaItem `json:"media,omitempty"`
	MediaUrls         []string    `json:"media_urls,omitempty"` // For backward compatibility with assignment handler
	Latitude          *float64    `json:"latitude,omitempty"`
	Longitude         *float64    `json:"longitude,omitempty"`
	AccuracyMeters    *float64    `json:"accuracy_meters,omitempty"`
	IsReport          bool        `json:"is_report,omitempty"` // For backward compatibility
}

func (s *Service) CreateUpdate(ctx context.Context, input CreateUpdateInput) (queries.PollingUnitUpdate, error) {
	// Fetch real User ID by FakeID using cached/optimized user service outside transaction
	user, err := s.usersSvc.GetUserByFakeID(ctx, input.UserID)
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("user not found")
	}

	// Start a transaction since we are updating multiple tables
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Fetch polling unit details for denormalized state/lga/ward
	pu, err := qtx.GetPollingUnitByID(ctx, input.PollingUnitID)
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("invalid polling unit id")
	}

	// Fetch LGA and Ward to get constituency IDs
	lga, err := qtx.GetLGAByID(ctx, pu.LgaID)
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("invalid lga for polling unit")
	}
	ward, err := qtx.GetWardByID(ctx, pu.WardID)
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("invalid ward for polling unit")
	}

	// Fetch ElectionGroup and check date
	electionGroup, err := qtx.GetElectionGroupByID(ctx, input.ElectionGroupID)
	if err != nil {
		return queries.PollingUnitUpdate{}, fmt.Errorf("invalid election group: %w", err)
	}
	now := time.Now().UTC()
	if now.Year() > electionGroup.ElectionDate.Time.Year() {
		return queries.PollingUnitUpdate{}, errors.New("updates can only be submitted during the election cycle")
	}

	assignmentID := utils.PgInt8FromPtr(input.AssignmentID)
	partyID := utils.PgInt2FromPtrNullable(input.PartyID)

	// Consolidate legacy MediaUrls into Media if empty
	mediaItems := input.Media
	if len(mediaItems) == 0 && len(input.MediaUrls) > 0 {
		for _, u := range input.MediaUrls {
			mediaType := "image"
			if isVideoURL(u) {
				mediaType = "video"
			}
			mediaItems = append(mediaItems, MediaItem{
				URL:       u,
				MediaType: mediaType,
			})
		}
	}
	hasMedia := len(mediaItems) > 0

	// Handle title
	var title pgtype.Text
	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		title = pgtype.Text{String: strings.TrimSpace(*input.Title), Valid: true}
	}

	// Handle coordinates
	var latitude, longitude, accuracyMeters pgtype.Float8
	if input.Latitude != nil {
		latitude = pgtype.Float8{Float64: *input.Latitude, Valid: true}
	}
	if input.Longitude != nil {
		longitude = pgtype.Float8{Float64: *input.Longitude, Valid: true}
	}
	if input.AccuracyMeters != nil {
		accuracyMeters = pgtype.Float8{Float64: *input.AccuracyMeters, Valid: true}
	}

	hasIssues := input.HasIssues || input.IsReport || len(input.NewIssueOptionIDs) > 0
	statusCategoryID := utils.PgInt2FromPtrNullable(input.StatusCategoryID)
	statusOptionID := utils.PgInt2FromPtrNullable(input.StatusOptionID)

	// Insert the update
	update, err := qtx.CreatePollingUnitUpdate(ctx, queries.CreatePollingUnitUpdateParams{
		AssignmentID:                assignmentID,
		UserID:                      user.ID,
		PollingUnitID:               input.PollingUnitID,
		ElectionGroupID:             input.ElectionGroupID,
		PartyID:                     partyID,
		StateID:                     utils.PgInt2FromPositive(pu.StateID),
		LgaID:                       utils.PgInt4FromPositive(pu.LgaID),
		WardID:                      utils.PgInt4FromPositive(pu.WardID),
		SenatorialDistrictID:        lga.SenatorialDistrictID,
		FederalConstituencyID:       lga.FederalConstituencyID,
		StateAssemblyConstituencyID: ward.StateConstituencyID,
		StatusCategoryID:            statusCategoryID,
		StatusOptionID:              statusOptionID,
		HasIssues:                   pgtype.Bool{Bool: hasIssues, Valid: true},
		Title:                       title,
		Message:                     input.Message,
		HasMedia:                    hasMedia,
		Latitude:                    latitude,
		Longitude:                   longitude,
		AccuracyMeters:              accuracyMeters,
	})
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	// Insert media attachments
	for _, m := range mediaItems {
		mediaType := m.MediaType
		if mediaType == "" {
			if isVideoURL(m.URL) {
				mediaType = "video"
			} else {
				mediaType = "image"
			}
		}
		var thumb pgtype.Text
		if m.ThumbnailURL != "" {
			thumb = pgtype.Text{String: m.ThumbnailURL, Valid: true}
		}
		var dur pgtype.Int4
		if m.DurationSeconds != nil {
			dur = pgtype.Int4{Int32: *m.DurationSeconds, Valid: true}
		}
		var sizeBytes int64
		if m.FileSizeBytes != nil {
			sizeBytes = *m.FileSizeBytes
		}
		_, err = qtx.CreatePollingUnitUpdateMedia(ctx, queries.CreatePollingUnitUpdateMediaParams{
			UpdateID:        update.ID,
			MediaType:       mediaType,
			Url:             m.URL,
			ThumbnailUrl:    thumb,
			DurationSeconds: dur,
			FileSizeBytes:   sizeBytes,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to save update media: %w", err)
		}
	}

	// Close/resolve active issues if linking existing issue as resolved
	if input.IssueAction == "link_existing" && len(input.ExistingIssueIDs) > 0 {
		if err := qtx.ResolvePollingUnitIssues(ctx, input.ExistingIssueIDs); err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to resolve issues: %w", err)
		}
	}

	// Create new active issues if reported
	for _, optID := range input.NewIssueOptionIDs {
		opt, err := qtx.GetIssueOptionByID(ctx, optID)
		if err != nil {
			continue // skip invalid option
		}
		_, err = qtx.CreatePollingUnitIssue(ctx, queries.CreatePollingUnitIssueParams{
			UpdateID:        pgtype.Int8{Int64: update.ID, Valid: true},
			ElectionGroupID: input.ElectionGroupID,
			PartyID:         partyID,
			UserID:          user.ID,
			AssignmentID:    assignmentID,
			PollingUnitID:   input.PollingUnitID,
			IssueCategoryID: opt.IssueCategoryID,
			IssueOptionID:   opt.ID,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to save issue: %w", err)
		}
	}

	// Calculate increments
	var reportsInc, updatesInc int32
	if hasIssues {
		reportsInc = 1
	} else {
		updatesInc = 1
	}

	// Increment Election Metrics (all races in this group)
	err = qtx.IncrementElectionMetricsByGroup(ctx, queries.IncrementElectionMetricsByGroupParams{
		ElectionGroupID: input.ElectionGroupID,
		ReportsCount:    reportsInc,
		UpdatesCount:    updatesInc,
	})
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	// Increment Assignment & Party Metrics if provided
	if input.AssignmentID != nil {
		err = qtx.IncrementPollingUnitAssignmentMetrics(ctx, queries.IncrementPollingUnitAssignmentMetricsParams{
			ID:           *input.AssignmentID,
			ReportsCount: reportsInc,
			UpdatesCount: updatesInc,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	if input.AssignmentID != nil && s.earningsSvc != nil {
		updateNarration := "Update: Given"
		if len(mediaItems) > 0 {
			hasVideo := false
			hasImage := false
			for _, m := range mediaItems {
				if m.MediaType == "video" || isVideoURL(m.URL) {
					hasVideo = true
				} else if m.MediaType == "image" {
					hasImage = true
				}
			}
			if hasVideo {
				updateNarration = "Update: Given (w/ video)"
			} else if hasImage {
				updateNarration = "Update: Given (w/ image)"
			}
		}

		go s.earningsSvc.ProcessTaskEarnings(context.Background(), *input.AssignmentID, "updates", updateNarration)
	}

	return update, nil
}

func (s *Service) ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error) {
	return s.queries.ListPollingUnitUpdates(ctx, params)
}

func (s *Service) GetActiveIssues(ctx context.Context, pollingUnitID int32) ([]queries.ListActivePollingUnitIssuesRow, error) {
	return s.queries.ListActivePollingUnitIssues(ctx, pollingUnitID)
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

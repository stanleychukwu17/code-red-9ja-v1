package polling_unit_updates

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

type CreateUpdateInput struct {
	UserID                      int64              `json:"user_id"`
	AssignmentID                int64              `json:"assignment_id"`
	PollingUnitID               int32              `json:"polling_unit_id"`
	ElectionGroupID             int32              `json:"election_group_id"`
	PartyID                     *int16             `json:"party_id,omitempty"`
	StateID                     int32              `json:"state_id,omitempty"`
	LgaID                       int32              `json:"lga_id,omitempty"`
	WardID                      int32              `json:"ward_id,omitempty"`
	SenatorialDistrictID        pgtype.Int4        `json:"senatorial_district_id,omitempty"`
	FederalConstituencyID       pgtype.Int4        `json:"federal_constituency_id,omitempty"`
	StateAssemblyConstituencyID pgtype.Int4        `json:"state_assembly_constituency_id,omitempty"`
	StatusCategoryID            *int16             `json:"status_category_id,omitempty"`
	StatusOptionID              *int16             `json:"status_option_id,omitempty"`
	HasIssues                   bool               `json:"has_issues"`
	IssueAction                 string             `json:"issue_action,omitempty"`
	ExistingIssueIDs            []int64            `json:"existing_issue_ids,omitempty"`
	NewIssueOptionIDs           []int16            `json:"new_issue_option_ids,omitempty"`
	Title                       *string            `json:"title,omitempty"`
	Message                     string             `json:"message"`
	Media                       []MediaItem        `json:"media,omitempty"`
	Latitude                    *float64           `json:"latitude,omitempty"`
	Longitude                   *float64           `json:"longitude,omitempty"`
	AccuracyMeters              *float64           `json:"accuracy_meters,omitempty"`
	CreatedAt                   *time.Time         `json:"created_at,omitempty"`
	AssignmentArrivedAt         pgtype.Timestamptz `json:"assignment_arrived_at,omitempty"`
	AssignmentElectionStartedAt pgtype.Timestamptz `json:"assignment_election_started_at,omitempty"`
	AssignmentElectionEndedAt   pgtype.Timestamptz `json:"assignment_election_ended_at,omitempty"`
}

func (s *Service) CreateUpdate(ctx context.Context, input CreateUpdateInput) (queries.PollingUnitUpdate, error) {
	// Fetch real User ID by FakeID using cached/optimized user service outside transaction
	user, err := s.usersSvc.GetUserByFakeID(ctx, input.UserID)
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("user not found")
	}

	if input.StateID == 0 {
		return queries.PollingUnitUpdate{}, errors.New("missing resolved location details for polling unit")
	}

	if input.StatusCategoryID == nil || *input.StatusCategoryID <= 0 {
		return queries.PollingUnitUpdate{}, errors.New("status_category_id is required")
	}

	// Pre-resolve and validate issue options via Redis cache (1 year TTL) before beginning transaction
	type issueItem struct {
		categoryID int16
		optionID   int16
	}
	var validIssues []issueItem
	// We want to validate that all the issue options are valid before we create the update
	for _, optID := range input.NewIssueOptionIDs {
		opt, err := s.GetIssueOptionByID(ctx, optID)
		if err != nil {
			continue // skip invalid option
		}

		validIssues = append(validIssues, issueItem{
			categoryID: opt.IssueCategoryID,
			optionID:   opt.ID,
		})
	}

	// Start a transaction since we are updating multiple tables
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	hasIssues := input.HasIssues || len(validIssues) > 0
	partyID := utils.PgInt2FromPtrNullable(input.PartyID)

	var createdAtPg pgtype.Timestamptz
	if input.CreatedAt != nil && !input.CreatedAt.IsZero() {
		createdAtPg = pgtype.Timestamptz{Time: input.CreatedAt.UTC(), Valid: true}
	}

	// Insert the update
	update, err := qtx.CreatePollingUnitUpdate(ctx, queries.CreatePollingUnitUpdateParams{
		AssignmentID:                input.AssignmentID,
		UserID:                      user.ID,
		PollingUnitID:               input.PollingUnitID,
		ElectionGroupID:             input.ElectionGroupID,
		PartyID:                     partyID,
		StateID:                     utils.PgInt2FromPositive(input.StateID),
		LgaID:                       utils.PgInt4FromPositive(input.LgaID),
		WardID:                      utils.PgInt4FromPositive(input.WardID),
		SenatorialDistrictID:        input.SenatorialDistrictID,
		FederalConstituencyID:       input.FederalConstituencyID,
		StateAssemblyConstituencyID: input.StateAssemblyConstituencyID,
		StatusCategoryID:            utils.PgInt2FromPtrNullable(input.StatusCategoryID),
		StatusOptionID:              utils.PgInt2FromPtrNullable(input.StatusOptionID),
		HasIssues:                   utils.PgBool(hasIssues),
		Title:                       utils.PgTextFromPtr(input.Title),
		Message:                     input.Message,
		HasMedia:                    len(input.Media) > 0,
		Latitude:                    utils.PgFloat8FromPtr(input.Latitude),
		Longitude:                   utils.PgFloat8FromPtr(input.Longitude),
		AccuracyMeters:              utils.PgFloat8FromPtr(input.AccuracyMeters),
		CreatedAt:                   createdAtPg,
	})
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	effectiveTimePg := update.CreatedAt
	if !effectiveTimePg.Valid {
		effectiveTimePg = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	}

	// Insert media attachments
	for _, m := range input.Media {
		mediaType := m.MediaType
		if mediaType == "" {
			if isVideoURL(m.URL) {
				mediaType = "video"
			} else {
				mediaType = "image"
			}
		}

		var sizeBytes int64
		if m.FileSizeBytes != nil {
			sizeBytes = *m.FileSizeBytes
		}

		_, err = qtx.CreatePollingUnitUpdateMedia(ctx, queries.CreatePollingUnitUpdateMediaParams{
			UpdateID:        update.ID,
			FileID:          utils.PgInt8FromPtr(m.FileID),
			MediaType:       mediaType,
			Url:             m.URL,
			ThumbnailUrl:    utils.PgTextFromString(m.ThumbnailURL),
			DurationSeconds: utils.PgInt4FromPtr(m.DurationSeconds),
			FileSizeBytes:   sizeBytes,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to save update media: %w", err)
		}
	}

	// Close/resolve active issues if linking existing issue as resolved
	if input.IssueAction == "link_existing" && len(input.ExistingIssueIDs) > 0 {
		if err := qtx.ResolvePollingUnitIssues(ctx, queries.ResolvePollingUnitIssuesParams{
			TimeIssueEnded: effectiveTimePg,
			IssueIds:       input.ExistingIssueIDs,
		}); err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to resolve issues: %w", err)
		}
	}

	// Create new active issues if reported
	for _, issue := range validIssues {
		_, err = qtx.CreatePollingUnitIssue(ctx, queries.CreatePollingUnitIssueParams{
			UpdateID:                    utils.PgInt8FromInt64(update.ID),
			ElectionGroupID:             input.ElectionGroupID,
			PartyID:                     partyID,
			UserID:                      user.ID,
			AssignmentID:                input.AssignmentID,
			StateID:                     utils.PgInt2FromPositive(input.StateID),
			LgaID:                       utils.PgInt4FromPositive(input.LgaID),
			WardID:                      utils.PgInt4FromPositive(input.WardID),
			SenatorialDistrictID:        input.SenatorialDistrictID,
			FederalConstituencyID:       input.FederalConstituencyID,
			StateAssemblyConstituencyID: input.StateAssemblyConstituencyID,
			PollingUnitID:               input.PollingUnitID,
			IssueCategoryID:             issue.categoryID,
			IssueOptionID:               issue.optionID,
			TimeIssueStarted:            effectiveTimePg,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, fmt.Errorf("failed to save issue: %w", err)
		}
	}

	// Commit pure append-only writes; live counters and metrics rollups are tracked via Redis
	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	// Prepare assignment tracking params in case this update triggers a primary election milestone
	var trackingParams queries.UpdateAssignmentTrackingParams
	trackingParams.ID = input.AssignmentID

	var milestoneTaskType string  // Target task key for async earnings calculation ("attendance", "election_start", "election_end")
	shouldUpdateTracking := false // Flips to true only when status matches an official milestone (arrival, start, end)

	switch *input.StatusCategoryID {
	case 1: // Just Arrived -> Attendance milestone (only if not already recorded)
		if !input.AssignmentArrivedAt.Valid {
			milestoneTaskType = "attendance"
			trackingParams.ArrivedAt = effectiveTimePg
			shouldUpdateTracking = true
		}

	case 3: // Active -> Election started milestone (only if not already recorded)
		if !input.AssignmentElectionStartedAt.Valid {
			milestoneTaskType = "election_start"
			trackingParams.ElectionStartedAt = effectiveTimePg
			shouldUpdateTracking = true
		}

	case 6: // Concluded -> Election ended milestone (only if not already recorded)
		if !input.AssignmentElectionEndedAt.Valid {
			milestoneTaskType = "election_end"
			trackingParams.ElectionEndedAt = effectiveTimePg
			shouldUpdateTracking = true
		}
	}

	if shouldUpdateTracking {
		if _, tErr := s.queries.UpdateAssignmentTracking(ctx, trackingParams); tErr != nil {
			slog.Warn("failed to update assignment tracking for status milestone", "assignmentID", input.AssignmentID, "statusCategoryID", input.StatusCategoryID, "err", tErr)
		} else {
			_ = s.rdb.Del(ctx, fmt.Sprintf("%s%d:eg:%d", db.RedisUserPollingUnitAssignment, user.ID, input.ElectionGroupID)).Err()
		}

		// Trigger milestone earnings calculation asynchronously
		_ = s.distributor.DistributeTaskCalculateAgentEarnings(context.Background(), &worker.CalculateAgentEarningsPayload{
			AssignmentID: input.AssignmentID,
			TaskType:     milestoneTaskType,
		})
	} else {
		// Routine periodic update: trigger 30-minute interval update earnings asynchronously
		_ = s.distributor.DistributeTaskCalculateAgentEarnings(context.Background(), &worker.CalculateAgentEarningsPayload{
			AssignmentID: input.AssignmentID,
			TaskType:     "updates",
		})
	}

	return update, nil
}

func (s *Service) ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error) {
	return s.queries.ListPollingUnitUpdates(ctx, params)
}

func (s *Service) GetActiveIssues(ctx context.Context, pollingUnitID int32) ([]queries.ListActivePollingUnitIssuesRow, error) {
	return s.queries.ListActivePollingUnitIssues(ctx, pollingUnitID)
}

// GetIssueOptionByID retrieves a single issue option by its ID, utilizing Redis cache (1 year TTL).
func (s *Service) GetIssueOptionByID(ctx context.Context, id int16) (queries.GetIssueOptionByIDRow, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisPollingUnitIssueOption, id)
	if opt, ok := utils.GetCachedJSON[queries.GetIssueOptionByIDRow](ctx, s.rdb, cacheKey); ok && opt.ID > 0 {
		return opt, nil
	}

	opt, err := s.queries.GetIssueOptionByID(ctx, id)
	if err != nil {
		return queries.GetIssueOptionByIDRow{}, err
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, opt, db.RedisOneYearTTL)
	return opt, nil
}

// GetElectionGroupByID retrieves an election group by its ID, utilizing Redis cache (90 days TTL).
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

package polling_unit_updates

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	earningsSvc earningsService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

func NewService(q *queries.Queries, pool *pgxpool.Pool) *Service {
	return &Service{
		queries: q,
		pool:    pool,
	}
}

func (s *Service) SetEarningsService(es earningsService) {
	s.earningsSvc = es
}

type CreateUpdateInput struct {
	UserID          int64    `json:"user_id"`
	PollingUnitID   int32    `json:"polling_unit_id"`
	ElectionGroupID int64    `json:"election_group_id"`
	AssignmentID    *int64   `json:"assignment_id,omitempty"`
	PartyID         *int16   `json:"party_id,omitempty"`
	Message         string   `json:"message"`
	MediaUrls       []string `json:"media_urls"`
	IsReport        bool     `json:"is_report"`
	ReportTypes     []string `json:"report_types"`
}

// updateScheduleConfig mirrors the JSON structure in system_settings for the
// 'update_schedule_config' key.
type updateScheduleConfig struct {
	StartTime       string `json:"start_time"`       // "HH:MM" (24-hour)
	EndTime         string `json:"end_time"`         // "HH:MM" (24-hour)
	IntervalMinutes int    `json:"interval_minutes"` // e.g. 30
}

// calcIntervalKey returns the floored interval bucket key ("HH:MM") for t
// based on interval_minutes.
//
// Examples with interval_minutes = 30:
//   - 06:15 AM -> "06:00"
//   - 07:25 AM -> "07:00"
//   - 07:32 AM -> "07:30"
//   - 17:45 PM -> "17:30"
func calcIntervalKey(t time.Time, cfg updateScheduleConfig) (string, error) {
	if cfg.IntervalMinutes <= 0 {
		cfg.IntervalMinutes = 30 // safe default
	}

	minute := t.Minute()
	flooredMinute := (minute / cfg.IntervalMinutes) * cfg.IntervalMinutes

	return fmt.Sprintf("%02d:%02d", t.Hour(), flooredMinute), nil
}

func (s *Service) CreateUpdate(ctx context.Context, input CreateUpdateInput) (queries.PollingUnitUpdate, error) {
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

	// Fetch real User ID by FakeID
	user, err := qtx.GetUserByFakeID(ctx, pgtype.Int8{Int64: input.UserID, Valid: true})
	if err != nil {
		return queries.PollingUnitUpdate{}, errors.New("user not found")
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
	if electionGroup.ElectionDate.Valid {
		now := time.Now().UTC()
		if now.Format("2006-01-02") != electionGroup.ElectionDate.Time.Format("2006-01-02") {
			return queries.PollingUnitUpdate{}, errors.New("updates can only be submitted on the election day")
		}
	}

	var assignmentID pgtype.Int8
	if input.AssignmentID != nil {
		assignmentID = pgtype.Int8{Int64: *input.AssignmentID, Valid: true}
	}

	var partyID pgtype.Int2
	if input.PartyID != nil {
		partyID = pgtype.Int2{Int16: int16(int16(*input.PartyID)), Valid: true}
	}

	// Insert the update
	update, err := qtx.CreatePollingUnitUpdate(ctx, queries.CreatePollingUnitUpdateParams{
		AssignmentID:                assignmentID,
		UserID:                      user.ID,
		PollingUnitID:               input.PollingUnitID,
		ElectionGroupID:             input.ElectionGroupID,
		PartyID:                     partyID,
		StateID:                     pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
		LgaID:                       pgtype.Int4{Int32: int32(pu.LgaID), Valid: true},
		WardID:                      pgtype.Int4{Int32: int32(pu.WardID), Valid: true},
		SenatorialDistrictID:        pgtype.Int4{Int32: lga.SenatorialDistrictID, Valid: true},
		FederalConstituencyID:       pgtype.Int4{Int32: lga.FederalConstituencyID, Valid: true},
		StateAssemblyConstituencyID: ward.StateAssemblyConstituencyID,
		Message:                     input.Message,
		MediaUrls:                   input.MediaUrls,
		IsReport:                    pgtype.Bool{Bool: input.IsReport, Valid: true},
		ReportTypes:                 input.ReportTypes,
	})
	if err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	// Calculate increments
	var reportsInc, updatesInc int32
	if input.IsReport {
		reportsInc = 1
	} else {
		updatesInc = 1
	}

	// Increment Election Group Metrics
	err = qtx.IncrementElectionGroupMetrics(ctx, queries.IncrementElectionGroupMetricsParams{
		ID:             input.ElectionGroupID,
		PuReportsCount: reportsInc,
		PuUpdatesCount: updatesInc,
	})
	if err != nil {
		return queries.PollingUnitUpdate{}, err
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

		// Update interval_updates bucket — only count non-report updates.
		if !input.IsReport {
			if intervalKey, err := s.calcIntervalKeyFromSettings(ctx, qtx, time.Now()); err == nil {
				// Best-effort: if interval tracking fails, we don't fail the whole request.
				_ = qtx.IncrementAssignmentIntervalUpdates(ctx, queries.IncrementAssignmentIntervalUpdatesParams{
					ID:          *input.AssignmentID,
					IntervalKey: intervalKey,
				})
			}
		}
	}

	if input.PartyID != nil {
		err = qtx.IncrementPartyElectionGroupMetrics(ctx, queries.IncrementPartyElectionGroupMetricsParams{
			PartyID:         int16(*input.PartyID),
			ElectionGroupID: input.ElectionGroupID,
			ReportsCount:    reportsInc,
			UpdatesCount:    updatesInc,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, err
		}

		err = qtx.IncrementElectionGroupPUPartyMetrics(ctx, queries.IncrementElectionGroupPUPartyMetricsParams{
			ElectionGroupID: input.ElectionGroupID,
			PollingUnitID:   input.PollingUnitID,
			PartyID:         int16(*input.PartyID),
			ReportsDelta:    reportsInc,
			UpdatesDelta:    updatesInc,
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
		if len(input.MediaUrls) > 0 {
			hasVideo := false
			hasImage := false
			for _, mediaURL := range input.MediaUrls {
				if isVideoURL(mediaURL) {
					hasVideo = true
				} else {
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

// calcIntervalKeyFromSettings fetches update_schedule_config from system_settings
// and delegates to calcIntervalKey.
func (s *Service) calcIntervalKeyFromSettings(ctx context.Context, q *queries.Queries, t time.Time) (string, error) {
	setting, err := q.GetSystemSetting(ctx, "update_schedule_config")
	if err != nil {
		// Fall back to a simple 30-minute fixed-window if the setting is missing.
		m := t.Minute()
		if m < 30 {
			return fmt.Sprintf("%02d:00", t.Hour()), nil
		}
		return fmt.Sprintf("%02d:30", t.Hour()), nil
	}

	var cfg updateScheduleConfig
	if err := json.Unmarshal(setting.Value, &cfg); err != nil {
		return "", fmt.Errorf("invalid update_schedule_config: %w", err)
	}

	return calcIntervalKey(t, cfg)
}

func (s *Service) ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error) {
	return s.queries.ListPollingUnitUpdates(ctx, params)
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

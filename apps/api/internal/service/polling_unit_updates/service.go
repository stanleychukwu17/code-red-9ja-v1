package polling_unit_updates

import (
	"context"
	"errors"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
}

func NewService(q *queries.Queries, pool *pgxpool.Pool) *Service {
	return &Service{
		queries: q,
		pool:    pool,
	}
}

type CreateUpdateInput struct {
	UserID          int64    `json:"user_id"`
	PollingUnitID   int32    `json:"polling_unit_id"`
	ElectionGroupID int64    `json:"election_group_id"`
	AssignmentID    *int64   `json:"assignment_id,omitempty"`
	PartyID         *int64   `json:"party_id,omitempty"`
	Message         string   `json:"message"`
	MediaUrls       []string `json:"media_urls"`
	IsReport        bool     `json:"is_report"`
	ReportTypes     []string `json:"report_types"`
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
		return queries.PollingUnitUpdate{}, errors.New("invalid election group")
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

	var partyID pgtype.Int8
	if input.PartyID != nil {
		partyID = pgtype.Int8{Int64: *input.PartyID, Valid: true}
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
		ID:           input.ElectionGroupID,
		ReportsCount: reportsInc,
		UpdatesCount: updatesInc,
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
	}

	if input.PartyID != nil {
		err = qtx.IncrementPartyElectionGroupMetrics(ctx, queries.IncrementPartyElectionGroupMetricsParams{
			PartyID:         *input.PartyID,
			ElectionGroupID: input.ElectionGroupID,
			ReportsCount:    reportsInc,
			UpdatesCount:    updatesInc,
		})
		if err != nil {
			return queries.PollingUnitUpdate{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitUpdate{}, err
	}

	return update, nil
}

func (s *Service) ListUpdates(ctx context.Context, params queries.ListPollingUnitUpdatesParams) ([]queries.ListPollingUnitUpdatesRow, error) {
	return s.queries.ListPollingUnitUpdates(ctx, params)
}

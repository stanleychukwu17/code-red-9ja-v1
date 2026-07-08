package paapplications

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
	rdb     *redis.Client
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{
		queries: q,
		pool:    pool,
		rdb:     rdb,
	}
}

type SubmitApplicationInput struct {
	UserID            int64
	PartyID           int64
	ElectionGroupIDs  []int64
	PollingUnitID     int32
	Avatar            string
	Vin               string
	VotersCardImage   string
	CurrentCountry    int16
	CurrentState      int16
	CurrentLga        int32
	CurrentCity       int32
	CurrentWard       int32
	BankAccountNumber string
	BankCode          string
	WhatsappPhone     string
	DataPhone         string
	EducationalStatus string
	HighestDegree     string
	GraduationYear    string
	SchoolName        string
	Phone             string
}

func (s *Service) SubmitApplication(ctx context.Context, input SubmitApplicationInput) ([]queries.PollingAgentApplication, error) {
	// Deduplicate election group IDs
	uniqueGroupIDs := make([]int64, 0, len(input.ElectionGroupIDs))
	seen := make(map[int64]bool)
	for _, id := range input.ElectionGroupIDs {
		if !seen[id] {
			seen[id] = true
			uniqueGroupIDs = append(uniqueGroupIDs, id)
		}
	}
	input.ElectionGroupIDs = uniqueGroupIDs

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch current user
	user, err := txQueries.GetUserByID(ctx, input.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	// Determine role and role_level based on party change
	roleVal := "partymember"
	roleLevelVal := "member"
	if user.PartyID.Valid && user.PartyID.Int64 == input.PartyID {
		if user.Role.Valid {
			roleVal = user.Role.String
		}
		if user.RoleLevel.Valid {
			roleLevelVal = user.RoleLevel.String
		}
	}

	// Update user agent details
	_, err = txQueries.UpdateUserAgentDetails(ctx, queries.UpdateUserAgentDetailsParams{
		ID:                input.UserID,
		PartyID:           pgtype.Int8{Int64: input.PartyID, Valid: true},
		Avatar:            pgtype.Text{String: input.Avatar, Valid: input.Avatar != ""},
		Vin:               pgtype.Text{String: input.Vin, Valid: input.Vin != ""},
		VotersCardImage:   pgtype.Text{String: input.VotersCardImage, Valid: input.VotersCardImage != ""},
		CurrentCountry:    input.CurrentCountry,
		CurrentState:      int16(input.CurrentState),
		CurrentLga:        pgtype.Int4{Int32: input.CurrentLga, Valid: input.CurrentLga > 0},
		CurrentWard:       pgtype.Int4{Int32: input.CurrentWard, Valid: input.CurrentWard > 0},
		CurrentCity:       pgtype.Int4{Int32: input.CurrentCity, Valid: input.CurrentCity > 0},
		BankAccountNumber: pgtype.Text{String: input.BankAccountNumber, Valid: input.BankAccountNumber != ""},
		BankCode:          pgtype.Text{String: input.BankCode, Valid: input.BankCode != ""},
		Role:              pgtype.Text{String: roleVal, Valid: true},
		RoleLevel:         pgtype.Text{String: roleLevelVal, Valid: true},
		WhatsappPhone:     pgtype.Text{String: input.WhatsappPhone, Valid: input.WhatsappPhone != ""},
		DataPhone:         pgtype.Text{String: input.DataPhone, Valid: input.DataPhone != ""},
		EducationalStatus: pgtype.Text{String: input.EducationalStatus, Valid: input.EducationalStatus != ""},
		HighestDegree:     pgtype.Text{String: input.HighestDegree, Valid: input.HighestDegree != ""},
		GraduationYear:    pgtype.Text{String: input.GraduationYear, Valid: input.GraduationYear != ""},
		SchoolName:        pgtype.Text{String: input.SchoolName, Valid: input.SchoolName != ""},
		Phone:             input.Phone,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user details: %w", err)
	}

	apps := make([]queries.PollingAgentApplication, 0, len(input.ElectionGroupIDs))
	for _, egID := range input.ElectionGroupIDs {
		// Create application
		app, err := txQueries.CreateApplication(ctx, queries.CreateApplicationParams{
			UserID:          input.UserID,
			PartyID:         input.PartyID,
			ElectionGroupID: egID,
			PollingUnitID:   pgtype.Int4{Int32: input.PollingUnitID, Valid: input.PollingUnitID > 0},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create application: %w", err)
		}
		apps = append(apps, app)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return apps, nil
}

func (s *Service) GetApplicationByID(ctx context.Context, id int64) (queries.PollingAgentApplication, error) {
	return s.queries.GetApplicationByID(ctx, id)
}

func (s *Service) ListApplications(ctx context.Context, userID, partyID, electionGroupID int64, status string, limit int32, cursor int64) ([]queries.ListApplicationsRow, error) {
	return s.queries.ListApplications(ctx, queries.ListApplicationsParams{
		UserID:          userID,
		LimitVal:        limit,
		Cursor:          cursor,
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		Status:          status,
	})
}

func (s *Service) GetPollingUnitRecommendations(ctx context.Context, partyID, electionGroupID int64, lgaID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error) {
	// 1. Fetch the ward ID of the applicant's selected polling unit.
	var targetWardID int32
	if pollingUnitID > 0 {
		err := s.pool.QueryRow(ctx, "SELECT ward_id FROM polling_units WHERE id = $1", pollingUnitID).Scan(&targetWardID)
		if err != nil {
			// ignore and fallback to 0
			targetWardID = 0
		}
	}

	// 2. Fetch up to 10 lowest-agent-count units
	rows, err := s.queries.GetPollingUnitsWithAgentCounts(ctx, queries.GetPollingUnitsWithAgentCountsParams{
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		LgaID:           lgaID,
		WardID:          targetWardID,
		LimitVal:        10,
	})
	if err != nil {
		return nil, err
	}

	// 3. Ensure applicant's own unit is listed FIRST
	hasApplicantUnit := false
	var applicantRow queries.GetPollingUnitsWithAgentCountsRow
	var otherRows []queries.GetPollingUnitsWithAgentCountsRow

	for _, r := range rows {
		if r.ID == pollingUnitID {
			hasApplicantUnit = true
			applicantRow = r
		} else {
			otherRows = append(otherRows, r)
		}
	}

	if pollingUnitID > 0 && !hasApplicantUnit {
		// Fetch applicant's unit globally
		applicantRows, err := s.queries.GetPollingUnitsWithAgentCounts(ctx, queries.GetPollingUnitsWithAgentCountsParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
			LgaID:           0,
			WardID:          0,
			LimitVal:        10,
		})
		if err == nil {
			for _, r := range applicantRows {
				if r.ID == pollingUnitID {
					applicantRow = r
					hasApplicantUnit = true
					break
				}
			}
		}
	}

	// Rebuild list with applicant's unit first
	var finalRows []queries.GetPollingUnitsWithAgentCountsRow
	if hasApplicantUnit {
		finalRows = append(finalRows, applicantRow)
	}
	finalRows = append(finalRows, otherRows...)

	// 4. Return at most 3
	if len(finalRows) > 3 {
		finalRows = finalRows[:3]
	}

	return finalRows, nil
}

func (s *Service) RejectApplication(ctx context.Context, id int64, reason string) (queries.PollingAgentApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PollingAgentApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PollingAgentApplication{}, errors.New("application is already processed")
	}

	return s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             id,
		Status:         "rejected",
		RejectedReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
}

func (s *Service) CancelApplication(ctx context.Context, id int64) (queries.PollingAgentApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PollingAgentApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PollingAgentApplication{}, errors.New("application is already processed")
	}

	return s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             id,
		Status:         "cancelled",
		RejectedReason: pgtype.Text{Valid: false},
	})
}

type ApproveApplicationInput struct {
	ApplicationID int64
	PollingUnitID int32
	RoleType      string
	AssignedBy    int64
}

func (s *Service) ApproveApplication(ctx context.Context, input ApproveApplicationInput) (queries.PollingAgentApplication, error) {
	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch application
	app, err := txQueries.GetApplicationByID(ctx, input.ApplicationID)
	if err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to get application: %w", err)
	}

	if app.Status != "pending" {
		return queries.PollingAgentApplication{}, errors.New("application is already processed")
	}

	// Deduct 1 slot from the party's slots balance. Once accepted, it is permanently consumed (no refund).
	_, err = txQueries.DeductPartySlots(ctx, queries.DeductPartySlotsParams{
		Slots: 1,
		ID:    app.PartyID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PollingAgentApplication{}, errors.New("insufficient slots: please purchase slots to accept applications")
		}
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to deduct slots: %w", err)
	}

	pollingUnitID := input.PollingUnitID
	if pollingUnitID <= 0 {
		if app.PollingUnitID.Valid {
			pollingUnitID = app.PollingUnitID.Int32
		} else {
			return queries.PollingAgentApplication{}, errors.New("polling unit ID is required but not specified in application")
		}
	}

	// Update user role to polling agent
	_, err = txQueries.UpdateUserRoleToAgent(ctx, app.UserID)
	if err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to promote user role: %w", err)
	}

	// Update application status
	updatedApp, err := txQueries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             input.ApplicationID,
		Status:         "accepted",
		RejectedReason: pgtype.Text{Valid: false},
	})
	if err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to update application status: %w", err)
	}

	// Create polling unit assignment
	roleType := input.RoleType
	if roleType == "" {
		roleType = "polling_agent"
	}
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = pgtype.Int8{Int64: input.AssignedBy, Valid: true}
	}

	_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
		UserID:          app.UserID,
		PollingUnitID:   pollingUnitID,
		ElectionGroupID: app.ElectionGroupID,
		PartyID:         app.PartyID,
		RoleType:        pgtype.Text{String: roleType, Valid: true},
		AssignedBy:      assignedByVal,
	})
	if err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to assign user to polling unit: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingAgentApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedApp, nil
}

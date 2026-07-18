package partyapplications

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
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
	PartyID           int16
	ElectionGroupIDs  []int64
	PollingUnitID     int32
	Avatar            string
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
	Address           string
}

func (s *Service) SubmitApplication(ctx context.Context, input SubmitApplicationInput) ([]queries.PartyApplication, error) {
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

	// Update user agent details
	user, err := txQueries.UpdateUserAgentDetails(ctx, queries.UpdateUserAgentDetailsParams{
		ID:                input.UserID,
		PartyID:           pgtype.Int2{Int16: int16(int16(input.PartyID)), Valid: true},
		Avatar:            pgtype.Text{String: input.Avatar, Valid: input.Avatar != ""},
		VotersCardImage:   pgtype.Text{String: input.VotersCardImage, Valid: input.VotersCardImage != ""},
		CurrentCountry:    input.CurrentCountry,
		CurrentState:      int16(input.CurrentState),
		CurrentLga:        pgtype.Int4{Int32: input.CurrentLga, Valid: input.CurrentLga > 0},
		CurrentCity:       pgtype.Int4{Int32: input.CurrentCity, Valid: input.CurrentCity > 0},
		BankAccountNumber: pgtype.Text{String: input.BankAccountNumber, Valid: input.BankAccountNumber != ""},
		BankCode:          pgtype.Text{String: input.BankCode, Valid: input.BankCode != ""},
		WhatsappPhone:     pgtype.Text{String: input.WhatsappPhone, Valid: input.WhatsappPhone != ""},
		DataPhone:         pgtype.Text{String: input.DataPhone, Valid: input.DataPhone != ""},
		CurrentWard:       pgtype.Int4{Int32: input.CurrentWard, Valid: input.CurrentWard > 0},
		Phone:             input.Phone,
		PollingUnitID:     pgtype.Int4{Int32: input.PollingUnitID, Valid: input.PollingUnitID > 0},
		Address:           input.Address,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user details: %w", err)
	}

	// Update profile details
	err = txQueries.UpdateUserAgentMoreInfo(ctx, queries.UpdateUserAgentMoreInfoParams{
		UserID:            input.UserID,
		EducationalStatus: pgtype.Text{String: input.EducationalStatus, Valid: input.EducationalStatus != ""},
		HighestDegree:     pgtype.Text{String: input.HighestDegree, Valid: input.HighestDegree != ""},
		GraduationYear:    pgtype.Text{String: input.GraduationYear, Valid: input.GraduationYear != ""},
		SchoolName:        pgtype.Text{String: input.SchoolName, Valid: input.SchoolName != ""},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user profile: %w", err)
	}

	apps := make([]queries.PartyApplication, 0, len(input.ElectionGroupIDs))
	for _, egID := range input.ElectionGroupIDs {
		// Create application
		app, err := txQueries.CreateApplication(ctx, queries.CreateApplicationParams{
			UserID:          input.UserID,
			PartyID:         int16(input.PartyID),
			ElectionGroupID: egID,
			PollingUnitID:   pgtype.Int4{Int32: input.PollingUnitID, Valid: input.PollingUnitID > 0},
			StateID:         pgtype.Int2{Int16: int16(input.CurrentState), Valid: input.CurrentState > 0},
			LgaID:           pgtype.Int4{Int32: input.CurrentLga, Valid: input.CurrentLga > 0},
			WardID:          pgtype.Int4{Int32: input.CurrentWard, Valid: input.CurrentWard > 0},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create application: %w", err)
		}
		apps = append(apps, app)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate caches
	if user.FakeID.Valid {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisUserInfo, user.FakeID.Int64))
	}
	s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisUserMoreInfo, input.UserID))

	return apps, nil
}

func (s *Service) GetApplicationByID(ctx context.Context, id int64) (queries.PartyApplication, error) {
	return s.queries.GetApplicationByID(ctx, id)
}

func (s *Service) ListApplications(ctx context.Context, userID int64, partyID int16, electionGroupID int64, status string, limit int32, cursor int64) ([]queries.ListApplicationsRow, error) {
	return s.queries.ListApplications(ctx, queries.ListApplicationsParams{
		UserID:          userID,
		LimitVal:        limit,
		Cursor:          cursor,
		PartyID:         int64(partyID),
		ElectionGroupID: electionGroupID,
		Status:          status,
	})
}

func (s *Service) GetPollingUnitRecommendations(ctx context.Context, partyID int16, electionGroupID int64, lgaID, wardID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error) {
	var finalRows []queries.GetPollingUnitsWithAgentCountsRow

	// 1. Fetch the applicant's specific polling unit directly (position 1).
	//    This also tells us its actual ward_id.
	var applicantWardID int32
	if pollingUnitID > 0 {
		pu, err := s.queries.GetPollingUnitByID(ctx, pollingUnitID)
		if err == nil {
			// Count how many agents are already assigned to this unit
			var agentsCount int32
			_ = s.pool.QueryRow(ctx,
				`SELECT COALESCE(COUNT(*), 0)::integer FROM polling_unit_assignments
				 WHERE polling_unit_id = $1 AND party_id = $2 AND election_group_id = $3`,
				pollingUnitID, partyID, electionGroupID,
			).Scan(&agentsCount)

			finalRows = append(finalRows, queries.GetPollingUnitsWithAgentCountsRow{
				ID:          pu.ID,
				Name:        pu.Name,
				WardID:      pu.WardID,
				WardName:    pu.WardName,
				LgaID:       pu.LgaID,
				LgaName:     pu.LgaName,
				StateID:     pu.StateID,
				StateName:   pu.StateName,
				AgentsCount: agentsCount,
			})
			applicantWardID = pu.WardID
		}
	}

	// 2. Resolve the ward to scope recommendations.
	//    Priority: applicant's unit's ward > caller-supplied wardID > fall back to LGA.
	targetWardID := applicantWardID
	if targetWardID == 0 {
		targetWardID = wardID
	}

	wardScopeLgaID := int32(0)
	wardScopeWardID := targetWardID
	if targetWardID == 0 {
		// No ward resolved at all – fall back to LGA scope
		wardScopeLgaID = lgaID
	}

	// 3. Fetch lowest-agent-count units in the same ward (positions 2 & 3).
	wardRows, err := s.queries.GetPollingUnitsWithAgentCounts(ctx, queries.GetPollingUnitsWithAgentCountsParams{
		PartyID:         int64(partyID),
		ElectionGroupID: electionGroupID,
		LgaID:           wardScopeLgaID,
		WardID:          wardScopeWardID,
		LimitVal:        10,
	})
	if err != nil {
		// If this fails just return what we have (the applicant's unit)
		return finalRows, nil
	}

	// 4. Add up to 2 ward units, skipping the applicant's unit (already in position 1)
	added := 0
	for _, r := range wardRows {
		if added >= 2 {
			break
		}
		if r.ID == pollingUnitID {
			continue // already included
		}
		finalRows = append(finalRows, r)
		added++
	}

	return finalRows, nil
}

func (s *Service) RejectApplication(ctx context.Context, id int64, reason string) (queries.PartyApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PartyApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PartyApplication{}, errors.New("application is already processed")
	}

	return s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             id,
		Status:         "rejected",
		RejectedReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
}

func (s *Service) CancelApplication(ctx context.Context, id int64) (queries.PartyApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PartyApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PartyApplication{}, errors.New("application is already processed")
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
	StateID       int16
	LgaID         int32
	WardID        int32
	AssignedBy    int64
}

func (s *Service) ApproveApplication(ctx context.Context, input ApproveApplicationInput) (queries.PartyApplication, error) {
	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch application
	app, err := txQueries.GetApplicationByID(ctx, input.ApplicationID)
	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to get application: %w", err)
	}

	if app.Status != "pending" {
		return queries.PartyApplication{}, errors.New("application is already processed")
	}

	// Deduct 1 slot from the party's slots balance. Once accepted, it is permanently consumed (no refund).
	_, err = txQueries.DeductPartySlots(ctx, queries.DeductPartySlotsParams{
		Slots: 1,
		ID:    app.PartyID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PartyApplication{}, errors.New("insufficient slots: please purchase slots to accept applications")
		}
		return queries.PartyApplication{}, fmt.Errorf("failed to deduct slots: %w", err)
	}

	// Create assignment based on role
	roleType := input.RoleType
	if roleType == "" {
		roleType = "polling_agent" // Note: Frontend passes 'pollingagent' or supervisor string
	}
	// For backward compatibility / handling frontend names
	if roleType == "pollingagent" {
		roleType = "polling_agent"
	}
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = pgtype.Int8{Int64: input.AssignedBy, Valid: true}
	}

	pollingUnitID := input.PollingUnitID
	if roleType == "polling_agent" {
		if pollingUnitID <= 0 {
			if app.PollingUnitID.Valid {
				pollingUnitID = app.PollingUnitID.Int32
			} else {
				return queries.PartyApplication{}, errors.New("polling unit ID is required for polling agents but not specified in application")
			}
		}
	}

	// Update user role to the dynamic role type
	_, err = txQueries.UpdateUserRoleForPartyApp(ctx, app.UserID)
	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to promote user role: %w", err)
	}

	// Update application status and final role/location
	updatedApp, err := txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
		ID:            input.ApplicationID,
		Role:          roleType,
		PollingUnitID: pgtype.Int4{Int32: pollingUnitID, Valid: pollingUnitID > 0},
		StateID:       pgtype.Int2{Int16: input.StateID, Valid: input.StateID > 0},
		LgaID:         pgtype.Int4{Int32: input.LgaID, Valid: input.LgaID > 0},
		WardID:        pgtype.Int4{Int32: input.WardID, Valid: input.WardID > 0},
	})
	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to update application approval status: %w", err)
	}



	if roleType == "state-election-supervisor" || roleType == "state_supervisor" {
		_, err = txQueries.CreateStateSupervisor(ctx, queries.CreateStateSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			ElectionGroupID: app.ElectionGroupID,
			PartyID:         app.PartyID,
			RoleType:        pgtype.Text{String: "state-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
	} else if roleType == "lga-election-supervisor" || roleType == "lga_supervisor" {
		_, err = txQueries.CreateLgaSupervisor(ctx, queries.CreateLgaSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			LgaID:           input.LgaID,
			ElectionGroupID: app.ElectionGroupID,
			PartyID:         app.PartyID,
			RoleType:        pgtype.Text{String: "lga-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
	} else if roleType == "ward-election-supervisor" || roleType == "ward_supervisor" {
		_, err = txQueries.CreateWardSupervisor(ctx, queries.CreateWardSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			LgaID:           input.LgaID,
			WardID:          input.WardID,
			ElectionGroupID: app.ElectionGroupID,
			PartyID:         app.PartyID,
			RoleType:        pgtype.Text{String: "ward-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
	} else {
		// Default to polling agent
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:          app.UserID,
			PollingUnitID:   pollingUnitID,
			ElectionGroupID: app.ElectionGroupID,
			PartyID:         app.PartyID,
			RoleType:        pgtype.Text{String: "polling_agent", Valid: true},
			AssignedBy:      assignedByVal,
		})
	}

	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedApp, nil
}

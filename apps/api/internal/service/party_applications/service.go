package partyapplications

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"time"

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
		PartyID:         partyID,
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
		PartyID:         partyID,
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

// puGeo holds full geography for a polling unit
type puGeo struct {
	wardID              int32
	lgaID               int32
	stateID             int16
	stateConstituencyID int32 // nullable – 0 if not set
	fedConstID          int32 // nullable – 0 if not set
	senatDistrictID     int32 // nullable – 0 if not set
}

// fetchPUGeo fetches full geography for a polling unit by querying
// polling_units JOIN wards JOIN lgas.
func fetchPUGeo(ctx context.Context, pool interface {
	QueryRow(ctx context.Context, sql string, args ...any) interface{ Scan(dest ...any) error }
}, puID int32) (puGeo, error) {
	var g puGeo
	var scID, fcID, sdID interface{}
	err := pool.QueryRow(ctx, `
		SELECT pu.ward_id, pu.lga_id, pu.state_id,
		       w.state_assembly_constituency_id,
		       l.federal_constituency_id,
		       l.senatorial_district_id
		FROM polling_units pu
		JOIN wards w ON w.id = pu.ward_id
		JOIN lgas  l ON l.id = pu.lga_id
		WHERE pu.id = $1 LIMIT 1`, puID).Scan(
		&g.wardID, &g.lgaID, &g.stateID, &scID, &fcID, &sdID,
	)
	if err != nil {
		return g, err
	}
	if v, ok := scID.(int32); ok {
		g.stateConstituencyID = v
	}
	if v, ok := fcID.(int32); ok {
		g.fedConstID = v
	}
	if v, ok := sdID.(int32); ok {
		g.senatDistrictID = v
	}
	return g, nil
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

	// Fetch the election group to check the election date
	electionGroup, err := txQueries.GetElectionGroupByID(ctx, app.ElectionGroupID)
	if err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to get election group: %w", err)
	}

	if electionGroup.ElectionDate.Valid {
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		if electionGroup.ElectionDate.Time.Before(today) {
			reason := "Please apply for an upcoming election (not in the past)"
			updatedApp, cancelErr := txQueries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
				ID:             input.ApplicationID,
				Status:         "cancelled",
				RejectedReason: pgtype.Text{String: reason, Valid: true},
			})
			if cancelErr != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to cancel application for past election: %w", cancelErr)
			}
			if commitErr := tx.Commit(ctx); commitErr != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to commit cancellation: %w", commitErr)
			}
			return updatedApp, errors.New("cancelled_past_election")
		}
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
		roleType = "pollingagent" // Note: Frontend passes 'pollingagent' or supervisor string
	}
	// For backward compatibility / handling frontend names
	if roleType == "polling_agent" {
		roleType = "pollingagent"
	}
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = pgtype.Int8{Int64: input.AssignedBy, Valid: true}
	}

	pollingUnitID := input.PollingUnitID
	if roleType == "pollingagent" {
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

	egID := app.ElectionGroupID
	partyID := app.PartyID

	if roleType == "state-election-supervisor" || roleType == "state_supervisor" {
		_, err = txQueries.CreateStateSupervisor(ctx, queries.CreateStateSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			ElectionGroupID: egID,
			PartyID:         partyID,
			RoleType:        pgtype.Text{String: "state-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		existingStateSupCount, countErr := txQueries.GetStateSupervisorCount(ctx, queries.GetStateSupervisorCountParams{
			ElectionGroupID: egID,
			StateID:         input.StateID,
			PartyID:         partyID,
		})
		if countErr != nil {
			existingStateSupCount = 0
		}
		isUniqueStateSup := int32(0)
		if existingStateSupCount <= 1 {
			isUniqueStateSup = 1
		}

		err = txQueries.AdjustElectionGroupNationalStateSupervisorCounts(ctx, queries.AdjustElectionGroupNationalStateSupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueStateSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust state supervisor counts on national: %w", err)
		}

	} else if roleType == "lga-election-supervisor" || roleType == "lga_supervisor" {
		_, err = txQueries.CreateLgaSupervisor(ctx, queries.CreateLgaSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			LgaID:           input.LgaID,
			ElectionGroupID: egID,
			PartyID:         partyID,
			RoleType:        pgtype.Text{String: "lga-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// Fetch lga geography for fed_const and senat IDs
		var lgaFedConstID, lgaSenatID int32
		_ = s.pool.QueryRow(ctx, `SELECT federal_constituency_id, senatorial_district_id FROM lgas WHERE id = $1 LIMIT 1`,
			input.LgaID,
		).Scan(&lgaFedConstID, &lgaSenatID)

		// Uniqueness: was this the first LGA supervisor for this party in this LGA?
		existingLgaSupCount, countErr := txQueries.GetLGASupervisorCount(ctx, queries.GetLGASupervisorCountParams{
			ElectionGroupID: egID,
			LgaID:           input.LgaID,
			PartyID:         partyID,
		})
		if countErr != nil {
			existingLgaSupCount = 0
		}
		isUniqueLgaSup := int32(0)
		if existingLgaSupCount <= 1 {
			isUniqueLgaSup = 1
		}

		// federal_constituency row
		if lgaFedConstID > 0 {
			err = txQueries.AdjustElectionGroupFederalConstituencyLGASupervisorCounts(ctx, queries.AdjustElectionGroupFederalConstituencyLGASupervisorCountsParams{
				ElectionGroupID:       egID,
				FederalConstituencyID: lgaFedConstID,
				PartyID:               partyID,
				Delta:                 1,
				UniqueDelta:           isUniqueLgaSup,
			})
			if err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to adjust LGA supervisor counts on fed const: %w", err)
			}
		}
		// senatorial_district row
		if lgaSenatID > 0 {
			err = txQueries.AdjustElectionGroupSenatorialDistrictLGASupervisorCounts(ctx, queries.AdjustElectionGroupSenatorialDistrictLGASupervisorCountsParams{
				ElectionGroupID:      egID,
				SenatorialDistrictID: lgaSenatID,
				PartyID:              partyID,
				Delta:                1,
				UniqueDelta:          isUniqueLgaSup,
			})
			if err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to adjust LGA supervisor counts on senatorial district: %w", err)
			}
		}
		// state row
		err = txQueries.AdjustElectionGroupStateLGASupervisorCounts(ctx, queries.AdjustElectionGroupStateLGASupervisorCountsParams{
			ElectionGroupID: egID,
			StateID:         input.StateID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueLgaSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust LGA supervisor counts on state: %w", err)
		}

		// national row
		err = txQueries.AdjustElectionGroupNationalLGASupervisorCounts(ctx, queries.AdjustElectionGroupNationalLGASupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueLgaSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust LGA supervisor counts on national: %w", err)
		}

	} else if roleType == "ward-election-supervisor" || roleType == "ward_supervisor" {
		_, err = txQueries.CreateWardSupervisor(ctx, queries.CreateWardSupervisorParams{
			UserID:          app.UserID,
			StateID:         input.StateID,
			LgaID:           input.LgaID,
			WardID:          input.WardID,
			ElectionGroupID: egID,
			PartyID:         partyID,
			RoleType:        pgtype.Text{String: "ward-election-supervisor", Valid: true},
			AssignedBy:      assignedByVal,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// Fetch full geography from ward + lga
		var wardStateConstID int32
		var lgaFedConstID, lgaSenatID int32
		_ = s.pool.QueryRow(ctx, `
			SELECT w.state_assembly_constituency_id, l.federal_constituency_id, l.senatorial_district_id
			FROM wards w JOIN lgas l ON l.id = w.lga_id
			WHERE w.id = $1 LIMIT 1`, input.WardID,
		).Scan(&wardStateConstID, &lgaFedConstID, &lgaSenatID)

		// Uniqueness: first ward supervisor for this party in this ward?
		existingWardSupCount, countErr := txQueries.GetWardSupervisorCount(ctx, queries.GetWardSupervisorCountParams{
			ElectionGroupID: egID,
			WardID:          input.WardID,
			PartyID:         partyID,
		})
		if countErr != nil {
			existingWardSupCount = 0
		}
		isUniqueWardSup := int32(0)
		if existingWardSupCount <= 1 {
			isUniqueWardSup = 1
		}

		// lga row
		err = txQueries.AdjustElectionGroupLGAWardSupervisorCounts(ctx, queries.AdjustElectionGroupLGAWardSupervisorCountsParams{
			ElectionGroupID: egID,
			LgaID:           input.LgaID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueWardSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on lga: %w", err)
		}
		// state_constituency row
		if wardStateConstID > 0 {
			err = txQueries.AdjustElectionGroupStateConstituencyWardSupervisorCounts(ctx, queries.AdjustElectionGroupStateConstituencyWardSupervisorCountsParams{
				ElectionGroupID:     egID,
				StateConstituencyID: wardStateConstID,
				PartyID:             partyID,
				Delta:               1,
				UniqueDelta:         isUniqueWardSup,
			})
			if err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on state const: %w", err)
			}
		}
		// federal_constituency row
		if lgaFedConstID > 0 {
			err = txQueries.AdjustElectionGroupFederalConstituencyWardSupervisorCounts(ctx, queries.AdjustElectionGroupFederalConstituencyWardSupervisorCountsParams{
				ElectionGroupID:       egID,
				FederalConstituencyID: lgaFedConstID,
				PartyID:               partyID,
				Delta:                 1,
				UniqueDelta:           isUniqueWardSup,
			})
			if err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on fed const: %w", err)
			}
		}
		// senatorial_district row
		if lgaSenatID > 0 {
			err = txQueries.AdjustElectionGroupSenatorialDistrictWardSupervisorCounts(ctx, queries.AdjustElectionGroupSenatorialDistrictWardSupervisorCountsParams{
				ElectionGroupID:      egID,
				SenatorialDistrictID: lgaSenatID,
				PartyID:              partyID,
				Delta:                1,
				UniqueDelta:          isUniqueWardSup,
			})
			if err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on senat dist: %w", err)
			}
		}
		// state row
		err = txQueries.AdjustElectionGroupStateWardSupervisorCounts(ctx, queries.AdjustElectionGroupStateWardSupervisorCountsParams{
			ElectionGroupID: egID,
			StateID:         input.StateID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueWardSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on state: %w", err)
		}

		// national row
		err = txQueries.AdjustElectionGroupNationalWardSupervisorCounts(ctx, queries.AdjustElectionGroupNationalWardSupervisorCountsParams{
			ElectionGroupID: egID,
			PartyID:         partyID,
			Delta:           1,
			UniqueDelta:     isUniqueWardSup,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to adjust ward supervisor counts on national: %w", err)
		}

	} else {
		// Default: polling agent
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:          app.UserID,
			PollingUnitID:   pollingUnitID,
			ElectionGroupID: egID,
			PartyID:         partyID,
			RoleType:        pgtype.Text{String: "polling_agent", Valid: true},
			AssignedBy:      assignedByVal,
		})
		if err != nil {
			return queries.PartyApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// --- Incremental stats update for polling agent ---
		// 1. Fetch full geography for the polling unit
		var geo puGeo
		var wardStateConstID, puFedConstID, puSenatID int32
		geoErr := s.pool.QueryRow(ctx, `
			SELECT pu.ward_id, pu.lga_id, pu.state_id,
			       COALESCE(w.state_assembly_constituency_id, 0),
			       COALESCE(l.federal_constituency_id, 0),
			       COALESCE(l.senatorial_district_id, 0)
			FROM polling_units pu
			JOIN wards w ON w.id = pu.ward_id
			JOIN lgas  l ON l.id = pu.lga_id
			WHERE pu.id = $1 LIMIT 1`, pollingUnitID,
		).Scan(&geo.wardID, &geo.lgaID, &geo.stateID, &wardStateConstID, &puFedConstID, &puSenatID)

		if geoErr == nil {
			// 2. Check current agents_count for this party in this PU BEFORE this insert.
			//    Used to compute unique_pu_delta for all parent rows.
			//    Because the assignment was just inserted in this tx, the DB may not have committed,
			//    but GetPUPartyAgentsCount reads the election_group_polling_units JSONB which is
			//    updated by THIS function call — so it's currently 0 if this is first agent.
			//    We derive from the raw assignment count instead (using tx to see our uncommitted insert):
			var priorAgentCount int32
			_ = tx.QueryRow(ctx, `
				SELECT COUNT(*)::int FROM polling_unit_assignments
				WHERE election_group_id = $1 AND polling_unit_id = $2 AND party_id = $3`,
				egID, pollingUnitID, partyID,
			).Scan(&priorAgentCount)
			// priorAgentCount now includes the one we just inserted (tx committed later),
			// but the trigger ran after INSERT so egpu row exists.
			// If priorAgentCount == 1, this was the first agent for this party in this PU.
			uniquePuDelta := int32(0)
			if priorAgentCount <= 1 {
				uniquePuDelta = 1
			}

			// 3. Upsert party entry at each level
			if err = txQueries.UpsertElectionGroupPUPartyEntry(ctx, queries.UpsertElectionGroupPUPartyEntryParams{
				ElectionGroupID: egID,
				PollingUnitID:   pollingUnitID,
				PartyID:         partyID,
				Delta:           1,
			}); err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupPUPartyEntry: %v", err)
			}
			if err = txQueries.UpsertElectionGroupWardPartyEntry(ctx, queries.UpsertElectionGroupWardPartyEntryParams{
				ElectionGroupID: egID,
				WardID:          geo.wardID,
				PartyID:         partyID,
				AgentsDelta:     1,
				UniquePuDelta:   uniquePuDelta,
			}); err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupWardPartyEntry: %v", err)
			}
			if err = txQueries.UpsertElectionGroupLGAPartyEntry(ctx, queries.UpsertElectionGroupLGAPartyEntryParams{
				ElectionGroupID: egID,
				LgaID:           geo.lgaID,
				PartyID:         partyID,
				AgentsDelta:     1,
				UniquePuDelta:   uniquePuDelta,
			}); err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupLGAPartyEntry: %v", err)
			}
			if wardStateConstID > 0 {
				if err = txQueries.UpsertElectionGroupStateConstituencyPartyEntry(ctx, queries.UpsertElectionGroupStateConstituencyPartyEntryParams{
					ElectionGroupID:     egID,
					StateConstituencyID: wardStateConstID,
					PartyID:             partyID,
					AgentsDelta:         1,
					UniquePuDelta:       uniquePuDelta,
				}); err != nil {
					return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupStateConstituencyPartyEntry: %v", err)
				}
			}
			if puFedConstID > 0 {
				if err = txQueries.UpsertElectionGroupFederalConstituencyPartyEntry(ctx, queries.UpsertElectionGroupFederalConstituencyPartyEntryParams{
					ElectionGroupID:       egID,
					FederalConstituencyID: puFedConstID,
					PartyID:               partyID,
					AgentsDelta:           1,
					UniquePuDelta:         uniquePuDelta,
				}); err != nil {
					return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupFederalConstituencyPartyEntry: %v", err)
				}
			}
			if puSenatID > 0 {
				if err = txQueries.UpsertElectionGroupSenatorialDistrictPartyEntry(ctx, queries.UpsertElectionGroupSenatorialDistrictPartyEntryParams{
					ElectionGroupID:      egID,
					SenatorialDistrictID: puSenatID,
					PartyID:              partyID,
					AgentsDelta:          1,
					UniquePuDelta:        uniquePuDelta,
				}); err != nil {
					return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupSenatorialDistrictPartyEntry: %v", err)
				}
			}
			if err = txQueries.UpsertElectionGroupStatePartyEntry(ctx, queries.UpsertElectionGroupStatePartyEntryParams{
				ElectionGroupID: egID,
				StateID:         geo.stateID,
				PartyID:         partyID,
				AgentsDelta:     1,
				UniquePuDelta:   uniquePuDelta,
			}); err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupStatePartyEntry: %v", err)
			}
			if err = txQueries.UpsertElectionGroupNationalPartyEntry(ctx, queries.UpsertElectionGroupNationalPartyEntryParams{
				ElectionGroupID: egID,
				PartyID:         partyID,
				AgentsDelta:     1,
				UniquePuDelta:   uniquePuDelta,
			}); err != nil {
				return queries.PartyApplication{}, fmt.Errorf("failed UpsertElectionGroupNationalPartyEntry: %v", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PartyApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedApp, nil
}

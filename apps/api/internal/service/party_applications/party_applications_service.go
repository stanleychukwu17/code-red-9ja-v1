package partyapplications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type UsersService interface {
	InvalidateCachedUserInfo(ctx context.Context, fakeID int64) error
	InvalidateUserMoreInfo(ctx context.Context, userID int64) error
	InvalidatePrimaryBankAccount(ctx context.Context, userID int64) error
}

type Service struct {
	queries      *queries.Queries
	pool         *pgxpool.Pool
	rdb          *redis.Client
	usersService UsersService
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, usersService UsersService) *Service {
	return &Service{
		queries:      q,
		pool:         pool,
		rdb:          rdb,
		usersService: usersService,
	}
}

type SubmitApplicationInput struct {
	UserID          int64
	UserFakeID      int64
	PartyID         int16
	ElectionGroupID int32
	PollingUnitID   int32
	Avatar          string
	AvatarFileID    *int64
	CurrentState    int16
	CurrentLga      int32
	CurrentWard     int32

	EducationalStatus string
	HighestDegree     string
	GraduationYear    string
	SchoolName        string
	Address           string
	BankAccountNumber string
	BankCode          string
}

func (s *Service) SubmitApplication(ctx context.Context, input SubmitApplicationInput) (int64, error) {
	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Ensure user does not already have an active application for an upcoming/active election
	hasActive, err := txQueries.HasActiveAgentApplication(ctx, input.UserID)
	if err != nil {
		return 0, fmt.Errorf("failed to check existing applications: %w", err)
	}
	if hasActive {
		return 0, errors.New("you already have an active application for an upcoming election. You cannot apply for another election group until your current assignment concludes")
	}

	// Update user agent details and retrieve existing avatar_file_id
	currentAvatarFileID, err := txQueries.UpdateUserAgentDetails(ctx, queries.UpdateUserAgentDetailsParams{
		ID:            input.UserID,
		Avatar:        utils.PgTextFromString(input.Avatar),
		CurrentState:  int16(input.CurrentState),
		CurrentLga:    utils.PgInt4FromPositive(input.CurrentLga),
		CurrentWard:   utils.PgInt4FromPositive(input.CurrentWard),
		PollingUnitID: utils.PgInt4FromPositive(input.PollingUnitID),
	})
	if err != nil {
		return 0, fmt.Errorf("failed to update user details: %w", err)
	}

	// Update user's avatar_file_id and file ownership only if avatar file actually changed
	hasNewAvatar := input.AvatarFileID != nil && *input.AvatarFileID > 0 &&
		(!currentAvatarFileID.Valid || currentAvatarFileID.Int64 != *input.AvatarFileID)

	// only update avatar when there is a new avatar uploaded
	if hasNewAvatar {
		if err := txQueries.UpdateUserAvatar(ctx, queries.UpdateUserAvatarParams{
			ID:           input.UserID,
			Avatar:       utils.PgTextFromString(input.Avatar),
			AvatarFileID: utils.PgInt8FromPtr(input.AvatarFileID),
		}); err != nil {
			return 0, fmt.Errorf("failed to update user avatar file id: %w", err)
		}

		_ = txQueries.UpdateFileOwner(ctx, queries.UpdateFileOwnerParams{
			ID:      *input.AvatarFileID,
			OwnerID: pgtype.Int8{Int64: input.UserID, Valid: true},
		})
	}

	// Update profile details if educational status is provided and not none
	if input.EducationalStatus != "" && strings.ToLower(input.EducationalStatus) != "none" {
		err = txQueries.UpdateUserAgentMoreInfo(ctx, queries.UpdateUserAgentMoreInfoParams{
			UserID:            input.UserID,
			EducationalStatus: utils.PgTextFromString(input.EducationalStatus),
			HighestDegree:     utils.PgTextFromString(input.HighestDegree),
			GraduationYear:    utils.PgTextFromString(input.GraduationYear),
			SchoolName:        utils.PgTextFromString(input.SchoolName),
			Address:           utils.PgTextFromString(input.Address),
		})
		if err != nil {
			return 0, fmt.Errorf("failed to update user profile: %w", err)
		}
	}

	// Update bank account if provided
	if input.BankAccountNumber != "" && input.BankCode != "" {
		err = txQueries.UpsertPrimaryBankAccount(ctx, queries.UpsertPrimaryBankAccountParams{
			UserID:        input.UserID,
			AccountNumber: input.BankAccountNumber,
			BankCode:      input.BankCode,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to save primary bank account: %w", err)
		}

		_ = s.usersService.InvalidatePrimaryBankAccount(ctx, input.UserID)
	}

	// Create application
	appID, err := txQueries.CreateApplication(ctx, queries.CreateApplicationParams{
		UserID:          input.UserID,
		PartyID:         int16(input.PartyID),
		ElectionGroupID: input.ElectionGroupID,
		PollingUnitID:   utils.PgInt4FromPositive(input.PollingUnitID),
		StateID:         int16(input.CurrentState),
		LgaID:           utils.PgInt4FromPositive(input.CurrentLga),
		WardID:          utils.PgInt4FromPositive(input.CurrentWard),
	})
	if err != nil {
		return 0, fmt.Errorf("failed to create application: %w", err)
	}

	// Process referred user's referral record linking & increment total_referrals (best effort)
	if refErr := s.updateReferralOnApplicationSubmission(ctx, txQueries, input.UserID, int16(input.PartyID), input.ElectionGroupID); refErr != nil {
		slog.Warn("updateReferralOnApplicationSubmission failed (non-fatal)", "userID", input.UserID, "err", refErr)
	}

	if err = tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit application transaction: %w", err)
	}

	// Invalidate caches
	_ = s.usersService.InvalidateCachedUserInfo(ctx, input.UserFakeID)
	_ = s.usersService.InvalidateUserMoreInfo(ctx, input.UserID)
	_ = s.InvalidateUserHasActiveAgentApp(ctx, input.UserID)

	return appID, nil
}

type SubmitSupervisorApplicationInput struct {
	UserID               int64
	ElectionGroupID      int32
	Role                 string
	StateID              int16
	LgaID                int32
	WardID               int32
	DegreeCertificateURL string
}

func (s *Service) SubmitSupervisorApplication(ctx context.Context, input SubmitSupervisorApplicationInput) (queries.PartyAgentApplication, error) {
	// 1. Verify role type string
	roleType := strings.TrimSpace(input.Role)
	switch roleType {
	case "state_election_supervisor", "state_supervisor", "state-election-supervisor":
		roleType = "state_election_supervisor"
		if input.StateID <= 0 {
			return queries.PartyAgentApplication{}, errors.New("state_id is required for state supervisor application")
		}
	case "lga_election_supervisor", "lga_supervisor", "lga-election-supervisor":
		roleType = "lga_election_supervisor"
		if input.StateID <= 0 || input.LgaID <= 0 {
			return queries.PartyAgentApplication{}, errors.New("state_id and lga_id are required for LGA supervisor application")
		}
	case "ward_election_supervisor", "ward_supervisor", "ward-election-supervisor":
		roleType = "ward_election_supervisor"
		if input.StateID <= 0 || input.LgaID <= 0 || input.WardID <= 0 {
			return queries.PartyAgentApplication{}, errors.New("state_id, lga_id, and ward_id are required for Ward supervisor application")
		}
	default:
		return queries.PartyAgentApplication{}, errors.New("invalid supervisor role. Must be state_election_supervisor, lga_election_supervisor, or ward_election_supervisor")
	}

	// 2. Check user's educational degree eligibility
	moreInfo, err := s.queries.GetMoreInfoAboutThisUser(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PartyAgentApplication{}, errors.New("please complete your educational details before applying for a supervisor role")
		}
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to fetch user educational details: %w", err)
	}

	highestDegree := strings.ToLower(strings.TrimSpace(moreInfo.HighestDegree.String))
	validDegrees := map[string]bool{
		"polytechnic": true,
		"bachelors":   true,
		"masters":     true,
		"phd":         true,
	}
	if !validDegrees[highestDegree] {
		return queries.PartyAgentApplication{}, errors.New("a higher education degree (Polytechnic/OND/HND, Bachelors, Masters, or PhD) is required to apply as an election supervisor")
	}

	// 3. Verify user has an accepted application for this election group
	acceptedApp, err := s.queries.GetAcceptedApplicationForUser(ctx, queries.GetAcceptedApplicationForUserParams{
		UserID:          input.UserID,
		ElectionGroupID: input.ElectionGroupID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PartyAgentApplication{}, errors.New("you must be an accepted polling agent for this election before applying for a supervisor role")
		}
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to verify polling agent application status: %w", err)
	}

	// 4. Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Update user's degree certificate URL if provided
	if input.DegreeCertificateURL != "" {
		err = txQueries.UpdateUserDegreeCertificateUrl(ctx, queries.UpdateUserDegreeCertificateUrlParams{
			UserID:               input.UserID,
			DegreeCertificateUrl: pgtype.Text{String: input.DegreeCertificateURL, Valid: true},
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to save degree certificate URL: %w", err)
		}
	}

	// Create supervisor application
	appID, err := txQueries.CreateApplication(ctx, queries.CreateApplicationParams{
		UserID:          input.UserID,
		PartyID:         acceptedApp.PartyID,
		ElectionGroupID: input.ElectionGroupID,
		PollingUnitID:   pgtype.Int4{Valid: false},
		StateID:         int16(input.StateID),
		LgaID:           utils.PgInt4FromPositive(input.LgaID),
		WardID:          utils.PgInt4FromPositive(input.WardID),
	})
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "uq_active_user_app_per_group") || strings.Contains(errStr, "uq_user_application_per_group") {
			return queries.PartyAgentApplication{}, errors.New("you already have an active application for this election group")
		}
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to create supervisor application: %w", err)
	}

	// Set role on application record explicitly to supervisor role
	app, err := txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
		ID:            appID,
		Role:          roleType,
		PollingUnitID: pgtype.Int4{Valid: false},
		StateID:       int16(input.StateID),
		LgaID:         utils.PgInt4FromPositive(input.LgaID),
		WardID:        utils.PgInt4FromPositive(input.WardID),
	})
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to set supervisor application role: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	_ = s.usersService.InvalidateUserMoreInfo(ctx, input.UserID)
	_ = s.usersService.InvalidatePrimaryBankAccount(ctx, input.UserID)
	_ = s.InvalidateUserHasActiveAgentApp(ctx, input.UserID)

	return app, nil
}

// HasActiveAgentApplication checks whether a user has a pending or accepted agent application for an upcoming election.
// The result is cached in Redis with a 30-day TTL to shield subsequent calls and allow fail-fast validation at the handler layer.
func (s *Service) HasActiveAgentApplication(ctx context.Context, userID int64) (bool, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserHasActiveAgentApp, userID)
	// Check Redis cache first ("1" = true, "0" = false)
	if val, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		return val == "1", nil
	}

	// Fallback to database check
	hasActive, err := s.queries.HasActiveAgentApplication(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to check active agent application: %w", err)
	}

	// Cache result in Redis for subsequent checks
	val := "0"
	if hasActive {
		val = "1"
	}

	_ = s.rdb.Set(ctx, cacheKey, val, db.RedisThirtyDaysTTL).Err()
	return hasActive, nil
}

// InvalidateUserHasActiveAgentApp clears the cached active agent application status for a user.
func (s *Service) InvalidateUserHasActiveAgentApp(ctx context.Context, userID int64) error {
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserHasActiveAgentApp, userID)
	return s.rdb.Del(ctx, cacheKey).Err()
}

// GetApplicationByID retrieves a single party agent application by its ID, utilizing Redis cache when available.
func (s *Service) GetApplicationByID(ctx context.Context, id int64) (queries.PartyAgentApplication, error) {
	if id <= 0 {
		return queries.PartyAgentApplication{}, errors.New("invalid application ID")
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisPartyApplicationByID, id)
	if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var app queries.PartyAgentApplication
		if err := json.Unmarshal([]byte(cachedData), &app); err == nil && app.ID > 0 {
			return app, nil
		}
	}

	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	if appData, err := json.Marshal(app); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, appData, db.RedisThirtyDaysTTL).Err()
	}

	return app, nil
}

// InvalidateApplicationByID clears the cached party agent application details for an application ID.
func (s *Service) InvalidateApplicationByID(ctx context.Context, id int64) error {
	cacheKey := fmt.Sprintf("%s%d", db.RedisPartyApplicationByID, id)
	return s.rdb.Del(ctx, cacheKey).Err()
}

// PartyApplicationListItem is a clean, frontend-ready representation of an agent application.
type PartyApplicationListItem struct {
	ID                int64   `json:"id"`
	UserID            int64   `json:"user_id"`
	PartyID           int16   `json:"party_id"`
	ElectionGroupID   int32   `json:"election_group_id"`
	PollingUnitID     *int32  `json:"polling_unit_id,omitempty"`
	Role              string  `json:"role"`
	AppStateID        *int16  `json:"app_state_id,omitempty"`
	AppLgaID          *int32  `json:"app_lga_id,omitempty"`
	AppWardID         *int32  `json:"app_ward_id,omitempty"`
	Status            string  `json:"status"`
	RejectedReason    *string `json:"rejected_reason,omitempty"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         string  `json:"updated_at"`
	FirstName         string  `json:"first_name"`
	LastName          string  `json:"last_name"`
	FullName          string  `json:"name"`
	Phone             *string `json:"phone,omitempty"`
	Username          string  `json:"username"`
	Avatar            *string `json:"avatar,omitempty"`
	CurrentCountry    int16   `json:"current_country"`
	CurrentState      int16   `json:"current_state"`
	CurrentLga        int32   `json:"current_lga"`
	CurrentCity       *int32  `json:"current_city,omitempty"`
	BankAccountNumber *string `json:"bank_account_number,omitempty"`
	BankCode          *string `json:"bank_code,omitempty"`
	EducationalStatus *string `json:"educational_status,omitempty"`
	HighestDegree     *string `json:"highest_degree,omitempty"`
	GraduationYear    *string `json:"graduation_year,omitempty"`
	SchoolName        *string `json:"school_name,omitempty"`
	Religion          *string `json:"religion,omitempty"`
	MaritalStatus     *string `json:"marital_status,omitempty"`
	Address           *string `json:"address,omitempty"`
	CurrentWard       int32   `json:"current_ward"`
	ElectionGroupName string  `json:"election_group_name"`
	Year              int16   `json:"year"`
	PartyName         string  `json:"party_name"`
	PartyShortName    string  `json:"party_short_name"`
	PartyLogo         string  `json:"party_logo"`
	StateName         string  `json:"state_name"`
	LgaName           string  `json:"lga_name"`
	CityName          *string `json:"city_name,omitempty"`
	WardName          string  `json:"ward_name"`
	PollingUnitName   *string `json:"polling_unit_name,omitempty"`
	PollingUnitCode   *string `json:"polling_unit_code,omitempty"`
	AgentsCount       int32   `json:"agents_count"`
}

func (s *Service) ListApplications(ctx context.Context, userID int64, partyID int16, electionGroupID int32, status string, stateID int16, lgaID, wardID int32, activeElectionOnly bool, limit int32, cursor int64) ([]PartyApplicationListItem, error) {
	rows, err := s.queries.ListApplications(ctx, queries.ListApplicationsParams{
		UserID:             userID,
		PartyID:            partyID,
		ElectionGroupID:    electionGroupID,
		Status:             status,
		StateID:            stateID,
		LgaID:              lgaID,
		WardID:             wardID,
		ActiveElectionOnly: activeElectionOnly,
		Cursor:             cursor,
		LimitVal:           limit,
	})
	if err != nil {
		return nil, err
	}

	result := make([]PartyApplicationListItem, 0, len(rows))
	for _, r := range rows {
		result = append(result, PartyApplicationListItem{
			ID:                r.ID,
			UserID:            r.UserID,
			PartyID:           r.PartyID,
			ElectionGroupID:   r.ElectionGroupID,
			PollingUnitID:     utils.PtrFromPgInt4(r.PollingUnitID),
			Role:              r.Role,
			AppStateID:        &r.AppStateID,
			AppLgaID:          utils.PtrFromPgInt4(r.AppLgaID),
			AppWardID:         utils.PtrFromPgInt4(r.AppWardID),
			Status:            r.Status,
			RejectedReason:    utils.PtrFromPgText(r.RejectedReason),
			CreatedAt:         r.CreatedAt.Time.Format(time.RFC3339),
			UpdatedAt:         r.UpdatedAt.Time.Format(time.RFC3339),
			FirstName:         r.FirstName.String,
			LastName:          r.LastName.String,
			FullName:          strings.TrimSpace(fmt.Sprintf("%s %s", r.FirstName.String, r.LastName.String)),
			Phone:             utils.PtrFromPgText(r.Phone),
			Username:          r.Username.String,
			Avatar:            utils.PtrFromPgText(r.Avatar),
			CurrentCountry:    r.CurrentCountry,
			CurrentState:      r.CurrentState,
			CurrentLga:        r.CurrentLga.Int32,
			CurrentCity:       utils.PtrFromPgInt4(r.CurrentCity),
			BankAccountNumber: utils.PtrFromPgText(r.BankAccountNumber),
			BankCode:          utils.PtrFromPgText(r.BankCode),
			EducationalStatus: utils.PtrFromPgText(r.EducationalStatus),
			HighestDegree:     utils.PtrFromPgText(r.HighestDegree),
			GraduationYear:    utils.PtrFromPgText(r.GraduationYear),
			SchoolName:        utils.PtrFromPgText(r.SchoolName),
			Religion:          utils.PtrFromPgText(r.Religion),
			MaritalStatus:     utils.PtrFromPgText(r.MaritalStatus),
			Address:           utils.PtrFromPgText(r.Address),
			CurrentWard:       r.CurrentWard.Int32,
			ElectionGroupName: r.ElectionGroupName,
			Year:              int16(r.ElectionDate.Time.Year()),
			PartyName:         r.PartyName,
			PartyShortName:    r.PartyShortName,
			PartyLogo:         r.PartyLogo,
			StateName:         r.StateName.String,
			LgaName:           r.LgaName.String,
			CityName:          utils.PtrFromPgText(r.CityName),
			WardName:          r.WardName.String,
			PollingUnitName:   utils.PtrFromPgText(r.PollingUnitName),
			PollingUnitCode:   utils.PtrFromPgText(r.PollingUnitCode),
			AgentsCount:       r.AgentsCount,
		})
	}

	return result, nil
}

func (s *Service) GetPollingUnitRecommendations(ctx context.Context, partyID int16, electionGroupID int32, lgaID, wardID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error) {
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

func (s *Service) RejectApplication(ctx context.Context, id int64, reason string) (queries.PartyAgentApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PartyAgentApplication{}, errors.New("application is already processed")
	}

	updatedApp, err := s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             id,
		Status:         "rejected",
		RejectedReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	// Invalidate active agent application cache for the applicant and application entity cache
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, id)

	return updatedApp, nil
}

func (s *Service) CancelApplication(ctx context.Context, id int64) (queries.PartyAgentApplication, error) {
	app, err := s.queries.GetApplicationByID(ctx, id)
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	if app.Status != "pending" {
		return queries.PartyAgentApplication{}, errors.New("application is already processed")
	}

	updatedApp, err := s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             id,
		Status:         "cancelled",
		RejectedReason: pgtype.Text{Valid: false},
	})
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	// Invalidate active agent application cache for the applicant and application entity cache
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, id)

	return updatedApp, nil
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
	senateDistrictID    int32 // nullable – 0 if not set
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
		       w.state_constituency_id,
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
		g.senateDistrictID = v
	}
	return g, nil
}

func (s *Service) ApproveApplication(ctx context.Context, input ApproveApplicationInput) (queries.PartyAgentApplication, error) {
	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch application
	app, err := txQueries.GetApplicationByID(ctx, input.ApplicationID)
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to get application: %w", err)
	}

	if app.Status != "pending" {
		return queries.PartyAgentApplication{}, errors.New("application is already processed")
	}

	// Fetch the election group to check the election date
	electionGroup, err := txQueries.GetElectionGroupByID(ctx, app.ElectionGroupID)
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to get election group: %w", err)
	}

	now := time.Now()
	if electionGroup.ElectionDate.Time.Year() < now.Year() {
		reason := "Please apply for an upcoming election (not in the past)"
		updatedApp, cancelErr := txQueries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
			ID:             input.ApplicationID,
			Status:         "cancelled",
			RejectedReason: pgtype.Text{String: reason, Valid: true},
		})
		if cancelErr != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to cancel application for past election: %w", cancelErr)
		}
		if commitErr := tx.Commit(ctx); commitErr != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to commit cancellation: %w", commitErr)
		}
		return updatedApp, errors.New("cancelled_past_election")
	}

	// Deduct 1 slot from the party's slots balance. Once accepted, it is permanently consumed (no refund).
	_, err = txQueries.DeductPartySlots(ctx, queries.DeductPartySlotsParams{
		Slots: 1,
		ID:    app.PartyID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PartyAgentApplication{}, errors.New("insufficient slots: please purchase slots to accept applications")
		}
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to deduct slots: %w", err)
	}

	// Create assignment based on role
	roleType := input.RoleType
	if roleType == "" {
		roleType = "polling_agent" // Note: Frontend passes 'polling_agent' or supervisor string
	}
	// For backward compatibility / handling frontend names
	if roleType == "polling_agent" {
		roleType = "polling_agent"
	}
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = utils.PgInt8FromPositive(input.AssignedBy)
	}

	pollingUnitID := input.PollingUnitID
	if roleType == "polling_agent" {
		if pollingUnitID <= 0 {
			if app.PollingUnitID.Valid {
				pollingUnitID = app.PollingUnitID.Int32
			} else {
				return queries.PartyAgentApplication{}, errors.New("polling unit ID is required for polling agents but not specified in application")
			}
		}
	}

	// Deduct payment based on role payment allocation
	party, err := txQueries.GetPartyByID(ctx, int16(app.PartyID))
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to fetch party: %w", err)
	}

	deductionKobo := resolvePotentialPaymentKobo(party.AgentPaymentAllocationKobo, roleType, input.StateID)

	if deductionKobo > 0 {
		_, err = txQueries.DeductPartyAgentPaymentBalance(ctx, queries.DeductPartyAgentPaymentBalanceParams{
			AgentPaymentBalanceKobo: deductionKobo,
			ID:                      party.ID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return queries.PartyAgentApplication{}, errors.New("insufficient payment balance: please fund your party wallet to accept this application")
			}
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to deduct payment balance: %w", err)
		}
	}

	// Update user role to the dynamic role type
	_, err = txQueries.UpdateUserRoleForPartyApp(ctx, app.UserID)
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to promote user role: %w", err)
	}

	// Update application status and final role/location
	updatedApp, err := txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
		ID:            input.ApplicationID,
		Role:          roleType,
		PollingUnitID: utils.PgInt4FromPositive(pollingUnitID),
		StateID:       int16(input.StateID),
		LgaID:         utils.PgInt4FromPositive(input.LgaID),
		WardID:        utils.PgInt4FromPositive(input.WardID),
	})
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to update application approval status: %w", err)
	}

	egID := app.ElectionGroupID
	partyID := app.PartyID

	if roleType == "state_election_supervisor" || roleType == "state_supervisor" {
		_, err = txQueries.CreateStateSupervisor(ctx, queries.CreateStateSupervisorParams{
			UserID:               app.UserID,
			StateID:              input.StateID,
			ElectionGroupID:      egID,
			PartyID:              partyID,
			RoleType:             pgtype.Text{String: "state_election_supervisor", Valid: true},
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// State supervisor created. Stats are aggregated dynamically.

	} else if roleType == "lga_election_supervisor" || roleType == "lga_supervisor" {
		_, err = txQueries.CreateLgaSupervisor(ctx, queries.CreateLgaSupervisorParams{
			UserID:               app.UserID,
			StateID:              input.StateID,
			LgaID:                input.LgaID,
			ElectionGroupID:      egID,
			PartyID:              partyID,
			RoleType:             pgtype.Text{String: "lga_election_supervisor", Valid: true},
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// LGA supervisor created. Stats are aggregated dynamically.

	} else if roleType == "ward_election_supervisor" || roleType == "ward_supervisor" {
		_, err = txQueries.CreateWardSupervisor(ctx, queries.CreateWardSupervisorParams{
			UserID:               app.UserID,
			StateID:              input.StateID,
			LgaID:                input.LgaID,
			WardID:               input.WardID,
			ElectionGroupID:      egID,
			PartyID:              partyID,
			RoleType:             pgtype.Text{String: "ward_election_supervisor", Valid: true},
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// Ward supervisor created. Stats are aggregated dynamically.

	} else {
		// Default: polling agent
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:               app.UserID,
			PollingUnitID:        pollingUnitID,
			ElectionGroupID:      egID,
			PartyID:              partyID,
			RoleType:             pgtype.Text{String: "polling_agent", Valid: true},
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}

		// --- Incremental stats update for polling agent ---
		// 1. Fetch full geography for the polling unit
		var geo puGeo
		var wardStateConstID, puFedConstID, puSenateID int32
		geoErr := s.pool.QueryRow(ctx, `
			SELECT pu.ward_id, pu.lga_id, pu.state_id,
			       COALESCE(w.state_constituency_id, 0),
			       COALESCE(l.federal_constituency_id, 0),
			       COALESCE(l.senatorial_district_id, 0)
			FROM polling_units pu
			JOIN wards w ON w.id = pu.ward_id
			JOIN lgas  l ON l.id = pu.lga_id
			WHERE pu.id = $1 LIMIT 1`, pollingUnitID,
		).Scan(&geo.wardID, &geo.lgaID, &geo.stateID, &wardStateConstID, &puFedConstID, &puSenateID)

		if geoErr == nil {
			// 2. Upsert party entry for polling unit
			if err = txQueries.UpsertElectionGroupPUPartyEntry(ctx, queries.UpsertElectionGroupPUPartyEntryParams{
				AgentsDelta:           1,
				ElectionGroupID:       egID,
				PollingUnitID:         pollingUnitID,
				PartyID:               partyID,
				StateID:               pgtype.Int2{Int16: geo.stateID, Valid: true},
				LgaID:                 pgtype.Int4{Int32: geo.lgaID, Valid: true},
				WardID:                pgtype.Int4{Int32: geo.wardID, Valid: true},
				StateConstituencyID:   pgtype.Int4{Int32: wardStateConstID, Valid: true},
				FederalConstituencyID: pgtype.Int4{Int32: puFedConstID, Valid: true},
				SenatorialDistrictID:  pgtype.Int4{Int32: puSenateID, Valid: true},
			}); err != nil {
				return queries.PartyAgentApplication{}, fmt.Errorf("failed UpsertElectionGroupPUPartyEntry: %v", err)
			}
		}
	}

	// --- Referral stat update on acceptance ---
	// Best-effort: failures are logged but do not fail the whole transaction.
	if refErr := s.processReferralOnAcceptance(ctx, txQueries, app.UserID, int16(app.PartyID)); refErr != nil {
		slog.Warn("processReferralOnAcceptance failed (non-fatal)", "userID", app.UserID, "err", refErr)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate only caches affected by slot deduction
	s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisPartyByID, partyID))
	s.rdb.Del(ctx, db.RedisPartiesAcceptingIDs)
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, input.ApplicationID)

	return updatedApp, nil
}

// processReferralOnAcceptance updates referral stats when a referred user's application is accepted (or auto-accepted).
func (s *Service) processReferralOnAcceptance(ctx context.Context, txQueries *queries.Queries, acceptedUserID int64, partyID int16) error {
	// 1. Get candidate's referral record
	referral, err := txQueries.GetReferralByReferredUserID(ctx, acceptedUserID)
	if err != nil {
		return nil // Not referred — nothing to do
	}

	// Idempotency check: if milestone is already BECAME_AGENT, skip
	if referral.Milestone == "BECAME_AGENT" {
		return nil
	}

	// Self-referral guard: cannot reward self
	if referral.ReferrerUserID <= 0 || referral.ReferrerUserID == acceptedUserID {
		return nil
	}

	userReferralID := int64(0)
	if referral.UserReferralID.Valid {
		userReferralID = referral.UserReferralID.Int64
	}

	electionGroupID := int32(0)
	if referral.ElectionGroupID.Valid {
		electionGroupID = referral.ElectionGroupID.Int32
	}

	// If user_referral_id is not directly set on referral, try finding matching user_referrals record for referrer
	if userReferralID <= 0 {
		referrerID := referral.ReferrerUserID
		if referrerID > 0 {
			referrerRecords, err := txQueries.GetReferrerUserReferralsForParty(ctx, queries.GetReferrerUserReferralsForPartyParams{
				UserID:  referrerID,
				PartyID: pgtype.Int2{Int16: partyID, Valid: true},
			})
			if err == nil && len(referrerRecords) > 0 {
				userReferralID = referrerRecords[0].ID
				if referrerRecords[0].ElectionGroupID.Valid {
					electionGroupID = referrerRecords[0].ElectionGroupID.Int32
				}
			}
		}
	}

	if userReferralID <= 0 {
		return nil
	}

	// Get electionGroupID from user_referrals if still unknown
	if electionGroupID <= 0 {
		if urObj, urErr := txQueries.GetUserReferralByID(ctx, userReferralID); urErr == nil && urObj.ElectionGroupID.Valid {
			electionGroupID = urObj.ElectionGroupID.Int32
		}
	}

	// 3. Check for ongoing party marketing campaign for party & election group
	var referralAmt pgtype.Numeric
	if electionGroupID > 0 {
		campaign, campErr := txQueries.GetActiveMarketingCampaignForElectionGroup(ctx, queries.GetActiveMarketingCampaignForElectionGroupParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
		})
		if campErr == nil {
			_ = referralAmt.Scan(fmt.Sprintf("%d.00", campaign.ReferralAmountKobo/100))
			if campaign.ReferralAmountKobo%100 != 0 {
				_ = referralAmt.Scan(fmt.Sprintf("%.2f", float64(campaign.ReferralAmountKobo)/100.0))
			}
		}
	}

	// 4. Update referral: set milestone = 'BECAME_AGENT' and amount_to_pay if active campaign
	if err := txQueries.UpdateReferralOnAgentAcceptance(ctx, queries.UpdateReferralOnAgentAcceptanceParams{
		ReferredUserID:  acceptedUserID,
		AmountToPay:     referralAmt,
		PartyID:         utils.PgInt2FromPositive(partyID),
		ElectionGroupID: utils.PgInt4FromPositive(electionGroupID),
	}); err != nil {
		return fmt.Errorf("UpdateReferralOnAgentAcceptance: %w", err)
	}

	return nil
}

// updateReferralOnApplicationSubmission links a newly submitted application to the applicant's existing referral record
// if the referral record's election_group_id / party_id / user_referral_id are still unlinked (NULL).
func (s *Service) updateReferralOnApplicationSubmission(ctx context.Context, txQueries *queries.Queries, userID int64, partyID int16, electionGroupID int32) error {
	// 1. Fetch user's referral record
	referral, err := txQueries.GetReferralByReferredUserID(ctx, userID)
	if err != nil {
		return nil // User was not referred (or no referral record found)
	}

	// Only proceed if the referral record exists and has no election_group_id or user_referral_id linked yet
	if referral.ElectionGroupID.Valid && referral.UserReferralID.Valid {
		return nil // Already linked
	}

	referrerID := referral.ReferrerUserID
	if referrerID <= 0 || referrerID == userID {
		return nil
	}

	// 2. Fetch or create referrer's user_referrals record for this election group
	userReferralID, err := txQueries.UpsertUserReferralRecord(ctx, queries.UpsertUserReferralRecordParams{
		UserID:          referrerID,
		PartyID:         utils.PgInt2FromPositive(partyID),
		ElectionGroupID: utils.PgInt4FromPositive(electionGroupID),
		Amount:          pgtype.Numeric{Valid: false},
		Status:          "pending",
	})
	if err != nil {
		return fmt.Errorf("failed to upsert referrer user_referrals record: %w", err)
	}

	// 3. Update referral: link user_referral_id, party_id, election_group_id, milestone ('APPLIED')
	if err := txQueries.UpdateReferralOnApplication(ctx, queries.UpdateReferralOnApplicationParams{
		ID:              referral.ID,
		UserReferralID:  utils.PgInt8FromPositive(userReferralID),
		PartyID:         utils.PgInt2FromPositive(partyID),
		ElectionGroupID: utils.PgInt4FromPositive(electionGroupID),
		AmountToPay:     pgtype.Numeric{Valid: false},
		Milestone:       "APPLIED",
	}); err != nil {
		slog.Error("failed to update referral record on application submission", "referral_id", referral.ID, "err", err)
		return err
	}

	return nil
}

func resolvePotentialPaymentKobo(allocationJSON []byte, roleType string, stateID int16) int64 {
	if len(allocationJSON) == 0 {
		return 0
	}
	roleKey := ""
	switch roleType {
	case "polling_agent", "pollingagent":
		roleKey = "polling_agent"
	case "ward_election_supervisor", "ward_supervisor":
		roleKey = "ward_election_supervisor"
	case "lga_election_supervisor", "lga_supervisor":
		roleKey = "lga_election_supervisor"
	case "state_election_supervisor", "state_supervisor":
		roleKey = "state_election_supervisor"
	}

	var allocs map[string]struct {
		Default int64            `json:"default"`
		States  map[string]int64 `json:"states"`
	}
	if err := json.Unmarshal(allocationJSON, &allocs); err != nil {
		return 0
	}

	cfg, ok := allocs[roleKey]
	if !ok {
		return 0
	}

	if stateID > 0 && cfg.States != nil {
		stateKey := strconv.Itoa(int(stateID))
		if customPay, found := cfg.States[stateKey]; found && customPay > 0 {
			return customPay
		}
	}

	return cfg.Default
}

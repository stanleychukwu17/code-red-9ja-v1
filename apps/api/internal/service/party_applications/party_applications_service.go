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

type PollingUnitsService interface {
	GetPollingUnitByID(ctx context.Context, id int32) (queries.PollingUnit, error)
}

type PartiesService interface {
	GetPartyByID(ctx context.Context, partyID int16) (queries.Party, error)
	InvalidatePartyCache(ctx context.Context, partyID int16)
	InvalidateAcceptingPartyIDsCache(ctx context.Context)
}

type Service struct {
	queries             *queries.Queries
	pool                *pgxpool.Pool
	rdb                 *redis.Client
	usersService        UsersService
	pollingUnitsService PollingUnitsService
	partiesService      PartiesService
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, usersService UsersService, pollingUnitsService PollingUnitsService, partiesService PartiesService) *Service {
	return &Service{
		queries:             q,
		pool:                pool,
		rdb:                 rdb,
		usersService:        usersService,
		pollingUnitsService: pollingUnitsService,
		partiesService:      partiesService,
	}
}

var (
	ErrPollingUnitNotFound    = errors.New("selected polling unit not found")
	ErrPollingUnitMismatch    = errors.New("selected polling unit does not match the provided state, LGA, or ward")
	ErrPollingUnitUnavailable = errors.New("selected polling unit has no active elections in this election cycle")
)

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

	// Verify selected polling unit exists
	pu, err := s.pollingUnitsService.GetPollingUnitByID(ctx, input.PollingUnitID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrPollingUnitNotFound
		}
		return 0, fmt.Errorf("failed to fetch polling unit: %w", err)
	}

	// Verify polling unit geography matches applicant's state, LGA, and ward
	if pu.StateID != int32(input.CurrentState) || pu.LgaID != input.CurrentLga || pu.WardID != input.CurrentWard {
		return 0, ErrPollingUnitMismatch
	}

	// Verify polling unit has active elections in the chosen election group
	isAvailable, err := txQueries.IsPollingUnitInElectionGroup(ctx, queries.IsPollingUnitInElectionGroupParams{
		PollingUnitID:   input.PollingUnitID,
		ElectionGroupID: input.ElectionGroupID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to verify polling unit in election group: %w", err)
	}
	if !isAvailable {
		return 0, ErrPollingUnitUnavailable
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

type ListApplicationsInput struct {
	UserID             int64
	PartyID            int16
	ElectionGroupID    int32
	Status             string
	StateID            int16
	LgaID              int32
	WardID             int32
	PollingUnitID      int32
	ActiveElectionOnly bool
	Limit              int32
	Cursor             int64
}

// show all agents applications to a party
func (s *Service) ListApplications(ctx context.Context, input ListApplicationsInput) ([]PartyApplicationListItem, error) {
	// Party/Platform Admin path: reviews incoming applications scoped to party, election group, and state
	if input.UserID == 0 {
		// Enforce mandatory election group and state filters
		if input.ElectionGroupID <= 0 {
			return nil, errors.New("election_group_id is required")
		}
		if input.StateID <= 0 {
			return nil, errors.New("state_id is required")
		}

		// Fetch admin applications matching the compound index (party, election_group, state, status, id DESC)
		rows, err := s.queries.ListPartyApplicationsForAdmin(ctx, queries.ListPartyApplicationsForAdminParams{
			PartyID:         input.PartyID,
			ElectionGroupID: input.ElectionGroupID,
			StateID:         input.StateID,
			Status:          input.Status,
			LgaID:           input.LgaID,
			WardID:          input.WardID,
			PollingUnitID:   input.PollingUnitID,
			Cursor:          input.Cursor,
			LimitVal:        input.Limit,
		})
		if err != nil {
			return nil, err
		}

		// Map admin rows to list items
		result := make([]PartyApplicationListItem, 0, len(rows))
		for _, r := range rows {
			result = append(result, mapAdminApplicationRow(r))
		}
		return result, nil
	}

	// Regular Applicant path: fetch the user's own applications via the user_id index
	rows, err := s.queries.ListUserApplications(ctx, queries.ListUserApplicationsParams{
		UserID:             input.UserID,
		PartyID:            input.PartyID,
		Status:             input.Status,
		ActiveElectionOnly: input.ActiveElectionOnly,
		Cursor:             input.Cursor,
		LimitVal:           input.Limit,
	})
	if err != nil {
		return nil, err
	}

	// Map user rows to list items
	result := make([]PartyApplicationListItem, 0, len(rows))
	for _, r := range rows {
		result = append(result, mapUserApplicationRow(r))
	}

	return result, nil
}

func mapAdminApplicationRow(r queries.ListPartyApplicationsForAdminRow) PartyApplicationListItem {
	return PartyApplicationListItem{
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
	}
}

func mapUserApplicationRow(r queries.ListUserApplicationsRow) PartyApplicationListItem {
	var appStateID *int16
	if r.AppStateID > 0 {
		appStateID = &r.AppStateID
	}
	return PartyApplicationListItem{
		ID:                r.ID,
		UserID:            r.UserID,
		PartyID:           r.PartyID,
		ElectionGroupID:   r.ElectionGroupID,
		PollingUnitID:     utils.PtrFromPgInt4(r.PollingUnitID),
		Role:              r.Role,
		AppStateID:        appStateID,
		AppLgaID:          utils.PtrFromPgInt4(r.AppLgaID),
		AppWardID:         utils.PtrFromPgInt4(r.AppWardID),
		Status:            r.Status,
		RejectedReason:    utils.PtrFromPgText(r.RejectedReason),
		CreatedAt:         r.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:         r.UpdatedAt.Time.Format(time.RFC3339),
		ElectionGroupName: r.ElectionGroupName,
		Year:              int16(r.ElectionDate.Time.Year()),
		PartyName:         r.PartyName,
		PartyShortName:    r.PartyShortName,
		PartyLogo:         r.PartyLogo,
		StateName:         r.StateName.String,
		LgaName:           r.LgaName.String,
		WardName:          r.WardName.String,
		PollingUnitName:   utils.PtrFromPgText(r.PollingUnitName),
		PollingUnitCode:   utils.PtrFromPgText(r.PollingUnitCode),
	}
}

func (s *Service) GetPollingUnitRecommendations(ctx context.Context, partyID int16, electionGroupID int32, lgaID, wardID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error) {
	var finalRows []queries.GetPollingUnitsWithAgentCountsRow

	// 1. Fetch the applicant's specific polling unit directly (position 1).
	//    This also tells us its actual ward_id.
	var applicantWardID int32
	if pollingUnitID > 0 {
		pu, err := s.pollingUnitsService.GetPollingUnitByID(ctx, pollingUnitID)
		if err == nil {
			// Count how many agents are already assigned to this unit
			agentsCount, _ := s.queries.CountPollingUnitAssignments(ctx, queries.CountPollingUnitAssignmentsParams{
				PollingUnitID:   pollingUnitID,
				PartyID:         partyID,
				ElectionGroupID: electionGroupID,
			})

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

func (s *Service) RejectApplication(ctx context.Context, app queries.PartyAgentApplication, reason string) (queries.PartyAgentApplication, error) {
	updatedApp, err := s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             app.ID,
		Status:         "rejected",
		RejectedReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	// Invalidate active agent application cache for the applicant and application entity cache
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, app.ID)

	return updatedApp, nil
}

func (s *Service) CancelApplication(ctx context.Context, app queries.PartyAgentApplication) (queries.PartyAgentApplication, error) {
	updatedApp, err := s.queries.UpdateApplicationStatus(ctx, queries.UpdateApplicationStatusParams{
		ID:             app.ID,
		Status:         "cancelled",
		RejectedReason: pgtype.Text{Valid: false},
	})
	if err != nil {
		return queries.PartyAgentApplication{}, err
	}

	// Invalidate active agent application cache for the applicant and application entity cache
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, app.ID)

	return updatedApp, nil
}

// checkRoleLocationCapacity verifies that the target location has not exceeded the party's recruitment target for the specified role
func checkRoleLocationCapacity(ctx context.Context, txQueries *queries.Queries, party queries.Party, electionGroupID int32, roleType string, stateID int16, lgaID, wardID, pollingUnitID int32) error {
	// Parse party's customized recruitment quotas (e.g. {"polling_agent": 2, "ward_election_supervisor": 1})
	var targets map[string]int
	if len(party.AgentAcquisitionTargets) > 0 {
		_ = json.Unmarshal(party.AgentAcquisitionTargets, &targets)
	}

	// Resolve target quota for this role (defaults: 2 for polling agent, 1 for supervisors)
	target := 1
	if t, ok := targets[roleType]; ok && t > 0 {
		target = t
	} else if roleType == "polling_agent" {
		target = 2
	}

	partyID := party.ID

	// Query active deployments at the specific station level and compare against quota
	switch roleType {
	case "polling_agent":
		// Count existing polling unit agents assigned for this party and election
		count, err := txQueries.CountPollingUnitAssignments(ctx, queries.CountPollingUnitAssignmentsParams{
			PollingUnitID:   pollingUnitID,
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
		})
		if err != nil {
			return fmt.Errorf("failed to check polling unit agent capacity: %w", err)
		}
		if count >= int32(target) {
			return fmt.Errorf("polling unit has reached maximum capacity (%d/%d agents assigned for %s)", count, target, party.ShortName)
		}

	case "ward_election_supervisor":
		// Count existing ward supervisors assigned for this party and election in this ward
		count, err := txQueries.GetWardSupervisorCount(ctx, queries.GetWardSupervisorCountParams{
			ElectionGroupID: electionGroupID,
			WardID:          wardID,
			PartyID:         partyID,
		})
		if err != nil {
			return fmt.Errorf("failed to check ward supervisor capacity: %w", err)
		}
		if count >= int32(target) {
			return fmt.Errorf("ward has reached maximum capacity (%d/%d supervisor(s) assigned for %s)", count, target, party.ShortName)
		}

	case "lga_election_supervisor":
		// Count existing LGA supervisors assigned for this party and election in this LGA
		count, err := txQueries.GetLGASupervisorCount(ctx, queries.GetLGASupervisorCountParams{
			ElectionGroupID: electionGroupID,
			LgaID:           lgaID,
			PartyID:         partyID,
		})
		if err != nil {
			return fmt.Errorf("failed to check LGA supervisor capacity: %w", err)
		}
		if count >= int32(target) {
			return fmt.Errorf("LGA has reached maximum capacity (%d/%d supervisor(s) assigned for %s)", count, target, party.ShortName)
		}

	case "state_election_supervisor":
		// Count existing state supervisors assigned for this party and election in this state
		count, err := txQueries.GetStateSupervisorCount(ctx, queries.GetStateSupervisorCountParams{
			ElectionGroupID: electionGroupID,
			StateID:         stateID,
			PartyID:         partyID,
		})
		if err != nil {
			return fmt.Errorf("failed to check state supervisor capacity: %w", err)
		}
		if count >= int32(target) {
			return fmt.Errorf("state has reached maximum capacity (%d/%d supervisor(s) assigned for %s)", count, target, party.ShortName)
		}
	}

	return nil
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

	// Automatically cancel the application if the election has already ended
	now := time.Now()
	if utils.ElectionStatusForDate(electionGroup.ElectionDate.Time, now) == "ended" {
		reason := "Election has already ended"
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

	// Create assignment based on role
	roleType := input.RoleType
	if roleType == "" {
		roleType = "polling_agent" // Note: Frontend passes 'polling_agent' or supervisor string
	}
	// Resolve who assigned this agent (if specified)
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = utils.PgInt8FromPositive(input.AssignedBy)
	}

	// Fallback to applicant's existing location if not explicitly provided in approval
	stateID := input.StateID
	if stateID <= 0 {
		stateID = app.StateID
	}
	lgaID := input.LgaID
	if lgaID <= 0 && app.LgaID.Valid {
		lgaID = app.LgaID.Int32
	}
	wardID := input.WardID
	if wardID <= 0 && app.WardID.Valid {
		wardID = app.WardID.Int32
	}

	// Validate and resolve polling unit assignment strictly for polling agents
	var pollingUnitID int32
	if roleType == "polling_agent" {
		pollingUnitID = input.PollingUnitID
		if pollingUnitID <= 0 && app.PollingUnitID.Valid {
			pollingUnitID = app.PollingUnitID.Int32
		}
		if pollingUnitID <= 0 {
			return queries.PartyAgentApplication{}, errors.New("polling unit ID is required for polling agents but not specified in application")
		}

		// Derive canonical stateID, lgaID, and wardID directly from the polling unit
		pu, err := s.pollingUnitsService.GetPollingUnitByID(ctx, pollingUnitID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return queries.PartyAgentApplication{}, ErrPollingUnitNotFound
			}
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to fetch polling unit: %w", err)
		}

		stateID = int16(pu.StateID)
		lgaID = pu.LgaID
		wardID = pu.WardID
	}

	// Fetch party configuration
	party, err := s.partiesService.GetPartyByID(ctx, int16(app.PartyID))
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to fetch party: %w", err)
	}

	// Verify that the target location has recruitment capacity remaining for this role
	if err := checkRoleLocationCapacity(ctx, txQueries, party, app.ElectionGroupID, roleType, stateID, lgaID, wardID, pollingUnitID); err != nil {
		return queries.PartyAgentApplication{}, err
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

	// Calculate the required payment allocation for this role and jurisdiction
	deductionKobo := resolvePotentialPaymentKobo(party.AgentPaymentAllocationKobo, roleType, stateID)

	// Deduct allocated agent remuneration from party balance
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

	// Update application status and final role/location
	updatedApp, err := txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
		ID:            input.ApplicationID,
		Role:          roleType,
		PollingUnitID: utils.PgInt4FromPositive(pollingUnitID),
		StateID:       stateID,
		LgaID:         utils.PgInt4FromPositive(lgaID),
		WardID:        utils.PgInt4FromPositive(wardID),
	})
	if err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to update application approval status: %w", err)
	}

	// Extract election group and party identifiers for assignment records
	electionGroupID := app.ElectionGroupID
	partyID := app.PartyID

	// Create role-specific assignment record (Supervisor or Polling Agent)
	switch roleType {
	case "state_election_supervisor":
		// State supervisor assignment
		_, err = txQueries.CreateStateSupervisor(ctx, queries.CreateStateSupervisorParams{
			UserID:               app.UserID,
			StateID:              stateID,
			ElectionGroupID:      electionGroupID,
			PartyID:              partyID,
			RoleType:             utils.PgTextFromString(roleType),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign state supervisor: %w", err)
		}
	case "lga_election_supervisor":
		// LGA supervisor assignment
		_, err = txQueries.CreateLgaSupervisor(ctx, queries.CreateLgaSupervisorParams{
			UserID:               app.UserID,
			StateID:              stateID,
			LgaID:                lgaID,
			ElectionGroupID:      electionGroupID,
			PartyID:              partyID,
			RoleType:             utils.PgTextFromString(roleType),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign LGA supervisor: %w", err)
		}
	case "ward_election_supervisor":
		// Ward supervisor assignment
		_, err = txQueries.CreateWardSupervisor(ctx, queries.CreateWardSupervisorParams{
			UserID:               app.UserID,
			StateID:              stateID,
			LgaID:                lgaID,
			WardID:               wardID,
			ElectionGroupID:      electionGroupID,
			PartyID:              partyID,
			RoleType:             utils.PgTextFromString(roleType),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign ward supervisor: %w", err)
		}
	case "polling_agent":
		// Create polling unit agent assignment with denormalized geography
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:               app.UserID,
			PollingUnitID:        pollingUnitID,
			ElectionGroupID:      electionGroupID,
			PartyID:              partyID,
			StateID:              stateID,
			LgaID:                lgaID,
			WardID:               wardID,
			RoleType:             utils.PgTextFromString(roleType),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			return queries.PartyAgentApplication{}, fmt.Errorf("failed to assign user to role %s: %w", roleType, err)
		}
	default:
		return queries.PartyAgentApplication{}, fmt.Errorf("unsupported role type: %s", roleType)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PartyAgentApplication{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate only caches affected by slot deduction
	s.partiesService.InvalidatePartyCache(ctx, partyID)
	s.partiesService.InvalidateAcceptingPartyIDsCache(ctx)
	_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
	_ = s.InvalidateApplicationByID(ctx, input.ApplicationID)

	// Referral stat update on acceptance in background (best-effort)
	go func(acceptedUserID int64, pID int16, egID int32) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if refErr := s.processReferralOnAcceptance(bgCtx, acceptedUserID, pID, egID); refErr != nil {
			slog.Warn("processReferralOnAcceptance failed (non-fatal)", "userID", acceptedUserID, "err", refErr)
		}
	}(app.UserID, int16(app.PartyID), app.ElectionGroupID)

	return updatedApp, nil
}

// BatchApproveApplicationsInput defines the geographic scope and parameters for bulk approving polling agent applications.
type BatchApproveApplicationsInput struct {
	PartyID         int16
	ElectionGroupID int32
	StateID         int16
	LgaID           int32
	WardID          int32
	AssignedBy      int64
}

// ApprovedAgentInfo captures operational IDs of an approved agent for downstream notification and group sync.
type ApprovedAgentInfo struct {
	ApplicationID int64
	UserID        int64
	PollingUnitID int32
	StateID       int16
	LgaID         int32
	WardID        int32
	Role          string
}

// BatchApproveResult summarizes the outcome of a batch approval run.
type BatchApproveResult struct {
	ApprovedCount int                 `json:"approved_count"`
	SkippedCount  int                 `json:"skipped_count"`
	Approved      []ApprovedAgentInfo `json:"-"`
}

// BatchApproveApplications approves pending polling agent applications within an LGA/Ward up to party capacity limits.
func (s *Service) BatchApproveApplications(ctx context.Context, input BatchApproveApplicationsInput) (*BatchApproveResult, error) {
	if input.PartyID <= 0 || input.ElectionGroupID <= 0 || input.StateID <= 0 || input.LgaID <= 0 {
		return nil, errors.New("party_id, election_group_id, state_id, and lga_id are required")
	}

	// 1. Fetch party configuration and acquisition targets
	party, err := s.partiesService.GetPartyByID(ctx, input.PartyID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch party: %w", err)
	}

	// Parse party agent acquisition quotas per polling unit (defaults to 1)
	var targets map[string]int
	if len(party.AgentAcquisitionTargets) > 0 {
		_ = json.Unmarshal(party.AgentAcquisitionTargets, &targets)
	}
	maxPUAgents := 1
	if val, ok := targets["polling_agent"]; ok && val > 0 {
		maxPUAgents = val
	} else if val, ok := targets["pu_agent"]; ok && val > 0 {
		maxPUAgents = val
	}

	// Calculate agent remuneration deduction per agent
	deductionKobo := resolvePotentialPaymentKobo(party.AgentPaymentAllocationKobo, "polling_agent", input.StateID)

	// 3. Query pending applications matching criteria
	pendingApps, err := s.queries.ListPendingApplicationsForBatchApproval(ctx, queries.ListPendingApplicationsForBatchApprovalParams{
		PartyID:         input.PartyID,
		ElectionGroupID: input.ElectionGroupID,
		StateID:         input.StateID,
		LgaID:           input.LgaID,
		WardID:          input.WardID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pending applications: %w", err)
	}
	if len(pendingApps) == 0 {
		return &BatchApproveResult{ApprovedCount: 0, SkippedCount: 0}, nil
	}

	var assignedBy pgtype.Int8
	if input.AssignedBy > 0 {
		assignedBy = utils.PgInt8FromPositive(input.AssignedBy)
	}

	// Track PU assignment counts in-memory to prevent over-allocation within the batch
	puCounts := make(map[int32]int)
	getPUCount := func(puID int32) int {
		if c, exists := puCounts[puID]; exists {
			return c
		}

		count, err := s.queries.CountPollingUnitAssignments(ctx, queries.CountPollingUnitAssignmentsParams{
			PollingUnitID:   puID,
			PartyID:         input.PartyID,
			ElectionGroupID: input.ElectionGroupID,
		})

		if err == nil {
			puCounts[puID] = int(count)
		} else {
			puCounts[puID] = 0
		}

		return puCounts[puID]
	}

	// Track successfully approved agents and count of skipped applications
	var approvedList []ApprovedAgentInfo
	skippedCount := 0

	// Process pending polling agent applications in FIFO order
	for _, app := range pendingApps {
		// Skip applications without a valid polling unit designation
		if !app.PollingUnitID.Valid || app.PollingUnitID.Int32 <= 0 {
			skippedCount++
			continue
		}

		puID := app.PollingUnitID.Int32

		// Check capacity for this polling unit
		currentCount := getPUCount(puID)
		if currentCount >= maxPUAgents {
			skippedCount++
			continue
		}

		// Execute approval transaction for this application
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			slog.Warn("batch approve: failed to begin transaction", "applicationID", app.ID, "error", err)
			skippedCount++
			continue
		}
		txQueries := s.queries.WithTx(tx)

		// Deduct 1 slot
		_, err = txQueries.DeductPartySlots(ctx, queries.DeductPartySlotsParams{
			Slots: 1,
			ID:    input.PartyID,
		})
		if err != nil {
			tx.Rollback(ctx)
			slog.Warn("batch approve: insufficient slots or deduction error", "error", err)
			break
		}

		// Deduct payment balance if applicable
		if deductionKobo > 0 {
			_, err = txQueries.DeductPartyAgentPaymentBalance(ctx, queries.DeductPartyAgentPaymentBalanceParams{
				AgentPaymentBalanceKobo: deductionKobo,
				ID:                      party.ID,
			})
			if err != nil {
				tx.Rollback(ctx)
				slog.Warn("batch approve: insufficient payment balance", "error", err)
				break
			}
		}

		// Derive canonical location from Polling Unit
		pu, err := s.pollingUnitsService.GetPollingUnitByID(ctx, puID)
		if err != nil {
			tx.Rollback(ctx)
			skippedCount++
			continue
		}
		stateID := int16(pu.StateID)
		lgaID := pu.LgaID
		wardID := pu.WardID

		// Update application status to approved
		_, err = txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
			ID:            app.ID,
			Role:          "polling_agent",
			PollingUnitID: utils.PgInt4FromPositive(puID),
			StateID:       stateID,
			LgaID:         utils.PgInt4FromPositive(lgaID),
			WardID:        utils.PgInt4FromPositive(wardID),
		})
		if err != nil {
			tx.Rollback(ctx)
			skippedCount++
			continue
		}

		// Insert polling_unit_assignments
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:               app.UserID,
			PollingUnitID:        puID,
			ElectionGroupID:      input.ElectionGroupID,
			PartyID:              input.PartyID,
			StateID:              stateID,
			LgaID:                lgaID,
			WardID:               wardID,
			RoleType:             utils.PgTextFromString("polling_agent"),
			AssignedBy:           assignedBy,
			PotentialPaymentKobo: deductionKobo,
		})
		if err != nil {
			tx.Rollback(ctx)
			skippedCount++
			continue
		}

		if err := tx.Commit(ctx); err != nil {
			skippedCount++
			continue
		}

		// Increment counts on success
		puCounts[puID]++
		_ = s.InvalidateUserHasActiveAgentApp(ctx, app.UserID)
		_ = s.InvalidateApplicationByID(ctx, app.ID)

		approvedList = append(approvedList, ApprovedAgentInfo{
			ApplicationID: app.ID,
			UserID:        app.UserID,
			PollingUnitID: puID,
			StateID:       stateID,
			LgaID:         lgaID,
			WardID:        wardID,
			Role:          "polling_agent",
		})
	}

	// Invalidate party caches once after batch
	s.partiesService.InvalidatePartyCache(ctx, input.PartyID)
	s.partiesService.InvalidateAcceptingPartyIDsCache(ctx)

	return &BatchApproveResult{
		ApprovedCount: len(approvedList),
		SkippedCount:  skippedCount,
		Approved:      approvedList,
	}, nil
}

// processReferralOnAcceptance updates referral stats when a referred user's application is accepted (or auto-accepted).
func (s *Service) processReferralOnAcceptance(ctx context.Context, acceptedUserID int64, partyID int16, electionGroupID int32) error {
	// 1. Get candidate's referral record
	referral, err := s.queries.GetReferralByReferredUserID(ctx, acceptedUserID)
	if err != nil {
		return nil // Not referred — nothing to do
	}

	// Idempotency check: if milestone is already BECAME_AGENT, skip (referral reward is once in a lifetime)
	if referral.Milestone == "BECAME_AGENT" {
		return nil
	}

	// Self-referral guard: cannot reward self
	if referral.ReferrerUserID <= 0 || referral.ReferrerUserID == acceptedUserID {
		return nil
	}

	// Fall back to referral's linked election_group_id if caller did not supply one
	if electionGroupID <= 0 && referral.ElectionGroupID.Valid {
		electionGroupID = referral.ElectionGroupID.Int32
	}

	// 2. Check for ongoing party marketing campaign for party & election group
	var referralAmtKobo int64
	if electionGroupID > 0 {
		campaign, campErr := s.queries.GetActiveMarketingCampaignForElectionGroup(ctx, queries.GetActiveMarketingCampaignForElectionGroupParams{
			PartyID:         partyID,
			ElectionGroupID: electionGroupID,
		})
		if campErr == nil {
			referralAmtKobo = campaign.ReferralAmountKobo
		}
	}

	// 3. Update referral: set milestone = 'BECAME_AGENT' and amount_to_pay_kobo if active campaign
	if err := s.queries.UpdateReferralOnAgentAcceptance(ctx, queries.UpdateReferralOnAgentAcceptanceParams{
		ReferredUserID:  acceptedUserID,
		AmountToPayKobo: referralAmtKobo,
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
		AmountKobo:      0,
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
		AmountToPayKobo: 0,
		Milestone:       "APPLIED",
	}); err != nil {
		slog.Error("failed to update referral record on application submission", "referral_id", referral.ID, "err", err)
		return err
	}

	return nil
}

func resolvePotentialPaymentKobo(allocationJSON []byte, roleType string, stateID int16) int64 {
	// Guard against empty allowance allocation data
	if len(allocationJSON) == 0 {
		return 0
	}

	// Validate against standard role keys
	roleKey := ""
	switch roleType {
	case "polling_agent":
		roleKey = "polling_agent"
	case "ward_election_supervisor":
		roleKey = "ward_election_supervisor"
	case "lga_election_supervisor":
		roleKey = "lga_election_supervisor"
	case "state_election_supervisor":
		roleKey = "state_election_supervisor"
	}

	// Unmarshal role-based payment configuration
	var allocs map[string]struct {
		Default int64            `json:"default"`
		States  map[string]int64 `json:"states"`
	}
	if err := json.Unmarshal(allocationJSON, &allocs); err != nil {
		return 0
	}

	// Lookup payment configuration for the target role
	cfg, ok := allocs[roleKey]
	if !ok {
		return 0
	}

	// Check for state-specific payment overrides
	if stateID > 0 && cfg.States != nil {
		stateKey := strconv.Itoa(int(stateID))
		if customPay, found := cfg.States[stateKey]; found && customPay > 0 {
			return customPay
		}
	}

	// Fall back to default role payment
	return cfg.Default
}

// ChangeAgentRoleInput defines parameters for reassigning an approved agent's role or geographic location
type ChangeAgentRoleInput struct {
	ApplicationID   int64
	UserID          int64
	PartyID         int16
	ElectionGroupID int32
	CurrentRoleType string
	NewRoleType     string
	StateID         int16
	LgaID           int32
	WardID          int32
	PollingUnitID   int32
	AssignedBy      int64
}

// ChangeAgentRoleResult returns the updated role assignment summary
type ChangeAgentRoleResult struct {
	UserID  int64  `json:"user_id"`
	NewRole string `json:"new_role"`
}

// ChangeAgentRole updates an agent's active assignment (e.g. promoting polling agent to supervisor or reassigning location)
func (s *Service) ChangeAgentRole(ctx context.Context, input ChangeAgentRoleInput) (*ChangeAgentRoleResult, error) {
	stateID := input.StateID
	lgaID := input.LgaID
	wardID := input.WardID
	pollingUnitID := input.PollingUnitID

	// Validate standardized role identifier and geographic requirements
	newRole := strings.ToLower(strings.TrimSpace(input.NewRoleType))
	switch newRole {
	case "polling_agent":
		if pollingUnitID <= 0 {
			return nil, errors.New("polling_unit_id is required for polling_agent role")
		}

		// Derive canonical parent geographic hierarchy directly from the polling unit
		pu, err := s.pollingUnitsService.GetPollingUnitByID(ctx, pollingUnitID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch polling unit: %w", err)
		}

		stateID = int16(pu.StateID)
		lgaID = pu.LgaID
		wardID = pu.WardID
	case "ward_election_supervisor":
		if stateID <= 0 || lgaID <= 0 || wardID <= 0 {
			return nil, errors.New("state_id, lga_id, and ward_id are required for ward supervisor")
		}
		pollingUnitID = 0
	case "lga_election_supervisor":
		if stateID <= 0 || lgaID <= 0 {
			return nil, errors.New("state_id and lga_id are required for LGA supervisor")
		}
		wardID = 0
		pollingUnitID = 0
	case "state_election_supervisor":
		if stateID <= 0 {
			return nil, errors.New("state_id is required for state supervisor")
		}
		lgaID = 0
		wardID = 0
		pollingUnitID = 0
	default:
		return nil, fmt.Errorf("invalid new_role_type: %s", input.NewRoleType)
	}

	// Require valid application ID and fetch existing application details
	if input.ApplicationID <= 0 {
		return nil, errors.New("application_id is required")
	}

	app, err := s.GetApplicationByID(ctx, input.ApplicationID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch application: %w", err)
	}

	// Early return without DB transaction if current assignment is already identical
	if app.Role == newRole {
		isSame := false
		switch newRole {
		case "polling_agent":
			isSame = app.PollingUnitID.Valid && app.PollingUnitID.Int32 == pollingUnitID
		case "ward_election_supervisor":
			isSame = app.WardID.Valid && app.WardID.Int32 == wardID &&
				app.LgaID.Valid && app.LgaID.Int32 == lgaID &&
				app.StateID == stateID
		case "lga_election_supervisor":
			isSame = app.LgaID.Valid && app.LgaID.Int32 == lgaID &&
				app.StateID == stateID
		case "state_election_supervisor":
			isSame = app.StateID == stateID
		}

		// if nothing changed, return early
		if isSame {
			return &ChangeAgentRoleResult{
				UserID:  input.UserID,
				NewRole: newRole,
			}, nil
		}
	}

	// Begin atomic transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch party configuration
	party, err := s.partiesService.GetPartyByID(ctx, input.PartyID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch party: %w", err)
	}

	// Verify that the target location has recruitment capacity remaining for the new role
	if err := checkRoleLocationCapacity(ctx, txQueries, party, input.ElectionGroupID, newRole, stateID, lgaID, wardID, pollingUnitID); err != nil {
		return nil, err
	}

	// Clear previous assignment from the table corresponding to the agent's current role
	switch app.Role {
	case "polling_agent":
		if _, err := tx.Exec(ctx, "DELETE FROM polling_unit_assignments WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", input.UserID, input.ElectionGroupID, input.PartyID); err != nil {
			return nil, fmt.Errorf("failed to clear old polling unit assignment: %w", err)
		}
	case "ward_election_supervisor":
		if _, err := tx.Exec(ctx, "DELETE FROM ward_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", input.UserID, input.ElectionGroupID, input.PartyID); err != nil {
			return nil, fmt.Errorf("failed to clear old ward supervisor assignment: %w", err)
		}
	case "lga_election_supervisor":
		if _, err := tx.Exec(ctx, "DELETE FROM lga_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", input.UserID, input.ElectionGroupID, input.PartyID); err != nil {
			return nil, fmt.Errorf("failed to clear old LGA supervisor assignment: %w", err)
		}
	case "state_election_supervisor":
		if _, err := tx.Exec(ctx, "DELETE FROM state_election_supervisors WHERE user_id = $1 AND election_group_id = $2 AND party_id = $3", input.UserID, input.ElectionGroupID, input.PartyID); err != nil {
			return nil, fmt.Errorf("failed to clear old state supervisor assignment: %w", err)
		}
	}

	// Resolve assigner and potential remuneration for the new assignment
	var assignedByVal pgtype.Int8
	if input.AssignedBy > 0 {
		assignedByVal = utils.PgInt8FromPositive(input.AssignedBy)
	}
	potentialPaymentKobo := resolvePotentialPaymentKobo(party.AgentPaymentAllocationKobo, newRole, stateID)

	// Insert new assignment record using type-safe sqlc queries
	switch newRole {
	case "polling_agent":
		_, err = txQueries.CreateAssignment(ctx, queries.CreateAssignmentParams{
			UserID:               input.UserID,
			PollingUnitID:        pollingUnitID,
			ElectionGroupID:      input.ElectionGroupID,
			PartyID:              input.PartyID,
			StateID:              stateID,
			LgaID:                lgaID,
			WardID:               wardID,
			RoleType:             utils.PgTextFromString(newRole),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: potentialPaymentKobo,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to assign polling agent: %w", err)
		}

	case "ward_election_supervisor":
		_, err = txQueries.CreateWardSupervisor(ctx, queries.CreateWardSupervisorParams{
			UserID:               input.UserID,
			StateID:              stateID,
			LgaID:                lgaID,
			WardID:               wardID,
			ElectionGroupID:      input.ElectionGroupID,
			PartyID:              input.PartyID,
			RoleType:             utils.PgTextFromString(newRole),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: potentialPaymentKobo,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to assign ward supervisor: %w", err)
		}

	case "lga_election_supervisor":
		_, err = txQueries.CreateLgaSupervisor(ctx, queries.CreateLgaSupervisorParams{
			UserID:               input.UserID,
			StateID:              stateID,
			LgaID:                lgaID,
			ElectionGroupID:      input.ElectionGroupID,
			PartyID:              input.PartyID,
			RoleType:             utils.PgTextFromString(newRole),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: potentialPaymentKobo,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to assign LGA supervisor: %w", err)
		}

	case "state_election_supervisor":
		_, err = txQueries.CreateStateSupervisor(ctx, queries.CreateStateSupervisorParams{
			UserID:               input.UserID,
			StateID:              stateID,
			ElectionGroupID:      input.ElectionGroupID,
			PartyID:              input.PartyID,
			RoleType:             utils.PgTextFromString(newRole),
			AssignedBy:           assignedByVal,
			PotentialPaymentKobo: potentialPaymentKobo,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to assign state supervisor: %w", err)
		}
	}

	// Keep party_agent_applications synchronized with the new assignment
	_, err = txQueries.UpdateApplicationApproval(ctx, queries.UpdateApplicationApprovalParams{
		ID:            app.ID,
		Role:          newRole,
		PollingUnitID: utils.PgInt4FromPositive(pollingUnitID),
		StateID:       stateID,
		LgaID:         utils.PgInt4FromPositive(lgaID),
		WardID:        utils.PgInt4FromPositive(wardID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update application record: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit role change: %w", err)
	}

	// Invalidate cached application details
	_ = s.InvalidateApplicationByID(ctx, app.ID)

	return &ChangeAgentRoleResult{
		UserID:  input.UserID,
		NewRole: newRole,
	}, nil
}

// RevokeAgentInput defines parameters for revoking an active agent or supervisor assignment
type RevokeAgentInput struct {
	AssignmentID int64
	RoleType     string
	PartyID      int16
}

// RevokedAgentResult contains the operational identifiers of the revoked agent.
type RevokedAgentResult struct {
	UserID          int64
	PartyID         int16
	ElectionGroupID int32
}

// RevokeAgent removes an active polling agent or supervisor assignment
func (s *Service) RevokeAgent(ctx context.Context, input RevokeAgentInput) (*RevokedAgentResult, error) {
	// Validate standardized role identifier
	roleType := strings.ToLower(strings.TrimSpace(input.RoleType))
	switch roleType {
	case "polling_agent", "ward_election_supervisor", "lga_election_supervisor", "state_election_supervisor":
		// Standardized role
	default:
		return nil, errors.New("invalid role_type parameter")
	}

	var partyID int16
	var electionGroupID int32
	var userID int64
	var err error

	switch roleType {
	case "polling_agent":
		// Verify assignment exists and matches target party
		errQuery := s.pool.QueryRow(ctx, "SELECT party_id, election_group_id, user_id FROM polling_unit_assignments WHERE id = $1", input.AssignmentID).Scan(&partyID, &electionGroupID, &userID)
		if errQuery != nil {
			return nil, errors.New("assignment not found")
		}
		if input.PartyID > 0 && partyID != input.PartyID {
			return nil, errors.New("cannot revoke assignment belonging to another party")
		}
		// Delete polling unit assignment record
		_, err = s.pool.Exec(ctx, "DELETE FROM polling_unit_assignments WHERE id = $1", input.AssignmentID)

	case "ward_election_supervisor":
		// Verify supervisor exists and matches target party
		errQuery := s.pool.QueryRow(ctx, "SELECT party_id, election_group_id, user_id FROM ward_election_supervisors WHERE id = $1", input.AssignmentID).Scan(&partyID, &electionGroupID, &userID)
		if errQuery != nil {
			return nil, errors.New("assignment not found")
		}
		if input.PartyID > 0 && partyID != input.PartyID {
			return nil, errors.New("cannot revoke assignment belonging to another party")
		}
		// Delete ward supervisor record
		_, err = s.pool.Exec(ctx, "DELETE FROM ward_election_supervisors WHERE id = $1", input.AssignmentID)

	case "lga_election_supervisor":
		// Verify supervisor exists and matches target party
		errQuery := s.pool.QueryRow(ctx, "SELECT party_id, election_group_id, user_id FROM lga_election_supervisors WHERE id = $1", input.AssignmentID).Scan(&partyID, &electionGroupID, &userID)
		if errQuery != nil {
			return nil, errors.New("assignment not found")
		}
		if input.PartyID > 0 && partyID != input.PartyID {
			return nil, errors.New("cannot revoke assignment belonging to another party")
		}
		// Delete LGA supervisor record
		_, err = s.pool.Exec(ctx, "DELETE FROM lga_election_supervisors WHERE id = $1", input.AssignmentID)

	case "state_election_supervisor":
		// Verify supervisor exists and matches target party
		errQuery := s.pool.QueryRow(ctx, "SELECT party_id, election_group_id, user_id FROM state_election_supervisors WHERE id = $1", input.AssignmentID).Scan(&partyID, &electionGroupID, &userID)
		if errQuery != nil {
			return nil, errors.New("assignment not found")
		}
		if input.PartyID > 0 && partyID != input.PartyID {
			return nil, errors.New("cannot revoke assignment belonging to another party")
		}
		// Delete state supervisor record
		_, err = s.pool.Exec(ctx, "DELETE FROM state_election_supervisors WHERE id = $1", input.AssignmentID)

	default:
		return nil, errors.New("invalid role_type parameter")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to revoke assignment: %w", err)
	}

	return &RevokedAgentResult{
		UserID:          userID,
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
	}, nil
}

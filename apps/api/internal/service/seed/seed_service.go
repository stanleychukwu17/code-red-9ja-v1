package seedservice

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	authservice "free9ja/api/internal/service/auth"
	bodiesservice "free9ja/api/internal/service/bodies"
	partiesservice "free9ja/api/internal/service/parties"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/sync/errgroup"
)

type SeedService struct {
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
	authService     *authservice.AuthService
	bodiesService   *bodiesservice.BodiesService
	usersService    *usersservice.UsersService
	partiesService  *partiesservice.PartiesService
}

func NewSeedService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	taskDistributor worker.TaskDistributor,
	authService *authservice.AuthService,
	bodiesService *bodiesservice.BodiesService,
	usersService *usersservice.UsersService,
	partiesService *partiesservice.PartiesService,
) *SeedService {
	return &SeedService{
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: taskDistributor,
		authService:     authService,
		bodiesService:   bodiesService,
		usersService:    usersService,
		partiesService:  partiesService,
	}
}

type SeedUserRequest struct {
	Num                int     `json:"num"`
	Email              string  `json:"email"`
	Avatar             string  `json:"avatar"`
	Phone              *string `json:"phone"`
	Username           *string `json:"username"`
	Password           string  `json:"password"`
	LastName           string  `json:"last_name"`
	FirstName          string  `json:"first_name"`
	MiddleName         *string `json:"middle_name"`
	Gender             string  `json:"gender"`
	DateOfBirth        string  `json:"date_of_birth"`
	Religion           string  `json:"religion"`
	CurrentCountry     int16   `json:"current_country"`
	CurrentState       int16   `json:"current_state"`
	CurrentLga         *int32  `json:"current_lga"`
	CurrentCity        *int32  `json:"current_city"`
	StateOfOrigin      *int16  `json:"state_of_origin"`
	MaritalStatus      string  `json:"marital_status"`
	EducationLevel     string  `json:"education_level"`
	HomeAddress        string  `json:"home_address"`
	OccupationID       *int16  `json:"occupation_id"`
	PartyID            *int16  `json:"party_id"`
	AccountStatus      string  `json:"account_status"`
	IsVerified         bool    `json:"is_verified"`
	VerificationTypeID *int16  `json:"verification_type_id"`
	IsPolitician       bool    `json:"is_politician"`
}

// SeedUsers registers a batch of new users from a seed request.
// It handles password hashing, database insertion, generates fake IDs, caches user details in Redis,
// and optionally appends user verification badges (e.g., for politicians).
func (s *SeedService) SeedUsers(ctx context.Context, users []SeedUserRequest) (string, error) {
	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(25)

	for _, u := range users {
		eg.Go(func() error {
			// check if email already exit, if yes, we can skip this user onto the next
			if s.usersService.CheckEmail(ctx, u.Email) {
				return nil
			}

			// Hash password
			hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
			if err != nil {
				return err
			}

			// parse date of birth
			dob, err := time.Parse(time.DateOnly, u.DateOfBirth)
			if err != nil {
				return fmt.Errorf("invalid dob format for user %s: %w", u.Email, err)
			}

			// Prepare params
			emailVal := pgtype.Text{String: strings.TrimSpace(strings.ToLower(u.Email)), Valid: true}
			avatarVal := pgtype.Text{String: u.Avatar, Valid: true}
			var usernameVal pgtype.Text
			if u.Username != nil {
				usernameVal = pgtype.Text{String: *u.Username, Valid: true}
			}
			var middleNameVal pgtype.Text
			if u.MiddleName != nil {
				middleNameVal = pgtype.Text{String: *u.MiddleName, Valid: true}
			}
			genderVal := pgtype.Text{String: u.Gender, Valid: true}
			var currentLgaVal pgtype.Int4
			if u.CurrentLga != nil {
				currentLgaVal = pgtype.Int4{Int32: *u.CurrentLga, Valid: true}
			}
			var currentCityVal pgtype.Int4
			if u.CurrentCity != nil {
				currentCityVal = pgtype.Int4{Int32: *u.CurrentCity, Valid: true}
			}
			var stateOfOriginVal pgtype.Int2
			if u.StateOfOrigin != nil {
				stateOfOriginVal = pgtype.Int2{Int16: *u.StateOfOrigin, Valid: true}
			}
			var occupationIDVal pgtype.Int2
			if u.OccupationID != nil {
				occupationIDVal = pgtype.Int2{Int16: *u.OccupationID, Valid: true}
			}
			var partyIDVal pgtype.Int2
			if u.PartyID != nil {
				partyIDVal = pgtype.Int2{Int16: *u.PartyID, Valid: true}
			}

			// check if the user phone number is valid
			var phoneVal pgtype.Text
			var iso2, phonecode, formattedPhone, rawPhoneInput string
			if u.Phone != nil && *u.Phone != "" {
				rawPhoneInput = *u.Phone
				country, err := s.bodiesService.CheckCountry(ctx, u.CurrentCountry)
				if err != nil {
					return fmt.Errorf("failed to fetch country for user %s: %w", u.Email, err)
				}

				iso2 = country.Iso2
				phonecode = country.Phonecode
				formattedPhone, err = utils.ValidatePhoneForCountry(rawPhoneInput, iso2)
				if err != nil {
					return fmt.Errorf("invalid phone for user %s: %w", u.Email, err)
				}
				phoneVal = pgtype.Text{String: formattedPhone, Valid: true}
			}

			isVerifiedVal := u.IsVerified && u.VerificationTypeID != nil

			// user params
			params := queries.SeedUserParams{
				Email:           emailVal,
				Avatar:          avatarVal,
				Phone:           phoneVal,
				Username:        usernameVal,
				PasswordHash:    string(hashed),
				LastName:        pgtype.Text{String: u.LastName, Valid: u.LastName != ""},
				FirstName:       pgtype.Text{String: u.FirstName, Valid: u.FirstName != ""},
				MiddleName:      middleNameVal,
				Gender:          genderVal,
				DateOfBirth:     pgtype.Date{Time: dob, Valid: true},
				CurrentCountry:  u.CurrentCountry,
				CurrentState:    u.CurrentState,
				CurrentLga:      currentLgaVal,
				CurrentCity:     currentCityVal,
				StateOfOrigin:   stateOfOriginVal,
				VotersCardImage: pgtype.Text{String: "", Valid: false},
				AccountStatus:   pgtype.Text{String: u.AccountStatus, Valid: u.AccountStatus != ""},
				PartyID:         partyIDVal,
				IsPolitician:    pgtype.Bool{Bool: u.IsPolitician, Valid: true},
				IsVerified:      pgtype.Bool{Bool: isVerifiedVal, Valid: true},
			}

			// save the users
			newUserID, err := s.queries.SeedUser(ctx, params)
			if err != nil {
				return fmt.Errorf("failed to seed user %s: %w", u.Email, err)
			}

			// save extra info on the users
			_, err = s.queries.CreateMoreInfoAboutThisUser(ctx, queries.CreateMoreInfoAboutThisUserParams{
				UserID:            newUserID,
				OccupationID:      occupationIDVal,
				EducationalStatus: pgtype.Text{},
				HighestDegree:     pgtype.Text{},
				GraduationYear:    pgtype.Text{},
				SchoolName:        pgtype.Text{},
				Religion:          pgtype.Text{String: u.Religion, Valid: u.Religion != ""},
				MaritalStatus:     pgtype.Text{String: u.MaritalStatus, Valid: u.MaritalStatus != ""},
				Address:           pgtype.Text{String: u.HomeAddress, Valid: u.HomeAddress != ""},
			})
			if err != nil {
				return fmt.Errorf("failed to seed user profile for %s: %w", u.Email, err)
			}

			// create a request for the user credentials to be verified
			_, err = s.queries.CreateUserVerification(ctx, queries.CreateUserVerificationParams{
				UserID:             newUserID,
				NinVerified:        pgtype.Bool{Bool: false, Valid: true},
				PhoneVerified:      pgtype.Bool{Bool: false, Valid: true},
				EmailVerified:      pgtype.Bool{Bool: false, Valid: true},
				VotersCardVerified: pgtype.Bool{Bool: false, Valid: true},
			})
			if err != nil {
				return fmt.Errorf("failed to create user verification for %s: %w", u.Email, err)
			}

			// generate and update the user fakeID
			newUserFakeID := utils.GenerateFakeID(newUserID)
			_ = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: newUserID, FakeID: pgtype.Int8{Int64: newUserFakeID, Valid: true}})

			// Save details to Redis cache
			emailStr := emailVal.String
			usernameStr := usernameVal.String
			_ = s.authService.SaveSomeUserRegistrationDetails(ctx, usernameStr, emailStr, "", newUserID, newUserFakeID)

			// save the user phone number
			if formattedPhone != "" {
				_ = s.usersService.UpdateUserPhoneNumbers(ctx, newUserID, newUserFakeID, []usersservice.PhonePayload{
					{
						Phone:     formattedPhone,
						RawInput:  rawPhoneInput,
						Phonecode: phonecode,
						IsDefault: true,
					},
				})
			}

			// update user verification type, this will add a verification badge for the user
			if u.IsVerified && u.VerificationTypeID != nil {
				_, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
					PageType:           db.PageTypeUser,
					PageID:             newUserID,
					VerificationTypeID: *u.VerificationTypeID,
				})
				if err != nil {
					return fmt.Errorf("failed to assign page verification for %s: %w", u.Email, err)
				}
			}

			// adds a "celebrity" verification type for politicians
			if u.IsPolitician {
				_, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
					PageType:           db.PageTypeUser,
					PageID:             newUserID,
					VerificationTypeID: 2,
				})
				if err != nil {
					return fmt.Errorf("failed to assign page verification for %s: %w", u.Email, err)
				}
			}

			// if the user belongs to a party, officially join them to the party
			if u.PartyID != nil && *u.PartyID > 0 {
				err := s.partiesService.JoinParty(ctx, *u.PartyID, 0, newUserID, newUserFakeID)
				if err != nil {
					return fmt.Errorf("failed to join party for user %s: %w", u.Email, err)
				}
			}

			// get and save the user details to cache in redis
			_, _ = s.authService.GetUserDetailsByFakeID(ctx, newUserFakeID)

			// log success message
			// fmt.Println("added user with id", newUserID)
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return "", err
	}

	return "Users seeded successfully", nil
}

type PartyAdminsData struct {
	ID              int16   `json:"id"` // partyID
	PartyAdmin      []int64 `json:"party_admin"`
	SuperPartyAdmin []int64 `json:"super_party_admin"`
}

type SeedAdminsRequest struct {
	Admins  []int64                      `json:"admins"`
	Parties []map[string]PartyAdminsData `json:"parties"`
}

// SeedAdmins assigns system-wide admin roles, as well as party admin and super party admin roles to existing users.
// For party roles, it first joins the user to the specified party.
// All role assignments are processed concurrently.
func (s *SeedService) SeedAdmins(ctx context.Context, req SeedAdminsRequest) (string, error) {
	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(25)

	// system admin who assigns
	systemAdminID := int64(1)

	// Process system admins
	for _, adminID := range req.Admins {
		eg.Go(func() error {
			// get the fake id for the user
			fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, adminID)
			if err != nil {
				return fmt.Errorf("failed to fetch fake ID for user %d: %w", adminID, err)
			}
			fakeID := fakeIDData.Int64

			// assign admin role
			err = s.usersService.AssignUserRole(ctx, adminID, fakeID, "admin", systemAdminID)
			if err != nil {
				return fmt.Errorf("failed to assign admin role to user %d: %w", adminID, err)
			}

			// assign super_admin role
			// err = s.usersService.AssignUserRole(ctx, adminID, fakeID, "super_admin", systemAdminID)
			// if err != nil {
			// 	return fmt.Errorf("failed to assign super_admin role to user %d: %w", adminID, err)
			// }
			// fmt.Println("assigned super_admin to id", adminID)
			return nil
		})
	}

	// Process party admins
	for _, partyMap := range req.Parties {
		for _, partyData := range partyMap {
			partyID := partyData.ID

			// Process party_admin
			for _, pAdminID := range partyData.PartyAdmin {
				eg.Go(func() error {
					// get the fake id for the user
					fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, pAdminID)
					if err != nil {
						return fmt.Errorf("failed to fetch fake ID for party admin %d: %w", pAdminID, err)
					}
					fakeID := fakeIDData.Int64

					// join party
					err = s.partiesService.JoinParty(ctx, partyID, 0, pAdminID, fakeID)
					if err != nil {
						return fmt.Errorf("failed to join party for user %d: %w", pAdminID, err)
					}

					// assign role
					err = s.usersService.AssignUserRole(ctx, pAdminID, fakeID, "party_admin", systemAdminID)
					if err != nil {
						return fmt.Errorf("failed to assign party_admin role to user %d: %w", pAdminID, err)
					}
					fmt.Println("assigned party_admin to id", pAdminID)
					return nil
				})
			}

			// Process super_party_admin
			for _, spAdminID := range partyData.SuperPartyAdmin {
				eg.Go(func() error {
					// get the fake id for the user
					fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, spAdminID)
					if err != nil {
						return fmt.Errorf("failed to fetch fake ID for super party admin %d: %w", spAdminID, err)
					}
					fakeID := fakeIDData.Int64

					// join party
					err = s.partiesService.JoinParty(ctx, partyID, 0, spAdminID, fakeID)
					if err != nil {
						return fmt.Errorf("failed to join party for user %d: %w", spAdminID, err)
					}

					// assign super_party_admin role
					err = s.usersService.AssignUserRole(ctx, spAdminID, fakeID, "super_party_admin", systemAdminID)
					if err != nil {
						return fmt.Errorf("failed to assign super_party_admin role to user %d: %w", spAdminID, err)
					}
					fmt.Println("assigned super_party_admin to id", spAdminID)
					return nil
				})
			}
		}
	}

	// wait for all goroutines to finish
	if err := eg.Wait(); err != nil {
		return "", err
	}

	return "Admins seeded successfully", nil
}

type SimulateElectionResultsRequest struct {
	Limit           int32 `json:"limit"`            // max PUs to populate (0 = all)
	MinVotesPerPU   int32 `json:"min_votes_per_pu"`  // optional min votes (default 100)
	MaxVotesPerPU   int32 `json:"max_votes_per_pu"`  // optional max votes (default 750)
	TriggerRealtime *bool `json:"trigger_realtime"` // dispatch Asynq tasks (default true)
	RunFullRollup   bool  `json:"run_full_rollup"`  // immediately run sequential rollup queries (default false)
}

type SimulateResultsResponse struct {
	ElectionID            int64  `json:"election_id"`
	ElectionName          string `json:"election_name"`
	Scope                 string `json:"scope"`
	SimulatedPollingUnits int    `json:"simulated_polling_units"`
	PartiesCount          int    `json:"parties_count"`
	Message               string `json:"message"`
}

type candidateResultItem struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
}

// SimulateElectionResults creates mock consensus final results for all eligible polling units
// of an election using all active political parties and automatically triggers the cascading real-time rollups or full sequential reconciliation.
func (s *SeedService) SimulateElectionResults(ctx context.Context, electionID int64, req SimulateElectionResultsRequest) (*SimulateResultsResponse, error) {
	election, err := s.queries.GetElectionInstanceByID(ctx, electionID)
	if err != nil {
		return nil, fmt.Errorf("election %d not found: %w", electionID, err)
	}

	activeParties, err := s.queries.ListParties(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch active parties: %w", err)
	}
	if len(activeParties) == 0 {
		return nil, fmt.Errorf("no active political parties found in database")
	}

	var partyShortNames []string
	for _, p := range activeParties {
		if p.ShortName != "" {
			partyShortNames = append(partyShortNames, p.ShortName)
		}
	}

	limit := req.Limit
	pus, err := s.queries.GetEligiblePollingUnitsForElection(ctx, queries.GetEligiblePollingUnitsForElectionParams{
		ID:      electionID,
		Column2: limit,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query eligible polling units: %w", err)
	}
	if len(pus) == 0 {
		return nil, fmt.Errorf("no eligible polling units found for election scope '%s'", election.Scope)
	}

	minVotes := req.MinVotesPerPU
	if minVotes <= 0 {
		minVotes = 100
	}
	maxVotes := req.MaxVotesPerPU
	if maxVotes < minVotes {
		maxVotes = minVotes + 500
	}

	triggerRealtime := true
	if req.TriggerRealtime != nil {
		triggerRealtime = *req.TriggerRealtime
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for _, pu := range pus {
		votesCast := minVotes + r.Int31n(maxVotes-minVotes+1)
		rejectedVotes := r.Int31n(votesCast/20 + 1)
		validVotes := votesCast - rejectedVotes
		accreditedVoters := votesCast + r.Int31n(40) + 10

		// Distribute valid votes among active political parties
		weights := make([]int32, len(partyShortNames))
		var sumWeights int32
		for i := range partyShortNames {
			w := r.Int31n(100) + 5
			weights[i] = w
			sumWeights += w
		}

		candItems := make([]candidateResultItem, len(partyShortNames))
		var allocatedVotes int32
		for i, shortName := range partyShortNames {
			v := int32((int64(weights[i]) * int64(validVotes)) / int64(sumWeights))
			candItems[i] = candidateResultItem{
				PartyShortName: shortName,
				VoteCount:      v,
			}
			allocatedVotes += v
		}
		candItems[0].VoteCount += (validVotes - allocatedVotes)

		candJSON, err := json.Marshal(candItems)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal candidate results: %w", err)
		}

		_, err = s.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
			ElectionID:               election.ID,
			ElectionGroupID:          election.ElectionGroupID,
			PollingUnitID:            pu.ID,
			StateID:                  pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:     pu.SenatorialDistrictID,
			FederalConstituencyID:    pu.FederalConstituencyID,
			StateConstituencyID:      pu.StateConstituencyID,
			LgaID:                    pgtype.Int4{Int32: pu.LgaID, Valid: true},
			WardID:                   pgtype.Int4{Int32: pu.WardID, Valid: true},
			PollingUnitResultID:      pgtype.Int8{Valid: false},
			AccreditedVoters:         accreditedVoters,
			VotesCast:                votesCast,
			ValidVotes:               validVotes,
			RejectedVotes:            rejectedVotes,
			CandidateResults:         candJSON,
			MatchingSubmissionsCount: 1,
			TotalSubmissionsCount:    1,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to upsert polling unit final result for PU %d: %w", pu.ID, err)
		}

		if triggerRealtime && s.taskDistributor != nil {
			_ = s.taskDistributor.DistributeTaskRollupSingleWard(ctx, &worker.RollupSingleWardPayload{
				ElectionID:            election.ID,
				WardID:                pu.WardID,
				LGAID:                 pu.LgaID,
				StateID:               int16(pu.StateID),
				StateConstituencyID:   pu.StateConstituencyID.Int32,
				FederalConstituencyID: pu.FederalConstituencyID.Int32,
				SenatorialDistrictID:  pu.SenatorialDistrictID.Int32,
			})
			if pu.StateConstituencyID.Valid && pu.StateConstituencyID.Int32 > 0 {
				_ = s.taskDistributor.DistributeTaskRollupSingleStateConstituency(ctx, &worker.RollupSingleStateConstituencyPayload{
					ElectionID:          election.ID,
					StateConstituencyID: pu.StateConstituencyID.Int32,
				})
			}
		}
	}

	if req.RunFullRollup {
		_ = s.queries.RollupWardFinalResults(ctx)
		_ = s.queries.RollupStateConstituencyFinalResults(ctx)
		_ = s.queries.RollupLGAFinalResults(ctx)
		_ = s.queries.RollupFederalConstituencyFinalResults(ctx)
		_ = s.queries.RollupSenatorialDistrictFinalResults(ctx)
		_ = s.queries.RollupStateFinalResults(ctx)
		_ = s.queries.RollupElectionFinalResults(ctx)

		switch election.Scope {
		case "ward":
			_ = s.queries.UpdateCandidatesFromSingleWardElection(ctx, election.ID)
		case "state-constituency":
			_ = s.queries.UpdateCandidatesFromSingleStateConstituencyElection(ctx, election.ID)
		case "lga":
			_ = s.queries.UpdateCandidatesFromSingleLGAElection(ctx, election.ID)
		case "federal-constituency":
			_ = s.queries.UpdateCandidatesFromSingleFederalConstituencyElection(ctx, election.ID)
		case "senatorial-district":
			_ = s.queries.UpdateCandidatesFromSingleSenatorialDistrictElection(ctx, election.ID)
		case "state":
			_ = s.queries.UpdateCandidatesFromSingleStateElection(ctx, election.ID)
		case "nationwide":
			_ = s.queries.UpdateCandidatesFromSingleNationwideElection(ctx, election.ID)
		}
	}

	return &SimulateResultsResponse{
		ElectionID:            election.ID,
		ElectionName:          election.Name,
		Scope:                 election.Scope,
		SimulatedPollingUnits: len(pus),
		PartiesCount:          len(partyShortNames),
		Message:               fmt.Sprintf("Successfully simulated results for %d polling units across %d active parties in election '%s' (scope: %s)", len(pus), len(partyShortNames), election.Name, election.Scope),
	}, nil
}


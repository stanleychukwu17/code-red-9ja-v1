package seedservice

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
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
			if exists, _ := s.usersService.CheckEmail(ctx, u.Email); exists {
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
	SuperAdmins []int64                      `json:"super_admins"`
	Admins      []int64                      `json:"admins"`
	Parties     []map[string]PartyAdminsData `json:"parties"`
}

// SeedAdmins assigns system-wide admin roles, as well as party admin and super party admin roles to existing users.
// For party roles, it first joins the user to the specified party.
// All role assignments are processed concurrently.
func (s *SeedService) SeedAdmins(ctx context.Context, req SeedAdminsRequest) (string, error) {
	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(25)

	// system admin who assigns
	systemAdminID := int64(1)

	// Process super admins
	for _, superAdminID := range req.SuperAdmins {
		eg.Go(func() error {
			// get the fake id for the user
			fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, superAdminID)
			if err != nil {
				return fmt.Errorf("failed to fetch fake ID for super admin %d: %w", superAdminID, err)
			}
			fakeID := fakeIDData.Int64

			// assign super_admin role
			err = s.usersService.AssignUserRole(ctx, superAdminID, fakeID, "super_admin", systemAdminID)
			if err != nil {
				return fmt.Errorf("failed to assign super_admin role to user %d: %w", superAdminID, err)
			}
			fmt.Println("assigned super_admin to id", superAdminID)
			return nil
		})
	}

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
			fmt.Println("assigned admin to id", adminID)
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

type PartyVoteShare struct {
	PartyShortName string  `json:"party_short_name"`
	VoteShare      float64 `json:"vote_share"`
}

type SimulateElectionResultsRequest struct {
	Limit           int32            `json:"limit"`            // max PUs to populate (0 = all)
	MinVotesPerPU   int32            `json:"min_votes_per_pu"` // optional min votes (default 100)
	MaxVotesPerPU   int32            `json:"max_votes_per_pu"` // optional max votes (default 750)
	TriggerRealtime *bool            `json:"trigger_realtime"` // dispatch Asynq tasks (default true)
	RunFullRollup   bool             `json:"run_full_rollup"`  // immediately run sequential rollup queries (default false)
	PartyShares     []PartyVoteShare `json:"party_shares"`     // optional target national vote share per party
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
	if limit == 0 {
		limit = 1000 // Sensible default when omitted or 0 in Swagger UI JSON
	} else if limit < 0 {
		limit = 0 // 0 signals SQL query to query all eligible polling units
	}

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

	// ── Step 1: Resolve national target shares ──────────────────────────────
	// Normalise the caller-supplied party_shares into fractions that sum to 1.0.
	// Unspecified active parties share whatever fraction is left over equally.
	nationalShares := make(map[string]float64) // upper(shortName) → [0,1]
	if len(req.PartyShares) > 0 {
		hasLargeVal := false
		for _, s := range req.PartyShares {
			if s.VoteShare > 1.0 {
				hasLargeVal = true
				break
			}
		}

		specifiedMap := make(map[string]float64)
		var totalSpecified float64
		for _, s := range req.PartyShares {
			name := strings.TrimSpace(s.PartyShortName)
			if name == "" || s.VoteShare <= 0 {
				continue
			}
			val := s.VoteShare
			if hasLargeVal {
				val /= 100.0
			}
			specifiedMap[strings.ToUpper(name)] = val
			totalSpecified += val
		}

		var unspecified []string
		for _, name := range partyShortNames {
			if _, ok := specifiedMap[strings.ToUpper(name)]; !ok {
				unspecified = append(unspecified, name)
			}
		}

		remaining := 1.0 - totalSpecified
		if remaining > 0 && len(unspecified) > 0 {
			// Randomly distribute the remaining share among unspecified parties
			// using exponential random weights (Dirichlet-like). This ensures
			// some marginal parties get a bigger slice while others are tiny —
			// just like real elections where not all minor parties are equal.
			rAlloc := rand.New(rand.NewSource(electionID + 77777))
			rawWeights := make([]float64, len(unspecified))
			var totalRaw float64
			for i := range unspecified {
				// Exponential random variable: -ln(U) gives a distribution
				// whose normalized values follow a Dirichlet(1,...,1).
				u := rAlloc.Float64()
				if u < 1e-10 {
					u = 1e-10
				}
				rawWeights[i] = -math.Log(u)
				totalRaw += rawWeights[i]
			}
			for i, name := range unspecified {
				nationalShares[strings.ToUpper(name)] = remaining * (rawWeights[i] / totalRaw)
			}
			for name, val := range specifiedMap {
				nationalShares[name] = val
			}
		} else {
			// Specified shares exceed 100% — normalise proportionally
			var sumAll float64
			for _, val := range specifiedMap {
				sumAll += val
			}
			if sumAll > 0 {
				for name, val := range specifiedMap {
					nationalShares[name] = val / sumAll
				}
			}
			for _, name := range partyShortNames {
				if _, ok := nationalShares[strings.ToUpper(name)]; !ok {
					nationalShares[strings.ToUpper(name)] = 0.0
				}
			}
		}
	}
	useTargetShares := len(nationalShares) > 0

	// ── Step 2: Build state-level regional strength modifiers ────────────────
	// For each (party, state) pair we draw a log-normal multiplier so that
	// every party has clear stronghold states and weak states. A multiplier
	// of 2.0 means the party gets roughly twice its national share in that
	// state; 0.3 means it's crushed there. The modifiers are seeded
	// deterministically per (party, state) so repeated runs are consistent.
	//
	// Log-normal parameters (μ=0, σ=0.8) produce a distribution whose
	// median is 1.0, mean ≈ 1.38, and tail extends to ~4× — realistic for
	// Nigerian electoral geography where one party can dominate a zone.
	type statePartyKey struct {
		stateID   int32
		partyIdx int
	}
	regionalMod := make(map[statePartyKey]float64)
	if useTargetShares {
		const lnSigma = 0.85 // controls spread; higher = more extreme strongholds
		for _, pu := range pus {
			sid := pu.StateID
			for i, name := range partyShortNames {
				key := statePartyKey{stateID: sid, partyIdx: i}
				if _, exists := regionalMod[key]; !exists {
					// Deterministic seed: combine state and party index so every
					// run with the same inputs yields the same regional pattern.
					seed := int64(sid)*1000 + int64(i) + electionID*100000
					rState := rand.New(rand.NewSource(seed))
					// Box-Muller to get a standard normal, then scale
					u1, u2 := rState.Float64(), rState.Float64()
					if u1 < 1e-9 {
						u1 = 1e-9
					}
					z := math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
					mod := math.Exp(lnSigma * z) // log-normal, median=1
					if mod < 0.10 {
						mod = 0.10 // floor: party always gets at least a tiny slice
					}
					regionalMod[key] = mod
					_ = name // used via partyShortNames index
				}
			}
		}
	}

	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(30)

	for _, pu := range pus {
		pu := pu
		eg.Go(func() error {
			r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(pu.ID)))
			votesCast := minVotes + r.Int31n(maxVotes-minVotes+1)
			rejectedVotes := r.Int31n(votesCast/20 + 1)
			validVotes := votesCast - rejectedVotes
			accreditedVoters := votesCast + r.Int31n(40) + 10

			// ── Step 3: Compute per-PU weights ──────────────────────────────
			// weight = national_share × state_regional_mod × PU_jitter
			// PU jitter is ±12% so local variation exists within a state but
			// the state-level modifier is what drives macro-geography.
			weights := make([]float64, len(partyShortNames))
			var sumWeights float64

			for i, shortName := range partyShortNames {
				if useTargetShares {
					nShare := nationalShares[strings.ToUpper(shortName)]
					if nShare > 0 {
						regKey := statePartyKey{stateID: pu.StateID, partyIdx: i}
						stateMod := regionalMod[regKey] // geographic stronghold factor
						puJitter := 0.88 + (r.Float64() * 0.24) // ±12% local noise
						weights[i] = nShare * stateMod * puJitter * 1000.0
					} else {
						weights[i] = 0.0
					}
				} else {
					// No target shares — pure random baseline
					weights[i] = float64(r.Int31n(100) + 5)
				}
				sumWeights += weights[i]
			}

			candItems := make([]candidateResultItem, len(partyShortNames))
			var allocatedVotes int32
			maxPartyIdx := 0
			var maxPartyVotes int32 = -1

			for i, shortName := range partyShortNames {
				var v int32
				if sumWeights > 0 {
					v = int32(float64(validVotes) * weights[i] / sumWeights)
				}
				candItems[i] = candidateResultItem{
					PartyShortName: shortName,
					VoteCount:      v,
				}
				allocatedVotes += v
				if v > maxPartyVotes {
					maxPartyVotes = v
					maxPartyIdx = i
				}
			}
			if len(candItems) > 0 {
				candItems[maxPartyIdx].VoteCount += (validVotes - allocatedVotes)
			}

			candJSON, err := json.Marshal(candItems)
			if err != nil {
				return fmt.Errorf("failed to marshal candidate results: %w", err)
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
				return fmt.Errorf("failed to upsert polling unit final result for PU %d: %w", pu.ID, err)
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
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return nil, err
	}

	if req.RunFullRollup {
		_ = s.queries.RollupWardFinalResults(ctx)
		_ = s.queries.RollupStateConstituencyFinalResults(ctx)
		_ = s.queries.RollupLGAFinalResults(ctx)
		_ = s.queries.RollupFederalConstituencyFinalResults(ctx)
		_ = s.queries.RollupSenatorialDistrictFinalResults(ctx)
		_ = s.queries.RollupStateFinalResults(ctx)
		_ = s.queries.RollupElectionFinalResults(ctx)
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


// FlushRedis removes all application cache keys matching the defined Redis prefixes in db.AllRedisPrefixes.
// It safely scans keys in batches and deletes them using Redis pipelines for optimal performance without blocking the Redis server.
func (s *SeedService) FlushRedis(ctx context.Context) (string, error) {
	var totalDeleted int64

	// 1. Loop through every key prefix defined in db.AllRedisPrefixes (e.g. "user:info:", "register:email_otp:", "countries:all")
	for _, prefix := range db.AllRedisPrefixes {
		// 2. Build the matching pattern for Redis:
		// If the prefix ends with a colon (e.g. "user:info:"), add a wildcard "*" -> "user:info:*" to match all user keys.
		// If it's an exact key name (e.g. "countries:all"), match that exact key.
		pattern := prefix
		if strings.HasSuffix(prefix, ":") {
			pattern = prefix + "*"
		}

		var keys []string

		// 3. Use SCAN instead of KEYS:
		// Redis KEYS command blocks the entire Redis server until complete.
		// SCAN uses a non-blocking cursor, retrieving keys in chunks of 500 without locking Redis.
		iter := s.rdb.Scan(ctx, 0, pattern, 500).Iterator()

		for iter.Next(ctx) {
			keys = append(keys, iter.Val())

			// 4. Batch Deletion with Pipeline:
			// Once we accumulate 500 keys in memory, send a single batch (Pipeline) to Redis.
			// Pipeline queues up all DEL commands and sends them in 1 network round-trip instead of 500 separate network requests.
			if len(keys) >= 500 {
				pipe := s.rdb.Pipeline()
				for _, k := range keys {
					pipe.Del(ctx, k)
				}
				cmds, err := pipe.Exec(ctx)
				if err != nil && err != redis.Nil {
					return "", fmt.Errorf("failed to delete keys for pattern %s: %w", pattern, err)
				}
				totalDeleted += int64(len(cmds))
				keys = keys[:0] // reset slice for next batch while preserving allocated memory
			}
		}

		// Check if there was an error during scanning
		if err := iter.Err(); err != nil {
			return "", fmt.Errorf("failed scanning pattern %s: %w", pattern, err)
		}

		// 5. Delete any remaining leftover keys in the current prefix batch (e.g., if there were 42 keys left)
		if len(keys) > 0 {
			pipe := s.rdb.Pipeline()
			for _, k := range keys {
				pipe.Del(ctx, k)
			}
			cmds, err := pipe.Exec(ctx)
			if err != nil && err != redis.Nil {
				return "", fmt.Errorf("failed to delete remaining keys for pattern %s: %w", pattern, err)
			}
			totalDeleted += int64(len(cmds))
		}
	}

	return fmt.Sprintf("Redis cache cleared successfully (%d keys deleted)", totalDeleted), nil
}


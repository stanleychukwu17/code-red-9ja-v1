package seedservice

import (
	"context"
	"fmt"
	"strings"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	authservice "free9ja/api/internal/service/auth"
	bodiesservice "free9ja/api/internal/service/bodies"
	partiesservice "free9ja/api/internal/service/parties"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/sync/errgroup"
)

type SeedService struct {
	queries        *queries.Queries
	rdb            *redis.Client
	authService    *authservice.AuthService
	bodiesService  *bodiesservice.BodiesService
	usersService   *usersservice.UsersService
	partiesService *partiesservice.PartiesService
}

func NewSeedService(
	q *queries.Queries,
	rdb *redis.Client,
	authService *authservice.AuthService,
	bodiesService *bodiesservice.BodiesService,
	usersService *usersservice.UsersService,
	partiesService *partiesservice.PartiesService,
) *SeedService {
	return &SeedService{
		queries:        q,
		rdb:            rdb,
		authService:    authService,
		bodiesService:  bodiesService,
		usersService:   usersService,
		partiesService: partiesService,
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


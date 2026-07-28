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
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/sync/errgroup"
)

type SeedService struct {
	queries       *queries.Queries
	rdb           *redis.Client
	authService   *authservice.AuthService
	bodiesService *bodiesservice.BodiesService
}

func NewSeedService(
	q *queries.Queries,
	rdb *redis.Client,
	authService *authservice.AuthService,
	bodiesService *bodiesservice.BodiesService,
) *SeedService {
	return &SeedService{
		queries:       q,
		rdb:           rdb,
		authService:   authService,
		bodiesService: bodiesService,
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

func (s *SeedService) SeedUsers(ctx context.Context, users []SeedUserRequest) (string, error) {
	eg, ctx := errgroup.WithContext(ctx)

	for _, u := range users {
		eg.Go(func() error {
			// check if email already exit, if yes, we can skip this user onto the next
			if s.authService.CheckEmail(ctx, u.Email) {
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
			usernameVal := pgtype.Text{String: *u.Username, Valid: true}
			middleNameVal := pgtype.Text{String: *u.MiddleName, Valid: true}
			genderVal := pgtype.Text{String: u.Gender, Valid: true}
			currentLgaVal := pgtype.Int4{Int32: *u.CurrentLga, Valid: true}
			currentCityVal := pgtype.Int4{Int32: *u.CurrentCity, Valid: true}
			stateOfOriginVal := pgtype.Int2{Int16: *u.StateOfOrigin, Valid: true}
			occupationIDVal := pgtype.Int2{Int16: *u.OccupationID, Valid: true}
			partyIDVal := pgtype.Int2{Int16: *u.PartyID, Valid: true}

			// check if the user phone number is valid
			var phoneVal pgtype.Text
			var iso2 string
			var phonecode string
			var formattedPhone string
			var rawPhoneInput string
			if u.Phone != nil && *u.Phone != "" {
				rawPhoneInput = *u.Phone
				country, err := s.bodiesService.CheckCountry(ctx, u.CurrentCountry)
				if err != nil {
					return fmt.Errorf("failed to fetch country for user %s: %w", u.Email, err)
				}

				iso2 = country.Iso2
				phonecode = country.Phonecode
				formattedPhone, err = s.authService.ValidatePhoneForCountry(rawPhoneInput, iso2)
				if err != nil {
					return fmt.Errorf("invalid phone for user %s: %w", u.Email, err)
				}
				phoneVal = pgtype.Text{String: formattedPhone, Valid: true}
			}

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
				IsVerified:      pgtype.Bool{Bool: u.IsVerified, Valid: true},
			}

			// save the users
			id, err := s.queries.SeedUser(ctx, params)
			if err != nil {
				return fmt.Errorf("failed to seed user %s: %w", u.Email, err)
			}

			// save extra info on the users
			_, err = s.queries.CreateMoreInfoAboutThisUser(ctx, queries.CreateMoreInfoAboutThisUserParams{
				UserID:            id,
				OccupationID:      occupationIDVal,
				EducationalStatus: pgtype.Text{},
				HighestDegree:     pgtype.Text{},
				GraduationYear:    pgtype.Text{},
				SchoolName:        pgtype.Text{},
				Religion:          pgtype.Text{String: u.Religion, Valid: u.Religion != ""},
				MaritalStatus:     pgtype.Text{String: u.MaritalStatus, Valid: u.MaritalStatus != ""},
				EducationLevel:    pgtype.Text{String: u.EducationLevel, Valid: u.EducationLevel != ""},
				Address:           pgtype.Text{String: u.HomeAddress, Valid: u.HomeAddress != ""},
			})
			if err != nil {
				return fmt.Errorf("failed to seed user profile for %s: %w", u.Email, err)
			}

			// create a request for the user credentials to be verified
			_, err = s.queries.CreateUserVerification(ctx, queries.CreateUserVerificationParams{
				UserID:             id,
				NinVerified:        pgtype.Bool{Bool: false, Valid: true},
				PhoneVerified:      pgtype.Bool{Bool: false, Valid: true},
				EmailVerified:      pgtype.Bool{Bool: false, Valid: true},
				VotersCardVerified: pgtype.Bool{Bool: false, Valid: true},
			})
			if err != nil {
				return fmt.Errorf("failed to create user verification for %s: %w", u.Email, err)
			}

			// generate and update the user fakeID
			fakeID := utils.GenerateFakeID(id)
			_ = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: id, FakeID: pgtype.Int8{Int64: fakeID, Valid: true}})

			// Save details to Redis cache
			emailStr := emailVal.String
			usernameStr := usernameVal.String
			_ = s.authService.SaveSomeUserRegistrationDetails(ctx, usernameStr, emailStr, "", id, fakeID)

			// save the user phone number
			if formattedPhone != "" {
				_ = s.authService.SaveUserPhone(ctx, id, fakeID, formattedPhone, rawPhoneInput, phonecode)
			}

			// update user verification type, this will add a verification badge for the user
			if u.IsVerified && u.VerificationTypeID != nil {
				_, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
					PageType:           db.PageTypeUser,
					PageID:             id,
					VerificationTypeID: *u.VerificationTypeID,
				})
				if err != nil {
					return fmt.Errorf("failed to assign page verification for %s: %w", u.Email, err)
				}
			}

			// adds a "celebrity" verifcation type for politicians
			if u.IsPolitician {
				_, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
					PageType:           db.PageTypeUser,
					PageID:             id,
					VerificationTypeID: 2,
				})
				if err != nil {
					return fmt.Errorf("failed to assign page verification for %s: %w", u.Email, err)
				}
			}

			// get and save the user details to cache in redis
			_, _ = s.authService.GetUserDetailsByFakeID(ctx, fakeID)

			// log success message
			fmt.Println("added id", id)
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return "", err
	}

	return "Users seeded successfully", nil
}

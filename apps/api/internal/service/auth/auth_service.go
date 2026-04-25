package authservice

import (
	"context"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	"math/rand"
	"regexp"
	"strconv"
	"strings"
	"time"

	"free9ja/api/internal/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	phonenumbers "github.com/nyaruka/phonenumbers"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewAuthService(q *queries.Queries, rdb *redis.Client) *AuthService {
	return &AuthService{
		queries: q,
		rdb:     rdb,
	}
}

type RegisterResult struct {
	UserID int64
	FakeID int64
}

func (s *AuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string) (RegisterResult, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(params.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return RegisterResult{}, err
	}
	params.PasswordHash = string(hashedPassword)

	// cleans up the username
	username := strings.TrimSpace(strings.ToLower(params.Username.String))
	username, err = CleanUsername(username)
	if err != nil {
		return RegisterResult{}, err
	}
	params.Username = pgtype.Text{String: username, Valid: true}

	// checks if the username already exist
	username_exist, err := s.CheckUsername(ctx, username)
	if err != nil {
		return RegisterResult{}, err
	}
	if username_exist {
		return RegisterResult{}, errors.New("username already exists")
	}

	// email checks
	email := strings.TrimSpace(strings.ToLower(params.Email.String))
	if email != "" {
		email_exist, err := s.CheckEmail(ctx, email)
		if err != nil {
			return RegisterResult{}, err
		}
		if email_exist {
			return RegisterResult{}, errors.New("email already exists")
		}
	}

	// phone checks
	phone_exist, err := s.CheckPhone(ctx, params.Phone)
	if err != nil {
		return RegisterResult{}, err
	}
	if phone_exist {
		return RegisterResult{}, errors.New("phone already exists")
	}

	// nin check
	nin_check, err := s.CheckNIN(ctx, nin)
	if err != nil {
		return RegisterResult{}, err
	}
	if nin_check {
		return RegisterResult{}, errors.New("nin already exists")
	}

	// country check
	country_dts, err := s.CheckCountry(ctx, params.CurrentCountry)
	if err != nil {
		return RegisterResult{}, err
	}
	// state check
	_, err = s.CheckState(ctx, params.CurrentCountry, params.CurrentState)
	if err != nil {
		return RegisterResult{}, err
	}
	// city check
	_, err = s.CheckCity(ctx, params.CurrentState, params.CurrentCity.Int32)
	if err != nil {
		return RegisterResult{}, err
	}

	// check phone country validation
	_, err = s.ValidatePhoneForCountry(params.Phone, country_dts.Iso2)
	if err != nil {
		return RegisterResult{}, err
	}

	// Check date of birth: Ensure the user is at least 18 years old
	today := time.Now().UTC()
	if today.Sub(params.DateOfBirth.Time) < 18*365*24*time.Hour {
		return RegisterResult{}, errors.New("you must be at least 18 years old")
	}

	// add the use to the db
	user_id, err := s.queries.CreateUser(ctx, params)
	if err != nil {
		return RegisterResult{}, err
	}

	// generate a fake_id using the user_id and update the user fake_id
	fake_id := GenerateFakeID(user_id)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: user_id, FakeID: pgtype.Int8{Int64: fake_id, Valid: true}})
	if err != nil {
		return RegisterResult{}, err
	}

	// save the username in redis
	err = s.SaveUsernameInRedis(ctx, username)
	if err != nil {
		return RegisterResult{}, err
	}

	// save the email in redis
	err = s.SaveEmailInRedis(ctx, email)
	if err != nil {
		return RegisterResult{}, err
	}

	// save the nin in rdb and db
	err = s.SaveNINInRedis(ctx, nin, user_id)
	if err != nil {
		return RegisterResult{}, err
	}

	// save the phone in rdb and db
	err = s.SavePhoneInRedis(ctx, params.Phone, user_id)
	if err != nil {
		return RegisterResult{}, err
	}

	return RegisterResult{UserID: user_id, FakeID: fake_id}, nil
}

// function: generates fake_id using the original id
func GenerateFakeID(id int64) int64 {
	front_id := rand.Intn(1000)
	back_id := rand.Intn(1000)

	fake_id := fmt.Sprintf("%d%d%d", front_id, id, back_id)
	fake_id_int, _ := strconv.ParseInt(fake_id, 10, 64)
	return fake_id_int
}

// CleanUsername normalizes and validates a username based on:
// 1. Alphanumeric start/end
// 2. No consecutive dots/underscores
// 3. Length between 2-30 chars
// 4. Case-insensitivity (returns lowercase)
func CleanUsername(input string) (string, error) {
	// 1. Trim whitespace and normalize to lowercase
	clean := strings.ToLower(strings.TrimSpace(input))

	// 2. Check length (2-30 characters)
	if len(clean) < 2 || len(clean) > 30 {
		return "", errors.New("username must be between 2 and 30 characters")
	}

	// 3. Define the Regex based on your logic:
	// The regex pattern is designed to match a string that starts and ends with
	// alphanumeric characters, and contains zero or more alphanumeric characters,
	// and zero or more dots or underscores in between.
	//
	// The pattern is split into two parts:
	// - The start and end of the string are checked for alphanumeric characters.
	// - The middle part is checked for alphanumeric characters and dots or underscores.
	validPattern := regexp.MustCompile(`^[a-z0-9][a-z0-9._]*[a-z0-9]$`)
	if !validPattern.MatchString(clean) {
		return "", errors.New("username can only contain letters, numbers, dots, and underscores")
	}

	// 4. Manual check for consecutive symbols (since Go regex doesn't do lookaheads)
	if strings.Contains(clean, "..") || strings.Contains(clean, "__") ||
		strings.Contains(clean, "._") || strings.Contains(clean, "_.") {
		return "", errors.New("username cannot contain consecutive dots or underscores")
	}

	return clean, nil
}

// function: check if the username already exist in redis and in the postgres db
func (s *AuthService) CheckUsername(ctx context.Context, username string) (bool, error) {
	// check in redis first
	exists, err := s.rdb.SIsMember(ctx, db.RedisRegisteredUsernames, username).Result()
	if err != nil {
		return false, err
	}
	if exists {
		return true, nil
	}

	// check in db
	_, err = s.queries.GetUserByUsername(ctx, pgtype.Text{String: username, Valid: true})
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil // no user found
		}
		return false, err
	}

	return true, nil
}

// function: checks if the email already exists in redis and in the postgres db
func (s *AuthService) CheckEmail(ctx context.Context, email string) (bool, error) {
	// check in redis first
	exists, err := s.rdb.SIsMember(ctx, db.RedisRegisteredEmails, email).Result()
	if err != nil {
		return false, err
	}
	if exists {
		return true, nil
	}

	// check in db
	_, err = s.queries.GetUserByEmail(ctx, pgtype.Text{String: email, Valid: true})
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil // no user found
		}
		return false, err
	}

	return true, nil
}

// function: checks if the phone already exists in redis and in the postgres db
func (s *AuthService) CheckPhone(ctx context.Context, phone string) (bool, error) {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredPhones, phone).Result()
	if exists {
		return true, nil
	}

	// check in db
	data, _ := s.queries.GetUserByPhone(ctx, phone)
	if data.ID > 0 {
		return true, nil
	}

	// check in all phone numbers table
	id, _ := s.queries.CheckIfPhoneNumberExists(ctx, phone)
	if id > 0 {
		return true, nil
	}

	return false, nil
}

// CheckNIN function checks if the nin already exists in the database
func (s *AuthService) CheckNIN(ctx context.Context, nin string) (bool, error) {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredNins, nin).Result()
	if exists {
		return true, nil
	}

	// check in db
	user_dts, _ := s.queries.GetUserNINByNIN(ctx, nin)
	if user_dts.ID > 0 {
		return true, nil
	}

	return false, nil
}

// ValidatePhoneForCountry checks:
// 1. valid phone number format
// 2. matches the given ISO country code (e.g. "NG", "US")
// 3. returns normalized E.164 format if valid
func (s *AuthService) ValidatePhoneForCountry(phone, country_code string) (string, error) {
	// Parse number (second arg can be empty if phone is already in E.164)
	num, err := phonenumbers.Parse(phone, "")
	if err != nil {
		return "", fmt.Errorf("invalid phone format: %w", err)
	}

	// Check if it's a valid number globally
	if !phonenumbers.IsValidNumber(num) {
		return "", fmt.Errorf("invalid phone number")
	}

	// Ensure it matches the expected country_code
	if !phonenumbers.IsValidNumberForRegion(num, country_code) {
		return "", fmt.Errorf("phone number does not match country %s", country_code)
	}

	// Normalize to E.164 format
	formatted := phonenumbers.Format(num, phonenumbers.E164)

	return formatted, nil
}

// function: check if the user country is valid
func (s *AuthService) CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error) {
	country_dts, _ := s.queries.GetCountryByID(ctx, country_id)
	if country_dts.ID > 0 {
		return country_dts, nil
	}

	return queries.GetCountryByIDRow{}, errors.New("invalid country ID")
}

// function: check if the state is valid
func (s *AuthService) CheckState(ctx context.Context, country_id, state_id int16) (bool, error) {
	state_dts, _ := s.queries.GetStateByID(ctx, queries.GetStateByIDParams{
		ID:        state_id,
		CountryID: country_id,
	})
	if state_dts.ID > 0 {
		return true, nil
	}
	return false, fmt.Errorf("invalid state ID")
}

// function: check if the city is valid
func (s *AuthService) CheckCity(ctx context.Context, state_id int16, city_id int32) (bool, error) {
	city_dts, _ := s.queries.GetCityByID(ctx, queries.GetCityByIDParams{
		ID:      city_id,
		StateID: state_id,
	})
	if city_dts.ID > 0 {
		return true, nil
	}

	return false, fmt.Errorf("invalid city ID")
}

// function: saves the username in redis
func (s *AuthService) SaveUsernameInRedis(ctx context.Context, username string) error {
	_, err := s.rdb.SAdd(ctx, db.RedisRegisteredUsernames, username).Result()
	return err
}

// function: saves the email in redis
func (s *AuthService) SaveEmailInRedis(ctx context.Context, email string) error {
	_, err := s.rdb.SAdd(ctx, db.RedisRegisteredEmails, email).Result()
	return err
}

// function: saves the phone in redis
func (s *AuthService) SavePhoneInRedis(ctx context.Context, phone string, userID int64) error {
	// save to redis
	_, err := s.rdb.SAdd(ctx, db.RedisRegisteredPhones, phone).Result()

	// save to db
	_, err = s.queries.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
		Phone:  phone,
		UserID: userID,
	})

	return err
}

// function: saves the nin in redis
func (s *AuthService) SaveNINInRedis(ctx context.Context, nin string, userID int64) error {
	// save to redis
	_, err := s.rdb.SAdd(ctx, db.RedisRegisteredNins, nin).Result()

	// save to db
	_, err = s.queries.CreateUserNIN(ctx, queries.CreateUserNINParams{
		Nin:    nin,
		UserID: userID,
	})

	return err
}

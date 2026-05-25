package authservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"regexp"
	"strings"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	phonenumbers "github.com/nyaruka/phonenumbers"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type MessagingService interface {
	SendWhatsAppOTP(phone, otp string) error
}

type AuthService struct {
	queries          *queries.Queries
	rdb              *redis.Client
	messagingService MessagingService
	jwtSecret        string
	jwtAccessExp     time.Duration
	jwtRefreshExp    time.Duration
}

func NewAuthService(q *queries.Queries, rdb *redis.Client, messagingService MessagingService, jwtSecret string, jwtAccessExp time.Duration, jwtRefreshExp time.Duration) *AuthService {
	return &AuthService{
		queries:          q,
		rdb:              rdb,
		messagingService: messagingService,
		jwtSecret:        jwtSecret,
		jwtAccessExp:     jwtAccessExp,
		jwtRefreshExp:    jwtRefreshExp,
	}
}

// Phone         string      `json:"phone"`
// Username      pgtype.Text `json:"username"`
// PasswordHash  string      `json:"password_hash"`
// AccountStatus pgtype.Text `json:"account_status"`
type LoginUser struct {
	FakeID        int64  `json:"fake_id"`
	Username      string `json:"username"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	AccountStatus string `json:"account_status"`
	AvatarURL     string `json:"avatar_url"`
}
type LoginResult struct {
	AccessToken  string
	RefreshToken string
	User         LoginUser
}

// Login verifies login credentials and returns JWT access and refresh tokens
func (s *AuthService) Login(ctx context.Context, identifier, password string) (LoginResult, error) {
	// check if identifier is in redis emails, usernames or phone_numbers

	// 1. Get user by email, username, or phone
	user, err := s.queries.GetUserByLoginIdentifier(ctx, pgtype.Text{String: identifier, Valid: true})
	if err != nil {
		return LoginResult{}, errors.New("invalid email, username, phone or password")
	}

	// 2. Check if password matches
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return LoginResult{}, errors.New("invalid email, username, phone or password")
	}

	// 3. Verify account status
	status := user.AccountStatus.String
	if status == "suspended" || status == "banned" || status == "deleted" || status == "inactive" {
		return LoginResult{}, fmt.Errorf("your account is %s", status)
	}

	// 4. Extract fake ID
	var fakeID int64 = user.FakeID.Int64

	// Save user info into redis
	userInfoJSON, err := json.Marshal(user)
	if err == nil {
		userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
		s.rdb.Set(ctx, userInfoKey, userInfoJSON, 0)
	}

	// 5. create session
	sessionID := uuid.NewString()
	loc, _ := time.LoadLocation(config.GetEnv("TIMEZONE", "Africa/Lagos"))
	now := time.Now().In(loc)
	sessionData := map[string]any{
		"SessionID": sessionID,
		"FakeID":    user.FakeID.Int64,
		"TimeAdded": now.Format(time.RFC3339),
	}

	jsonData, _ := json.Marshal(sessionData)

	// 6. Generate Access Token and Refresh Token
	accessToken, err := utils.GenerateToken(fakeID, user.Username.String, s.jwtSecret, s.jwtAccessExp)
	if err != nil {
		return LoginResult{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	// 7. generate refresh token (opaque)
	result, err := utils.GenerateRandomString()
	if err != nil {
		return LoginResult{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// 8. Store the payload in redis using the hashed refresh token as the key
	redisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, result.HashedToken)
	s.rdb.Set(ctx, redisKey, jsonData, s.jwtRefreshExp)

	// 9. session index
	s.rdb.SAdd(ctx, fmt.Sprintf("%s%s", db.RedisLoginSessions, sessionID), result.HashedToken)
	s.rdb.SAdd(ctx, fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID), sessionID)

	return LoginResult{
		AccessToken:  accessToken,
		RefreshToken: result.RandomString,
		User: LoginUser{
			FakeID:        fakeID,
			Username:      user.Username.String,
			FirstName:     user.FirstName.String,
			LastName:      user.LastName.String,
			AvatarURL:     "",
			AccountStatus: user.AccountStatus.String,
		},
	}, nil
}

type RefreshResult struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         LoginUser `json:"user"`
}

// Refresh validates the refresh token and returns a new set of tokens
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (RefreshResult, error) {
	// hash the refresh token
	hashed := utils.HashToken(refreshToken)

	// use token to fetch jwt session details from redis
	RedisTokenKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, hashed)
	sessionDts, err := s.rdb.Get(ctx, RedisTokenKey).Result()
	if err != nil {
		return RefreshResult{}, errors.New("invalid or expired refresh token")
	}

	// unmarshal the session details
	var sessionData map[string]any
	err = json.Unmarshal([]byte(sessionDts), &sessionData)
	if err != nil {
		return RefreshResult{}, errors.New("having issues with unpacking token details")
	}

	// get some info from the session details
	userFid := int64(sessionData["FakeID"].(float64))
	sessionID := sessionData["SessionID"].(string)
	timeAdded := sessionData["TimeAdded"].(string)
	redisSessionKey := fmt.Sprintf("%s%s", db.RedisLoginSessions, sessionID)

	// get the user details using the userFid
	user, err := s.GetUserDetailsByFakeID(ctx, userFid)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("user not found: %v", err)
	}

	// destructure some of the user info
	accountStatus := user.AccountStatus.String
	username := user.Username.String
	userDetails := LoginUser{
		FakeID:        userFid,
		Username:      username,
		FirstName:     user.FirstName.String,
		LastName:      user.LastName.String,
		AvatarURL:     "",
		AccountStatus: accountStatus,
	}

	// Parse the RFC3339 string back into a time.Time
	parsedTime, err := time.Parse(time.RFC3339, timeAdded)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("error parsing time: %v", err)
	}

	// Compare with current time
	if time.Since(parsedTime) < 12*time.Minute {
		// fmt.Println("TimeAdded is less than 12 minutes ago", parsedTime)
		return RefreshResult{
			User: userDetails,
		}, nil
	}

	// delete old token (rotation)
	s.rdb.Del(ctx, RedisTokenKey)            // deletes the token
	s.rdb.SRem(ctx, redisSessionKey, hashed) // deletes the token from the list of session tokens

	// Retrieve the user by fake_id, this returns all the details of the user
	// user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: userFid, Valid: true})
	// if err != nil {
	// 	return RefreshResult{}, errors.New("user not found")
	// }

	// Verify account status
	if accountStatus == "suspended" || accountStatus == "banned" || accountStatus == "deleted" || accountStatus == "inactive" {
		return RefreshResult{}, fmt.Errorf("your account is %s", accountStatus)
	}

	// update the time of this new accessToken generated
	loc, _ := time.LoadLocation(config.GetEnv("TIMEZONE", "Africa/Lagos"))
	now := time.Now().In(loc)
	sessionData["TimeAdded"] = now.Format(time.RFC3339)

	//convert to json
	jsonData, _ := json.Marshal(sessionData)

	// Generate a new Access Token
	newAccessToken, err := utils.GenerateToken(userFid, username, s.jwtSecret, s.jwtAccessExp)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate a new refresh token
	refresh, err := utils.GenerateRandomString()
	if err != nil {
		return RefreshResult{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Store the new refresh token, but we use the hashed string as the key
	newRedisTokenKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, refresh.HashedToken)
	s.rdb.Set(ctx, newRedisTokenKey, jsonData, s.jwtRefreshExp)

	// add the new refresh token to the session SET
	s.rdb.SAdd(ctx, redisSessionKey, refresh.HashedToken)

	response := RefreshResult{
		AccessToken:  newAccessToken,
		RefreshToken: refresh.RandomString,
		User:         userDetails,
	}

	return response, nil
}

// Logout invalidates the refresh token by removing the session from Redis
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	// hash the refresh token
	hashed := utils.HashToken(refreshToken)

	// use token to fetch jwt session details from redis
	tokenRedisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, hashed)
	sessionDts, err := s.rdb.Get(ctx, tokenRedisKey).Result()
	if err != nil {
		return errors.New("invalid or expired refresh token")
	}

	// unmarshal the session details
	var sessionData map[string]any
	err = json.Unmarshal([]byte(sessionDts), &sessionData)
	if err != nil {
		return errors.New("invalid or expired refresh token")
	}

	// get the sessionID from the session details
	sessionID := sessionData["SessionID"].(string)
	userFid := int64(sessionData["FakeID"].(float64))

	// delete the token from redis
	s.rdb.Del(ctx, tokenRedisKey)
	// remove the token from the list of session tokens
	redisSessionKey := fmt.Sprintf("%s%s", db.RedisLoginSessions, sessionID)
	s.rdb.SRem(ctx, redisSessionKey, hashed)
	// remove the session from the user sessions set
	userRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, userFid)
	s.rdb.SRem(ctx, userRedisKey, sessionID)

	return nil
}

type RegisterResult struct {
	UserID int64
	FakeID int64
}

func (s *AuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID int64) (RegisterResult, error) {
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

	// check if onboarding details exist
	onboardingDts, err := s.queries.GetOnboardingByPhone(ctx, params.Phone)
	if err != nil {
		return RegisterResult{}, errors.New("onboarding details not found")
	}
	if onboardingDts.ID != onboardingID {
		return RegisterResult{}, errors.New("invalid onboarding details")
	}
	if onboardingDts.Completed.String == "yes" {
		return RegisterResult{}, errors.New("user has already been onboarded")
	}

	// checks if the username already exist
	username_exist := s.CheckUsername(ctx, username)
	if username_exist {
		return RegisterResult{}, errors.New("username already exists")
	}

	// email checks
	email := strings.TrimSpace(strings.ToLower(params.Email.String))
	email_exist := s.CheckEmail(ctx, email)
	if email_exist {
		return RegisterResult{}, errors.New("email already exists")
	}

	// phone checks
	phone_exist := s.CheckPhone(ctx, params.Phone)
	if phone_exist {
		return RegisterResult{}, errors.New("phone already exists")
	}

	// nin check
	nin_check := s.CheckNIN(ctx, nin)
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
	fake_id := utils.GenerateFakeID(user_id)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: user_id, FakeID: pgtype.Int8{Int64: fake_id, Valid: true}})
	if err != nil {
		return RegisterResult{}, err
	}

	// save details in redis
	s.SaveUsernameInRedis(ctx, username)
	s.SaveEmailInRedis(ctx, email)
	s.SaveNINInRedis(ctx, nin, user_id)
	s.SavePhoneInRedis(ctx, params.Phone, user_id)

	// fetch user details using the user fake_id
	_, _ = s.GetUserDetailsByFakeID(ctx, fake_id)

	// update onboarding state to completed
	err = s.queries.UpdateOnboardingCompleted(ctx, onboardingID)
	if err != nil {
		return RegisterResult{}, err
	}

	return RegisterResult{UserID: user_id, FakeID: fake_id}, nil
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
	validPattern := regexp.MustCompile(`^[a-z0-9][a-z0-9_]*[a-z0-9]$`)
	if !validPattern.MatchString(clean) {
		return "", errors.New("username can only contain letters, numbers, and underscores")
	}

	// 4. Manual check for consecutive symbols (since Go regex doesn't do lookahead)
	if strings.Contains(clean, "..") || strings.Contains(clean, "__") ||
		strings.Contains(clean, "._") || strings.Contains(clean, "_.") {
		return "", errors.New("username cannot contain consecutive underscores")
	}

	return clean, nil
}

// function: check if the username already exist in redis and in the postgres db
func (s *AuthService) CheckUsername(ctx context.Context, username string) bool {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredUsernames, username).Result()
	if exists {
		return true
	}

	// check in db
	userDts, _ := s.queries.GetUserByUsername(ctx, pgtype.Text{String: username, Valid: true})
	return userDts.ID > 0
}

// function: checks if the email already exists in redis and in the postgres db
func (s *AuthService) CheckEmail(ctx context.Context, email string) bool {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredEmails, email).Result()
	if exists {
		return true
	}

	// check in db
	userDts, _ := s.queries.GetUserByEmail(ctx, pgtype.Text{String: email, Valid: true})
	return userDts.ID > 0
}

// function: checks if the phone exists in redis and in the postgres db
func (s *AuthService) CheckPhone(ctx context.Context, phone string) bool {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredPhones, phone).Result()
	if exists {
		return true
	}

	// check in all phone numbers table
	id, _ := s.queries.CheckIfPhoneNumberExists(ctx, phone)
	if id > 0 {
		return true
	}

	return false
}

// CheckNIN function checks if the nin already exists in the database
func (s *AuthService) CheckNIN(ctx context.Context, nin string) bool {
	// check in redis first
	exists, _ := s.rdb.SIsMember(ctx, db.RedisRegisteredNins, nin).Result()
	if exists {
		return true
	}

	// check in db
	user_dts, _ := s.queries.GetUserNINByNIN(ctx, nin)
	return user_dts.ID > 0
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
func (s *AuthService) SaveUsernameInRedis(ctx context.Context, username string) {
	s.rdb.SAdd(ctx, db.RedisRegisteredUsernames, username).Result()
}

// function: saves the email in redis
func (s *AuthService) SaveEmailInRedis(ctx context.Context, email string) {
	s.rdb.SAdd(ctx, db.RedisRegisteredEmails, email).Result()
}

// function: saves the phone in redis
func (s *AuthService) SavePhoneInRedis(ctx context.Context, phone string, userID int64) {
	// save to redis
	s.rdb.SAdd(ctx, db.RedisRegisteredPhones, phone).Result()

	// save to db
	s.queries.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
		Phone:  phone,
		UserID: userID,
	})
}

// function: saves the nin in redis
func (s *AuthService) SaveNINInRedis(ctx context.Context, nin string, userID int64) {
	// save to redis
	s.rdb.SAdd(ctx, db.RedisRegisteredNins, nin).Result()

	// save to db
	s.queries.CreateUserNIN(ctx, queries.CreateUserNINParams{
		Nin:    nin,
		UserID: userID,
	})
}

// RegisterPhaseSignUpResult represents the structure for the response from the initial sign-up phase
type RegisterPhaseSignUpResult struct {
	ID              int64     `json:"id"`
	DateTimeOtpSent time.Time `json:"dateTimeOtpSent"`
	OtpVerified     string    `json:"otpVerified"`
}

func (s *AuthService) RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16) (RegisterPhaseSignUpResult, error) {
	// email checks
	if email != "" {
		email = strings.TrimSpace(strings.ToLower(email))
		email_exist := s.CheckEmail(ctx, email)
		if email_exist {
			return RegisterPhaseSignUpResult{}, errors.New("email already exists")
		}
	}

	// phone checks
	phone_exist := s.CheckPhone(ctx, phone)
	if phone_exist {
		return RegisterPhaseSignUpResult{}, errors.New("phone already exists")
	}

	// country check
	country_dts, err := s.CheckCountry(ctx, countryID)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// check phone country validation
	_, err = s.ValidatePhoneForCountry(phone, country_dts.Iso2)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// check if onboarding already exists for this phone
	onboarding, err := s.queries.GetOnboardingByPhone(ctx, phone)
	if err == nil && onboarding.ID > 0 {
		// if completed is yes, return error
		if onboarding.Completed.String == "yes" {
			return RegisterPhaseSignUpResult{}, errors.New("User is already registered")
		}

		// update the email address in-case the email address has changed
		if email != "" && email != onboarding.Email.String {
			s.queries.UpdateOnboardingEmail(ctx, queries.UpdateOnboardingEmailParams{
				ID:    onboarding.ID,
				Email: pgtype.Text{String: email, Valid: true},
			})
		}

		// check if DateTimeOtpSent is less than 10 mins, if yes: return the onboarding details,
		// or if the otpSent to user has been verified, if yes: return the onboarding details
		if time.Since(onboarding.DateTimeOtpSent.Time) < 10*time.Minute || onboarding.OtpVerified.String == "yes" {
			return RegisterPhaseSignUpResult{
				ID:              onboarding.ID,
				DateTimeOtpSent: onboarding.DateTimeOtpSent.Time,
				OtpVerified:     onboarding.OtpVerified.String,
			}, nil
		}

		// generate and sends a whatsapp otp
		hashedOTP, err := s.generateAndSendWhatsappOTP(phone)
		if err != nil {
			return RegisterPhaseSignUpResult{}, err
		}

		// update the onboarding record with the new otp
		updatedAt, err := s.queries.UpdateOnboardingOTP(ctx, queries.UpdateOnboardingOTPParams{
			ID:              onboarding.ID,
			Otp:             pgtype.Text{String: hashedOTP, Valid: true},
			DateTimeOtpSent: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		})
		if err != nil {
			return RegisterPhaseSignUpResult{}, err
		}

		return RegisterPhaseSignUpResult{
			ID:              onboarding.ID,
			DateTimeOtpSent: updatedAt.Time,
			OtpVerified:     onboarding.OtpVerified.String,
		}, nil
	}

	hashedOTP, err := s.generateAndSendWhatsappOTP(phone)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// save to onboarding_details
	otpSentAt := time.Now()
	id, err := s.queries.CreateOnboardingDetails(ctx, queries.CreateOnboardingDetailsParams{
		Otp:             pgtype.Text{String: hashedOTP, Valid: true},
		DateTimeOtpSent: pgtype.Timestamptz{Time: otpSentAt, Valid: true},
		CountryID:       countryID,
		Email:           pgtype.Text{String: email, Valid: email != ""},
		Phone:           phone,
	})
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	return RegisterPhaseSignUpResult{
		ID:              id,
		DateTimeOtpSent: otpSentAt,
		OtpVerified:     "no",
	}, nil
}

// ResendOtp resend's the OTP if 10 minutes have passed since the last one
func (s *AuthService) ResendOtp(ctx context.Context, phone string, id int64) (RegisterPhaseSignUpResult, error) {
	onboarding, err := s.queries.GetOnboardingByPhone(ctx, phone)
	if err != nil {
		return RegisterPhaseSignUpResult{}, errors.New("onboarding record not found")
	}

	if onboarding.ID != id {
		return RegisterPhaseSignUpResult{}, errors.New("invalid record reference")
	}

	if onboarding.Completed.String == "yes" {
		return RegisterPhaseSignUpResult{}, errors.New("registration already completed")
	}

	// check if 10 mins have passed as requested by user
	timePassed := time.Since(onboarding.DateTimeOtpSent.Time)
	if timePassed < 10*time.Minute {
		timeLeft := 10*time.Minute - timePassed
		return RegisterPhaseSignUpResult{}, fmt.Errorf("please wait another %d seconds before resending", int(timeLeft.Seconds()))
	}

	hashedOTP, err := s.generateAndSendWhatsappOTP(phone)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// update the onboarding record
	sentAt, err := s.queries.UpdateOnboardingOTP(ctx, queries.UpdateOnboardingOTPParams{
		ID:              onboarding.ID,
		Otp:             pgtype.Text{String: hashedOTP, Valid: true},
		DateTimeOtpSent: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	return RegisterPhaseSignUpResult{
		ID:              onboarding.ID,
		DateTimeOtpSent: sentAt.Time,
	}, nil
}

// VerifyOtp verifies the OTP sent to the user
func (s *AuthService) VerifyOtp(ctx context.Context, phone, otp string) error {
	onboarding, err := s.queries.GetOnboardingByPhone(ctx, phone)
	if err != nil {
		return errors.New("onboarding record not found")
	}

	if onboarding.Completed.String == "yes" {
		return errors.New("registration already completed")
	}

	err = bcrypt.CompareHashAndPassword([]byte(onboarding.Otp.String), []byte(otp))
	if err != nil {
		return errors.New("invalid OTP")
	}

	// Check if 12 mins have passed
	if time.Since(onboarding.DateTimeOtpSent.Time) > 12*time.Minute {
		return errors.New("OTP has expired, please request for a new otp")
	}

	// Mark as verified
	err = s.queries.UpdateOnboardingOTPVerified(ctx, queries.UpdateOnboardingOTPVerifiedParams{
		ID:          onboarding.ID,
		OtpVerified: pgtype.Text{String: "yes", Valid: true},
	})
	if err != nil {
		return errors.New("failed to mark otp as verified")
	}

	return nil
}

// generateAndSendWhatsappOTP abstracts the generation and sending of a new OTP
func (s *AuthService) generateAndSendWhatsappOTP(phone string) (string, error) {
	otp, hashedOTP, err := utils.GenerateOTP()
	if err != nil {
		return "", err
	}

	err = s.messagingService.SendWhatsAppOTP(phone, otp)
	if err != nil {
		return "", err
	}

	return hashedOTP, nil
}

// GetUserDetailsByFakeID fetches all user details using the user fake_id.
// It checks Redis first, if not found, it fetches from the DB and caches it in Redis.
func (s *AuthService) GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.User, error) {
	// 1. Check Redis
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	userInfoJSON, err := s.rdb.Get(ctx, userInfoKey).Result()
	if err == nil {
		var user queries.User
		if err := json.Unmarshal([]byte(userInfoJSON), &user); err == nil {
			return user, nil
		}
	}

	// 2. Fetch from DB if not in Redis
	user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return queries.User{}, fmt.Errorf("user not found: %w", err)
	}

	// 3. Cache it in Redis
	userJSON, err := json.Marshal(user)
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, 0)
	}

	return user, nil
}

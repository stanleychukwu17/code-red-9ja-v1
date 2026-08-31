package authservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/logger"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"free9ja/api/internal/db"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nyaruka/phonenumbers"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type MessagingService interface {
	SendWhatsAppOTP(phone, otp string) error
}

type UsersService interface {
	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	GetUserRoles(ctx context.Context, userID int64) (queries.CachedUserRoles, error)
	AssignUserRole(ctx context.Context, userID int64, fakeID int64, code string, whoAssigned int64) error
	GetMoreInfoAboutThisUser(ctx context.Context, userID int64) (queries.UserMoreInfo, error)
	InvalidateCachedUserInfo(ctx context.Context, fakeID int64) error
	UpdateUserPhoneNumbers(ctx context.Context, userID int64, fakeID int64, phones []usersservice.PhonePayload) error
	CheckUsername(ctx context.Context, username string) (bool, int64)
	CheckEmail(ctx context.Context, email string) (bool, int64)
	CheckPhone(ctx context.Context, phone string, userFakeID int64) (bool, int64)
	CheckNIN(ctx context.Context, nin string) bool
	GetUserPrimaryBankAccount(ctx context.Context, userID int64) (queries.UserBankAccount, error)
	GenerateUniqueReferralCode(ctx context.Context, firstName string) (string, error)
	GetReferralCodeInfo(ctx context.Context, code string) (*usersservice.CachedReferralCodeInfo, error)
}

type PartyService interface {
	GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications
	JoinParty(ctx context.Context, partyID int16, chapterID int32, userID, userFid int64) error
}

type BodiesService interface {
	CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error)
	CheckState(ctx context.Context, country_id, state_id int16) (queries.GetStateByIDRow, error)
	CheckCity(ctx context.Context, state_id int16, city_id int32) (queries.GetCityByIDRow, error)
}

type AuthService struct {
	queries          *queries.Queries
	rdb              *redis.Client
	messagingService MessagingService
	usersService     UsersService
	partyService     PartyService
	bodiesService    BodiesService
	jwtSecret        string
	jwtAccessExp     time.Duration
	jwtRefreshExp    time.Duration
}

func NewAuthService(
	queries *queries.Queries,
	rdb *redis.Client,
	messagingService MessagingService,
	usersService UsersService,
	partyService PartyService,
	bodiesService BodiesService,
	jwtSecret string,
	jwtAccessExp time.Duration,
	jwtRefreshExp time.Duration,
) *AuthService {
	return &AuthService{
		queries:          queries,
		rdb:              rdb,
		messagingService: messagingService,
		usersService:     usersService,
		partyService:     partyService,
		bodiesService:    bodiesService,
		jwtSecret:        jwtSecret,
		jwtAccessExp:     jwtAccessExp,
		jwtRefreshExp:    jwtRefreshExp,
	}
}

type LoginResult struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         LoginUser `json:"user"`
}

type AuthTokens struct {
	AccessToken  string
	RefreshToken string
}

type LoginUser struct {
	ID                int64                                  `json:"id"`
	FakeID            int64                                  `json:"fake_id"`
	Email             string                                 `json:"email"`
	Username          string                                 `json:"username"`
	ReferralCode      string                                 `json:"referral_code"`
	FirstName         string                                 `json:"first_name"`
	LastName          string                                 `json:"last_name"`
	MiddleName        string                                 `json:"middle_name"`
	Gender            string                                 `json:"gender"`
	Avatar            string                                 `json:"avatar"`
	Phone             string                                 `json:"phone"`
	Roles             []string                               `json:"roles"`
	AccountStatus     string                                 `json:"account_status"`
	PartyID           int16                                  `json:"party_id"`
	CurrentCountry    int16                                  `json:"current_country"`
	CurrentState      int16                                  `json:"current_state"`
	CurrentLga        int32                                  `json:"current_lga"`
	CurrentWard       int32                                  `json:"current_ward"`
	CurrentCity       int32                                  `json:"current_city"`
	PollingUnitID     int32                                  `json:"polling_unit_id"`
	BankAccountNumber string                                 `json:"bank_account_number"`
	BankCode          string                                 `json:"bank_code"`
	VotersCardImage   string                                 `json:"voters_card_image"`
	Party             *queries.PartyBasicInfoWithVerifications `json:"party"`
}

func (s *AuthService) Login(
	ctx context.Context,
	identifierType,
	identifier,
	password string,
	iso2 string,
	allowedRoles ...string,
) (LoginResult, error) {
	log := logger.FromContext(ctx).With("component", logger.ComponentAuthService)
	identifier = strings.TrimSpace(strings.ToLower(identifier))

	var fakeID int64

	switch identifierType {
	case "email":
		identifier = strings.TrimSpace(strings.ToLower(identifier))
		exists, fID := s.usersService.CheckEmail(ctx, identifier)
		if !exists || fID == 0 {
			return LoginResult{}, errors.New("Invalid email or password")
		}
		fakeID = fID

	case "username":
		exists, fID := s.usersService.CheckUsername(ctx, identifier)
		if !exists || fID == 0 {
			return LoginResult{}, errors.New("invalid username or password")
		}
		fakeID = fID

	case "phone":
		// validate iso2
		if iso2 == "" {
			return LoginResult{}, errors.New("iso2 is required")
		}

		// validate phone number using the provided iso2
		formattedPhone, err := utils.ValidatePhoneForCountry(identifier, iso2)
		if err != nil {
			return LoginResult{}, err
		}

		exists, fID := s.usersService.CheckPhone(ctx, formattedPhone, 0)
		if !exists || fID == 0 {
			return LoginResult{}, errors.New("invalid phone number or password")
		}
		fakeID = fID
	default:
		return LoginResult{}, errors.New("invalid identifier type")
	}

	// fetch the user details using the fakeID
	user, err := s.GetUserDetailsByFakeID(ctx, fakeID)
	if err != nil {
		return LoginResult{}, errors.New("invalid login details provided")
	}

	// Fetch the user's assigned roles from the database
	userRolesData, err := s.usersService.GetUserRoles(ctx, user.ID)
	if err != nil {
		return LoginResult{}, errors.New("failed to fetch user roles")
	}

	userRoleCodes := userRolesData.RolesCode

	// Role Validation
	if len(allowedRoles) > 0 {
		// Check if the user has at least one of the roles required to perform this action (allowedRoles)
		hasRole := false
		for _, allowedRole := range allowedRoles {
			for _, userRoleC := range userRoleCodes {
				if userRoleC == allowedRole {
					hasRole = true
					break // Stop checking once a matching role is found
				}
			}
			if hasRole {
				break
			}
		}

		// If after checking all allowed roles, the user doesn't have any of them, deny access
		if !hasRole {
			return LoginResult{}, errors.New("insufficient permissions")
		}
	}

	// Fetch the actual password hash directly from the database
	actualPasswordHash, err := s.queries.GetUserPasswordHashByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return LoginResult{}, errors.New("invalid login details provided")
	}

	//  Check if password matches
	err = bcrypt.CompareHashAndPassword([]byte(actualPasswordHash), []byte(password))
	if err != nil {
		return LoginResult{}, errors.New("invalid email, username, phone or password")
	}

	// Verify account status
	status := user.AccountStatus.String
	if status == "suspended" || status == "banned" || status == "deleted" || status == "inactive" {
		return LoginResult{}, fmt.Errorf("your account is %s", status)
	}
	if status == "placeholder" {
		return LoginResult{}, errors.New(`
			Your account is not activated, you cannot login into a placeholder account. Please contact an
			admin to activate your account
		`)
	}

	// if user has a valid partyID, we fetch the party details
	var partyObj *queries.PartyBasicInfoWithVerifications
	partyID := user.PartyID.Int16
	if partyID != 0 {
		partyObj = s.partyService.GetPartyBasicInfo(ctx, partyID)
	}

	// create session and generate tokens
	tokens, err := s.createSession(ctx, user.ID, fakeID, user.Username.String, userRoleCodes, partyID)
	if err != nil {
		log.Error(logger.EventRedisPipelineFailed, "error", err, "operation", "login_session_storage")
		return LoginResult{}, err
	}

	bankAccount, _ := s.usersService.GetUserPrimaryBankAccount(ctx, user.ID)

	loginResult := LoginResult{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User: LoginUser{
			ID:                user.ID,
			FakeID:            user.FakeID.Int64,
			Email:             user.Email.String,
			Username:          user.Username.String,
			ReferralCode:      user.ReferralCode.String,
			FirstName:         user.FirstName.String,
			LastName:          user.LastName.String,
			MiddleName:        user.MiddleName.String,
			Gender:            user.Gender.String,
			Avatar:            user.Avatar.String,
			Phone:             user.Phone.String,
			Roles:             userRoleCodes,
			AccountStatus:     user.AccountStatus.String,
			PartyID:           partyID,
			PollingUnitID:     user.PollingUnitID.Int32,
			CurrentCountry:    user.CurrentCountry,
			CurrentState:      user.CurrentState,
			CurrentLga:        user.CurrentLga.Int32,
			BankAccountNumber: bankAccount.AccountNumber,
			BankCode:          bankAccount.BankCode,
			CurrentWard:       user.CurrentWard.Int32,
			CurrentCity:       user.CurrentCity.Int32,
			VotersCardImage:   user.VotersCardImage.String,
			Party:             partyObj,
		},
	}

	return loginResult, nil
}

// createSession creates a new login session, generates access/refresh tokens, and persists session data in Redis
func (s *AuthService) createSession(
	ctx context.Context,
	userID int64,
	fakeID int64,
	username string,
	roles []string,
	partyID int16,
) (AuthTokens, error) {
	sessionID := uuid.NewString()
	now := time.Now().UTC()
	sessionData := TokenSessionData{
		SessionID: sessionID,
		FakeID:    fakeID,
		TimeAdded: now.Format(time.RFC3339),
	}
	jsonSessionData, err := json.Marshal(sessionData)
	if err != nil {
		return AuthTokens{}, fmt.Errorf("failed to marshal session data: %w", err)
	}

	accessToken, err := utils.GenerateToken(userID, fakeID, username, roles, s.jwtSecret, s.jwtAccessExp, partyID)
	if err != nil {
		return AuthTokens{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	randStr, err := utils.GenerateRandomString()
	if err != nil {
		return AuthTokens{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	pipe := s.rdb.TxPipeline()
	redisRefreshKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, randStr.HashedToken)
	pipe.Set(ctx, redisRefreshKey, jsonSessionData, s.jwtRefreshExp)

	redisLoginSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
	pipe.SAdd(ctx, redisLoginSessionKey, randStr.HashedToken)
	pipe.Expire(ctx, redisLoginSessionKey, s.jwtRefreshExp)

	redisUserSessionKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID)
	pipe.SAdd(ctx, redisUserSessionKey, sessionID)
	pipe.Expire(ctx, redisUserSessionKey, s.jwtRefreshExp)

	if _, err = pipe.Exec(ctx); err != nil {
		return AuthTokens{}, fmt.Errorf("failed to execute redis pipeline: %w", err)
	}

	return AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: randStr.RandomString,
	}, nil
}

type RefreshResult struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         LoginUser `json:"user"`
}

type TokenSessionData struct {
	FakeID    int64  `json:"FakeID"`
	SessionID string `json:"SessionID"`
	TimeAdded string `json:"TimeAdded"`
}

// Refresh validates the refresh token and returns a new set of tokens
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (RefreshResult, error) {
	// init logger
	log := logger.FromContext(ctx).With("component", logger.ComponentAuthService)

	// hash the refresh token
	hashed := utils.HashToken(refreshToken)

	// use token to fetch jwt session details from redis
	currentRedisTokenKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, hashed)
	sessionDts, err := s.rdb.Get(ctx, currentRedisTokenKey).Result()
	if err != nil {
		return RefreshResult{}, errors.New("invalid or expired refresh token")
	}

	// unmarshal the session details
	var sessionData TokenSessionData
	err = json.Unmarshal([]byte(sessionDts), &sessionData)
	if err != nil {
		return RefreshResult{}, errors.New("having issues with unpacking token details")
	}

	// Parse the RFC3339 string back into a time.Time
	parsedTime, err := time.Parse(time.RFC3339, sessionData.TimeAdded)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("error parsing time: %v", err)
	}

	// will only acquire lock after 10 minutes of the token being generated
	// this is to avoid concurrent token generation and speed up the process
	// this is a grace period for the token rotation
	isGracePeriod := time.Since(parsedTime) < 10*time.Minute

	// acquire lock before expensive DB queries if time expired
	if !isGracePeriod {
		// Redis key for user login lock
		lockKey := fmt.Sprintf("%s%d", db.RedisJwtUserLoginLocked, sessionData.FakeID)

		// acquire lock
		result, err := s.rdb.SetArgs(ctx, lockKey, "yes", redis.SetArgs{
			TTL:  10 * time.Second,
			Mode: "NX", // only set if not exists
		}).Result()

		// check if lock was acquired
		if errors.Is(err, redis.Nil) {
			return RefreshResult{}, errors.New("token generation in progress")
		}

		// check for other errors
		if err != nil {
			return RefreshResult{}, err
		}

		// check if lock was acquired
		if result != "OK" {
			return RefreshResult{}, errors.New("token generation in progress")
		}

		// release the lock after successful re-assignment of tokens
		defer s.rdb.Del(ctx, lockKey)
	}

	// get the user details using the FakeID
	user, err := s.GetUserDetailsByFakeID(ctx, sessionData.FakeID)
	if err != nil {
		return RefreshResult{}, errors.New("user not found")
	}

	// get user party id
	var userPartyID int16
	if user.PartyID.Valid {
		userPartyID = user.PartyID.Int16
	}

	// user details
	userDetails := LoginUser{
		ID:              user.ID,
		FakeID:          user.FakeID.Int64,
		Email:           user.Email.String,
		Username:        user.Username.String,
		ReferralCode:    user.ReferralCode.String,
		FirstName:       user.FirstName.String,
		LastName:        user.LastName.String,
		MiddleName:      user.MiddleName.String,
		Gender:          user.Gender.String,
		Avatar:          user.Avatar.String,
		Phone:           user.Phone.String,
		Roles:           user.Roles.RolesCode,
		AccountStatus:   user.AccountStatus.String,
		PartyID:         userPartyID,
		PollingUnitID:   user.PollingUnitID.Int32,
		CurrentCountry:  user.CurrentCountry,
		CurrentState:    user.CurrentState,
		CurrentLga:      user.CurrentLga.Int32,
		CurrentWard:     user.CurrentWard.Int32,
		CurrentCity:     user.CurrentCity.Int32,
		VotersCardImage: user.VotersCardImage.String,
		Party:           user.PartyBasicInfo,
	}

	// Verify account status
	accountStatus := user.AccountStatus.String
	if accountStatus == "suspended" || accountStatus == "banned" || accountStatus == "deleted" || accountStatus == "inactive" {
		return RefreshResult{}, errors.New("your account is not active")
	}
	if accountStatus == "placeholder" {
		return RefreshResult{}, errors.New("Placeholder account cannot be logged in")
	}

	// if time is still within the grace period, return the user details
	if isGracePeriod {
		return RefreshResult{
			User: userDetails,
		}, nil
	}

	// update the time of this new accessToken generated
	now := time.Now().UTC()
	sessionData.TimeAdded = now.Format(time.RFC3339)

	//convert to json
	jsonSessionData, _ := json.Marshal(sessionData)

	// Generate a new Access Token
	newAccessToken, err := utils.GenerateToken(user.ID, sessionData.FakeID, user.Username.String, user.Roles.RolesCode, s.jwtSecret, s.jwtAccessExp, userPartyID)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate a new refresh token
	refresh, err := utils.GenerateRandomString()
	if err != nil {
		return RefreshResult{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Redis session key
	redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionData.SessionID)
	pipe := s.rdb.TxPipeline()

	// expire old token (rotation grace period) and cleanup session tokens
	pipe.Expire(ctx, currentRedisTokenKey, 1*time.Minute) // keeps the token for 1 minute for concurrent requests
	pipe.SRem(ctx, redisSessionKey, hashed)               // deletes the token from the list of session tokens

	// Store the new refresh token, but we use the hashed string as the key
	newRedisTokenKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, refresh.HashedToken)
	pipe.Set(ctx, newRedisTokenKey, jsonSessionData, s.jwtRefreshExp)

	// add the new refresh token to the session SET
	pipe.SAdd(ctx, redisSessionKey, refresh.HashedToken)
	pipe.Expire(ctx, redisSessionKey, s.jwtRefreshExp) // let the whole set expire in s.jwtRefreshExp

	// execute the pipeline
	_, err = pipe.Exec(ctx)
	if err != nil {
		log.Error(logger.EventRedisPipelineFailed, "error", err, "operation", "refresh_token_storage")
		return RefreshResult{}, fmt.Errorf("failed to execute redis pipeline: %w", err)
	}

	// logs token refreshed successfully
	log.Info(logger.EventTokenRefreshSuccess, "user_id", sessionData.FakeID)

	// set the response data
	return RefreshResult{
		AccessToken:  newAccessToken,
		RefreshToken: refresh.RandomString,
		User:         userDetails,
	}, nil
}

// Logout invalidates the refresh token by removing the session from Redis
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	log := logger.FromContext(ctx).With("component", logger.ComponentAuthService)

	// hash the refresh token
	hashed := utils.HashToken(refreshToken)
	// return errors.New("testing error")

	// use token to fetch jwt session details from redis
	tokenRedisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, hashed)
	sessionDts, err := s.rdb.Get(ctx, tokenRedisKey).Result()
	if errors.Is(err, redis.Nil) {
		return errors.New("invalid or expired refresh token")
	}
	if err != nil {
		return err
	}

	// unmarshal the session details
	type SessionData struct {
		SessionID string `json:"SessionID"`
		FakeID    int64  `json:"FakeID"`
	}
	var sessionData SessionData
	if err := json.Unmarshal([]byte(sessionDts), &sessionData); err != nil {
		return errors.New("failed to destructure the session data")
	}

	// get the sessionID from the session details
	sessionID := sessionData.SessionID
	userFid := sessionData.FakeID
	redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)

	// get all tokens in the redisSessionKey set
	tokens, err := s.rdb.SMembers(ctx, redisSessionKey).Result()
	if err != nil {
		return errors.New("failed to retrieve all your tokens")
	}

	// create a pipeline to delete all tokens in the redisSessionKey set
	pipe := s.rdb.TxPipeline()
	for _, token := range tokens {
		// delete the token from redis
		tokenRedisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, token)
		pipe.Del(ctx, tokenRedisKey)
	}

	// delete the session set itself
	pipe.Del(ctx, redisSessionKey)

	// remove the session from the user sessions set
	userRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, userFid)
	pipe.SRem(ctx, userRedisKey, sessionID) // delete the current session

	// fetches all the session in the user session set, and check if they are still valid, if-not-valid, we delete the session
	members, err := s.rdb.SMembers(ctx, userRedisKey).Result()
	if err == nil {
		for _, sessionUID := range members {
			// check if the session is still valid
			redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionUID)
			_, err := s.rdb.Get(ctx, redisSessionKey).Result()
			if errors.Is(err, redis.Nil) {
				// session is not valid, delete it
				pipe.SRem(ctx, userRedisKey, sessionUID)
			}
		}
	}

	// send the pipeline to redis and check for errors
	_, err = pipe.Exec(ctx)
	if err != nil {
		log.Error(logger.EventRedisPipelineFailed, "error", err, "operation", "logout")
		return errors.New("piping the redis command failed")
	}

	log.Info(logger.EventUserLogoutSuccess, "user_id", userFid)
	return nil
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
	validPattern := regexp.MustCompile(`^[a-z][a-z0-9._]{1,28}[a-z0-9]$`)
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
	exists, _ := s.usersService.CheckUsername(ctx, username)
	return exists
}

func (s *AuthService) CheckReferralCode(ctx context.Context, code string) (bool, string, int64) {
	info, err := s.usersService.GetReferralCodeInfo(ctx, code)
	if err != nil || info == nil || info.ID == 0 {
		return false, "", 0
	}
	return true, info.Name, info.ID
}

// function: checks if the Email address already exists in redis and in the postgres db
func (s *AuthService) CheckEmail(ctx context.Context, email string) bool {
	exists, _ := s.usersService.CheckEmail(ctx, email)
	return exists
}

// function: checks if the phone exists in redis and in the postgres db
func (s *AuthService) CheckPhone(ctx context.Context, phone string) bool {
	exists, _ := s.usersService.CheckPhone(ctx, phone, 0)
	return exists
}

// CheckNIN function checks if the nin already exists in the database
func (s *AuthService) CheckNIN(ctx context.Context, nin string) bool {
	return s.usersService.CheckNIN(ctx, nin)
}

type SignupResult struct {
	ID           string    `json:"id"`
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         LoginUser `json:"user"`
}

// Signup performs the primary backend registration logic.
// It checks if the email or phone number is already registered, hashes the password,
// creates the new user record in the database, and returns the user's ID along with
// generated access and refresh tokens.
func (s *AuthService) Signup(ctx context.Context, email, phone, password string, countryID int16) (SignupResult, error) {
	// Check if email exists
	email = normalizeEmail(email)
	if email != "" {
		if exists, _ := s.usersService.CheckEmail(ctx, email); exists {
			return SignupResult{}, errors.New("Email address already exists")
		}
	}

	// Validate country and normalize phone to E.164 format
	country_dts, err := s.bodiesService.CheckCountry(ctx, countryID)
	if err != nil {
		return SignupResult{}, err
	}

	e164Phone, err := s.ValidatePhoneForCountry(phone, country_dts.Iso2)
	if err != nil {
		return SignupResult{}, err
	}

	// Check if phone exists in E.164 format
	if exists, _ := s.usersService.CheckPhone(ctx, e164Phone, 0); exists {
		return SignupResult{}, errors.New("phone already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to hash password: %w", err)
	}

	// prepares and validates user record before inserting into database
	params := queries.CreateUserParams{
		Email:          pgtype.Text{String: email, Valid: email != ""},
		Phone:          pgtype.Text{String: e164Phone, Valid: true},
		PasswordHash:   string(hashedPassword),
		CurrentCountry: countryID,
		CurrentState:   37, // temp default state to avoid error of null entry
	}

	// creates user and inserts into database
	userID, err := s.queries.CreateUser(ctx, params)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			switch pgErr.ConstraintName {
			case "users_email_key":
				return SignupResult{}, errors.New("Email address already exists")
			case "users_phone_key":
				return SignupResult{}, errors.New("phone already exists")
			}
		}
		return SignupResult{}, fmt.Errorf("failed to create user: %w", err)
	}

	// fake id generator
	fakeID := utils.GenerateFakeID(userID)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{
		// Update user fake ID
		ID:     userID,
		FakeID: pgtype.Int8{Int64: fakeID, Valid: true},
	})
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to update user fake ID: %w", err)
	}

	// save user phonenumbers
	err = s.usersService.UpdateUserPhoneNumbers(ctx, userID, fakeID, []usersservice.PhonePayload{
		{
			Phone:     e164Phone,
			RawInput:  phone,
			Phonecode: country_dts.Phonecode,
			IsDefault: true,
		},
	})
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to save user phone number: %w", err)
	}

	// save he user email to redis
	err = s.SaveSomeUserRegistrationDetails(ctx, "", email, "", userID, fakeID)
	if err != nil {
		return SignupResult{}, err
	}

	// Generate session and tokens (same pattern as Login)
	tokens, err := s.createSession(ctx, userID, fakeID, "", nil, 0)
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to create session: %w", err)
	}

	return SignupResult{
		ID:           strconv.FormatInt(userID, 10),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User: LoginUser{
			ID:             userID,
			FakeID:         fakeID,
			Email:          email,
			Phone:          e164Phone,
			AccountStatus:  "just_registered",
			CurrentCountry: countryID,
			CurrentState:   37,
		},
	}, nil

}

// CompleteOnboarding finalizes a newly registered user's profile with all data collected during the onboarding flow.
// It updates the user row, saves NIN + username to Redis/DB, stores security questions, and sets account status to 'active'.
func (s *AuthService) CompleteOnboarding(
	ctx context.Context,
	userID int64,
	fakeID int64,
	params queries.UpdateOnboardingProfileParams,
	referrerUserID *int64,
	nin string,
) error {
	// 1. Update the users row with all onboarding fields including referral code
	updatedUser, err := s.queries.UpdateOnboardingProfile(ctx, params)
	if err != nil {
		return fmt.Errorf("update profile: %w", err)
	}

	// record referrer user
	if referrerUserID != nil && *referrerUserID > 0 && *referrerUserID != userID {
		if _, err := s.queries.CreateReferral(ctx, queries.CreateReferralParams{
			PartyID:        pgtype.Int2{Valid: false}, // No party at signup
			ReferrerUserID: *referrerUserID,
			ReferredUserID: userID,
			Milestone:      "SIGNED_UP",
			Status:         pgtype.Text{String: "pending", Valid: true},
		}); err != nil {
			return fmt.Errorf("create referral record: %w", err)
		}
	}

	// 2. Persist username, email, nin to Redis for fast lookups
	if err := s.SaveSomeUserRegistrationDetails(ctx, params.Username.String, "", nin, userID, fakeID); err != nil {
		return fmt.Errorf("save registration details: %w", err)
	}

	// 3. Invalidate the Redis user-info cache so the next read is fresh
	_ = s.usersService.InvalidateCachedUserInfo(ctx, fakeID)

	// 4. Create user wallet in background using the updated user data
	if s.usersService != nil {
		go func() {
			bgCtx := context.Background()
			if _, walletErr := s.usersService.CreateUserWallet(bgCtx, updatedUser); walletErr != nil {
				slog.Warn("[AuthService.CompleteOnboarding] Background wallet creation returned error", "user_id", userID, "err", walletErr)
			}
		}()
	}

	return nil
}

// ValidatePhoneForCountry checks:
// 1. valid phone number format
// 2. matches the given ISO country code (e.g. "NG", "US")
// 3. returns normalized E.164 format if valid
func (s *AuthService) ValidatePhoneForCountry(phone, country_code string) (string, error) {
	// Parse number (second arg can be empty if phone is already in E.164)
	num, err := phonenumbers.Parse(phone, country_code)
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

// SaveSomeUserRegistrationDetails saves the user's registration details (username, email, nin) to Redis & DB
func (s *AuthService) SaveSomeUserRegistrationDetails(ctx context.Context, username, email, nin string, userID int64, fakeID int64) error {
	// batch redis commands
	pipe := s.rdb.TxPipeline()

	if username != "" {
		pipe.Set(ctx, db.RedisUsernameFakeID+username, fakeID, db.RedisFiveYearsTTL)
	}
	if email != "" {
		pipe.Set(ctx, db.RedisEmailFakeID+email, fakeID, db.RedisFiveYearsTTL)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return err
	}

	// save to db
	if nin != "" {
		if _, err := s.queries.CreateUserNIN(ctx, queries.CreateUserNINParams{
			Nin:    nin,
			UserID: userID,
		}); err != nil {
			slog.Error("SaveSomeUserRegistrationDetails: failed to create user NIN", "error", err, "user_id", userID)
		}
	}

	return nil
}

const (
	emailOtpTTL         = 10 * time.Minute
	emailOtpVerifiedTTL = 30 * time.Minute
)

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *AuthService) emailOtpKey(email string) string {
	return db.RedisRegisterEmailOtp + normalizeEmail(email)
}

func (s *AuthService) emailOtpVerifiedKey(email string) string {
	return db.RedisRegisterEmailOtpVerified + normalizeEmail(email)
}

func (s *AuthService) sendEmailOTP(ctx context.Context, to, otp string) error {
	from := config.GetEnv("RESEND_FROM_EMAIL", "")
	apiKey := config.GetEnv("RESEND_API_KEY", "")
	if from == "" || apiKey == "" {
		return errors.New("email service is not configured")
	}

	body := map[string]any{
		"from":    from,
		"to":      []string{to},
		"subject": "Your Free9ja verification code",
		"html": fmt.Sprintf(`<div style="font-family:Arial,sans-serif;line-height:1.6">
			<h2>Verify your email</h2>
			<p>Your verification code is:</p>
			<div style="font-size:32px;font-weight:700;letter-spacing:6px">%s</div>
			<p>This code expires in 10 minutes.</p>
		</div>`, otp),
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "free9ja-api")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend email failed: %s", resp.Status)
	}
	return nil
}

// Maximum allowed failed verification attempts before an OTP is invalidated
const maxOTPAttempts = 5

// StoredEmailOTP represents the OTP payload cached in Redis
type StoredEmailOTP struct {
	Hash     string `json:"hash"`     // bcrypt hash of the OTP code
	Attempts int    `json:"attempts"` // count of failed verification attempts
}

type EmailOTPResult struct {
	Message                string `json:"message"`
	EmailVerificationToken string `json:"emailVerificationToken,omitempty"`
	ExpiresInSeconds       int    `json:"expiresInSeconds,omitempty"`
}

// generateAndSendEmailOTP generates a new OTP, emails it, and caches the hash in Redis
func (s *AuthService) generateAndSendEmailOTP(ctx context.Context, email string) (EmailOTPResult, error) {
	// 1. Generate plain 6-digit OTP and its bcrypt hash
	otp, hashedOTP, err := utils.GenerateOTP()
	if err != nil {
		return EmailOTPResult{}, err
	}

	// 2. Dispatch the plain OTP to the user's email
	if err := s.sendEmailOTP(ctx, email, otp); err != nil {
		return EmailOTPResult{}, err
	}

	// 3. Store the hashed OTP in Redis with initial 0 attempts and a TTL
	otpData, _ := json.Marshal(StoredEmailOTP{
		Hash:     hashedOTP,
		Attempts: 0,
	})
	if err := s.rdb.Set(ctx, s.emailOtpKey(email), otpData, emailOtpTTL).Err(); err != nil {
		return EmailOTPResult{}, err
	}

	// 4. Return success result with remaining expiration time
	return EmailOTPResult{
		Message:          "OTP sent successfully",
		ExpiresInSeconds: int(emailOtpTTL.Seconds()),
	}, nil
}

// SendSignupEmailOTP generates and sends an OTP to a new user's email address during the signup process
func (s *AuthService) SendSignupEmailOTP(ctx context.Context, email string) (EmailOTPResult, error) {
	// Normalize email format (e.g. lowercase, trim spaces)
	email = normalizeEmail(email)
	if email == "" {
		return EmailOTPResult{}, errors.New("email is required")
	}

	// Ensure the email is not already registered in the system
	if exists, _ := s.usersService.CheckEmail(ctx, email); exists {
		return EmailOTPResult{}, errors.New("Email address already exists")
	}

	// Generate, send, and cache OTP
	return s.generateAndSendEmailOTP(ctx, email)
}

// SendForgotPasswordEmailOTP sends a one-time code for password reset.
// Unlike SendSignupEmailOTP, it requires the email to already exist.
func (s *AuthService) SendForgotPasswordEmailOTP(ctx context.Context, email string) (EmailOTPResult, error) {
	email = normalizeEmail(email)
	if email == "" {
		return EmailOTPResult{}, errors.New("email is required")
	}
	if exists, _ := s.usersService.CheckEmail(ctx, email); !exists {
		return EmailOTPResult{}, errors.New("no account found with that email address")
	}

	// Generate, send, and cache OTP
	return s.generateAndSendEmailOTP(ctx, email)
}

// verifyAndConsumeEmailOTP checks the OTP against the stored hash in Redis with brute-force attempt tracking.
// If valid, the OTP is deleted from Redis immediately.
func (s *AuthService) verifyAndConsumeEmailOTP(ctx context.Context, email, otp string) error {
	// 1. Validate and clean input parameters
	email = normalizeEmail(email)
	if email == "" {
		return errors.New("email is required")
	}
	otp = strings.TrimSpace(otp)
	if otp == "" {
		return errors.New("otp code is required")
	}

	// 2. Fetch the cached OTP record from Redis
	key := s.emailOtpKey(email)
	raw, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		return errors.New("otp expired or not found")
	}

	// 3. Deserialize the stored hash and attempt count
	var stored StoredEmailOTP
	if err := json.Unmarshal([]byte(raw), &stored); err != nil {
		return errors.New("invalid otp state")
	}

	// 4. Check if max brute-force attempts have already been reached
	if stored.Attempts >= maxOTPAttempts {
		_ = s.rdb.Del(ctx, key).Err()
		return errors.New("too many failed attempts, please request a new code")
	}

	// 5. Compare the submitted OTP with the stored bcrypt hash
	if err := bcrypt.CompareHashAndPassword([]byte(stored.Hash), []byte(otp)); err != nil {
		stored.Attempts++
		// Invalidate OTP immediately on reaching the limit
		if stored.Attempts >= maxOTPAttempts {
			_ = s.rdb.Del(ctx, key).Err()
			return errors.New("too many failed attempts, please request a new code")
		}

		// Persist the incremented attempt count while preserving remaining key TTL
		ttl := s.rdb.TTL(ctx, key).Val()
		if ttl > 0 {
			updatedData, _ := json.Marshal(stored)
			_ = s.rdb.Set(ctx, key, updatedData, ttl).Err()
		}

		// 6. Calculate remaining attempts and return error
		remaining := maxOTPAttempts - stored.Attempts
		return fmt.Errorf("invalid otp (%d attempt(s) remaining)", remaining)
	}

	// 7. Consume and remove the OTP from Redis on successful verification
	_ = s.rdb.Del(ctx, key).Err()
	return nil
}

// VerifySignupEmailOTP validates the submitted OTP against the stored hash and generates a verification token upon success
func (s *AuthService) VerifySignupEmailOTP(ctx context.Context, email, otp string) (EmailOTPResult, error) {
	// 1. Verify and consume OTP with brute-force protection
	if err := s.verifyAndConsumeEmailOTP(ctx, email, otp); err != nil {
		return EmailOTPResult{}, err
	}

	// 2. Generate and store temporary email verification token in Redis
	email = normalizeEmail(email)
	verificationToken := uuid.NewString()
	if err := s.rdb.Set(ctx, s.emailOtpVerifiedKey(email), verificationToken, emailOtpVerifiedTTL).Err(); err != nil {
		return EmailOTPResult{}, err
	}

	// 3. Return success response with the verification token and its expiration
	return EmailOTPResult{
		Message:                "Email verified successfully",
		EmailVerificationToken: verificationToken,
		ExpiresInSeconds:       int(emailOtpVerifiedTTL.Seconds()),
	}, nil
}

// GetUserDetailsByFakeID fetches all user details using the user fake_id
func (s *AuthService) GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error) {
	return s.usersService.GetUserByFakeID(ctx, fakeID)
}

// ChangePasswordByEmail resets a user's password using their email address and OTP
func (s *AuthService) ChangePasswordByEmail(ctx context.Context, email, otp, newPassword string) error {
	email = normalizeEmail(email)
	if email == "" {
		return errors.New("email is required")
	}
	if len(newPassword) < 5 {
		return errors.New("password must be at least 5 characters")
	}

	// 1. Verify and consume OTP with brute-force attempt limits
	if err := s.verifyAndConsumeEmailOTP(ctx, email, otp); err != nil {
		return err
	}

	// 2. Resolve fakeID from Redis via email with Postgres fallback
	exists, fakeID := s.usersService.CheckEmail(ctx, email)
	if !exists || fakeID == 0 {
		return errors.New("no account found with that email address")
	}

	// 3. Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// 4. Update password in DB
	err = s.queries.UpdateUserPasswordByFid(ctx, queries.UpdateUserPasswordByFidParams{
		FakeID:       pgtype.Int8{Int64: fakeID, Valid: true},
		PasswordHash: string(hashedPassword),
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// 4. Invalidate all active sessions across all devices
	// Security requirement: Changing/resetting a password must immediately revoke all existing
	// authentication tokens and sessions across all devices (desktops, mobile apps, browsers).
	//
	// Redis Key Hierarchy:
	//   1. User-to-Sessions Set   (`db.RedisUserLoginSessions` + fakeID):
	//      Stores the set of all active session IDs belonging to this user.
	//   2. Session-to-Tokens Set  (`db.RedisSessionTokens` + sessionID):
	//      Stores the set of active refresh token identifiers associated with each session.
	//   3. Refresh Token Payload  (`db.RedisJwtRefreshToken` + token):
	//      Stores the actual refresh token record used during token renewals.
	// first gets all the session ids, then loop through it to get all the refresh tokens
	// then delete the tokens and the session id
	userSessionsRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID)
	sessions, err := s.rdb.SMembers(ctx, userSessionsRedisKey).Result()
	if err == nil && len(sessions) > 0 {
		// Use a transactional pipeline to execute all deletion commands in a single round-trip
		pipe := s.rdb.TxPipeline()

		// loop through all the session ids and delete the tokens
		for _, sessionID := range sessions {
			sessionTokensRedisKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
			tokens, _ := s.rdb.SMembers(ctx, sessionTokensRedisKey).Result()

			// a) Revoke every refresh token under this session
			for _, token := range tokens {
				refreshTokenRedisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, token)
				pipe.Del(ctx, refreshTokenRedisKey)
			}

			// b) Delete the session's token set
			pipe.Del(ctx, sessionTokensRedisKey)
		}

		// c) Delete the user's overall active session tracking set
		pipe.Del(ctx, userSessionsRedisKey)

		// Execute all queued Redis deletion commands atomically
		_, _ = pipe.Exec(ctx)
	}

	// 5. Update cached user info
	_ = s.usersService.InvalidateCachedUserInfo(ctx, fakeID)

	return nil
}

type RegisterResult struct {
	UserID int64
	FakeID int64
	User   *queries.UserWithPlaces
}

// RegisterCandidatePlaceholder creates a new candidate user in the system with placeholder status
func (s *AuthService) RegisterCandidatePlaceholder(
	ctx context.Context,
	email, password, firstName, lastName, middleName, username, gender, avatar string,
	avatarFileId *int64,
	dob time.Time,
	countryID, stateID int16,
	currentCity int32,
	stateOfOrigin int16,
	partyID int64,
) (RegisterResult, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return RegisterResult{}, err
	}

	// email checks
	email = strings.TrimSpace(strings.ToLower(email))
	if email != "" {
		if exists, _ := s.usersService.CheckEmail(ctx, email); exists {
			return RegisterResult{}, errors.New("Email address already exists")
		}
	}

	// re-assert the avatar_file_id to pgtype
	avatarFileIdPg := pgtype.Int8{Valid: false}
	if avatarFileId != nil {
		avatarFileIdPg = pgtype.Int8{Int64: *avatarFileId, Valid: true}
	}

	params := queries.CreateCandidatePlaceholderParams{
		Email:          pgtype.Text{String: email, Valid: email != ""},
		PasswordHash:   string(hashedPassword),
		LastName:       pgtype.Text{String: lastName, Valid: lastName != ""},
		FirstName:      pgtype.Text{String: firstName, Valid: firstName != ""},
		MiddleName:     pgtype.Text{String: middleName, Valid: middleName != ""},
		Username:       pgtype.Text{String: username, Valid: username != ""},
		Gender:         pgtype.Text{String: gender, Valid: gender != ""},
		DateOfBirth:    pgtype.Date{Time: dob, Valid: !dob.IsZero()},
		CurrentCountry: countryID,
		CurrentState:   stateID,
		CurrentCity:    pgtype.Int4{Int32: currentCity, Valid: currentCity != 0},
		StateOfOrigin:  pgtype.Int2{Int16: stateOfOrigin, Valid: stateOfOrigin != 0},
		Avatar:         pgtype.Text{String: avatar, Valid: avatar != ""},
		AvatarFileID:   avatarFileIdPg,
	}

	// creates the user's new account in our database
	userID, err := s.queries.CreateCandidatePlaceholder(ctx, params)
	if err != nil {
		return RegisterResult{}, err
	}

	// generate a fake_id using the user_id and update the user fake_id
	fakeID := utils.GenerateFakeID(userID)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: userID, FakeID: pgtype.Int8{Int64: fakeID, Valid: true}})
	if err != nil {
		return RegisterResult{}, err
	}

	// save some of the user details to our db & also to redis(using pipeline)
	err = s.SaveSomeUserRegistrationDetails(ctx, username, email, "", userID, fakeID)
	if err != nil {
		return RegisterResult{}, err
	}

	// if partyID is provided, we add the new user to the party provided
	if partyID != 0 {
		err = s.partyService.JoinParty(ctx, int16(partyID), 0, userID, fakeID)
		if err != nil {
			return RegisterResult{}, err
		}
	}

	// fetch user details to cache it in Redis
	user, err := s.GetUserDetailsByFakeID(ctx, fakeID)
	if err != nil {
		return RegisterResult{}, err
	}

	err = s.CheckAndAssignRole(ctx, user.ID, fakeID, "super_admin", 0)
	return RegisterResult{UserID: user.ID, FakeID: user.FakeID.Int64, User: &user}, err
}

// CheckAndAssignRole checks if a user already has a specific role, and if not, assigns it.
func (s *AuthService) CheckAndAssignRole(ctx context.Context, userID int64, fakeID int64, roleCode string, whoAssigned int64) error {
	// 1. Get user roles (with cache check)
	roles, err := s.usersService.GetUserRoles(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch user roles: %w", err)
	}

	// 2. Check if the user already has the role
	for _, r := range roles.RolesCode {
		if r == roleCode {
			// Already has the role, no need to assign again
			return nil
		}
	}

	// 3. Assign the role in DB (UsersService handles caching)
	err = s.usersService.AssignUserRole(ctx, userID, fakeID, roleCode, whoAssigned)
	if err != nil {
		return fmt.Errorf("failed to assign role %s: %w", roleCode, err)
	}

	return nil
}

// UpdateUserRoles replaces a user's roles and optionally sets their party ID.
func (s *AuthService) UpdateUserRoles(ctx context.Context, userID int64, fakeID int64, roles []string, partyID *int64, whoAssigned int64) error {
	// 1. Delete all existing roles
	err := s.queries.DeleteUserRoles(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to delete existing roles: %w", err)
	}

	// 2. Assign the new roles
	for _, roleCode := range roles {
		err = s.usersService.AssignUserRole(ctx, userID, fakeID, roleCode, whoAssigned)
		if err != nil {
			return fmt.Errorf("failed to assign role %s: %w", roleCode, err)
		}
	}

	// 3. Update party if provided
	if partyID != nil {
		err = s.queries.UpdateUserParty(ctx, queries.UpdateUserPartyParams{
			ID:      userID,
			PartyID: pgtype.Int2{Int16: int16(*partyID), Valid: true},
		})
		if err != nil {
			return fmt.Errorf("failed to update user party: %w", err)
		}
	}

	return nil
}

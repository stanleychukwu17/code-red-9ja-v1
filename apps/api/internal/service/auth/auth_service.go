package authservice

import (
	"context"
	cryptorand "crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/logger"
	"log/slog"
	"math/big"
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
	CheckUsername(ctx context.Context, username string) bool
	CheckEmail(ctx context.Context, email string) bool
	CheckPhone(ctx context.Context, phone string) bool
	CheckNIN(ctx context.Context, nin string) bool
	GetUserPrimaryBankAccount(ctx context.Context, userID int64) (queries.UserBankAccount, error)
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
	q *queries.Queries,
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
		queries:          q,
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

type LoginUser struct {
	ID                int64    `json:"id"`
	FakeID            int64    `json:"fake_id"`
	Email             string   `json:"email"`
	Username          string   `json:"username"`
	ReferralCode      string   `json:"referral_code"`
	FirstName         string   `json:"first_name"`
	LastName          string   `json:"last_name"`
	MiddleName        string   `json:"middle_name"`
	Gender            string   `json:"gender"`
	DateOfBirth       string   `json:"date_of_birth"`
	Avatar            string   `json:"avatar"`
	Phone             string   `json:"phone"`
	Roles             []string `json:"roles"`
	AccountStatus     string   `json:"account_status"`
	PartyID           int16    `json:"party_id,omitempty"`
	PollingUnitID     int32    `json:"polling_unit_id,omitempty"`
	CurrentCountry    int16    `json:"current_country"`
	CurrentState      int16    `json:"current_state"`
	CurrentLga        int32    `json:"current_lga"`
	BankAccountNumber string   `json:"bank_account_number"`
	BankCode          string   `json:"bank_code"`

	CurrentWard     int32                                    `json:"current_ward"`
	CurrentCity     int32                                    `json:"current_city"`
	VotersCardImage string                                   `json:"voters_card_image"`
	Party           *queries.PartyBasicInfoWithVerifications `json:"party,omitempty"`
}
type LoginResult struct {
	AccessToken  string
	RefreshToken string
	User         LoginUser
}

// Login verifies login credentials and returns JWT access and refresh tokens
func (s *AuthService) Login(ctx context.Context, identifierType, identifier, password, iso2 string, allowedRoles ...string) (LoginResult, error) {
	log := logger.FromContext(ctx).With("component", logger.ComponentAuthService)
	identifier = strings.TrimSpace(strings.ToLower(identifier))

	var err error
	var fakeIDStr string
	var fakeID int64

	switch identifierType {
	case "email":
		identifier = strings.TrimSpace(strings.ToLower(identifier))
		fakeIDStr = s.rdb.Get(ctx, db.RedisEmailFakeID+identifier).Val()
		if fakeIDStr == "" {
			// Fall back to Postgres if not in cache
			fakeIDPg, err := s.queries.GetFakeIDByEmail(ctx, pgtype.Text{String: identifier, Valid: true})
			if err == nil && fakeIDPg.Valid {
				fakeIDStr = strconv.FormatInt(fakeIDPg.Int64, 10)
				s.rdb.Set(ctx, db.RedisEmailFakeID+identifier, fakeIDStr, db.RedisFiveYearsTTL)
			} else {
				return LoginResult{}, errors.New("Invalid email or password")
			}
		}

	case "username":
		fakeIDStr = s.rdb.Get(ctx, db.RedisUsernameFakeID+identifier).Val()
		if fakeIDStr == "" {
			fakeIDPg, err := s.queries.GetFakeIDByUsername(ctx, pgtype.Text{String: identifier, Valid: true})
			if err == nil && fakeIDPg.Valid {
				fakeIDStr = strconv.FormatInt(fakeIDPg.Int64, 10)
				s.rdb.Set(ctx, db.RedisUsernameFakeID+identifier, fakeIDStr, db.RedisFiveYearsTTL)
			} else {
				return LoginResult{}, errors.New("invalid username or password")
			}
		}

	case "phone":
		// validate iso2
		if iso2 == "" {
			return LoginResult{}, errors.New("iso2 is required")
		}

		// validate phone number using the provided iso2
		_, err = utils.ValidatePhoneForCountry(identifier, iso2)
		if err != nil {
			return LoginResult{}, err
		}

		fakeIDStr = s.rdb.Get(ctx, db.RedisPhoneFakeID+identifier).Val()
		if fakeIDStr == "" {
			fakeIDPg, err := s.queries.GetFakeIDByPhone(ctx, pgtype.Text{String: identifier, Valid: true})
			if err == nil && fakeIDPg.Valid {
				fakeIDStr = strconv.FormatInt(fakeIDPg.Int64, 10)
				s.rdb.Set(ctx, db.RedisPhoneFakeID+identifier, fakeIDStr, db.RedisFiveYearsTTL)
			} else {
				return LoginResult{}, errors.New("invalid phone number or password")
			}
		}
	default:
		return LoginResult{}, errors.New("invalid identifier type")
	}

	// fetch the user details using the fakeID
	fakeID, _ = strconv.ParseInt(fakeIDStr, 10, 64)
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

	// create session details
	sessionID := uuid.NewString()
	timezone, _ := time.LoadLocation(config.GetEnv("TIMEZONE", "Africa/Lagos"))
	now := time.Now().In(timezone)
	sessionData := map[string]any{
		"SessionID": sessionID,
		"FakeID":    fakeID,
		"TimeAdded": now.Format(time.RFC3339),
	}
	jsonSessionData, _ := json.Marshal(sessionData)

	// if user has a valid partyID, we fetch the party details
	var partyObj *queries.PartyBasicInfoWithVerifications
	partyID := user.PartyID.Int16
	if partyID != 0 {
		partyObj = s.partyService.GetPartyBasicInfo(ctx, partyID)
	}

	// Generate Access Token and Refresh Token
	accessToken, err := utils.GenerateToken(user.ID, fakeID, user.Username.String, userRoleCodes, s.jwtSecret, s.jwtAccessExp, partyID)
	if err != nil {
		return LoginResult{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	// generate refresh token (opaque)
	randStr, err := utils.GenerateRandomString()
	if err != nil {
		return LoginResult{}, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Redis: create redis pipeline
	pipe := s.rdb.TxPipeline()

	// Redis: Store the session data in redis using the hashed refresh token as the key
	redisRefreshKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, randStr.HashedToken)
	pipe.Set(ctx, redisRefreshKey, jsonSessionData, s.jwtRefreshExp)

	// Redis: add the session ID to the set of login sessions
	redisLoginSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
	pipe.SAdd(ctx, redisLoginSessionKey, randStr.HashedToken)
	pipe.Expire(ctx, redisLoginSessionKey, s.jwtRefreshExp) // sets an expiration on the entire set using the jwtRefreshExpiration time

	// Redis: add the session ID to the set of the user's login sessions
	redisUserSessionKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID)
	pipe.SAdd(ctx, redisUserSessionKey, sessionID)
	pipe.Expire(ctx, redisUserSessionKey, s.jwtRefreshExp) // sets an expiration on the entire set using the jwtRefreshExpiration time

	// execute the pipeline
	_, err = pipe.Exec(ctx)
	if err != nil {
		log.Error(logger.EventRedisPipelineFailed, "error", err, "operation", "login_session_storage")
		return LoginResult{}, fmt.Errorf("failed to execute redis pipeline: %w", err)
	}

	bankAccount, _ := s.usersService.GetUserPrimaryBankAccount(ctx, user.ID)

	loginResult := LoginResult{
		AccessToken:  accessToken,
		RefreshToken: randStr.RandomString,
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

	// if time is still within the grace period, return the user details
	if isGracePeriod {
		return RefreshResult{
			User: userDetails,
		}, nil
	}

	// Verify account status
	accountStatus := user.AccountStatus.String
	if accountStatus == "suspended" || accountStatus == "banned" || accountStatus == "deleted" || accountStatus == "inactive" {
		return RefreshResult{}, errors.New("your account is not active")
	}
	if accountStatus == "placeholder" {
		return RefreshResult{}, errors.New("Placeholder account cannot be logged in")
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

type RedisOnboardingData struct {
	ID        string `json:"id"`
	Phone     string `json:"phone"`
	E164      string `json:"e164"`
	Email     string `json:"email"`
	CountryID int16  `json:"country_id"`
	Completed string `json:"completed"`
}

type RegisterResult struct {
	UserID int64
	FakeID int64
	User   *queries.UserWithPlaces
}

func (s *AuthService) Register(ctx context.Context, params queries.CreateUserParams, referredByCode string, nin string, onboardingID string, question1 int16, answer1 string, question2 int16, answer2 string) (RegisterResult, error) {
	// check security questions are different
	if question1 == question2 {
		return RegisterResult{}, errors.New("security questions must be different")
	}

	// Hash security question answers
	hashedAnswer1, err := bcrypt.GenerateFromPassword([]byte(answer1), bcrypt.DefaultCost)
	if err != nil {
		return RegisterResult{}, err
	}
	hashedAnswer2, err := bcrypt.GenerateFromPassword([]byte(answer2), bcrypt.DefaultCost)
	if err != nil {
		return RegisterResult{}, err
	}

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

	// country check
	country_dts, err := s.bodiesService.CheckCountry(ctx, params.CurrentCountry)
	if err != nil {
		return RegisterResult{}, err
	}
	// state check
	_, err = s.bodiesService.CheckState(ctx, params.CurrentCountry, params.CurrentState)
	if err != nil {
		return RegisterResult{}, err
	}
	// city check
	if params.CurrentCity.Int32 > 0 {
		_, err = s.bodiesService.CheckCity(ctx, params.CurrentState, params.CurrentCity.Int32)
		if err != nil {
			return RegisterResult{}, err
		}
	}

	// check phone country validation
	phone := params.Phone.String
	formattedPhone, err := utils.ValidatePhoneForCountry(phone, country_dts.Iso2)
	if err != nil {
		return RegisterResult{}, err
	}

	// check if onboarding details exist in redis
	redisKey := db.RedisRegisterOnboarding + formattedPhone
	onboardingJSON, err := s.rdb.Get(ctx, redisKey).Result()
	if err != nil {
		return RegisterResult{}, errors.New("onboarding details not found")
	}

	// Parse the onboarding data retrieved from Redis
	var onboardingDts RedisOnboardingData
	if err := json.Unmarshal([]byte(onboardingJSON), &onboardingDts); err != nil {
		return RegisterResult{}, errors.New("invalid onboarding data format")
	}

	// Verify the provided onboarding ID matches the data in Redis
	if onboardingDts.ID != onboardingID {
		return RegisterResult{}, errors.New("invalid onboarding details")
	}

	// Ensure the user hasn't already completed the onboarding process
	if onboardingDts.Completed == "yes" {
		return RegisterResult{}, errors.New("user has already been onboarded")
	}

	// checks if the username already exist
	username_exist := s.usersService.CheckUsername(ctx, username)
	if username_exist {
		return RegisterResult{}, errors.New("username already exists")
	}

	// email checks
	email := strings.TrimSpace(strings.ToLower(params.Email.String))
	email_exist := s.usersService.CheckEmail(ctx, email)
	if email_exist {
		return RegisterResult{}, errors.New("Email address already exists")
	}

	// phone checks
	phone_exist := s.usersService.CheckPhone(ctx, formattedPhone)
	if phone_exist {
		return RegisterResult{}, errors.New("phone already exists")
	}

	// nin check
	nin_check := s.usersService.CheckNIN(ctx, nin)
	if nin_check {
		return RegisterResult{}, errors.New("nin already exists")
	}

	// Check date of birth: Ensure the user is at least 18 years old
	today := time.Now().UTC()
	if today.Sub(params.DateOfBirth.Time) < 18*365*24*time.Hour {
		return RegisterResult{}, errors.New("you must be at least 18 years old")
	}

	// Auto-generate unique referral code format: {F}-{random}-{L}
	fName := strings.ToUpper(strings.TrimSpace(params.FirstName.String))
	if len(fName) > 3 {
		fName = fName[:3]
	}
	lName := strings.ToUpper(strings.TrimSpace(params.LastName.String))
	if len(lName) > 3 {
		lName = lName[:3]
	}

	timeMsStr := fmt.Sprintf("%d", time.Now().UnixMilli())
	if len(timeMsStr) > 6 {
		timeMsStr = timeMsStr[len(timeMsStr)-6:]
	}
	refCode := fmt.Sprintf("%s-%s-%s", fName, timeMsStr, lName)
	//--CREATE USER--
	// creates the user's new account in our database
	user_id, err := s.queries.CreateUser(ctx, params)
	if err != nil {
		return RegisterResult{}, err
	}

	var referredByID pgtype.Int8
	if referredByCode != "" {
		uID, err := s.queries.GetUserIdByReferralCode(ctx, pgtype.Text{String: referredByCode, Valid: true})
		if err == nil {
			referredByID = pgtype.Int8{Int64: uID, Valid: true}
		}
	}

	err = s.queries.UpdateUserReferralCode(ctx, queries.UpdateUserReferralCodeParams{
		ID:           user_id,
		ReferralCode: pgtype.Text{String: refCode, Valid: true},
	})
	if err == nil && referredByID.Valid {
		err = s.queries.UpdateUserReferredBy(ctx, queries.UpdateUserReferredByParams{
			ID:           user_id,
			ReferredByID: referredByID,
		})
	}
	if err != nil {
		slog.Error("failed to create user referral profile during registration", "user_id", user_id, "err", err)
	} else if referredByID.Valid {
		_, err = s.queries.CreateReferral(ctx, queries.CreateReferralParams{
			PartyID:        pgtype.Int2{Valid: false},
			ReferrerUserID: referredByID.Int64,
			ReferredUserID: user_id,
			Milestone:      "SIGNED_UP",
			Status:         pgtype.Text{String: "pending", Valid: true},
		})
		if err != nil {
			slog.Error("failed to create referral record during registration", "user_id", user_id, "err", err)
		}

	}

	// generate a fake_id using the user_id and update the user fake_id
	fake_id := utils.GenerateFakeID(user_id)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: user_id, FakeID: pgtype.Int8{Int64: fake_id, Valid: true}})
	if err != nil {
		return RegisterResult{}, err
	}

	// save some of the user details to our db & also to redis(using pipeline)
	err = s.SaveSomeUserRegistrationDetails(ctx, username, email, nin, user_id, fake_id)
	if err != nil {
		return RegisterResult{}, err
	}

	// save the user phone number
	err = s.usersService.UpdateUserPhoneNumbers(ctx, user_id, fake_id, []usersservice.PhonePayload{
		{
			Phone:     formattedPhone,
			RawInput:  params.Phone.String,
			Phonecode: country_dts.Phonecode,
			IsDefault: true,
		},
	})
	if err != nil {
		return RegisterResult{}, err
	}

	// save security questions and answers
	_, err = s.queries.CreateUserSecurityQuestions(ctx, queries.CreateUserSecurityQuestionsParams{
		UserFid:   fake_id,
		Nin:       nin,
		Question1: question1,
		Answer1:   string(hashedAnswer1),
		Question2: question2,
		Answer2:   string(hashedAnswer2),
	})
	if err != nil {
		return RegisterResult{}, err
	}

	// fetch user details using the user fake_id, because the details does not currently exist in redis,
	// it will fetch the details and save it into redis
	registeredUser, userErr := s.GetUserDetailsByFakeID(ctx, fake_id)

	// delete onboarding state from redis as it is now completed
	s.rdb.Del(ctx, redisKey)

	// TODO: this creating of user wallet should be in done in a background job or queue instead of a go routine
	// Create user wallet (best effort, non-blocking)
	if userErr == nil {
		go func() {
			bgCtx := context.Background()
			if _, walletErr := s.usersService.CreateUserWallet(bgCtx, queries.User{
				ID:              registeredUser.ID,
				FakeID:          registeredUser.FakeID,
				Email:           registeredUser.Email,
				Phone:           registeredUser.Phone,
				Username:        registeredUser.Username,
				PasswordHash:    registeredUser.PasswordHash,
				LastName:        registeredUser.LastName,
				FirstName:       registeredUser.FirstName,
				MiddleName:      registeredUser.MiddleName,
				Gender:          registeredUser.Gender,
				DateOfBirth:     registeredUser.DateOfBirth,
				CurrentCountry:  registeredUser.CurrentCountry,
				CurrentState:    registeredUser.CurrentState,
				CurrentCity:     registeredUser.CurrentCity,
				StateOfOrigin:   registeredUser.StateOfOrigin,
				CountryOfOrigin: registeredUser.CountryOfOrigin,
				AccountStatus:   registeredUser.AccountStatus,
				CreatedAt:       registeredUser.CreatedAt,
				UpdatedAt:       registeredUser.UpdatedAt,
			}); walletErr != nil {
				slog.Error("failed to create user wallet during registration", "user_id", user_id, "err", walletErr)
			}
		}()
	} else {
		slog.Error("failed to fetch user details to create wallet", "user_id", user_id, "err", userErr)
	}

	return RegisterResult{UserID: user_id, FakeID: fake_id, User: &registeredUser}, nil
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
	exists, _ := s.rdb.Exists(ctx, db.RedisUsernameFakeID+username).Result()
	return exists > 0
}

func (s *AuthService) CheckReferralCode(ctx context.Context, code string) (bool, string, int64) {
	user, err := s.queries.GetReferrerNameByCode(ctx, pgtype.Text{String: code, Valid: true})
	if err != nil {
		return false, "", 0
	}
	name := ""
	if user.FirstName.Valid {
		name += user.FirstName.String
	}
	if user.LastName.Valid {
		if name != "" {
			name += " "
		}
		name += user.LastName.String
	}
	return true, name, user.ID
}

// function: checks if the Email address already exists in redis and in the postgres db
func (s *AuthService) CheckEmail(ctx context.Context, email string) bool {
	exists, _ := s.rdb.Exists(ctx, db.RedisEmailFakeID+email).Result()
	return exists > 0
}

// function: checks if the phone exists in redis and in the postgres db
func (s *AuthService) CheckPhone(ctx context.Context, phone string) bool {
	exists, _ := s.rdb.Exists(ctx, db.RedisPhoneFakeID+phone).Result()
	return exists > 0
}

// CheckNIN function checks if the nin already exists in the database
func (s *AuthService) CheckNIN(ctx context.Context, nin string) bool {
	exists, _ := s.rdb.Exists(ctx, db.RedisNINFakeID+nin).Result()
	return exists > 0
}

type SignupResult struct {
	ID           string `json:"id"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

func (s *AuthService) Signup(ctx context.Context, email, phone, password string, countryID int16) (SignupResult, error) {
	// Check if email exists
	if email != "" && s.usersService.CheckEmail(ctx, email) {
		return SignupResult{}, errors.New("Email address already exists")
	}

	// Check if phone exists
	if s.usersService.CheckPhone(ctx, phone) {
		return SignupResult{}, errors.New("phone already exists")
	}

	// Validate phone
	country_dts, err := s.bodiesService.CheckCountry(ctx, countryID)
	if err != nil {
		return SignupResult{}, err
	}

	e164Phone, err := s.ValidatePhoneForCountry(phone, country_dts.Iso2)
	if err != nil {
		return SignupResult{}, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to hash password: %w", err)
	}

	// insert into database
	params := queries.CreateUserParams{
		Email:          pgtype.Text{String: email, Valid: email != ""},
		Phone:          pgtype.Text{String: e164Phone, Valid: true},
		PasswordHash:   string(hashedPassword),
		CurrentCountry: countryID,
		CurrentState:   37, // Default state
	}

	user_id, err := s.queries.CreateUser(ctx, params)
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
	fakeID := utils.GenerateFakeID(user_id)

	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{
		// Update user fake ID
		ID:     user_id,
		FakeID: pgtype.Int8{Int64: fakeID, Valid: true},
	})
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to update user fake ID: %w", err)
	}

	go func() {
		// Initialize basic wallet
		bgCtx := context.Background()
		registeredUser, userErr := s.GetUserDetailsByFakeID(bgCtx, fakeID)
		if userErr == nil {
			if _, walletErr := s.usersService.CreateUserWallet(bgCtx, queries.User{
				ID:              registeredUser.ID,
				FakeID:          registeredUser.FakeID,
				Email:           registeredUser.Email,
				Phone:           registeredUser.Phone,
				Username:        registeredUser.Username,
				PasswordHash:    registeredUser.PasswordHash,
				LastName:        registeredUser.LastName,
				FirstName:       registeredUser.FirstName,
				MiddleName:      registeredUser.MiddleName,
				Gender:          registeredUser.Gender,
				DateOfBirth:     registeredUser.DateOfBirth,
				CurrentCountry:  registeredUser.CurrentCountry,
				CurrentState:    registeredUser.CurrentState,
				CurrentCity:     registeredUser.CurrentCity,
				StateOfOrigin:   registeredUser.StateOfOrigin,
				CountryOfOrigin: registeredUser.CountryOfOrigin,
				AccountStatus:   registeredUser.AccountStatus,
				CreatedAt:       registeredUser.CreatedAt,
				UpdatedAt:       registeredUser.UpdatedAt,
			}); walletErr != nil {
				slog.Error("failed to create user wallet during signup", "user_id", user_id, "err", walletErr)
			}
		}
	}()

	// Generate session and tokens (same pattern as Login)
	sessionID := uuid.NewString()
	timezone, _ := time.LoadLocation(config.GetEnv("TIMEZONE", "Africa/Lagos"))
	now := time.Now().In(timezone)
	sessionData := map[string]any{
		"SessionID": sessionID,
		"FakeID":    fakeID,
		"TimeAdded": now.Format(time.RFC3339),
	}
	jsonSessionData, _ := json.Marshal(sessionData)

	// No roles assigned yet for new users
	var roleCodes []string

	accessToken, err := utils.GenerateToken(user_id, fakeID, "", roleCodes, s.jwtSecret, s.jwtAccessExp, 0)
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to generate access token: %w", err)
	}

	randStr, err := utils.GenerateRandomString()
	if err != nil {
		return SignupResult{}, fmt.Errorf("failed to generate refresh token: %w", err)
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
	if email != "" {
		// Store email and phone → fakeID mappings so login-by-email/phone works immediately
		pipe.Set(ctx, db.RedisEmailFakeID+strings.ToLower(strings.TrimSpace(email)), fakeID, 0)
	}
	if e164Phone != "" {
		pipe.Set(ctx, db.RedisPhoneFakeID+e164Phone, fakeID, 0)
	}
	if _, err = pipe.Exec(ctx); err != nil {
		return SignupResult{}, fmt.Errorf("failed to store session: %w", err)
	}

	return SignupResult{
		ID:           strconv.FormatInt(user_id, 10),
		AccessToken:  accessToken,
		RefreshToken: randStr.RandomString,
	}, nil
}

// CompleteOnboarding finalises a newly registered user's profile with all data collected during the onboarding flow.
// It updates the user row, saves NIN + username to Redis/DB, stores security questions, and sets account status to 'active'.
func (s *AuthService) CompleteOnboarding(
	ctx context.Context,
	userID int64,
	fakeID int64,
	params queries.UpdateOnboardingProfileParams,
	myReferralCode string,
	referrerUserID *int64,
) error {
	refIDVal := int64(0)
	if referrerUserID != nil {
		refIDVal = *referrerUserID
	}
	slog.Info("🚀 [AuthService.CompleteOnboarding] Started", "user_id", userID, "fake_id", fakeID, "my_referral_code", myReferralCode, "referrer_user_id", refIDVal)

	// 1. Update the users row with all onboarding fields
	slog.Info("📍 [AuthService.CompleteOnboarding] Step 1: Updating user onboarding profile in DB", "user_id", userID)
	if err := s.queries.UpdateOnboardingProfile(ctx, params); err != nil {
		slog.Error("❌ [AuthService.CompleteOnboarding] Step 1 Failed: UpdateOnboardingProfile error", "user_id", userID, "err", err)
		return fmt.Errorf("update profile: %w", err)
	}
	slog.Info("✅ [AuthService.CompleteOnboarding] Step 1 Succeeded: User onboarding profile updated", "user_id", userID)
	
	var referredByID pgtype.Int8
	if referrerUserID != nil && *referrerUserID > 0 && *referrerUserID != userID {
		referredByID = pgtype.Int8{Int64: *referrerUserID, Valid: true}
		slog.Info("🔍 [AuthService.CompleteOnboarding] Valid referrer ID detected", "referrer_user_id", *referrerUserID)
	} else if referrerUserID != nil {
		slog.Warn("⚠️ [AuthService.CompleteOnboarding] Ignored referrer ID (invalid or self-referral)", "referrer_user_id", *referrerUserID, "user_id", userID)
	} else {
		slog.Info("ℹ️ [AuthService.CompleteOnboarding] No referrer user ID provided")
	}
	
	slog.Info("📍 [AuthService.CompleteOnboarding] Step 2: Updating user's own referral code", "user_id", userID, "my_referral_code", myReferralCode)
	err := s.queries.UpdateUserReferralCode(ctx, queries.UpdateUserReferralCodeParams{
		ID:           userID,
		ReferralCode: pgtype.Text{String: myReferralCode, Valid: myReferralCode != ""},
	})
	if err != nil {
		slog.Error("❌ [AuthService.CompleteOnboarding] Step 2 Failed: UpdateUserReferralCode error", "user_id", userID, "err", err)
	} else {
		slog.Info("✅ [AuthService.CompleteOnboarding] Step 2 Succeeded: Referral code saved", "user_id", userID, "my_referral_code", myReferralCode)
	}

	if err == nil && referredByID.Valid {
		slog.Info("📍 [AuthService.CompleteOnboarding] Step 3: Updating users.referred_by_id", "user_id", userID, "referred_by_id", referredByID.Int64)
		err = s.queries.UpdateUserReferredBy(ctx, queries.UpdateUserReferredByParams{
			ID:           userID,
			ReferredByID: referredByID,
		})
		if err != nil {
			slog.Error("❌ [AuthService.CompleteOnboarding] Step 3 Failed: UpdateUserReferredBy error", "user_id", userID, "err", err)
		} else {
			slog.Info("✅ [AuthService.CompleteOnboarding] Step 3 Succeeded: ReferredBy saved on user", "user_id", userID, "referred_by_id", referredByID.Int64)
		}
	}

	if err != nil {
		slog.Error("❌ [AuthService.CompleteOnboarding] Referral profile update failed", "user_id", userID, "err", err)
	} else if referredByID.Valid {
		slog.Info("🤝 [AuthService.CompleteOnboarding] Step 4: Creating/upserting referral record in referrals table", "referrer_user_id", referredByID.Int64, "referred_user_id", userID)
		refRecord, err := s.queries.CreateReferral(ctx, queries.CreateReferralParams{
			PartyID:        pgtype.Int2{Valid: false}, // No party at signup
			ReferrerUserID: referredByID.Int64,
			ReferredUserID: userID,
			Milestone:      "SIGNED_UP",
			Status:         pgtype.Text{String: "pending", Valid: true},
		})
		if err != nil {
			slog.Error("❌ [AuthService.CompleteOnboarding] Step 4 Failed: CreateReferral error", "user_id", userID, "err", err)
		} else {
			slog.Info("✅ [AuthService.CompleteOnboarding] Step 4 Succeeded: Referral record created", "referral_id", refRecord.ID, "referrer_user_id", refRecord.ReferrerUserID, "referred_user_id", refRecord.ReferredUserID)
		}
	}
	
	// 2. Persist username, email to Redis for fast lookups
	slog.Info("📍 [AuthService.CompleteOnboarding] Step 5: Persisting registration details to Redis", "username", params.Username.String, "user_id", userID)
	if err := s.SaveSomeUserRegistrationDetails(ctx, params.Username.String, "", "", userID, fakeID); err != nil {
		slog.Error("❌ [AuthService.CompleteOnboarding] Step 5 Failed: SaveSomeUserRegistrationDetails error", "err", err)
		return fmt.Errorf("save registration details: %w", err)
	}
	slog.Info("✅ [AuthService.CompleteOnboarding] Step 5 Succeeded: Redis details saved")

	// 3. Invalidate the Redis user-info cache so the next read is fresh
	slog.Info("📍 [AuthService.CompleteOnboarding] Step 6: Invalidating cached user info", "fake_id", fakeID)
	_ = s.usersService.InvalidateCachedUserInfo(ctx, fakeID)

	// 4. Attempt to create user wallet if it wasn't successfully created during Signup
	if s.usersService != nil {
		slog.Info("📍 [AuthService.CompleteOnboarding] Step 7: Launching background wallet creation", "user_id", userID, "fake_id", fakeID)
		go func() {
			bgCtx := context.Background()
			registeredUser, userErr := s.GetUserDetailsByFakeID(bgCtx, fakeID)
			if userErr == nil {
				if _, walletErr := s.usersService.CreateUserWallet(bgCtx, queries.User{
					ID:              registeredUser.ID,
					FakeID:          registeredUser.FakeID,
					Email:           registeredUser.Email,
					Phone:           registeredUser.Phone,
					Username:        registeredUser.Username,
					PasswordHash:    registeredUser.PasswordHash,
					LastName:        registeredUser.LastName,
					FirstName:       registeredUser.FirstName,
					MiddleName:      registeredUser.MiddleName,
					Gender:          registeredUser.Gender,
					DateOfBirth:     registeredUser.DateOfBirth,
					CurrentCountry:  registeredUser.CurrentCountry,
					CurrentState:    registeredUser.CurrentState,
					CurrentCity:     registeredUser.CurrentCity,
					StateOfOrigin:   registeredUser.StateOfOrigin,
					CountryOfOrigin: registeredUser.CountryOfOrigin,
					AccountStatus:   registeredUser.AccountStatus,
					CreatedAt:       registeredUser.CreatedAt,
					UpdatedAt:       registeredUser.UpdatedAt,
				}); walletErr != nil {
					slog.Info("ℹ️ [AuthService.CompleteOnboarding] Background wallet creation result", "user_id", userID, "err", walletErr)
				} else {
					slog.Info("✅ [AuthService.CompleteOnboarding] Background wallet creation succeeded", "user_id", userID)
				}
			} else {
				slog.Error("❌ [AuthService.CompleteOnboarding] Background wallet creation failed to fetch user", "err", userErr)
			}
		}()
	}

	slog.Info("🎉 [AuthService.CompleteOnboarding] Finished successfully", "user_id", userID)
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
	if nin != "" {
		pipe.Set(ctx, db.RedisNINFakeID+nin, fakeID, db.RedisFiveYearsTTL)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return err
	}

	// save to db
	if nin != "" {
		s.queries.CreateUserNIN(ctx, queries.CreateUserNINParams{
			Nin:    nin,
			UserID: userID,
		})
	}

	return nil
}

// RegisterPhaseSignUpResult represents the structure for the response from the initial sign-up phase
type RegisterPhaseSignUpResult struct {
	ID                     string `json:"id"`
	EmailVerificationToken string `json:"emailVerificationToken,omitempty"`
}

const (
	emailOtpPrefix         = "register:email_otp:"
	emailOtpVerifiedPrefix = "register:email_otp_verified:"
	emailOtpTTL            = 10 * time.Minute
	emailOtpVerifiedTTL    = 30 * time.Minute
)

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *AuthService) emailOtpKey(email string) string {
	return emailOtpPrefix + normalizeEmail(email)
}

func (s *AuthService) emailOtpVerifiedKey(email string) string {
	return emailOtpVerifiedPrefix + normalizeEmail(email)
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

type EmailOTPResult struct {
	Message                string `json:"message"`
	EmailVerificationToken string `json:"emailVerificationToken,omitempty"`
	ExpiresInSeconds       int    `json:"expiresInSeconds,omitempty"`
}

func (s *AuthService) SendSignupEmailOTP(ctx context.Context, email string) (EmailOTPResult, error) {
	email = normalizeEmail(email)
	if email == "" {
		return EmailOTPResult{}, errors.New("email is required")
	}
	if s.usersService.CheckEmail(ctx, email) {
		return EmailOTPResult{}, errors.New("Email address already exists")
	}

	otp, hashedOTP, err := utils.GenerateOTP()
	if err != nil {
		return EmailOTPResult{}, err
	}
	if err := s.sendEmailOTP(ctx, email, otp); err != nil {
		return EmailOTPResult{}, err
	}

	otpData, _ := json.Marshal(map[string]string{"hash": hashedOTP})
	if err := s.rdb.Set(ctx, s.emailOtpKey(email), otpData, emailOtpTTL).Err(); err != nil {
		return EmailOTPResult{}, err
	}

	return EmailOTPResult{
		Message:          "OTP sent successfully",
		ExpiresInSeconds: int(emailOtpTTL.Seconds()),
	}, nil
}

// SendForgotPasswordEmailOTP sends a one-time code for password reset.
// Unlike SendSignupEmailOTP, it requires the email to already exist.
func (s *AuthService) SendForgotPasswordEmailOTP(ctx context.Context, email string) (EmailOTPResult, error) {
	email = normalizeEmail(email)
	if email == "" {
		return EmailOTPResult{}, errors.New("email is required")
	}
	if !s.usersService.CheckEmail(ctx, email) {
		return EmailOTPResult{}, errors.New("no account found with that email address")
	}

	otp, hashedOTP, err := utils.GenerateOTP()
	if err != nil {
		return EmailOTPResult{}, err
	}
	if err := s.sendEmailOTP(ctx, email, otp); err != nil {
		return EmailOTPResult{}, err
	}

	otpData, _ := json.Marshal(map[string]string{"hash": hashedOTP})
	if err := s.rdb.Set(ctx, s.emailOtpKey(email), otpData, emailOtpTTL).Err(); err != nil {
		return EmailOTPResult{}, err
	}

	return EmailOTPResult{
		Message:          "OTP sent successfully",
		ExpiresInSeconds: int(emailOtpTTL.Seconds()),
	}, nil
}

func (s *AuthService) VerifySignupEmailOTP(ctx context.Context, email, otp string) (EmailOTPResult, error) {
	email = normalizeEmail(email)
	if email == "" {
		return EmailOTPResult{}, errors.New("email is required")
	}

	raw, err := s.rdb.Get(ctx, s.emailOtpKey(email)).Result()
	if err != nil {
		return EmailOTPResult{}, errors.New("otp expired or not found")
	}

	var stored struct {
		Hash string `json:"hash"`
	}
	if err := json.Unmarshal([]byte(raw), &stored); err != nil {
		return EmailOTPResult{}, errors.New("invalid otp state")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(stored.Hash), []byte(strings.TrimSpace(otp))); err != nil {
		return EmailOTPResult{}, errors.New("invalid otp")
	}

	verificationToken := uuid.NewString()
	if err := s.rdb.Set(ctx, s.emailOtpVerifiedKey(email), verificationToken, emailOtpVerifiedTTL).Err(); err != nil {
		return EmailOTPResult{}, err
	}
	_ = s.rdb.Del(ctx, s.emailOtpKey(email)).Err()

	return EmailOTPResult{
		Message:                "Email verified successfully",
		EmailVerificationToken: verificationToken,
		ExpiresInSeconds:       int(emailOtpVerifiedTTL.Seconds()),
	}, nil
}

func (s *AuthService) VerifySignupEmailToken(ctx context.Context, email, token string) error {
	email = normalizeEmail(email)
	if email == "" || token == "" {
		return errors.New("email verification is required")
	}

	stored, err := s.rdb.Get(ctx, s.emailOtpVerifiedKey(email)).Result()
	if err != nil || stored != token {
		return errors.New("email verification expired or invalid")
	}
	return nil
}

func (s *AuthService) RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16, emailVerificationToken string) (RegisterPhaseSignUpResult, error) {
	// email checks
	email = normalizeEmail(email)
	if email == "" {
		return RegisterPhaseSignUpResult{}, errors.New("email is required")
	}
	if err := s.VerifySignupEmailToken(ctx, email, emailVerificationToken); err != nil {
		return RegisterPhaseSignUpResult{}, err
	}
	if s.usersService.CheckEmail(ctx, email) {
		return RegisterPhaseSignUpResult{}, errors.New("Email address already exists")
	}

	// country check
	country_dts, err := s.bodiesService.CheckCountry(ctx, countryID)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// check phone country validation
	e164, err := utils.ValidatePhoneForCountry(phone, country_dts.Iso2)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// phone checks
	if s.usersService.CheckPhone(ctx, e164) {
		return RegisterPhaseSignUpResult{}, errors.New("phone already exists")
	}

	// checks to see if this user already started onboarding
	redisKey := db.RedisRegisterOnboarding + e164
	onboardingJSON, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var onboarding RedisOnboardingData
		if err := json.Unmarshal([]byte(onboardingJSON), &onboarding); err == nil {
			// if completed is yes, return error
			if onboarding.Completed == "yes" {
				return RegisterPhaseSignUpResult{}, errors.New("User is already registered")
			}

			// update the email address in-case the email address has changed
			if email != "" && email != onboarding.Email {
				onboarding.Email = email
			}

			updatedJSON, _ := json.Marshal(onboarding)
			s.rdb.Set(ctx, redisKey, updatedJSON, 48*time.Hour)

			return RegisterPhaseSignUpResult{ID: onboarding.ID}, nil
		}
	}

	// prepare data to be saved to redis
	newOnboarding := RedisOnboardingData{
		ID:        uuid.NewString(),
		Phone:     phone,
		E164:      e164,
		Email:     email,
		CountryID: countryID,
		Completed: "no",
	}
	newJSON, err := json.Marshal(newOnboarding)
	if err != nil {
		return RegisterPhaseSignUpResult{}, err
	}

	// save the onboarding info to redis
	s.rdb.Set(ctx, redisKey, newJSON, 48*time.Hour)
	return RegisterPhaseSignUpResult{ID: newOnboarding.ID}, nil
}

// GetUserDetailsByFakeID fetches all user details using the user fake_id.
func (s *AuthService) GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error) {
	return s.usersService.GetUserByFakeID(ctx, fakeID)
}

type VerifySecurityQuestionsResult struct {
	ChangePasswordID string `json:"change_password_id"`
	UserFID          int64  `json:"user_fid"`
}

func (s *AuthService) VerifySecurityQuestions(ctx context.Context, nin string, q1 int16, a1 string, q2 int16, a2 string) (VerifySecurityQuestionsResult, error) {
	// Check if the user exists in Redis using the nin
	userFidStr := s.rdb.Get(ctx, db.RedisNINFakeID+nin).Val()
	if userFidStr == "" {
		return VerifySecurityQuestionsResult{}, errors.New("invalid nin or security questions not found")
	}

	// check if there is already an existing request from db.RedisChangePassword
	if s.rdb.Exists(ctx, db.RedisChangePassword+userFidStr).Val() > 0 {
		return VerifySecurityQuestionsResult{}, errors.New("you already have an existing request for password change, please wait for 10mins and try again")
	}

	secQ, err := s.queries.GetUserSecurityQuestionsByNIN(ctx, nin)
	if err != nil {
		return VerifySecurityQuestionsResult{}, errors.New("invalid nin or security questions not found")
	}

	// Verify answers
	if secQ.Question1 != q1 || secQ.Question2 != q2 {
		return VerifySecurityQuestionsResult{}, errors.New("incorrect security questions")
	}

	err = bcrypt.CompareHashAndPassword([]byte(secQ.Answer1), []byte(a1))
	if err != nil {
		return VerifySecurityQuestionsResult{}, errors.New("incorrect answer for question 1")
	}

	err = bcrypt.CompareHashAndPassword([]byte(secQ.Answer2), []byte(a2))
	if err != nil {
		return VerifySecurityQuestionsResult{}, errors.New("incorrect answer for question 2")
	}

	// Generate a unique ID
	changePasswordID := uuid.NewString()

	// Save user_fid in Redis with an expiry of 5 minutes
	redisKey := db.RedisChangePassword + userFidStr
	err = s.rdb.Set(ctx, redisKey, changePasswordID, 5*time.Minute).Err()
	if err != nil {
		return VerifySecurityQuestionsResult{}, fmt.Errorf("failed to save state in redis: %w", err)
	}

	return VerifySecurityQuestionsResult{
		ChangePasswordID: changePasswordID,
		UserFID:          secQ.UserFid,
	}, nil
}

// ChangePasswordByEmail resets a user's password using their email address
func (s *AuthService) ChangePasswordByEmail(ctx context.Context, email, newPassword string) error {
	email = strings.TrimSpace(strings.ToLower(email))

	// 1. Resolve fakeID from Redis via email (same as Login flow)
	fakeIDStr := s.rdb.Get(ctx, db.RedisEmailFakeID+email).Val()
	if fakeIDStr == "" {
		return errors.New("no account found with that email address")
	}

	fakeID, err := strconv.ParseInt(fakeIDStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid account reference: %w", err)
	}

	// 2. Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// 3. Update password in DB
	err = s.queries.UpdateUserPasswordByFid(ctx, queries.UpdateUserPasswordByFidParams{
		FakeID:       pgtype.Int8{Int64: fakeID, Valid: true},
		PasswordHash: string(hashedPassword),
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// 4. Invalidate all active sessions
	userRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID)
	sessions, err := s.rdb.SMembers(ctx, userRedisKey).Result()
	if err == nil && len(sessions) > 0 {
		pipe := s.rdb.TxPipeline()
		for _, sessionID := range sessions {
			redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
			tokens, _ := s.rdb.SMembers(ctx, redisSessionKey).Result()
			for _, token := range tokens {
				pipe.Del(ctx, fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, token))
			}
			pipe.Del(ctx, redisSessionKey)
		}
		pipe.Del(ctx, userRedisKey)
		_, _ = pipe.Exec(ctx)
	}

	// 5. Update cached user info
	_ = s.usersService.InvalidateCachedUserInfo(ctx, fakeID)

	return nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, changePasswordID string, userFid int64, password string) error {
	redisKey := fmt.Sprintf("%s%d", db.RedisChangePassword, userFid)

	// Check if token exists in Redis
	storedID, err := s.rdb.Get(ctx, redisKey).Result()
	if err != nil || storedID != changePasswordID {
		return errors.New("invalid or expired reset token")
	}

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update the user's password
	err = s.queries.UpdateUserPasswordByFid(ctx, queries.UpdateUserPasswordByFidParams{
		FakeID:       pgtype.Int8{Int64: userFid, Valid: true},
		PasswordHash: string(hashedPassword),
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Delete the redis key upon success
	s.rdb.Del(ctx, redisKey)

	// Invalidate all active user sessions and refresh tokens
	// Get all user sessions
	userRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, userFid)
	sessions, err := s.rdb.SMembers(ctx, userRedisKey).Result()
	if err == nil && len(sessions) > 0 {
		// Create a pipeline to execute all delete operations atomically
		pipe := s.rdb.TxPipeline()

		// Iterate over each session
		for _, sessionID := range sessions {
			// Get all tokens for the session
			redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
			tokens, _ := s.rdb.SMembers(ctx, redisSessionKey).Result()

			// Delete each token
			for _, token := range tokens {
				redisTokenKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, token)
				pipe.Del(ctx, redisTokenKey)
			}

			// Delete the session set itself
			pipe.Del(ctx, redisSessionKey)
		}

		// Delete the user sessions set
		pipe.Del(ctx, userRedisKey)

		// Execute the pipeline
		_, _ = pipe.Exec(ctx)
	}

	// Invalidate cached user info
	_ = s.usersService.InvalidateCachedUserInfo(ctx, userFid)
	return nil
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
	if email != "" && s.usersService.CheckEmail(ctx, email) {
		return RegisterResult{}, errors.New("Email address already exists")
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

type SeedUserRequest struct {
	ID             int64   `json:"id"`
	FakeID         int64   `json:"fake_id"`
	Email          string  `json:"email"`
	Avatar         string  `json:"avatar"`
	Phone          *string `json:"phone"`
	Username       *string `json:"username"`
	Password       string  `json:"password"`
	LastName       string  `json:"last_name"`
	FirstName      string  `json:"first_name"`
	MiddleName     *string `json:"middle_name"`
	Gender         string  `json:"gender"`
	DateOfBirth    string  `json:"date_of_birth"`
	Religion       string  `json:"religion"`
	CurrentCountry int16   `json:"current_country"`
	CurrentState   int16   `json:"current_state"`
	CurrentLga     *int32  `json:"current_lga"`
	CurrentCity    *int32  `json:"current_city"`
	StateOfOrigin  *int16  `json:"state_of_origin"`
	MaritalStatus  string  `json:"marital_status"`
	EducationLevel string  `json:"education_level"`
	HomeAddress    string  `json:"home_address"`
	OccupationID   *int16  `json:"occupation_id"`
}

func (s *AuthService) SeedUsers(ctx context.Context, users []SeedUserRequest) (string, error) {
	for _, u := range users {
		// check if email already exit, if yes, we can skip this user onto the next
		if s.CheckEmail(ctx, u.Email) {
			continue
		}

		// Hash password
		hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return "", err
		}

		// parse date of birth
		dob, err := time.Parse(time.DateOnly, u.DateOfBirth)
		if err != nil {
			return "", fmt.Errorf("invalid dob format for user %s: %w", u.Email, err)
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
				return "", fmt.Errorf("failed to fetch country for user %s: %w", u.Email, err)
			}

			iso2 = country.Iso2
			phonecode = country.Phonecode
			formattedPhone, err = s.ValidatePhoneForCountry(rawPhoneInput, iso2)
			if err != nil {
				return "", fmt.Errorf("invalid phone for user %s: %w", u.Email, err)
			}
			phoneVal = pgtype.Text{String: formattedPhone, Valid: true}
		}

		// Generate unique referral code (e.g. DANIEL-88)
		firstNameUpper := strings.ToUpper(strings.TrimSpace(u.FirstName))
		if firstNameUpper == "" {
			firstNameUpper = "USER"
		}
		n, _ := cryptorand.Int(cryptorand.Reader, big.NewInt(900))
		suffix := n.Int64() + 100 // 100-999
		myReferralCode := fmt.Sprintf("%s-%d", firstNameUpper, suffix)

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
			VotersCardImage: pgtype.Text{},
			AccountStatus:   pgtype.Text{},
			PartyID:         pgtype.Int2{},
			IsPolitician:    pgtype.Bool{Bool: false, Valid: true},
			IsVerified:      pgtype.Bool{Bool: false, Valid: true},
		}

		id, err := s.queries.SeedUser(ctx, params)
		if err != nil {
			return "", fmt.Errorf("failed to seed user %s: %w", u.Email, err)
		}

		err = s.queries.UpdateUserReferralCode(ctx, queries.UpdateUserReferralCodeParams{
			ID:           id,
			ReferralCode: pgtype.Text{String: myReferralCode, Valid: true},
		})
		if err != nil {
			slog.Error("failed to seed user referral profile", "user_id", id, "err", err)
		}

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
			return "", fmt.Errorf("failed to seed user profile for %s: %w", u.Email, err)
		}

		_, err = s.queries.CreateUserVerification(ctx, queries.CreateUserVerificationParams{
			UserID:             id,
			NinVerified:        pgtype.Bool{Bool: false, Valid: true},
			PhoneVerified:      pgtype.Bool{Bool: false, Valid: true},
			EmailVerified:      pgtype.Bool{Bool: false, Valid: true},
			VotersCardVerified: pgtype.Bool{Bool: false, Valid: true},
		})
		if err != nil {
			return "", fmt.Errorf("failed to create user verification for %s: %w", u.Email, err)
		}

		// Save details to Redis cache
		fakeID := u.FakeID
		if fakeID == 0 {
			fakeID = utils.GenerateFakeID(id)
			_ = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: id, FakeID: pgtype.Int8{Int64: fakeID, Valid: true}})
		}

		emailStr := emailVal.String
		usernameStr := usernameVal.String
		_ = s.SaveSomeUserRegistrationDetails(ctx, usernameStr, emailStr, "", id, fakeID)

		// save the user phone number
		if formattedPhone != "" {
			_ = s.usersService.UpdateUserPhoneNumbers(ctx, id, fakeID, []usersservice.PhonePayload{
				{
					Phone:     formattedPhone,
					RawInput:  rawPhoneInput,
					Phonecode: phonecode,
					IsDefault: true,
				},
			})
		}

		// get and save the user details to cache in redis
		_, _ = s.GetUserDetailsByFakeID(ctx, fakeID)

	}
	return "Users seeded successfully", nil
}

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
	"math/rand"
	"regexp"
	"strconv"
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

type UserWalletService interface {
	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
}

type PartyService interface {
	GetPartyBasicInfo(ctx context.Context, partyID int64) *queries.GetPartyBasicInfoRow
}

type AuthService struct {
	queries          *queries.Queries
	rdb              *redis.Client
	messagingService MessagingService
	walletService    UserWalletService
	partyService     PartyService
	jwtSecret        string
	jwtAccessExp     time.Duration
	jwtRefreshExp    time.Duration
}

func NewAuthService(
	q *queries.Queries,
	rdb *redis.Client,
	messagingService MessagingService,
	walletService UserWalletService,
	partyService PartyService,
	jwtSecret string,
	jwtAccessExp time.Duration,
	jwtRefreshExp time.Duration,
) *AuthService {
	return &AuthService{
		queries:          q,
		rdb:              rdb,
		messagingService: messagingService,
		walletService:    walletService,
		partyService:     partyService,
		jwtSecret:        jwtSecret,
		jwtAccessExp:     jwtAccessExp,
		jwtRefreshExp:    jwtRefreshExp,
	}
}

type LoginUser struct {
	ID                int64                         `json:"id"`
	FakeID            int64                         `json:"fake_id"`
	Email             string                        `json:"email"`
	Username          string                        `json:"username"`
	FirstName         string                        `json:"first_name"`
	LastName          string                        `json:"last_name"`
	MiddleName        string                        `json:"middle_name"`
	Gender            string                        `json:"gender"`
	DateOfBirth       string                        `json:"date_of_birth"`
	Avatar            string                        `json:"avatar"`
	Phone             string                        `json:"phone"`
	Roles             []string                      `json:"roles"`
	AccountStatus     string                        `json:"account_status"`
	PartyID           int64                         `json:"party_id,omitempty"`
	PollingUnitID     int64                         `json:"polling_unit_id,omitempty"`
	CurrentCountry    int16                         `json:"current_country"`
	CurrentState      int16                         `json:"current_state"`
	CurrentLga        int32                         `json:"current_lga"`
	CurrentWard       int32                         `json:"current_ward"`
	CurrentCity       int32                         `json:"current_city"`
	Address           string                        `json:"address"`
	WhatsappPhone     string                        `json:"whatsapp_phone"`
	DataPhone         string                        `json:"data_phone"`
	EducationalStatus string                        `json:"educational_status"`
	HighestDegree     string                        `json:"highest_degree"`
	GraduationYear    string                        `json:"graduation_year"`
	SchoolName        string                        `json:"school_name"`
	BankAccountNumber string                        `json:"bank_account_number"`
	BankCode          string                        `json:"bank_code"`
	VotersCardImage   string                        `json:"voters_card_image"`
	Vin               string                        `json:"vin"`
	Party             *queries.GetPartyBasicInfoRow `json:"party,omitempty"`
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

	var user queries.User
	var err error
	var fakeIDStr string
	var fakeID int64

	switch identifierType {
	case "email":
		identifier = strings.TrimSpace(strings.ToLower(identifier))
		fakeIDStr = s.rdb.Get(ctx, db.RedisEmailFakeID+identifier).Val()
		if fakeIDStr == "" {
			dbUser, err := s.queries.GetUserByEmail(ctx, pgtype.Text{String: identifier, Valid: true})
			if err == nil && dbUser.FakeID.Valid {
				fakeIDStr = strconv.FormatInt(dbUser.FakeID.Int64, 10)
				_ = s.SaveSomeUserRegistrationDetails(ctx, dbUser.Username.String, dbUser.Email.String, dbUser.Phone.String, "", dbUser.ID, dbUser.FakeID.Int64)
			} else {
				return LoginResult{}, errors.New("invalid email, this record not found")
			}
		}

	case "username":
		fakeIDStr = s.rdb.Get(ctx, db.RedisUsernameFakeID+identifier).Val()
		if fakeIDStr == "" {
			return LoginResult{}, errors.New("invalid username or password")
		}

	case "phone":
		// validate iso2
		if iso2 == "" {
			return LoginResult{}, errors.New("iso2 is required")
		}

		// validate phone number using the provided iso2
		_, err = s.ValidatePhoneForCountry(identifier, iso2)
		if err != nil {
			return LoginResult{}, err
		}

		fakeIDStr = s.rdb.Get(ctx, db.RedisPhoneFakeID+identifier).Val()
		if fakeIDStr == "" {
			return LoginResult{}, errors.New("invalid phone number or password")
		}
	default:
		return LoginResult{}, errors.New("invalid identifier type")
	}

	// fetch the user details using the fakeID
	fakeID, _ = strconv.ParseInt(fakeIDStr, 10, 64)
	user, err = s.GetUserDetailsByFakeID(ctx, fakeID)
	if err != nil {
		return LoginResult{}, errors.New("invalid login details provided")
	}

	// Fetch the user's assigned roles from the database
	userRoles, err := s.GetUserRoles(ctx, user.ID)
	if err != nil {
		return LoginResult{}, errors.New("failed to fetch user roles")
	}

	var userRoleCodes []string
	// Extract just the role codes (e.g., "admin", "user") into a simple string slice for easier comparison
	for _, ur := range userRoles {
		userRoleCodes = append(userRoleCodes, ur.Code)
	}
	fmt.Println("userRoleCodes", userRoleCodes)

	// Role Validation
	if len(allowedRoles) > 0 {
		// Check if the user has at least one of the roles required to perform this action (allowedRoles)
		hasRole := false
		for _, allowedRole := range allowedRoles {
			for _, code := range userRoleCodes {
				fmt.Println("allowedRole", allowedRole)
				fmt.Println("code", code)
				if code == allowedRole {
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

	//  Check if password matches
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return LoginResult{}, errors.New("invalid email, username, phone or password")
	}

	// Verify account status
	status := user.AccountStatus.String
	if status == "suspended" || status == "banned" || status == "deleted" || status == "inactive" {
		return LoginResult{}, fmt.Errorf("your account is %s", status)
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

	var partyID int64
	if user.PartyID.Valid {
		partyID = user.PartyID.Int64
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

	var partyObj *queries.GetPartyBasicInfoRow
	if partyID != 0 {
		partyObj = s.partyService.GetPartyBasicInfo(ctx, partyID)
	}

	return LoginResult{
		AccessToken:  accessToken,
		RefreshToken: randStr.RandomString,
		User: LoginUser{
			ID:                user.ID,
			FakeID:            user.FakeID.Int64,
			Email:             user.Email.String,
			Username:          user.Username.String,
			FirstName:         user.FirstName.String,
			LastName:          user.LastName.String,
			MiddleName:        user.MiddleName.String,
			Gender:            user.Gender.String,
			Avatar:            user.Avatar.String,
			Phone:             user.Phone.String,
			Roles:             userRoleCodes,
			AccountStatus:     user.AccountStatus.String,
			PartyID:           partyID,
			PollingUnitID:     user.PollingUnitID.Int64,
			CurrentCountry:    user.CurrentCountry,
			CurrentState:      user.CurrentState,
			CurrentLga:        user.CurrentLga.Int32,
			CurrentWard:       user.CurrentWard.Int32,
			CurrentCity:       user.CurrentCity.Int32,
			Address:           user.Address.String,
			WhatsappPhone:     user.WhatsappPhone.String,
			DataPhone:         user.DataPhone.String,
			EducationalStatus: user.EducationalStatus.String,
			HighestDegree:     user.HighestDegree.String,
			GraduationYear:    user.GraduationYear.String,
			SchoolName:        user.SchoolName.String,
			BankAccountNumber: user.BankAccountNumber.String,
			BankCode:          user.BankCode.String,
			VotersCardImage:   user.VotersCardImage.String,
			Vin:               user.Vin.String,
			Party:             partyObj,
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
	// init logger
	log := logger.FromContext(ctx).With("component", logger.ComponentAuthService)

	// hash the refresh token
	hashed := utils.HashToken(refreshToken)
	pipe := s.rdb.TxPipeline()

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
	redisSessionKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)

	// get the user details using the userFid
	user, err := s.GetUserDetailsByFakeID(ctx, userFid)
	if err != nil {
		return RefreshResult{}, errors.New("user not found")
	}

	// destructure some of the user info
	accountStatus := user.AccountStatus.String
	username := user.Username.String
	var partyObj *queries.GetPartyBasicInfoRow
	if user.PartyID.Valid {
		partyObj = s.partyService.GetPartyBasicInfo(ctx, user.PartyID.Int64)
	}
	var userPartyID int64
	if user.PartyID.Valid {
		userPartyID = user.PartyID.Int64
	}
	userRoles, _ := s.queries.GetUserRoles(ctx, user.ID)
	var userRoleCodes []string
	for _, ur := range userRoles {
		userRoleCodes = append(userRoleCodes, ur.Code)
	}
	userDetails := LoginUser{
		ID:                user.ID,
		FakeID:            user.FakeID.Int64,
		Email:             user.Email.String,
		Username:          user.Username.String,
		FirstName:         user.FirstName.String,
		LastName:          user.LastName.String,
		MiddleName:        user.MiddleName.String,
		Gender:            user.Gender.String,
		Avatar:            user.Avatar.String,
		Phone:             user.Phone.String,
		Roles:             userRoleCodes,
		AccountStatus:     user.AccountStatus.String,
		PartyID:           userPartyID,
		PollingUnitID:     user.PollingUnitID.Int64,
		CurrentCountry:    user.CurrentCountry,
		CurrentState:      user.CurrentState,
		CurrentLga:        user.CurrentLga.Int32,
		CurrentWard:       user.CurrentWard.Int32,
		CurrentCity:       user.CurrentCity.Int32,
		Address:           user.Address.String,
		WhatsappPhone:     user.WhatsappPhone.String,
		DataPhone:         user.DataPhone.String,
		EducationalStatus: user.EducationalStatus.String,
		HighestDegree:     user.HighestDegree.String,
		GraduationYear:    user.GraduationYear.String,
		SchoolName:        user.SchoolName.String,
		BankAccountNumber: user.BankAccountNumber.String,
		BankCode:          user.BankCode.String,
		VotersCardImage:   user.VotersCardImage.String,
		Vin:               user.Vin.String,
		Party:             partyObj,
	}

	// Parse the RFC3339 string back into a time.Time
	parsedTime, err := time.Parse(time.RFC3339, timeAdded)
	if err != nil {
		return RefreshResult{}, fmt.Errorf("error parsing time: %v", err)
	}

	// Compare with current time
	if time.Since(parsedTime) < 10*time.Minute {
		// fmt.Println("TimeAdded is less than 10 minutes ago", parsedTime)
		return RefreshResult{
			User: userDetails,
		}, nil
	}

	// check if generation of accessToken and refreshToken is locked
	lockKey := fmt.Sprintf("%s%d", db.RedisJwtUserLoginLocked, userFid)
	isLocked, _ := s.rdb.Get(ctx, lockKey).Result()
	if isLocked == "yes" {
		return RefreshResult{}, errors.New("token generation in progress")
	}

	// lock generation of new keys
	result, err := s.rdb.SetArgs(ctx, lockKey, "yes", redis.SetArgs{
		TTL:  10 * time.Second,
		Mode: "NX",
	}).Result()
	if err != nil {
		return RefreshResult{}, err
	}
	if result != "OK" {
		return RefreshResult{}, errors.New("token generation in progress")
	}

	// unlock generation of new keys after 10 seconds
	defer s.rdb.Del(ctx, lockKey)

	// delete old token (rotation)
	s.rdb.Del(ctx, RedisTokenKey)            // deletes the token
	s.rdb.SRem(ctx, redisSessionKey, hashed) // deletes the token from the list of session tokens

	// Verify account status
	if accountStatus == "suspended" || accountStatus == "banned" || accountStatus == "deleted" || accountStatus == "inactive" {
		return RefreshResult{}, errors.New("your account is not active")
	}

	// update the time of this new accessToken generated
	loc, _ := time.LoadLocation(config.GetEnv("TIMEZONE", "Africa/Lagos"))
	now := time.Now().In(loc)
	sessionData["TimeAdded"] = now.Format(time.RFC3339)

	//convert to json
	jsonSessionData, _ := json.Marshal(sessionData)

	var partyID int64
	if user.PartyID.Valid {
		partyID = user.PartyID.Int64
	}

	// Generate a new Access Token
	newAccessToken, err := utils.GenerateToken(user.ID, userFid, username, userRoleCodes, s.jwtSecret, s.jwtAccessExp, partyID)
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
	pipe.Set(ctx, newRedisTokenKey, jsonSessionData, s.jwtRefreshExp)

	// add the new refresh token to the session SET
	pipe.SAdd(ctx, redisSessionKey, refresh.HashedToken)
	pipe.Expire(ctx, redisSessionKey, s.jwtRefreshExp)

	// execute the pipeline
	_, err = pipe.Exec(ctx)
	if err != nil {
		log.Error(logger.EventRedisPipelineFailed, "error", err, "operation", "refresh_token_storage")
		return RefreshResult{}, fmt.Errorf("failed to execute redis pipeline: %w", err)
	}

	// logs token refreshed successfully
	log.Info(logger.EventTokenRefreshSuccess, "user_id", userFid)

	// set the response data
	response := RefreshResult{
		AccessToken:  newAccessToken,
		RefreshToken: refresh.RandomString,
		User:         userDetails,
	}

	return response, nil
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
	Email     string `json:"email"`
	CountryID int16  `json:"country_id"`
	Completed string `json:"completed"`
}

type RegisterResult struct {
	UserID int64
	FakeID int64
}

func (s *AuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID string, question1 int16, answer1 string, question2 int16, answer2 string) (RegisterResult, error) {
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

	// check if onboarding details exist in redis
	redisKey := db.RedisRegisterOnboarding + params.Phone.String
	onboardingJSON, err := s.rdb.Get(ctx, redisKey).Result()
	if err != nil {
		return RegisterResult{}, errors.New("onboarding details not found")
	}

	var onboardingDts RedisOnboardingData
	if err := json.Unmarshal([]byte(onboardingJSON), &onboardingDts); err != nil {
		return RegisterResult{}, errors.New("invalid onboarding data format")
	}

	if onboardingDts.ID != onboardingID {
		return RegisterResult{}, errors.New("invalid onboarding details")
	}
	if onboardingDts.Completed == "yes" {
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
	phone_exist := s.CheckPhone(ctx, params.Phone.String)
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
	_, err = s.ValidatePhoneForCountry(params.Phone.String, country_dts.Iso2)
	if err != nil {
		return RegisterResult{}, err
	}

	// Check date of birth: Ensure the user is at least 18 years old
	today := time.Now().UTC()
	if today.Sub(params.DateOfBirth.Time) < 18*365*24*time.Hour {
		return RegisterResult{}, errors.New("you must be at least 18 years old")
	}

	// Auto-generate unique referral code format: {FIRST_NAME}{2-digit-suffix}
	baseName := strings.ToUpper(strings.TrimSpace(params.FirstName.String))
	reg, _ := regexp.Compile("[^a-zA-Z0-9]+")
	baseName = reg.ReplaceAllString(baseName, "")
	if baseName == "" {
		baseName = "USER"
	}
	// Cap base name length to avoid excessively long codes
	if len(baseName) > 10 {
		baseName = baseName[:10]
	}

	rand.Seed(time.Now().UnixNano())
	var refCode string
	for i := 0; i < 50; i++ {
		// Use a random number up to 999 to allow more space if collisions occur
		suffix := fmt.Sprintf("%02d", rand.Intn(100))
		if i > 10 {
			suffix = fmt.Sprintf("%04d", rand.Intn(10000))
		}
		refCode = baseName + suffix
		exists, err := s.queries.CheckReferralCodeExists(ctx, pgtype.Text{String: refCode, Valid: true})
		if err != nil {
			return RegisterResult{}, err
		}
		if !exists {
			break
		}
	}
	params.ReferralCode = pgtype.Text{String: refCode, Valid: true}

	// creates the user's new account in our database
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

	// save some of the user details to our db & also to redis(using pipeline)
	err = s.SaveSomeUserRegistrationDetails(ctx, username, email, params.Phone.String, nin, user_id, fake_id)
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
	_, _ = s.GetUserDetailsByFakeID(ctx, fake_id)

	// delete onboarding state from redis as it is now completed
	s.rdb.Del(ctx, redisKey)

	// Create user wallet (best effort, non-blocking)
	if s.walletService != nil {
		if registeredUser, err := s.queries.GetUserByID(context.Background(), user_id); err == nil {
			go func() {
				bgCtx := context.Background()
				if _, walletErr := s.walletService.CreateUserWallet(bgCtx, registeredUser); walletErr != nil {
					slog.Error("failed to create user wallet during registration", "user_id", user_id, "err", walletErr)
				}
			}()
		}
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

// function: checks if the email already exists in redis and in the postgres db
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
	redisCountryKey := fmt.Sprintf("%s%d", db.RedisEachCountry, country_id)

	// attempt to get country details from redis
	country_data, err := s.rdb.Get(ctx, redisCountryKey).Result()
	if err == nil {
		var country_dts queries.GetCountryByIDRow
		json.Unmarshal([]byte(country_data), &country_dts)
		return country_dts, nil
	}

	// get country details from db
	country_dts, _ := s.queries.GetCountryByID(ctx, country_id)
	if country_dts.ID > 0 {
		s.rdb.Set(ctx, redisCountryKey, country_data, 0)
		return country_dts, nil
	}

	return queries.GetCountryByIDRow{}, errors.New("invalid country ID")
}

// function: check if the state is valid
func (s *AuthService) CheckState(ctx context.Context, country_id, state_id int16) (bool, error) {
	redisStateKey := fmt.Sprintf("%s%d", db.RedisEachState, state_id)

	// get state details from redis
	state_data, err := s.rdb.Get(ctx, redisStateKey).Result()
	if err == nil {
		var state_dts queries.GetStateByIDRow
		json.Unmarshal([]byte(state_data), &state_dts)
		return state_dts.ID > 0, nil
	}

	// get state details from db
	state_dts, _ := s.queries.GetStateByID(ctx, queries.GetStateByIDParams{
		ID:        state_id,
		CountryID: country_id,
	})
	if state_dts.ID > 0 {
		// save to redis
		state_data, _ := json.Marshal(state_dts)
		s.rdb.Set(ctx, redisStateKey, state_data, 5*365*24*time.Hour) // expires in 5years

		return true, nil
	}
	return false, fmt.Errorf("invalid state ID")
}

// function: check if the city is valid
func (s *AuthService) CheckCity(ctx context.Context, state_id int16, city_id int32) (bool, error) {
	redisCityKey := fmt.Sprintf("%s%d", db.RedisEachCity, city_id)

	// get city details from redis
	city_data, err := s.rdb.Get(ctx, redisCityKey).Result()
	if err == nil {
		var city_dts queries.GetCityByIDRow
		json.Unmarshal([]byte(city_data), &city_dts)
		return city_dts.ID > 0, nil
	}

	// get city details from db
	city_dts, _ := s.queries.GetCityByID(ctx, queries.GetCityByIDParams{
		ID:      city_id,
		StateID: state_id,
	})
	if city_dts.ID > 0 {
		// save to redis
		city_data, _ := json.Marshal(city_dts)
		s.rdb.Set(ctx, redisCityKey, city_data, 5*365*24*time.Hour) // expires in 5years

		return true, nil
	}

	return false, fmt.Errorf("invalid city ID")
}

// SaveSomeUserRegistrationDetails saves the user's registration details (username, email, phone, nin) to Redis & DB
func (s *AuthService) SaveSomeUserRegistrationDetails(ctx context.Context, username, email, phone, nin string, userID int64, fakeID int64) error {
	// batch redis commands
	pipe := s.rdb.TxPipeline()

	if username != "" {
		pipe.Set(ctx, db.RedisUsernameFakeID+username, fakeID, 0)
	}
	if email != "" {
		pipe.Set(ctx, db.RedisEmailFakeID+email, fakeID, 0)
	}
	if phone != "" {
		pipe.Set(ctx, db.RedisPhoneFakeID+phone, fakeID, 0)
	}
	if nin != "" {
		pipe.Set(ctx, db.RedisNINFakeID+nin, fakeID, 0)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return err
	}

	// save to db
	if phone != "" {
		s.queries.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
			Phone:  phone,
			UserID: userID,
		})
	}

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
	ID string `json:"id"`
}

func (s *AuthService) RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16) (RegisterPhaseSignUpResult, error) {
	// email checks
	if email != "" {
		email = strings.TrimSpace(strings.ToLower(email))
		if s.CheckEmail(ctx, email) {
			return RegisterPhaseSignUpResult{}, errors.New("email already exists")
		}
	}

	// phone checks
	if s.CheckPhone(ctx, phone) {
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

	// checks to see if this user already started onboarding
	redisKey := db.RedisRegisterOnboarding + phone
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
// It checks Redis first, if not found, it fetches from the DB and caches it in Redis.
func (s *AuthService) GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.User, error) {
	// Check Redis
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	userInfoJSON, err := s.rdb.Get(ctx, userInfoKey).Result()
	if err == nil {
		var user queries.User
		if err := json.Unmarshal([]byte(userInfoJSON), &user); err == nil {
			return user, nil
		}
	}

	// Fetch from DB if not in Redis
	user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return queries.User{}, fmt.Errorf("user not found: %w", err)
	}

	// Cache it in Redis
	userJSON, err := json.Marshal(user)
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, 5*365*24*time.Hour)
	}

	return user, nil
}

// UpdateCachedUserInfo refreshes the cached user information in Redis.
// This function should be called anytime a user's details changes
func (s *AuthService) UpdateCachedUserInfo(ctx context.Context, fakeID int64) error {
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)

	// Fetch fresh data from DB
	user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		// If the user can't be fetched, remove the cache anyway to avoid stale data
		s.rdb.Del(ctx, userInfoKey)
		return fmt.Errorf("user not found for cache update: %w", err)
	}

	// Marshal and update Redis
	userJSON, err := json.Marshal(user)
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, 5*365*24*time.Hour)
	}

	return err
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
	// TODO: Implement the actual password change logic
	return errors.New("ChangePasswordByEmail is not implemented yet")
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

	// Update cached user info
	_ = s.UpdateCachedUserInfo(ctx, userFid)

	return nil
}


// RegisterCandidatePlaceholder creates a new candidate user in the system with placeholder status
func (s *AuthService) RegisterCandidatePlaceholder(
	ctx context.Context,
	email, password, firstName, lastName, middleName, gender, avatar, role, roleLevel string,
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
	if email != "" && s.CheckEmail(ctx, email) {
		return RegisterResult{}, errors.New("email already exists")
	}

	params := queries.CreateCandidatePlaceholderParams{
		Email:          pgtype.Text{String: email, Valid: email != ""},
		PasswordHash:   string(hashedPassword),
		LastName:       pgtype.Text{String: lastName, Valid: lastName != ""},
		FirstName:      pgtype.Text{String: firstName, Valid: firstName != ""},
		MiddleName:     pgtype.Text{String: middleName, Valid: middleName != ""},
		Gender:         pgtype.Text{String: gender, Valid: gender != ""},
		DateOfBirth:    pgtype.Date{Time: dob, Valid: !dob.IsZero()},
		CurrentCountry: countryID,
		CurrentState:   stateID,
		CurrentCity:    pgtype.Int4{Int32: currentCity, Valid: currentCity != 0},
		StateOfOrigin:  pgtype.Int2{Int16: stateOfOrigin, Valid: stateOfOrigin != 0},
		PartyID:        pgtype.Int8{Int64: partyID, Valid: partyID != 0},
		Avatar:         pgtype.Text{String: avatar, Valid: avatar != ""},
	}

	// creates the user's new account in our database
	userID, err := s.queries.CreateCandidatePlaceholder(ctx, params)
	if err != nil {
		return RegisterResult{}, err
	}
	if role != "" {
		dbRole, rErr := s.queries.GetRoleByCode(ctx, role)
		if rErr == nil {
			_ = s.queries.AssignUserRole(ctx, queries.AssignUserRoleParams{
				UserID:            userID,
				RoleID:            dbRole.ID,
				RoleCode:          dbRole.Code,
				WhoAssignedUserID: 0,
			})
		}
	}

	// generate a fake_id using the user_id and update the user fake_id
	fakeID := utils.GenerateFakeID(userID)
	err = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: userID, FakeID: pgtype.Int8{Int64: fakeID, Valid: true}})
	if err != nil {
		return RegisterResult{}, err
	}

	// save some of the user details to our db & also to redis(using pipeline)
	err = s.SaveSomeUserRegistrationDetails(ctx, "", email, "", "", userID, fakeID)
	if err != nil {
		return RegisterResult{}, err
	}

	// fetch user details to cache it in Redis
	_, _ = s.GetUserDetailsByFakeID(ctx, fakeID)

	return RegisterResult{UserID: userID, FakeID: fakeID}, nil
}

// ListAdmins fetches all administrative users from the database
func (s *AuthService) ListAdmins(ctx context.Context) ([]queries.ListAdminsRow, error) {
	return s.queries.ListAdmins(ctx)
}

// MakeUserSuperAdmin promotes a specific user to the superadmin role.
func (s *AuthService) MakeUserSuperAdmin(ctx context.Context, username string) error {
	allowed := map[string]bool{
		"stanley": true, "stanley_chukwu": true, "stanleychukwu": true,
		"daniel": true, "daniel_chukwu": true, "danielchukwu": true,
	}

	if !allowed[username] {
		return fmt.Errorf("username not authorized for superadmin promotion")
	}

	redisKey := fmt.Sprintf("%s%s", db.RedisUsernameFakeID, username)
	val, err := s.rdb.Get(ctx, redisKey).Result()
	if err != nil {
		if err == redis.Nil {
			return fmt.Errorf("user not found in registry")
		}
		return fmt.Errorf("redis error: %w", err)
	}

	fakeID, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid fake id in redis: %w", err)
	}

	user, err := s.GetUserDetailsByFakeID(ctx, fakeID)
	if err != nil {
		return fmt.Errorf("failed to fetch user details: %w", err)
	}

	return s.CheckAndAssignRole(ctx, user.ID, "super_admin", 0)
}

// GetUserRoles fetches user roles from Redis cache, falling back to DB and caching if missed.
func (s *AuthService) GetUserRoles(ctx context.Context, userID int64) ([]queries.GetUserRolesRow, error) {
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)

	// first redis to see if the roles have been cached
	rolesJSON, err := s.rdb.Get(ctx, userRolesKey).Result()
	if err == nil {
		var roles []queries.GetUserRolesRow
		if err := json.Unmarshal([]byte(rolesJSON), &roles); err == nil {
			return roles, nil
		}
	}

	// Fetch from DB if not in Redis
	roles, err := s.queries.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache it in Redis
	rolesJSONBytes, err := json.Marshal(roles)
	if err == nil {
		s.rdb.Set(ctx, userRolesKey, rolesJSONBytes, 5*365*24*time.Hour) // expires in 5years
	}

	return roles, nil
}

// UpdateCachedUserRoles refreshes the cached user roles in Redis.
// This function should be called anytime a user's roles changes
func (s *AuthService) UpdateCachedUserRoles(ctx context.Context, userID int64) error {
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)

	// Fetch fresh roles from DB
	roles, err := s.queries.GetUserRoles(ctx, userID)
	if err != nil {
		// If the roles can't be fetched, remove the cache anyway to avoid stale data
		s.rdb.Del(ctx, userRolesKey)
		return fmt.Errorf("user roles not found for cache update: %w", err)
	}

	// Marshal and update Redis
	rolesJSON, err := json.Marshal(roles)
	if err == nil {
		s.rdb.Set(ctx, userRolesKey, rolesJSON, 5*365*24*time.Hour) // expires in 5years
	}

	return err
}

// CheckAndAssignRole checks if a user already has a specific role, and if not, assigns it.
func (s *AuthService) CheckAndAssignRole(ctx context.Context, userID int64, roleCode string, whoAssigned int64) error {
	// 1. Get user roles (with cache check)
	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch user roles: %w", err)
	}

	// 2. Check if the user already has the role
	for _, r := range roles {
		if r.Code == roleCode {
			// Already has the role, no need to assign again
			return nil
		}
	}

	// 3. Get the role ID from db
	role, err := s.queries.GetRoleByCode(ctx, roleCode)
	if err != nil {
		return fmt.Errorf("failed to fetch role %s: %w", roleCode, err)
	}

	// 4. Assign the role in DB
	err = s.queries.AssignUserRole(ctx, queries.AssignUserRoleParams{
		UserID:            userID,
		RoleID:            role.ID,
		RoleCode:          role.Code,
		WhoAssignedUserID: whoAssigned,
	})
	if err != nil {
		return fmt.Errorf("failed to assign role %s: %w", roleCode, err)
	}

	// 5. Update cached roles
	_ = s.UpdateCachedUserRoles(ctx, userID)
	return nil
}

type SeedUserRequest struct {
	ID                int64   `json:"id"`
	FakeID            int64   `json:"fake_id"`
	Email             string  `json:"email"`
	Avatar            string  `json:"avatar"`
	Phone             *string `json:"phone"`
	Username          *string `json:"username"`
	Password          string  `json:"password"`
	LastName          string  `json:"last_name"`
	FirstName         string  `json:"first_name"`
	MiddleName        *string `json:"middle_name"`
	Gender            string  `json:"gender"`
	DateOfBirth       string  `json:"date_of_birth"`
	CurrentCountry    int16   `json:"current_country"`
	CurrentState      int16   `json:"current_state"`
	CurrentLga        *int32  `json:"current_lga"`
	CurrentCity       *int32  `json:"current_city"`
	StateOfOrigin     *int16  `json:"state_of_origin"`
	Vin               *string `json:"vin"`
	VotersCardImage   *string `json:"voters_card_image"`
	BankAccountNumber *string `json:"bank_account_number"`
	BankCode          *string `json:"bank_code"`
	NinVerified       string  `json:"nin_verified"`
	PhoneVerified     string  `json:"phone_verified"`
	Role              string  `json:"role"`
	RoleLevel         string  `json:"role_level"`
	AccountStatus     string  `json:"account_status"`
	PartyID           *int64  `json:"party_id"`
}

func (s *AuthService) SeedUsers(ctx context.Context, users []SeedUserRequest) ([]int64, error) {
	var createdIDs []int64
	for _, u := range users {
		// Hash password
		hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}

		dob, err := time.Parse("2006-01-02", u.DateOfBirth)
		if err != nil {
			return nil, fmt.Errorf("invalid dob format for user %s: %w", u.Email, err)
		}

		// Prepare params
		var emailVal, avatarVal, phoneVal, usernameVal, middleNameVal, genderVal, vinVal, votersCardVal, bankNoVal, bankCodeVal pgtype.Text
		var currentLgaVal, currentCityVal pgtype.Int4
		var stateOfOriginVal pgtype.Int2
		var partyIDVal pgtype.Int8

		if u.Email != "" {
			emailVal = pgtype.Text{String: strings.TrimSpace(strings.ToLower(u.Email)), Valid: true}
		}
		if u.Avatar != "" {
			avatarVal = pgtype.Text{String: u.Avatar, Valid: true}
		}
		if u.Phone != nil && *u.Phone != "" {
			phoneVal = pgtype.Text{String: *u.Phone, Valid: true}
		}
		if u.Username != nil && *u.Username != "" {
			usernameVal = pgtype.Text{String: *u.Username, Valid: true}
		}
		if u.MiddleName != nil && *u.MiddleName != "" {
			middleNameVal = pgtype.Text{String: *u.MiddleName, Valid: true}
		}
		if u.Gender != "" {
			genderVal = pgtype.Text{String: u.Gender, Valid: true}
		}
		if u.CurrentLga != nil && *u.CurrentLga != 0 {
			currentLgaVal = pgtype.Int4{Int32: *u.CurrentLga, Valid: true}
		}
		if u.CurrentCity != nil && *u.CurrentCity != 0 {
			currentCityVal = pgtype.Int4{Int32: *u.CurrentCity, Valid: true}
		}
		if u.StateOfOrigin != nil && *u.StateOfOrigin != 0 {
			stateOfOriginVal = pgtype.Int2{Int16: *u.StateOfOrigin, Valid: true}
		}
		if u.Vin != nil && *u.Vin != "" {
			vinVal = pgtype.Text{String: *u.Vin, Valid: true}
		}
		if u.VotersCardImage != nil && *u.VotersCardImage != "" {
			votersCardVal = pgtype.Text{String: *u.VotersCardImage, Valid: true}
		}
		if u.BankAccountNumber != nil && *u.BankAccountNumber != "" {
			bankNoVal = pgtype.Text{String: *u.BankAccountNumber, Valid: true}
		}
		if u.BankCode != nil && *u.BankCode != "" {
			bankCodeVal = pgtype.Text{String: *u.BankCode, Valid: true}
		}
		if u.PartyID != nil && *u.PartyID != 0 {
			partyIDVal = pgtype.Int8{Int64: *u.PartyID, Valid: true}
		}

		params := queries.SeedUserParams{
			FakeID:            pgtype.Int8{Int64: u.FakeID, Valid: u.FakeID != 0},
			Email:             emailVal,
			Avatar:            avatarVal,
			Phone:             phoneVal,
			Username:          usernameVal,
			PasswordHash:      string(hashed),
			LastName:          pgtype.Text{String: u.LastName, Valid: u.LastName != ""},
			FirstName:         pgtype.Text{String: u.FirstName, Valid: u.FirstName != ""},
			MiddleName:        middleNameVal,
			Gender:            genderVal,
			DateOfBirth:       pgtype.Date{Time: dob, Valid: true},
			CurrentCountry:    u.CurrentCountry,
			CurrentState:      u.CurrentState,
			CurrentLga:        currentLgaVal,
			CurrentCity:       currentCityVal,
			StateOfOrigin:     stateOfOriginVal,
			Vin:               vinVal,
			VotersCardImage:   votersCardVal,
			BankAccountNumber: bankNoVal,
			BankCode:          bankCodeVal,
			NinVerified:       pgtype.Text{String: u.NinVerified, Valid: u.NinVerified != ""},
			PhoneVerified:     pgtype.Text{String: u.PhoneVerified, Valid: u.PhoneVerified != ""},
			AccountStatus:     pgtype.Text{String: u.AccountStatus, Valid: u.AccountStatus != ""},
			PartyID:           partyIDVal,
		}

		id, err := s.queries.SeedUser(ctx, params)
		if err != nil {
			return nil, fmt.Errorf("failed to seed user %s: %w", u.Email, err)
		}

		// Save details to Redis cache
		fakeID := u.FakeID
		if fakeID == 0 {
			fakeID = utils.GenerateFakeID(id)
			_ = s.queries.UpdateUserFakeID(ctx, queries.UpdateUserFakeIDParams{ID: id, FakeID: pgtype.Int8{Int64: fakeID, Valid: true}})
		}

		emailStr := ""
		if emailVal.Valid {
			emailStr = emailVal.String
		}
		phoneStr := ""
		if phoneVal.Valid {
			phoneStr = phoneVal.String
		}
		usernameStr := ""
		if usernameVal.Valid {
			usernameStr = usernameVal.String
		}

		_ = s.SaveSomeUserRegistrationDetails(ctx, usernameStr, emailStr, phoneStr, "", id, fakeID)
		_, _ = s.GetUserDetailsByFakeID(ctx, fakeID)

		createdIDs = append(createdIDs, id)
	}
	return createdIDs, nil
}

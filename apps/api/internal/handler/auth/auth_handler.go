package authhandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	auth "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"net/http"

	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

type AuthService interface {
	Signup(ctx context.Context, email, phone, password string, countryID int16) (auth.SignupResult, error)
	SendSignupEmailOTP(ctx context.Context, email string) (auth.EmailOTPResult, error)
	VerifySignupEmailOTP(ctx context.Context, email, otp string) (auth.EmailOTPResult, error)
	SendForgotPasswordEmailOTP(ctx context.Context, email string) (auth.EmailOTPResult, error)
	CompleteOnboarding(ctx context.Context, userID int64, fakeID int64, params queries.UpdateOnboardingProfileParams, referrerUserID *int64, nin string) error
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) bool
	CheckReferralCode(ctx context.Context, code string) (bool, string, int64)
	Login(ctx context.Context, identifierType, identifier, password, iso2 string, allowedRoles ...string) (auth.LoginResult, error)
	Refresh(ctx context.Context, refreshToken string) (auth.RefreshResult, error)
	Logout(ctx context.Context, refreshToken string) error
	ChangePasswordByEmail(ctx context.Context, email, otp, newPassword string) error
	RegisterCandidatePlaceholder(ctx context.Context, email, password, firstName, lastName, middleName, username, gender, avatar string, avatarFileId *int64, dob time.Time, countryID, stateID int16, currentCity int32, stateOfOrigin int16, partyID int64) (auth.RegisterResult, error)
	GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

// UsersService interface defines the methods from UsersService that the auth handler needs
type UsersService interface {
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) (bool, int64)
	CheckEmail(ctx context.Context, email string) (bool, int64)
	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
	GenerateUniqueReferralCode(ctx context.Context, firstName string) (string, error)
}

// FilesService interface defines the methods from FilesService that the auth handler needs
type FilesService interface {
	UpdateFileOwner(ctx context.Context, fileID int64, ownerID int64) (queries.File, error)
}

// Handler struct holds the dependencies for the auth handler
type Handler struct {
	authService  AuthService
	usersService UsersService
	filesService FilesService
	validate     *validator.Validate
	utils        *utils.Utils
}

// NewHandler creates a new instance of the auth handler
func NewHandler(authService AuthService, usersService UsersService, filesService FilesService, utils *utils.Utils) *Handler {
	return &Handler{
		authService:  authService,
		usersService: usersService,
		filesService: filesService,
		validate:     validator.New(),
		utils:        utils,
	}
}

// SignupRequest represents the structure for the basic sign-up phase
type SignupRequest struct {
	CountryID   int16  `json:"countryId" validate:"required"`
	PhoneNumber string `json:"phoneNumber" validate:"required"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=5,max=72"`
}

type VerifySignupEmailOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
	OTP   string `json:"otp" validate:"required,len=6,numeric"`
}

// Signup godoc
// @Summary Basic sign-up
// @Description Handles the basic user registration (phone, email, password, country)
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body SignupRequest true "Basic sign-up details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/signup [post]
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest

	// Parse the incoming JSON payload into the request struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields (email, phone, password, country)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Delegate business logic to create the user and generate authentication tokens
	result, err := h.authService.Signup(r.Context(), req.Email, req.PhoneNumber, req.Password, req.CountryID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Respond with success, including the user's ID, user object, and authentication tokens
	h.utils.RespondSuccess(w, http.StatusOK, "Sign-up successful", map[string]interface{}{
		"id":           result.ID,
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
		"preferences":  result.Preferences,
	})
}

type SendSignupEmailOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// SendSignupEmailOTP handles the request to send an OTP to a new user's email during signup
func (h *Handler) SendSignupEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req SendSignupEmailOTPRequest

	// Parse the incoming JSON payload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields in the request
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Delegate business logic to the auth service
	result, err := h.authService.SendSignupEmailOTP(r.Context(), req.Email)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Respond with success and the email verification token details
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":                result.Message,
		"emailVerificationToken": result.EmailVerificationToken,
		"expiresInSeconds":       result.ExpiresInSeconds,
	})
}

// VerifySignupEmailOTP handles the request to verify the OTP sent to a new user's email during signup
func (h *Handler) VerifySignupEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req VerifySignupEmailOTPRequest

	// Parse the incoming JSON payload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields (email and OTP)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Delegate business logic to verify the OTP
	result, err := h.authService.VerifySignupEmailOTP(r.Context(), req.Email, req.OTP)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Respond with success and the email verification token details
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":                result.Message,
		"emailVerificationToken": result.EmailVerificationToken,
		"expiresInSeconds":       result.ExpiresInSeconds,
	})
}

// SendForgotPasswordEmailOTP handles the request to send an OTP for password recovery
func (h *Handler) SendForgotPasswordEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req SendSignupEmailOTPRequest

	// Parse the incoming JSON payload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required fields in the request
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Delegate business logic to generate and send the OTP
	result, err := h.authService.SendForgotPasswordEmailOTP(r.Context(), req.Email)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Respond with success and OTP expiration details
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":          result.Message,
		"expiresInSeconds": result.ExpiresInSeconds,
	})
}

type CompleteOnboardingRequest struct {
	// details step
	FirstName       string `json:"first_name" validate:"required,min=2,max=30"`
	LastName        string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName      string `json:"middle_name" validate:"omitempty,max=30"`
	Gender          string `json:"gender" validate:"required,oneof=male female"`
	DateOfBirth     string `json:"date_of_birth" validate:"required"`
	ReferrerUserId  *int64 `json:"referrer_user_id" validate:"omitempty"`
	ReferralCode    string `json:"referral_code" validate:"omitempty"`
	Nin             string `json:"nin" validate:"required,len=11"`
	Username        string `json:"username" validate:"required,min=2,max=30"`
	CountryOfOrigin int16  `json:"country_of_origin" validate:"omitempty"`
	StateOfOrigin   int16  `json:"state_of_origin" validate:"omitempty"`
	CurrentCountry  int16  `json:"current_country" validate:"required"`
	CurrentState    int16  `json:"current_state" validate:"required"`
	CurrentCity     int32  `json:"current_city" validate:"omitempty"`
}

// CompleteOnboarding handles PATCH /api/v1/auth/onboarding
func (h *Handler) CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract JWT claims from the context
	claims, ok := ctx.Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Decode the incoming request body
	var req CompleteOnboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate the request payload
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Check NIN if provided
	if h.usersService.CheckNIN(ctx, req.Nin) {
		h.utils.RespondError(w, http.StatusBadRequest, "NIN is already taken")
		return
	}

	// Validate referral code and referrer user id if both are provided
	if len(req.ReferralCode) > 0 && req.ReferrerUserId != nil && *req.ReferrerUserId > 0 {
		valid, _, refId := h.authService.CheckReferralCode(ctx, req.ReferralCode)
		if !valid || refId != *req.ReferrerUserId {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid referral code or referrer")
			return
		}
	}

	// Clean and validate username format
	cleanUsername, err := auth.CleanUsername(req.Username)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check username availability
	if exists, _ := h.usersService.CheckUsername(ctx, cleanUsername); exists {
		h.utils.RespondError(w, http.StatusBadRequest, "Username is already taken")
		return
	}

	// Fetch the DB user
	user, err := h.authService.GetUserDetailsByFakeID(ctx, claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	// if account_status != "just_registered", return error
	if user.AccountStatus.String != "just_registered" {
		h.utils.RespondError(w, http.StatusBadRequest, "User is already onboarded")
		return
	}

	// Parse date of birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date_of_birth format, expected YYYY-MM-DD")
		return
	}

	// Generate unique referral code (e.g. DANIEL402)
	myReferralCode, err := h.usersService.GenerateUniqueReferralCode(ctx, req.FirstName)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to generate referral code")
		return
	}

	params := queries.UpdateOnboardingProfileParams{
		ID:              user.ID,
		Username:        pgtype.Text{String: cleanUsername, Valid: cleanUsername != ""},
		FirstName:       pgtype.Text{String: req.FirstName, Valid: true},
		LastName:        pgtype.Text{String: req.LastName, Valid: true},
		MiddleName:      pgtype.Text{String: req.MiddleName, Valid: req.MiddleName != ""},
		Gender:          pgtype.Text{String: req.Gender, Valid: true},
		DateOfBirth:     pgtype.Date{Time: dob, Valid: true},
		CurrentCountry:  req.CurrentCountry,
		CurrentState:    req.CurrentState,
		CurrentCity:     pgtype.Int4{Int32: req.CurrentCity, Valid: req.CurrentCity != 0},
		StateOfOrigin:   pgtype.Int2{Int16: req.StateOfOrigin, Valid: req.StateOfOrigin != 0},
		CountryOfOrigin: pgtype.Int2{Int16: req.CountryOfOrigin, Valid: req.CountryOfOrigin != 0},
		ReferralCode:    pgtype.Text{String: myReferralCode, Valid: myReferralCode != ""},
	}

	if err = h.authService.CompleteOnboarding(r.Context(), user.ID, user.FakeID.Int64, params, req.ReferrerUserId, req.Nin); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to complete onboarding: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Onboarding completed successfully", nil)
}

// CheckNINRequest represents the structure for checking if a NIN exists
type CheckNINRequest struct {
	Nin string `json:"nin" validate:"required,numeric,len=11"`
}

// CheckNin godoc
// @Summary Check NIN
// @Description Checks if the National Identification Number (NIN) already exists
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body CheckNINRequest true "NIN to check"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/check_nin [post]
// CheckNin checks if the National Identification Number (NIN) already exists
func (h *Handler) CheckNin(w http.ResponseWriter, r *http.Request) {
	var req CheckNINRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	exists := h.usersService.CheckNIN(r.Context(), req.Nin)

	h.utils.RespondSuccess(w, http.StatusOK, "NIN check completed", map[string]interface{}{
		"exists": exists,
	})
}

// CheckUsernameRequest represents the structure for checking if a username exists
type CheckUsernameRequest struct {
	Username string `json:"username" validate:"required,min=2,max=30"`
}

// CheckUsername godoc
// @Summary Check Username
// @Description Checks if the username already exists
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body CheckUsernameRequest true "Username to check"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/check_username [post]
// CheckUsername checks if the username already exists, used during registration
func (h *Handler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	var req CheckUsernameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// checks if the username is cleaned
	_, err := auth.CleanUsername(req.Username)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// checks if the username exist
	exists, _ := h.usersService.CheckUsername(r.Context(), req.Username)

	h.utils.RespondSuccess(w, http.StatusOK, "Username checked successfully", map[string]interface{}{
		"exists": exists,
	})
}

// CheckReferralCodeRequest represents the structure for checking if a referral code exists
type CheckReferralCodeRequest struct {
	Code string `json:"code" validate:"required,min=5"`
}

// CheckReferralCode godoc
// @Summary Check Referral Code existence
// @Description Check if a given referral code exists
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body CheckReferralCodeRequest true "Referral code to check"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/check_referral_code [post]
func (h *Handler) CheckReferralCode(w http.ResponseWriter, r *http.Request) {
	var req CheckReferralCodeRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	exists, name, referrerId := h.authService.CheckReferralCode(r.Context(), req.Code)

	h.utils.RespondSuccess(w, http.StatusOK, "Referral code checked successfully", map[string]interface{}{
		"exists":     exists,
		"name":       name,
		"referrerId": referrerId,
	})
}

// LoginRequest represents the parameters for logging in
type LoginRequest struct {
	Country        string `json:"country" validate:"required"`
	Identifier     string `json:"identifier" validate:"required,min=2,max=50"` // accepts email, username or phone
	Password       string `json:"password" validate:"required,min=4"`
	IdentifierType string `json:"identifierType" validate:"required,oneof=email username phone"`
	Iso2           string `json:"iso2" validate:"omitempty"`
}

// @Summary Login user
// @Description Authenticates a user and returns access and refresh tokens
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/login [post]
// Login handles the user login and token generation
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if !(req.IdentifierType == "email" || req.IdentifierType == "username" || req.IdentifierType == "phone") {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid identifier type")
		return
	}

	result, err := h.authService.Login(r.Context(), req.IdentifierType, req.Identifier, req.Password, req.Iso2)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Login successful", map[string]interface{}{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
		"preferences":  result.Preferences,
	})
}

// RefreshRequest represents the refresh token parameters
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// Refresh godoc
// @Summary Refresh Token
// @Description Handles token rotation using a valid refresh token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/refresh [post]
// Refresh handles token rotation using a valid refresh token
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest

	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
			return
		}
	}

	if req.RefreshToken == "" {
		h.utils.RespondError(w, http.StatusUnauthorized, "Refresh token is missing")
		return
	}

	result, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// return the new accessToken and refreshToken
	h.utils.RespondSuccess(w, http.StatusOK, "Token refreshed successfully", map[string]interface{}{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
		"preferences":  result.Preferences,
	})
}

// LogoutRequest represents the parameters for logging out
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// Logout godoc
// @Summary Logout user
// @Description Handles the user logout by removing the session
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LogoutRequest true "Refresh token"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/logout [post]
// Logout handles the user logout by removing the session
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest

	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
			return
		}
	}

	if req.RefreshToken == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "Refresh token is missing")
		return
	}

	err := h.authService.Logout(r.Context(), req.RefreshToken)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Logout successful", nil)
}

// ChangePasswordByEmailRequest represents the structure for resetting password using email
type ChangePasswordByEmailRequest struct {
	Email    string `json:"email" validate:"required,email"`
	OTP      string `json:"otp" validate:"required,len=6"`
	Password string `json:"password" validate:"required,min=5,max=72"`
}

// ChangePasswordByEmail godoc
// @Summary Change password by email
// @Description Resets a user's password using their email address and OTP, invalidating active sessions
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body ChangePasswordByEmailRequest true "Email, OTP and new password details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/change-password [post]
// ChangePasswordByEmail handles resetting the user's password by email
func (h *Handler) ChangePasswordByEmail(w http.ResponseWriter, r *http.Request) {
	var req ChangePasswordByEmailRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	err := h.authService.ChangePasswordByEmail(r.Context(), req.Email, req.OTP, req.Password)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Password changed successfully", nil)
}

// AdminLoginRequest represents the simplified payload for admin login
type AdminLoginRequest struct {
	Identifier     string `json:"identifier" validate:"required,min=2,max=50"`
	Password       string `json:"password" validate:"required,min=4"`
	IdentifierType string `json:"identifierType" validate:"required,oneof=email username phone"`
	Iso2           string `json:"iso2" validate:"omitempty"`
}

// @Summary Login admin user
// @Description Authenticates an admin and returns access and refresh tokens
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body AdminLoginRequest true "Admin login credentials"
// @Success 200 {object} AdminLoginResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/admin/login [post]
func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req AdminLoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.Login(r.Context(), req.IdentifierType, req.Identifier, req.Password, req.Iso2, "admin", "super_admin")
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Login successful", map[string]interface{}{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
		"preferences":  result.Preferences,
	})
}

// PartyLoginRequest represents the payload for party member login
type PartyLoginRequest struct {
	Identifier     string `json:"identifier" validate:"required,min=2,max=50"`
	Password       string `json:"password" validate:"required,min=4"`
	IdentifierType string `json:"identifierType" validate:"required,oneof=email username phone"`
	Iso2           string `json:"iso2" validate:"omitempty"`
}

// @Summary Login party member user
// @Description Authenticates a party member and returns access and refresh tokens
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body PartyLoginRequest true "Party login credentials"
// @Success 200 {object} AdminLoginResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/partyapp/login [post]
func (h *Handler) PartyLogin(w http.ResponseWriter, r *http.Request) {
	var req PartyLoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.Login(r.Context(), req.IdentifierType, req.Identifier, req.Password, req.Iso2, "party_admin", "super_party_admin")
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Login successful", map[string]interface{}{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
		"preferences":  result.Preferences,
	})
}

// LoginUser represents user details returned on login
type LoginUser struct {
	ID           int64    `json:"id"`
	FakeID       int64    `json:"fake_id"`
	Email        string   `json:"email"`
	Username     string   `json:"username"`
	ReferralCode string   `json:"referral_code"`
	FirstName    string   `json:"first_name"`
	LastName     string   `json:"last_name"`
	MiddleName   string   `json:"middle_name"`
	Gender       string   `json:"gender"`
	DateOfBirth  string   `json:"date_of_birth"`
	Avatar       string   `json:"avatar"`
	Phone        string   `json:"phone"`
	Roles        []string `json:"roles"`
}

// AdminLoginResponse represents the Swagger response structure for admin login
type AdminLoginResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Data    AdminLoginData `json:"data"`
}

// AdminLoginData represents the inner response payload for admin login
type AdminLoginData struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         LoginUser `json:"user"`
}

// RegisterCandidatePlaceholderRequest represents the structure of candidate registration payload
type RegisterCandidatePlaceholderRequest struct {
	Email          string `json:"email" validate:"omitempty,email"`
	Password       string `json:"password" validate:"required,min=5,max=72"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,min=2,max=30"`
	Username       string `json:"username" validate:"omitempty,min=3,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	DateOfBirth    string `json:"date_of_birth" validate:"required"` // Expects YYYY-MM-DD
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
	StateOfOrigin  int16  `json:"state_of_origin" validate:"omitempty"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
	Avatar         string `json:"avatar" validate:"omitempty"`
	AvatarFileId   *int64 `json:"avatar_file_id" validate:"omitempty"`
}

// @Summary Register a new candidate user with placeholder status
// @Description Creates a new candidate placeholder user account
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterCandidatePlaceholderRequest true "Candidate registration details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/register_candidate [post]
// RegisterCandidatePlaceholder registers any placeholder user (with specific role & role_level)
func (h *Handler) RegisterCandidatePlaceholder(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	var req RegisterCandidatePlaceholderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.(validator.ValidationErrors)[0].Translate(nil))
		return
	}

	// Permission checks
	isAdmin := claims.HasAnyRole("admin", "super_admin")
	isPartyAdmin := claims.HasAnyRole("party_admin", "super_party_admin")
	if !isAdmin && !isPartyAdmin {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}
	if isPartyAdmin && !isAdmin {
		// A party admin can only register users for their own party
		if claims.PartyID == 0 || claims.PartyID != int16(req.PartyID) {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only add members to your own party")
			return
		}
	}

	// Validate and parse DateOfBirth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date format for date_of_birth. Use YYYY-MM-DD")
		return
	}

	// Validate email
	if req.Email != "" {
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		if exists, _ := h.usersService.CheckEmail(r.Context(), req.Email); exists {
			h.utils.RespondError(w, http.StatusConflict, "Email already exists")
			return
		}
	}

	// Validate and clean username
	if req.Username != "" {
		cleanUsername, err := auth.CleanUsername(req.Username)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		if exists, _ := h.usersService.CheckUsername(r.Context(), cleanUsername); exists {
			h.utils.RespondError(w, http.StatusConflict, "Username already exists")
			return
		}
		req.Username = cleanUsername
	}

	// Register user
	result, err := h.authService.RegisterCandidatePlaceholder(
		r.Context(),
		req.Email,
		req.Password,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Username,
		req.Gender,
		req.Avatar,
		req.AvatarFileId,
		dob,
		req.CurrentCountry,
		req.CurrentState,
		req.CurrentCity,
		req.StateOfOrigin,
		req.PartyID,
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create candidate placeholder: "+err.Error())
		return
	}

	if req.AvatarFileId != nil && *req.AvatarFileId > 0 {
		_, _ = h.filesService.UpdateFileOwner(r.Context(), *req.AvatarFileId, result.UserID)
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Candidate placeholder registered successfully", map[string]interface{}{
		"id":      result.UserID,
		"fake_id": result.FakeID,
		"user":    result.User,
	})
}

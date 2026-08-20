package authhandler

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	auth "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"log/slog"
	"math/big"
	"net/http"

	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// AuthService interface defines the methods for authentication services
type AuthService interface {
	Register(ctx context.Context, params queries.CreateUserParams, referredByCode string, nin string, onboardingID string, question1 int16, answer1 string, question2 int16, answer2 string) (auth.RegisterResult, error)
	RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16, emailVerificationToken string) (auth.RegisterPhaseSignUpResult, error)
	Signup(ctx context.Context, email, phone, password string, countryID int16) (auth.SignupResult, error)
	SendSignupEmailOTP(ctx context.Context, email string) (auth.EmailOTPResult, error)
	VerifySignupEmailOTP(ctx context.Context, email, otp string) (auth.EmailOTPResult, error)
	SendForgotPasswordEmailOTP(ctx context.Context, email string) (auth.EmailOTPResult, error)
	CompleteOnboarding(ctx context.Context, userID int64, fakeID int64, params queries.UpdateOnboardingProfileParams, myReferralCode string, referrerUserID *int64) error
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) bool
	CheckReferralCode(ctx context.Context, code string) (bool, string, int64)
	Login(ctx context.Context, identifierType, identifier, password, iso2 string, allowedRoles ...string) (auth.LoginResult, error)
	Refresh(ctx context.Context, refreshToken string) (auth.RefreshResult, error)
	Logout(ctx context.Context, refreshToken string) error
	VerifySecurityQuestions(ctx context.Context, nin string, q1 int16, a1 string, q2 int16, a2 string) (auth.VerifySecurityQuestionsResult, error)
	ChangePasswordByEmail(ctx context.Context, email, newPassword string) error
	ForgotPassword(ctx context.Context, changePasswordID string, userFid int64, password string) error
	RegisterCandidatePlaceholder(ctx context.Context, email, password, firstName, lastName, middleName, username, gender, avatar string, avatarFileId *int64, dob time.Time, countryID, stateID int16, currentCity int32, stateOfOrigin int16, partyID int64) (auth.RegisterResult, error)
	GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

// UsersService interface defines the methods from UsersService that the auth handler needs
type UsersService interface {
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) bool
	CheckEmail(ctx context.Context, email string) bool
	CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error)
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

// RegisterRequest represents the structure of the incoming JSON request body for user registration
type RegisterRequest struct {
	Email          string `json:"email" validate:"omitempty,email"`
	Phone          string `json:"phone" validate:"required,min=5,max=15"`
	OnboardingID   string `json:"onboarding_id" validate:"required"`
	Username       string `json:"username" validate:"required,min=2,max=30"`
	Nin            string `json:"nin" validate:"required,numeric,len=11"`
	Question1      int16  `json:"question1" validate:"required"`
	Answer1        string `json:"answer1" validate:"required,min=2,max=30"`
	Question2      int16  `json:"question2" validate:"required"`
	Answer2        string `json:"answer2" validate:"required,min=2,max=30"`
	Password       string `json:"password" validate:"required,min=5,max=72"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,min=2,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	DateOfBirth    string `json:"date_of_birth" validate:"required"` // Expects YYYY-MM-DD
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city"`
	ReferredByCode string `json:"referred_by_code" validate:"omitempty,max=15"`
}

// @Summary Register a new user
// @Description Creates a new user account with full details
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/register [post]
// Register handles the user registration process
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest

	// Decode the incoming JSON request body into the RegisterRequest struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate the struct fields using the defined validation tags (email, phone, min/max length, etc.)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.(validator.ValidationErrors)[0].Translate(nil))
		return
	}

	if req.Question1 == req.Question2 {
		h.utils.RespondError(w, http.StatusBadRequest, "Security questions must be different")
		return
	}

	// Parse the date of birth string into a time.Time object
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date format for date_of_birth. Use YYYY-MM-DD")
		return
	}

	// Map the request data to the database creation parameters
	// Note: Password hashing is handled within the service layer
	params := queries.CreateUserParams{
		Email:          pgtype.Text{String: req.Email, Valid: req.Email != ""},
		Phone:          pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Username:       pgtype.Text{String: req.Username, Valid: true},
		PasswordHash:   req.Password, // Hashed in the service layer
		LastName:       pgtype.Text{String: req.LastName, Valid: true},
		FirstName:      pgtype.Text{String: req.FirstName, Valid: true},
		MiddleName:     pgtype.Text{String: req.MiddleName, Valid: req.MiddleName != ""},
		Gender:         pgtype.Text{String: req.Gender, Valid: true},
		DateOfBirth:    pgtype.Date{Time: dob, Valid: true},
		CurrentCountry: req.CurrentCountry,
		CurrentState:   req.CurrentState,
		CurrentCity:    pgtype.Int4{Int32: req.CurrentCity, Valid: req.CurrentCity != 0},
	}

	// Call the auth service to register the new user
	id, err := h.authService.Register(r.Context(), params, req.ReferredByCode, req.Nin, req.OnboardingID, req.Question1, req.Answer1, req.Question2, req.Answer2)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create user: "+err.Error())
		return
	}

	// Return a successful response with the newly created user ID
	h.utils.RespondSuccess(w, http.StatusCreated, "User registered successfully", map[string]interface{}{
		"id": id,
	})
}

// RegisterPhaseSignUpRequest represents the structure for the initial sign-up phase
type RegisterPhaseSignUpRequest struct {
	Country                string `json:"country" validate:"required"`
	CountryID              int16  `json:"countryId" validate:"required"`
	PhoneNumber            string `json:"phoneNumber" validate:"required"`
	Email                  string `json:"email" validate:"required,email"`
	Password               string `json:"password" validate:"required,min=5,max=72"`
	ConfirmPassword        string `json:"confirmPassword" validate:"required,eqfield=Password"`
	EmailVerificationToken string `json:"emailVerificationToken" validate:"required"`
}

// RegisterPhaseSignUp godoc
// @Summary Initial sign-up phase
// @Description Handles the first phase of user registration (country, phone, email, password)
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterPhaseSignUpRequest true "Initial sign-up details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/signup/web [post]
// RegisterPhaseSignUp handles the initial registration phase
func (h *Handler) RegisterPhaseSignUp(w http.ResponseWriter, r *http.Request) {
	var req RegisterPhaseSignUpRequest

	// Decode the incoming JSON request body into the RegisterPhaseSignUpRequest struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate the struct fields using the defined validation tags (email, phone, min/max length, etc.)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.RegisterPhaseSignUp(r.Context(), req.Email, req.PhoneNumber, req.CountryID, req.EmailVerificationToken)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Initial sign-up data is valid", map[string]interface{}{
		"id": result.ID,
	})
}

// SignupRequest represents the structure for the basic sign-up phase
type SignupRequest struct {
	CountryID   int16  `json:"countryId" validate:"required"`
	PhoneNumber string `json:"phoneNumber" validate:"required"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=5,max=72"`
}

type SendSignupEmailOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
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

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.Signup(r.Context(), req.Email, req.PhoneNumber, req.Password, req.CountryID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Sign-up successful", map[string]interface{}{
		"id":           result.ID,
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
	})
}

func (h *Handler) SendSignupEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req SendSignupEmailOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	result, err := h.authService.SendSignupEmailOTP(r.Context(), req.Email)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":                result.Message,
		"emailVerificationToken": result.EmailVerificationToken,
		"expiresInSeconds":       result.ExpiresInSeconds,
	})
}

func (h *Handler) VerifySignupEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req VerifySignupEmailOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	result, err := h.authService.VerifySignupEmailOTP(r.Context(), req.Email, req.OTP)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":                result.Message,
		"emailVerificationToken": result.EmailVerificationToken,
		"expiresInSeconds":       result.ExpiresInSeconds,
	})
}

func (h *Handler) SendForgotPasswordEmailOTP(w http.ResponseWriter, r *http.Request) {
	var req SendSignupEmailOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	result, err := h.authService.SendForgotPasswordEmailOTP(r.Context(), req.Email)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.utils.RespondSuccess(w, http.StatusOK, result.Message, map[string]interface{}{
		"message":          result.Message,
		"expiresInSeconds": result.ExpiresInSeconds,
	})
}

type CompleteOnboardingRequest struct {
	// details step
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	DateOfBirth    string `json:"date_of_birth" validate:"required"`
	ReferrerUserId *int64 `json:"referrer_user_id" validate:"omitempty"`
	// username step
	Username string `json:"username" validate:"required,min=2,max=30"`
	// origin step
	CountryOfOrigin int16 `json:"country_of_origin" validate:"omitempty"`
	StateOfOrigin   int16 `json:"state_of_origin" validate:"omitempty"`
	// location step
	CurrentCountry int16 `json:"current_country" validate:"required"`
	CurrentState   int16 `json:"current_state" validate:"required"`
	CurrentCity    int32 `json:"current_city" validate:"omitempty"`
}

// CompleteOnboarding handles PATCH /api/v1/auth/onboarding
func (h *Handler) CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	slog.Info("CompleteOnboarding handler called")

	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		slog.Error("CompleteOnboarding: Unauthorized - no claims in context")
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	slog.Info("CompleteOnboarding: Claims extracted", "fake_id", claims.FakeID, "roles", claims.Roles)

	var req CompleteOnboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("CompleteOnboarding: Invalid request body", "error", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	slog.Info("CompleteOnboarding: Request payload decoded", "username", req.Username, "first_name", req.FirstName, "last_name", req.LastName, "referrer_user_id", req.ReferrerUserId)

	if err := h.validate.Struct(req); err != nil {
		slog.Error("CompleteOnboarding: Validation failed", "error", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	slog.Info("CompleteOnboarding: Struct validation passed")

	ctx := r.Context()

	// Check username availability
	if h.usersService.CheckUsername(ctx, req.Username) {
		slog.Warn("CompleteOnboarding: Username already taken", "username", req.Username)
		h.utils.RespondError(w, http.StatusBadRequest, "Username is already taken")
		return
	}
	slog.Info("CompleteOnboarding: Username is available", "username", req.Username)

	// Fetch the DB user
	user, err := h.authService.GetUserDetailsByFakeID(ctx, claims.FakeID)
	if err != nil {
		slog.Error("CompleteOnboarding: User not found", "fake_id", claims.FakeID, "error", err)
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}
	slog.Info("CompleteOnboarding: DB User found", "user_id", user.ID, "fake_id", user.FakeID)

	// Parse date of birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		slog.Error("CompleteOnboarding: Invalid date_of_birth format", "date_of_birth", req.DateOfBirth, "error", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date_of_birth format, expected YYYY-MM-DD")
		return
	}
	slog.Info("CompleteOnboarding: Parsed DateOfBirth", "dob", dob)

	// Generate unique referral code (e.g. DANIEL-884920)
	firstNameUpper := strings.ToUpper(strings.TrimSpace(req.FirstName))
	n, _ := rand.Int(rand.Reader, big.NewInt(9000000))
	suffix := n.Int64() + 1000000 // 1000000-9999999
	myReferralCode := fmt.Sprintf("%s-%d", firstNameUpper, suffix)
	slog.Info("CompleteOnboarding: Generated referral code", "my_referral_code", myReferralCode)

	params := queries.UpdateOnboardingProfileParams{
		ID:              user.ID,
		Username:        pgtype.Text{String: req.Username, Valid: req.Username != ""},
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
	}

	slog.Info("CompleteOnboarding: Calling authService.CompleteOnboarding", "user_id", user.ID, "referrer_user_id", req.ReferrerUserId)
	if err = h.authService.CompleteOnboarding(r.Context(), user.ID, user.FakeID.Int64, params, myReferralCode, req.ReferrerUserId); err != nil {
		slog.Error("CompleteOnboarding: authService.CompleteOnboarding failed", "error", err)
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to complete onboarding: "+err.Error())
		return
	}
	slog.Info("CompleteOnboarding: authService.CompleteOnboarding succeeded")

	// Async wallet creation so HTTP onboarding response returns immediately without blocking on Monnify external API calls
	fakeID := claims.FakeID
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if updatedUser, err := h.authService.GetUserDetailsByFakeID(bgCtx, fakeID); err == nil {
			slog.Info("CompleteOnboarding: Re-fetched updated user for wallet creation", "user_id", updatedUser.ID)
			_, walletErr := h.usersService.CreateUserWallet(bgCtx, queries.User{
				ID:              updatedUser.ID,
				FakeID:          updatedUser.FakeID,
				Email:           updatedUser.Email,
				Phone:           updatedUser.Phone,
				Username:        updatedUser.Username,
				PasswordHash:    updatedUser.PasswordHash,
				LastName:        updatedUser.LastName,
				FirstName:       updatedUser.FirstName,
				MiddleName:      updatedUser.MiddleName,
				Gender:          updatedUser.Gender,
				DateOfBirth:     updatedUser.DateOfBirth,
				CurrentCountry:  updatedUser.CurrentCountry,
				CurrentState:    updatedUser.CurrentState,
				CurrentCity:     updatedUser.CurrentCity,
				StateOfOrigin:   updatedUser.StateOfOrigin,
				CountryOfOrigin: updatedUser.CountryOfOrigin,
				AccountStatus:   updatedUser.AccountStatus,
				CreatedAt:       updatedUser.CreatedAt,
				UpdatedAt:       updatedUser.UpdatedAt,
			})
			if walletErr != nil {
				slog.Warn("CompleteOnboarding: Immediate wallet creation returned error", "error", walletErr)
			} else {
				slog.Info("CompleteOnboarding: Immediate wallet creation succeeded")
			}
		} else {
			slog.Warn("CompleteOnboarding: Failed to re-fetch updated user for wallet creation", "error", err)
		}
	}()

	slog.Info("CompleteOnboarding: Responding with success")
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
	exists := h.usersService.CheckUsername(r.Context(), req.Username)

	h.utils.RespondSuccess(w, http.StatusOK, "Username checked successfully", map[string]interface{}{
		"exists": exists,
	})
}

// CheckReferralCodeRequest represents the structure for checking if a referral code exists
type CheckReferralCodeRequest struct {
	Code string `json:"code" validate:"required,min=3"`
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

// VerifySecurityQuestionsRequest represents the structure for verifying security questions
type VerifySecurityQuestionsRequest struct {
	Nin       string `json:"nin" validate:"required,numeric,len=11"`
	Question1 int16  `json:"question1" validate:"required"`
	Answer1   string `json:"answer1" validate:"required"`
	Question2 int16  `json:"question2" validate:"required"`
	Answer2   string `json:"answer2" validate:"required"`
}

// VerifySecurityQuestions godoc
// @Summary Verify security questions
// @Description Checks the answers to security questions and returns a unique ID if successful
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body VerifySecurityQuestionsRequest true "Security questions and answers"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/verify_security_questions [post]
// VerifySecurityQuestions checks the answers and returns a unique ID if successful
func (h *Handler) VerifySecurityQuestions(w http.ResponseWriter, r *http.Request) {
	var req VerifySecurityQuestionsRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.VerifySecurityQuestions(r.Context(), req.Nin, req.Question1, req.Answer1, req.Question2, req.Answer2)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Security questions verified successfully", map[string]interface{}{
		"change_password_id": result.ChangePasswordID,
		"user_fid":           result.UserFID,
	})
}

// ForgotPasswordRequest represents the structure for resetting password
type ForgotPasswordRequest struct {
	Password         string `json:"password" validate:"required,min=5"`
	ConfirmPassword  string `json:"confirmPassword" validate:"required,eqfield=Password"`
	ChangePasswordID string `json:"change_password_id" validate:"required"`
	UserFid          int64  `json:"user_fid" validate:"required"`
}

// ForgotPassword godoc
// @Summary Forgot password
// @Description Handles resetting the user's password
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body ForgotPasswordRequest true "New password details"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/forgot_password [post]
// ForgotPassword handles resetting the user's password
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	err := h.authService.ForgotPassword(r.Context(), req.ChangePasswordID, req.UserFid, req.Password)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Password reset successfully", nil)
}

// ChangePasswordByEmailRequest represents the structure for resetting password using email
type ChangePasswordByEmailRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=5,max=72"`
}

// ChangePasswordByEmail godoc
// @Summary Change password by email
// @Description Resets a user's password using their email address and a new password, invalidating active sessions
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body ChangePasswordByEmailRequest true "Email and new password details"
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

	err := h.authService.ChangePasswordByEmail(r.Context(), req.Email, req.Password)
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
		if h.usersService.CheckEmail(r.Context(), req.Email) {
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
		if h.usersService.CheckUsername(r.Context(), cleanUsername) {
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

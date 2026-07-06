package authhandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	apimiddleware "free9ja/api/internal/middleware"
	auth "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"net/http"
	"strings"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// AuthService interface defines the methods for authentication services
type AuthService interface {
	Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID string, question1 int16, answer1 string, question2 int16, answer2 string) (auth.RegisterResult, error)
	RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16) (auth.RegisterPhaseSignUpResult, error)
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) bool
	Login(ctx context.Context, identifierType, identifier, password, iso2 string, allowedRoles ...string) (auth.LoginResult, error)
	Refresh(ctx context.Context, refreshToken string) (auth.RefreshResult, error)
	Logout(ctx context.Context, refreshToken string) error
	VerifySecurityQuestions(ctx context.Context, nin string, q1 int16, a1 string, q2 int16, a2 string) (auth.VerifySecurityQuestionsResult, error)
	ForgotPassword(ctx context.Context, changePasswordID string, userFid int64, password string) error
	RegisterAdmin(ctx context.Context, email, phone, username, password, firstName, lastName, avatar string) (auth.RegisterResult, error)
	RegisterCandidatePlaceholder(ctx context.Context, email, password, firstName, lastName, middleName, gender, avatar, role, roleLevel string, dob time.Time, countryID, stateID int16, currentCity int32, stateOfOrigin int16, partyID int64) (auth.RegisterResult, error)
	ListAdmins(ctx context.Context) ([]queries.ListAdminsRow, error)
	GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.User, error)

	SeedUsers(ctx context.Context, users []auth.SeedUserRequest) ([]int64, error)
}

// Handler struct holds the dependencies for the auth handler
type Handler struct {
	authService AuthService
	validate    *validator.Validate
	utils       *utils.Utils
}

// NewHandler creates a new instance of the auth handler
func NewHandler(authService AuthService, utils *utils.Utils) *Handler {
	return &Handler{
		authService: authService,
		validate:    validator.New(),
		utils:       utils,
	}
}

// RegisterRequest represents the structure of the incoming JSON request body for user registration
type RegisterRequest struct {
	Email          string `json:"email" validate:"omitempty,email"`
	Phone          string `json:"phone" validate:"required,e164"`
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
	id, err := h.authService.Register(r.Context(), params, req.Nin, req.OnboardingID, req.Question1, req.Answer1, req.Question2, req.Answer2)
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
	Country         string `json:"country" validate:"required"`
	CountryID       int16  `json:"countryId" validate:"required"`
	PhoneNumber     string `json:"phoneNumber" validate:"required"`
	Email           string `json:"email" validate:"omitempty,email"`
	Password        string `json:"password" validate:"required,min=5,max=72"`
	ConfirmPassword string `json:"confirmPassword" validate:"required,eqfield=Password"`
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
// @Router /auth/register_phase_signup [post]
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

	result, err := h.authService.RegisterPhaseSignUp(r.Context(), req.Email, req.PhoneNumber, req.CountryID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Initial sign-up data is valid", map[string]interface{}{
		"id": result.ID,
	})
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

	exists := h.authService.CheckNIN(r.Context(), req.Nin)

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
	exists := h.authService.CheckUsername(r.Context(), req.Username)

	h.utils.RespondSuccess(w, http.StatusOK, "Username check completed", map[string]interface{}{
		"exists": exists,
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

// AdminRegisterRequest represents the simplified payload for registering a new admin account
type AdminRegisterRequest struct {
	Email     string `json:"email" validate:"omitempty,email"`
	Phone     string `json:"phone" validate:"required,e164"`
	Username  string `json:"username" validate:"required,min=2,max=30"`
	Password  string `json:"password" validate:"required,min=5,max=72"`
	FirstName string `json:"first_name" validate:"omitempty,min=2,max=30"`
	LastName  string `json:"last_name" validate:"omitempty,min=2,max=30"`
	Avatar    string `json:"avatar" validate:"omitempty"`
}

// @Summary Register a new admin user
// @Description Creates a new admin account
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body AdminRegisterRequest true "Admin registration details"
// @Success 201 {object} AdminRegisterResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /auth/admin/register [post]
func (h *Handler) AdminRegister(w http.ResponseWriter, r *http.Request) {
	var req AdminRegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.RegisterAdmin(r.Context(), req.Email, req.Phone, req.Username, req.Password, req.FirstName, req.LastName, req.Avatar)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create admin: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Admin registered successfully", map[string]interface{}{
		"id": result.UserID,
	})
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

	result, err := h.authService.Login(r.Context(), req.IdentifierType, req.Identifier, req.Password, req.Iso2, "admin")
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

	result, err := h.authService.Login(r.Context(), req.IdentifierType, req.Identifier, req.Password, req.Iso2, "partymember")
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

// AdminRegisterResponse represents the Swagger response structure for admin registration
type AdminRegisterResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Data    AdminRegisterData `json:"data"`
}

// AdminRegisterData represents the inner response payload for admin registration
type AdminRegisterData struct {
	ID int64 `json:"id"`
}

// AdminLoginResponse represents the Swagger response structure for admin login
type AdminLoginResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message"`
	Data    AdminLoginData `json:"data"`
}

// AdminLoginData represents the inner response payload for admin login
type AdminLoginData struct {
	AccessToken  string         `json:"accessToken"`
	RefreshToken string         `json:"refreshToken"`
	User         auth.LoginUser `json:"user"`
}

// RegisterCandidatePlaceholderRequest represents the structure of candidate registration payload
type RegisterCandidatePlaceholderRequest struct {
	Email          string `json:"email" validate:"omitempty,email"`
	Password       string `json:"password" validate:"required,min=5,max=72"`
	LastName       string `json:"last_name" validate:"required,min=2,max=30"`
	FirstName      string `json:"first_name" validate:"required,min=2,max=30"`
	MiddleName     string `json:"middle_name" validate:"omitempty,min=2,max=30"`
	Gender         string `json:"gender" validate:"required,oneof=male female"`
	DateOfBirth    string `json:"date_of_birth" validate:"required"` // Expects YYYY-MM-DD
	CurrentCountry int16  `json:"current_country" validate:"required"`
	CurrentState   int16  `json:"current_state" validate:"required"`
	CurrentCity    int32  `json:"current_city" validate:"omitempty"`
	StateOfOrigin  int16  `json:"state_of_origin" validate:"omitempty"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
	PartyID        int64  `json:"party_id" validate:"omitempty"`
	Avatar         string `json:"avatar" validate:"omitempty"`
	Role           string `json:"role" validate:"required,oneof=admin partymember user"`
	RoleLevel      string `json:"role_level" validate:"required,oneof=superadmin admin member placeholder pollingagent user"`
	RoleLevel      string `json:"role_level" validate:"required,oneof=superadmin admin member placeholder pollingagent user"`
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
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
		return
	}

	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized: claims not found")
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

	if req.Role == "partymember" && req.PartyID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: Key: 'RegisterCandidatePlaceholderRequest.PartyID' Error:Field validation for 'PartyID' failed on the 'required' tag")
		return
	}

	// Permission checks
	userRole := strings.ToLower(claims.Role)
	if userRole != "admin" && userRole != "partymember" {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	if userRole == "partymember" {
		currUser, err := h.authService.GetUserDetailsByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		if !currUser.RoleLevel.Valid || strings.ToLower(currUser.RoleLevel.String) != "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only party admins can add users")
			return
		}

		// A party admin can only register users for their own party
		if !currUser.PartyID.Valid || currUser.PartyID.Int64 != req.PartyID {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only add members to your own party")
			return
		}

		// A party admin cannot create admin accounts
		if strings.ToLower(req.Role) == "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: party admins cannot create administrative accounts")
			return
		}
	}

	if req.Role == "partymember" && req.PartyID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: Key: 'RegisterCandidatePlaceholderRequest.PartyID' Error:Field validation for 'PartyID' failed on the 'required' tag")
		return
	}

	// Permission checks
	userRole := strings.ToLower(claims.Role)
	if userRole != "admin" && userRole != "partymember" {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	if userRole == "partymember" {
		currUser, err := h.authService.GetUserDetailsByFakeID(r.Context(), claims.FakeID)
		if err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: user details not found")
			return
		}

		if !currUser.RoleLevel.Valid || strings.ToLower(currUser.RoleLevel.String) != "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only party admins can add users")
			return
		}

		// A party admin can only register users for their own party
		if !currUser.PartyID.Valid || currUser.PartyID.Int64 != req.PartyID {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: you can only add members to your own party")
			return
		}

		// A party admin cannot create admin accounts
		if strings.ToLower(req.Role) == "admin" {
			h.utils.RespondError(w, http.StatusForbidden, "Forbidden: party admins cannot create administrative accounts")
			return
		}
	}

	// Validate role and role level combination
	isValidCombo := false
	switch req.Role {
	case "admin":
		if req.RoleLevel == "superadmin" || req.RoleLevel == "admin" {
			isValidCombo = true
		}
	case "partymember":
		if req.RoleLevel == "admin" || req.RoleLevel == "member" || req.RoleLevel == "placeholder" {
			isValidCombo = true
		}
	case "user":
		if req.RoleLevel == "pollingagent" || req.RoleLevel == "user" {
		if req.RoleLevel == "pollingagent" || req.RoleLevel == "user" {
			isValidCombo = true
		}
	}

	if !isValidCombo {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid role ("+req.Role+") and role level ("+req.RoleLevel+") combination")
		return
	}

	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date format for date_of_birth. Use YYYY-MM-DD")
		return
	}

	result, err := h.authService.RegisterCandidatePlaceholder(
		r.Context(),
		req.Email,
		req.Password,
		req.FirstName,
		req.LastName,
		req.MiddleName,
		req.Gender,
		req.Avatar,
		req.Role,
		req.RoleLevel,
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

	h.utils.RespondSuccess(w, http.StatusCreated, "Candidate placeholder registered successfully", map[string]interface{}{
		"id":      result.UserID,
		"fake_id": result.FakeID,
	})
}

// ListAdmins handles requests to list all administrative users
func (h *Handler) ListAdmins(w http.ResponseWriter, r *http.Request) {
	admins, err := h.authService.ListAdmins(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve admins: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Admins retrieved successfully", map[string]interface{}{
		"admins": admins,
	})
}

// @Summary Seed testing users
// @Description Batch registers testing users from formatted JSON data
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body []auth.SeedUserRequest true "List of users to seed"
// @Success 200 {object} map[string]interface{} "Users seeded successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body"
// @Failure 500 {object} map[string]interface{} "Failed to seed users"
// @Router /auth/seed [post]
// SeedUsers handles batch registration of testing users from seed data
func (h *Handler) SeedUsers(w http.ResponseWriter, r *http.Request) {
	var req []auth.SeedUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	ids, err := h.authService.SeedUsers(r.Context(), req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to seed users: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Users seeded successfully", map[string]interface{}{
		"ids": ids,
	})
}




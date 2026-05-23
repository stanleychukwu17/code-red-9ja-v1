package authhandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	auth "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"net/http"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// AuthService interface defines the methods for authentication services
type AuthService interface {
	Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID int64) (auth.RegisterResult, error)
	RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16) (auth.RegisterPhaseSignUpResult, error)
	VerifyOtp(ctx context.Context, phone, otp string) error
	ResendOtp(ctx context.Context, phone string, id int64) (auth.RegisterPhaseSignUpResult, error)
	CheckNIN(ctx context.Context, nin string) bool
	CheckUsername(ctx context.Context, username string) bool
	Login(ctx context.Context, identifier, password string) (auth.LoginResult, error)
	Refresh(ctx context.Context, refreshToken string) (auth.RefreshResult, error)
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
	OnboardingID   int64  `json:"onboarding_id" validate:"required"`
	Username       string `json:"username" validate:"required,min=2,max=30"`
	Nin            string `json:"nin" validate:"required,numeric,len=11"`
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

	// Parse the date of birth string into a time.Time object
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid date format for date_of_birth. Use YYYY-MM-DD")
		return
	}

	// Map the request data to the database creation parameters
	// Note: Password hashing is handled within the service layer
	params := queries.CreateUserParams{
		Email:          pgtype.Text{String: req.Email},
		Phone:          req.Phone,
		Username:       pgtype.Text{String: req.Username},
		PasswordHash:   req.Password, // Hashed in the service layer
		LastName:       pgtype.Text{String: req.LastName},
		FirstName:      pgtype.Text{String: req.FirstName},
		MiddleName:     pgtype.Text{String: req.MiddleName},
		Gender:         pgtype.Text{String: req.Gender, Valid: true},
		DateOfBirth:    pgtype.Date{Time: dob, Valid: true},
		CurrentCountry: req.CurrentCountry,
		CurrentState:   req.CurrentState,
		CurrentCity:    pgtype.Int4{Int32: req.CurrentCity, Valid: req.CurrentCity != 0},
	}

	// Call the auth service to register the new user
	id, err := h.authService.Register(r.Context(), params, req.Nin, req.OnboardingID)
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
		"id":              result.ID,
		"dateTimeOtpSent": result.DateTimeOtpSent,
		"otpVerified":     result.OtpVerified,
	})
}

// VerifyOtpRequest represents the structure for OTP verification
type VerifyOtpRequest struct {
	Phone string `json:"phoneNumber" validate:"required"`
	Otp   string `json:"otp" validate:"required,len=6"`
}

// VerifyOtp handles the OTP verification process
func (h *Handler) VerifyOtp(w http.ResponseWriter, r *http.Request) {
	var req VerifyOtpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if err := h.authService.VerifyOtp(r.Context(), req.Phone, req.Otp); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "OTP verified successfully", nil)
}

// ResendOtpRequest represents the structure for resending OTP
type ResendOtpRequest struct {
	Phone string `json:"phoneNumber" validate:"required"`
	ID    int64  `json:"id" validate:"required"`
}

// ResendOtp handles the request to resend OTP
func (h *Handler) ResendOtp(w http.ResponseWriter, r *http.Request) {
	var req ResendOtpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	result, err := h.authService.ResendOtp(r.Context(), req.Phone, req.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "OTP resent successfully", map[string]interface{}{
		"id":              result.ID,
		"dateTimeOtpSent": result.DateTimeOtpSent,
	})
}

// CheckNINRequest represents the structure for checking if a NIN exists
type CheckNINRequest struct {
	Nin string `json:"nin" validate:"required,numeric,len=11"`
}

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

// CheckUsername checks if the username already exists
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
	Identifier string `json:"identifier" validate:"required,min=2,max=50"` // accepts email, username or phone
	Password   string `json:"password" validate:"required,min=4"`
}

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

	result, err := h.authService.Login(r.Context(), req.Identifier, req.Password)
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

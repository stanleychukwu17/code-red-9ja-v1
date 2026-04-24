package authhandler

import (
	"encoding/json"
	"free9ja/api/internal/db/queries"
	auth "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"net/http"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
)

// Handler struct holds the dependencies for the auth handler
type Handler struct {
	authService *auth.AuthService
	validate    *validator.Validate
	utils       *utils.Utils
}

// NewHandler creates a new instance of the auth handler
func NewHandler(authService *auth.AuthService) *Handler {
	return &Handler{
		authService: authService,
		validate:    validator.New(),
	}
}

// RegisterRequest represents the structure of the incoming JSON request body for user registration
type RegisterRequest struct {
	Email          string `json:"email" validate:"omitempty,email"`
	Phone          string `json:"phone" validate:"required,e164"`
	Username       string `json:"username" validate:"required,min=2,max=30,alphanum"`
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
		h.utils.RespondJSON(w, http.StatusBadRequest, map[string]interface{}{"error": "Invalid request body " + err.Error()})
		return
	}

	// Validate the struct fields using the defined validation tags (email, phone, min/max length, etc.)
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"error": "Invalid request body: " + err.(validator.ValidationErrors)[0].Translate(nil),
		})
		return
	}

	// Parse the date of birth string into a time.Time object
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		h.utils.RespondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid date format for date_of_birth. Use YYYY-MM-DD"})
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
	id, err := h.authService.Register(r.Context(), params, req.Nin)
	if err != nil {
		// Fallback for unexpected errors
		h.utils.RespondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create user: " + err.Error()})
		return
	}

	// Return a successful response with the newly created user ID
	h.utils.RespondJSON(w, http.StatusCreated, map[string]any{
		"id":      id,
		"message": "User registered successfully",
	})
}

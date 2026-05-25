package authhandler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"free9ja/api/internal/db/queries"
	authhandler "free9ja/api/internal/handler/auth"
	authservice "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockAuthService is a mock implementation of the AuthService interface
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID int64) (authservice.RegisterResult, error) {
	args := m.Called(ctx, params, nin, onboardingID)
	return args.Get(0).(authservice.RegisterResult), args.Error(1)
}

func (m *MockAuthService) RegisterPhaseSignUp(ctx context.Context, email, phone string, countryID int16) (authservice.RegisterPhaseSignUpResult, error) {
	args := m.Called(ctx, email, phone, countryID)
	return args.Get(0).(authservice.RegisterPhaseSignUpResult), args.Error(1)
}

func (m *MockAuthService) VerifyOtp(ctx context.Context, phone, otp string) error {
	args := m.Called(ctx, phone, otp)
	return args.Error(0)
}

func (m *MockAuthService) ResendOtp(ctx context.Context, phone string, id int64) (authservice.RegisterPhaseSignUpResult, error) {
	args := m.Called(ctx, phone, id)
	return args.Get(0).(authservice.RegisterPhaseSignUpResult), args.Error(1)
}

func (m *MockAuthService) CheckNIN(ctx context.Context, nin string) bool {
	args := m.Called(ctx, nin)
	return args.Bool(0)
}

func (m *MockAuthService) CheckUsername(ctx context.Context, username string) bool {
	args := m.Called(ctx, username)
	return args.Bool(0)
}

func (m *MockAuthService) Login(ctx context.Context, identifier, password string) (authservice.LoginResult, error) {
	args := m.Called(ctx, identifier, password)
	return args.Get(0).(authservice.LoginResult), args.Error(1)
}

func (m *MockAuthService) Refresh(ctx context.Context, refreshToken string) (authservice.RefreshResult, error) {
	args := m.Called(ctx, refreshToken)
	return args.Get(0).(authservice.RefreshResult), args.Error(1)
}

func (m *MockAuthService) GetRefreshExpiration() time.Duration {
	args := m.Called()
	return args.Get(0).(time.Duration)
}

func (m *MockAuthService) Logout(ctx context.Context, refreshToken string) error {
	args := m.Called(ctx, refreshToken)
	return args.Error(0)
}

// TestRegister tests the Register method of the AuthHandler
func TestRegister(t *testing.T) {
	// Create a new instance of the utils package
	utilsInstance := utils.NewUtils(nil)

	// Test case: successful registration
	t.Run("successful registration", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)
		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, utilsInstance)

		// Create a RegisterRequest with valid data
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "2000-01-01",
			CurrentCountry: 1,
			CurrentState:   1,
			CurrentCity:    1,
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)
		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))
		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Set up the mock service to return a RegisterResult with UserID and FakeID
		mockService.On("Register", mock.Anything, mock.Anything, reqBody.Nin, reqBody.OnboardingID).Return(authservice.RegisterResult{UserID: 1, FakeID: 12345}, nil)

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 201 Created
		require.Equal(t, http.StatusCreated, rr.Code)

		// Unmarshal the response body into a map
		var response map[string]any
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Assert that the response message is "User registered successfully" and the response id is not nil
		require.Equal(t, "User registered successfully", response["message"])
		require.NotNil(t, response["id"])
	})

	// Test case: invalid JSON body
	t.Run("invalid json body", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)

		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, utilsInstance)

		// Create a new HTTP request with invalid JSON body
		req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBufferString("invalid json"))

		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 400 Bad Request and the response body contains "Invalid request body"
		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid request body")
	})

	// Test case: validation error - missing fields
	t.Run("validation error - missing fields", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)
		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, utilsInstance)

		// Create a RegisterRequest with missing required fields
		reqBody := authhandler.RegisterRequest{
			Email: "test@example.com",
			// Missing required fields like Phone, Username, etc.
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)

		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))

		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 400 Bad Request and the response body contains "Invalid request body"
		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid request body")
	})

	// Test case: invalid date format
	t.Run("invalid date format", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)
		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, utilsInstance)

		// Create a RegisterRequest with an invalid date format
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "01-01-2000", // Wrong format
			CurrentCountry: 1,
			CurrentState:   1,
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)
		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))
		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 400 Bad Request and the response body contains "Invalid date format"
		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid date format")
	})

	// Test case: registration service error
	t.Run("registration service error", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)
		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, utilsInstance)

		// Create a RegisterRequest with valid data
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "2000-01-01",
			CurrentCountry: 1,
			CurrentState:   1,
			CurrentCity:    1,
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)
		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))
		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Set up the mock service to return an error
		mockService.On("Register", mock.Anything, mock.Anything, reqBody.Nin, reqBody.OnboardingID).Return(authservice.RegisterResult{}, errors.New("registration failed"))

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 500 Internal Server Error
		require.Equal(t, http.StatusInternalServerError, rr.Code)

		// Assert that the response body contains "Failed to create user: registration failed"
		require.Contains(t, rr.Body.String(), "Failed to create user: registration failed")
	})
}

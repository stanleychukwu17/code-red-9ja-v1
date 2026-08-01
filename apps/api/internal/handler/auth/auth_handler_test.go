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

type MockUsersService struct {
	mock.Mock
}

func (m *MockUsersService) CheckNIN(ctx context.Context, nin string) bool {
	args := m.Called(ctx, nin)
	return args.Bool(0)
}

func (m *MockUsersService) CheckUsername(ctx context.Context, username string) bool {
	args := m.Called(ctx, username)
	return args.Bool(0)
}

func (m *MockAuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string, onboardingID string, question1 int16, answer1 string, question2 int16, answer2 string) (authservice.RegisterResult, error) {
	args := m.Called(ctx, params, nin, onboardingID, question1, answer1, question2, answer2)
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

func (m *MockAuthService) ResendOtp(ctx context.Context, phone string, id string) (authservice.RegisterPhaseSignUpResult, error) {
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

func (m *MockAuthService) Login(ctx context.Context, identifierType string, identifier, password string, iso2 string, allowedRoles ...string) (authservice.LoginResult, error) {
	args := m.Called(ctx, identifierType, identifier, password, iso2, allowedRoles)
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

func (m *MockAuthService) VerifySecurityQuestions(ctx context.Context, nin string, q1 int16, a1 string, q2 int16, a2 string) (authservice.VerifySecurityQuestionsResult, error) {
	args := m.Called(ctx, nin, q1, a1, q2, a2)
	return args.Get(0).(authservice.VerifySecurityQuestionsResult), args.Error(1)
}

func (m *MockAuthService) ForgotPassword(ctx context.Context, changePasswordID string, userFid int64, password string) error {
	args := m.Called(ctx, changePasswordID, userFid, password)
	return args.Error(0)
}

func (m *MockAuthService) ListAdmins(ctx context.Context) ([]queries.ListAdminsRow, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]queries.ListAdminsRow), args.Error(1)
}

func (m *MockAuthService) RegisterCandidatePlaceholder(ctx context.Context, email, password, firstName, lastName, middleName, gender, avatar string, role, roleLevel string, dob time.Time, countryID, stateID int16, currentCity int32, stateOfOrigin int16, partyID int64) (authservice.RegisterResult, error) {
	args := m.Called(ctx, email, password, firstName, lastName, middleName, gender, avatar, role, roleLevel, dob, countryID, stateID, currentCity, stateOfOrigin, partyID)
	return args.Get(0).(authservice.RegisterResult), args.Error(1)
}

func (m *MockAuthService) GetUserDetailsByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error) {
	args := m.Called(ctx, fakeID)
	return args.Get(0).(queries.UserWithPlaces), args.Error(1)
}

func (m *MockAuthService) ChangePasswordByEmail(ctx context.Context, email, newPassword string) error {
	args := m.Called(ctx, email, newPassword)
	return args.Error(0)
}

func (m *MockAuthService) MakeUserSuperAdmin(ctx context.Context, username string) error {
	args := m.Called(ctx, username)
	return args.Error(0)
}

func (m *MockAuthService) SaveSomeUserRegistrationDetails(ctx context.Context, username, email, nin string, userID int64, fakeID int64) error {
	args := m.Called(ctx, username, email, nin, userID, fakeID)
	return args.Error(0)
}

func (m *MockAuthService) CheckAndAssignRole(ctx context.Context, userID int64, fakeID int64, roleCode string, whoAssigned int64) error {
	args := m.Called(ctx, userID, fakeID, roleCode, whoAssigned)
	return args.Error(0)
}

func (m *MockAuthService) UpdateUserRoles(ctx context.Context, userID int64, roles []string, partyID *int64, whoAssigned int64) error {
	args := m.Called(ctx, userID, roles, partyID, whoAssigned)
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
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		// Create a RegisterRequest with valid data
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Question1:      1,
			Answer1:        "dog",
			Question2:      2,
			Answer2:        "cat",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "2000-01-01",
			CurrentCountry: 1,
			CurrentState:   1,
			CurrentCity:    1,
			OnboardingID:   "test-uuid",
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)
		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))
		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Set up the mock service to return a RegisterResult with UserID and FakeID
		mockService.On("Register", mock.Anything, mock.Anything, reqBody.Nin, reqBody.OnboardingID, reqBody.Question1, reqBody.Answer1, reqBody.Question2, reqBody.Answer2).Return(authservice.RegisterResult{UserID: 1, FakeID: 12345}, nil)

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
		data := response["data"].(map[string]any)
		require.NotNil(t, data["id"])
	})

	// Test case: invalid JSON body
	t.Run("invalid json body", func(t *testing.T) {
		// Create a new instance of the MockAuthService
		mockService := new(MockAuthService)

		// Create a new instance of the AuthHandler with the mock service and utils instance
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

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
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

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
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		// Create a RegisterRequest with an invalid date format
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Question1:      1,
			Answer1:        "dog",
			Question2:      2,
			Answer2:        "cat",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "01-01-2000", // Wrong format
			CurrentCountry: 1,
			CurrentState:   1,
			OnboardingID:   "test-uuid",
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
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		// Create a RegisterRequest with valid data
		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "test_user",
			Nin:            "12345678901",
			Question1:      1,
			Answer1:        "dog",
			Question2:      2,
			Answer2:        "cat",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "2000-01-01",
			CurrentCountry: 1,
			CurrentState:   1,
			CurrentCity:    1,
			OnboardingID:   "test-uuid",
		}

		// Marshal the RegisterRequest into JSON
		body, _ := json.Marshal(reqBody)
		// Create a new HTTP request with the JSON body
		req, _ := http.NewRequest("POST", utils.ApiUrls.Auth.Register, bytes.NewBuffer(body))
		// Create a new HTTP response recorder
		rr := httptest.NewRecorder()

		// Set up the mock service to return an error
		mockService.On("Register", mock.Anything, mock.Anything, reqBody.Nin, reqBody.OnboardingID, reqBody.Question1, reqBody.Answer1, reqBody.Question2, reqBody.Answer2).Return(authservice.RegisterResult{}, errors.New("registration failed"))

		// Call the Register method of the AuthHandler with the request and response recorder
		handler.Register(rr, req)

		// Assert that the response code is 500 Internal Server Error
		require.Equal(t, http.StatusInternalServerError, rr.Code)

		// Assert that the response body contains "Failed to create user: registration failed"
		require.Contains(t, rr.Body.String(), "Failed to create user: registration failed")
	})
}

// TestAdminLogin tests the AdminLogin method of the AuthHandler
func TestAdminLogin(t *testing.T) {
	utilsInstance := utils.NewUtils(nil)

	t.Run("successful admin login", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		reqBody := authhandler.AdminLoginRequest{
			IdentifierType: "email",
			Identifier:     "admin@example.com",
			Password:       "password123",
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/admin/login", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		mockService.On("Login", mock.Anything, reqBody.IdentifierType, reqBody.Identifier, reqBody.Password, "", []string{"admin", "super_admin"}).Return(authservice.LoginResult{
			AccessToken:  "access-token",
			RefreshToken: "refresh-token",
			User: authservice.LoginUser{
				FakeID:   12345,
				Username: "superadmin",
				Roles:    []string{"admin"},
			},
		}, nil)

		handler.AdminLogin(rr, req)

		require.Equal(t, http.StatusOK, rr.Code)
		var response map[string]any
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		require.Equal(t, "Login successful", response["message"])
		data := response["data"].(map[string]any)
		require.Equal(t, "access-token", data["accessToken"])
	})
}

// TestChangePasswordByEmail tests the ChangePasswordByEmail method of the AuthHandler
func TestChangePasswordByEmail(t *testing.T) {
	utilsInstance := utils.NewUtils(nil)

	t.Run("successful password change", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		reqBody := authhandler.ChangePasswordByEmailRequest{
			Email:    "user@example.com",
			Password: "password123",
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/change-password", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		mockService.On("ChangePasswordByEmail", mock.Anything, reqBody.Email, reqBody.Password).Return(nil)

		handler.ChangePasswordByEmail(rr, req)

		require.Equal(t, http.StatusOK, rr.Code)
		var response map[string]any
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		require.Equal(t, "Password changed successfully", response["message"])
	})

	t.Run("validation failure - short password", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		reqBody := authhandler.ChangePasswordByEmailRequest{
			Email:    "user@example.com",
			Password: "123", // too short
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/change-password", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		handler.ChangePasswordByEmail(rr, req)

		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Validation failed")
	})

	t.Run("service failure - user not found", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, new(MockUsersService), utilsInstance)

		reqBody := authhandler.ChangePasswordByEmailRequest{
			Email:    "notfound@example.com",
			Password: "password123",
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/change-password", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		mockService.On("ChangePasswordByEmail", mock.Anything, reqBody.Email, reqBody.Password).Return(errors.New("user not found"))

		handler.ChangePasswordByEmail(rr, req)

		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "user not found")
	})
}

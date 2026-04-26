package authhandler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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

func (m *MockAuthService) Register(ctx context.Context, params queries.CreateUserParams, nin string) (authservice.RegisterResult, error) {
	args := m.Called(ctx, params, nin)
	return args.Get(0).(authservice.RegisterResult), args.Error(1)
}

func TestRegister(t *testing.T) {
	utilsInstance := utils.NewUtils(nil)

	t.Run("successful registration", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, utilsInstance)

		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "testuser",
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

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		mockService.On("Register", mock.Anything, mock.Anything, reqBody.Nin).Return(authservice.RegisterResult{UserID: 1, FakeID: 12345}, nil)

		handler.Register(rr, req)

		require.Equal(t, http.StatusCreated, rr.Code)

		var response map[string]any
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		require.Equal(t, "User registered successfully", response["message"])
		require.NotNil(t, response["id"])
	})

	t.Run("invalid json body", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, utilsInstance)

		req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBufferString("invalid json"))
		rr := httptest.NewRecorder()

		handler.Register(rr, req)

		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("validation error - missing fields", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, utilsInstance)

		reqBody := authhandler.RegisterRequest{
			Email: "test@example.com",
			// Missing required fields like Phone, Username, etc.
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		handler.Register(rr, req)

		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("invalid date format", func(t *testing.T) {
		mockService := new(MockAuthService)
		handler := authhandler.NewHandler(mockService, utilsInstance)

		reqBody := authhandler.RegisterRequest{
			Email:          "test@example.com",
			Phone:          "+2348012345678",
			Username:       "testuser",
			Nin:            "12345678901",
			Password:       "password123",
			LastName:       "Doe",
			FirstName:      "John",
			Gender:         "male",
			DateOfBirth:    "01-01-2000", // Wrong format
			CurrentCountry: 1,
			CurrentState:   1,
		}

		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		handler.Register(rr, req)

		require.Equal(t, http.StatusBadRequest, rr.Code)
		require.Contains(t, rr.Body.String(), "Invalid date format")
	})
}

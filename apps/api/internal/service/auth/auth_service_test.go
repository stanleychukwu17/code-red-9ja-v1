package authservice_test

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	authhandler "free9ja/api/internal/handler/auth"
	authservice "free9ja/api/internal/service/auth"
	"free9ja/api/internal/utils"
	"free9ja/api/test"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

var (
	testPool    *pgxpool.Pool
	testRedis   *redis.Client
	authService *authservice.AuthService
)

type mockMessagingService struct{}

func (m *mockMessagingService) SendWhatsAppOTP(phone, otp string) error {
	return nil
}

func TestRegister(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)
	ctx := context.Background()

	app := test.TestNewApp(t, ctx, cfg)
	defer app.Server.Shutdown(ctx)

	// Create a RegisterRequest with valid data
	requestBody := authhandler.RegisterRequest{
		Email:          "johnDoe@example.com",
		Phone:          "+2348012345678",
		Username:       "johnDoe",
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
		CurrentCountry: 161,
		CurrentState:   293,
		CurrentCity:    153369,
	}

	// create a dynamic url using the config.Port, then attach the registration path
	url := fmt.Sprintf("http://localhost:%s%s", cfg.Port, utils.ApiUrls.Auth.Register)

	t.Run("successful registration", func(t *testing.T) {
		response, respBody := test.SendRequest(t, "POST", url, requestBody)
		// fmt.Printf("Status: %s, Response: %s\n", response.Status, string(respBody))

		require.Equal(t, response.StatusCode, http.StatusCreated, "expected status code %d, got %d", http.StatusCreated, response.StatusCode)
		require.Contains(t, string(respBody), "User registered successfully")
		require.Contains(t, string(respBody), "UserID")
	})

	t.Run("duplicate username", func(t *testing.T) {
		response, respBody := test.SendRequest(t, "POST", url, requestBody)
		// fmt.Printf("Status: %s, Response: %s\n", response.Status, string(respBody))

		require.Equal(t, response.StatusCode, http.StatusInternalServerError, "expected status code %d, got %d", http.StatusInternalServerError, response.StatusCode)
		require.Contains(t, string(respBody), "username already exists")
	})

	t.Run("duplicate email", func(t *testing.T) {
		// Change only the username so it doesn't trigger the username check first
		req := requestBody
		req.Username = "johnDoe2"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "email already exists")
	})

	t.Run("duplicate phone number", func(t *testing.T) {
		// Change username and email
		req := requestBody
		req.Username = "johnDoe3"
		req.Email = "johnDoe3@example.com"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "phone already exists")
	})

	t.Run("duplicate nin", func(t *testing.T) {
		// Change username, email, and phone
		req := requestBody
		req.Username = "johnDoe4"
		req.Email = "johnDoe4@example.com"
		req.Phone = "+2348012345679"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "nin already exists")
	})

	t.Run("invalid country", func(t *testing.T) {
		req := requestBody
		req.Username = "johnDoe5"
		req.Email = "johnDoe5@example.com"
		req.Phone = "+2348012345680"
		req.CurrentCountry = 9999                                            // Invalid country
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid country ID")
	})

	t.Run("invalid state", func(t *testing.T) {
		req := requestBody
		req.Username = "johnDoe6"
		req.Email = "johnDoe6@example.com"
		req.Phone = "+2348012345681"
		req.CurrentState = 9999                                              // Invalid state
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid state ID")
	})

	t.Run("invalid city", func(t *testing.T) {
		req := requestBody
		req.Username = "johnDoe7"
		req.Email = "johnDoe7@example.com"
		req.Phone = "+2348012345682"
		req.CurrentCity = 111111111                                          // Invalid city
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid city ID")
	})

	t.Run("invalid phone number", func(t *testing.T) {
		req := requestBody
		req.Username = "johnDoe8"
		req.Email = "johnDoe8@example.com"
		req.Phone = "+18012345678"                                           // Invalid phone number
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "phone number does not match country NG")
	})

	t.Run("underage user", func(t *testing.T) {
		req := requestBody
		req.Username = "johnDoe9"
		req.Email = "johnDoe9@example.com"
		req.Phone = "+2348012345683"
		// Set birth date to something recent (e.g., 10 years ago)
		req.DateOfBirth = time.Now().AddDate(-10, 0, 0).Format("2006-01-02")
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "you must be at least 18 years old")
	})

}

func TestCleanUsername(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		wantErr  bool
	}{
		{"valid username", "JohnDoe", "johnDoe", false},
		{"valid with dot", "john.doe", "john.doe", false},
		{"valid with underscore", "john_doe", "john_doe", false},
		{"valid alphanumeric", "j0hn123", "j0hn123", false},
		{"too short", "a", "", true},
		{"too long", "a123456789012345678901234567890", "", true},
		{"invalid start symbol", ".john", "", true},
		{"invalid end symbol", "john_", "", true},
		{"consecutive dots", "john..doe", "", true},
		{"consecutive underscores", "john__doe", "", true},
		{"mixed consecutive symbols", "john._doe", "", true},
		{"invalid characters", "john@doe", "", true},
		{"whitespace trim", "  johnDoe  ", "johnDoe", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := authservice.CleanUsername(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("CleanUsername() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got != tt.expected {
				t.Errorf("CleanUsername() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestValidatePhoneForCountry(t *testing.T) {
	s := &authservice.AuthService{}
	tests := []struct {
		name        string
		phone       string
		countryCode string
		expected    string
		wantErr     bool
	}{
		{"valid NG", "+2348012345678", "NG", "+2348012345678", false},
		{"valid US", "+18012345678", "US", "+18012345678", false},
		{"invalid format", "12345", "NG", "", true},
		{"mismatch country", "+18012345678", "NG", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := s.ValidatePhoneForCountry(tt.phone, tt.countryCode)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePhoneForCountry() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.expected {
				t.Errorf("ValidatePhoneForCountry() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestCheckPhone(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)
	ctx := context.Background()

	app := test.TestNewApp(t, ctx, cfg)
	defer app.Server.Shutdown(ctx)

	q := queries.New(app.DB)
	s := authservice.NewAuthService(q, app.RDB, &mockMessagingService{}, "jwt_test_string", 15*time.Minute, 168*time.Hour)

	phone := "+2348011111111"

	// 1. Check before inserting
	exists := s.CheckPhone(ctx, phone)
	require.False(t, exists)

	// 2. Insert into redis
	app.RDB.Set(ctx, db.RedisPhoneFakeID+phone, "123456", 0)
	exists = s.CheckPhone(ctx, phone)
	require.True(t, exists)

	fmt.Println("success")
}

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

func TestRegister(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)
	ctx := context.Background()

	app := test.TestNewApp(t, ctx, cfg)
	defer app.Server.Shutdown(ctx)

	// Create a RegisterRequest with valid data
	requestBody := authhandler.RegisterRequest{
		Email:          "johndoe@example.com",
		Phone:          "+2348012345678",
		Username:       "johndoe",
		Nin:            "12345678901",
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
	url := fmt.Sprintf("http://localhost:%s%s", cfg.Port, utils.ApiUrls.Register)

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
		req.Username = "johndoe2"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "email already exists")
	})

	t.Run("duplicate phone number", func(t *testing.T) {
		// Change username and email
		req := requestBody
		req.Username = "johndoe3"
		req.Email = "johndoe3@example.com"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "phone already exists")
	})

	t.Run("duplicate nin", func(t *testing.T) {
		// Change username, email, and phone
		req := requestBody
		req.Username = "johndoe4"
		req.Email = "johndoe4@example.com"
		req.Phone = "+2348012345679"

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "nin already exists")
	})

	t.Run("invalid country", func(t *testing.T) {
		req := requestBody
		req.Username = "johndoe5"
		req.Email = "johndoe5@example.com"
		req.Phone = "+2348012345680"
		req.CurrentCountry = 9999                                            // Invalid country
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid country ID")
	})

	t.Run("invalid state", func(t *testing.T) {
		req := requestBody
		req.Username = "johndoe6"
		req.Email = "johndoe6@example.com"
		req.Phone = "+2348012345681"
		req.CurrentState = 9999                                              // Invalid state
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid state ID")
	})

	t.Run("invalid city", func(t *testing.T) {
		req := requestBody
		req.Username = "johndoe7"
		req.Email = "johndoe7@example.com"
		req.Phone = "+2348012345682"
		req.CurrentCity = 111111111                                          // Invalid city
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "invalid city ID")
	})

	t.Run("invalid phone number", func(t *testing.T) {
		req := requestBody
		req.Username = "johndoe8"
		req.Email = "johndoe8@example.com"
		req.Phone = "+18012345678"                                           // Invalid phone number
		req.Nin = fmt.Sprintf("%011d", rand.Int63n(90000000000)+10000000000) // Random 11 digit nin

		response, respBody := test.SendRequest(t, "POST", url, req)
		require.Equal(t, response.StatusCode, http.StatusInternalServerError)
		require.Contains(t, string(respBody), "phone number does not match country NG")
	})

	t.Run("underage user", func(t *testing.T) {
		req := requestBody
		req.Username = "johndoe9"
		req.Email = "johndoe9@example.com"
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
		{"valid username", "JohnDoe", "johndoe", false},
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
		{"whitespace trim", "  johndoe  ", "johndoe", false},
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
	s := authservice.NewAuthService(q, app.RDB)

	phone := "+2348011111111"

	// 1. Check before inserting
	exists := s.CheckPhone(ctx, phone)
	require.False(t, exists)

	// 2. Insert into redis
	app.RDB.SAdd(ctx, db.RedisRegisteredPhones, phone)
	exists = s.CheckPhone(ctx, phone)
	require.True(t, exists)

	// 3. Not in redis, but in users_phone_numbers table
	phone2 := "+2348022222222"

	// We need a user to associate the phone number with.
	// Using a simple insert to avoid filling all fields of queries.CreateUserParams
	var userID int64
	err := app.DB.QueryRow(ctx, "INSERT INTO users (email, phone, username, password_hash, current_country, current_state, current_city) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
		"phone2@example.com", "+2348022222223", "phone2user", "hash", 161, 293, 153369).Scan(&userID)
	require.NoError(t, err)

	_, err = q.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
		UserID: userID,
		Phone:  phone2,
	})
	require.NoError(t, err)

	// Ensure it's not in Redis
	app.RDB.SRem(ctx, db.RedisRegisteredPhones, phone2)

	exists = s.CheckPhone(ctx, phone2)
	require.True(t, exists)

	fmt.Println("success")
}

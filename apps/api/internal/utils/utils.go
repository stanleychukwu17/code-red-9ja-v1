package utils

import (
	"context"
	cryptoRand "crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	mathRand "math/rand"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"golang.org/x/crypto/bcrypt"
)

type Utils struct {
	db *pgxpool.Pool
}

func NewUtils(db *pgxpool.Pool) *Utils {
	return &Utils{
		db: db,
	}
}

// RespondJSON writes a JSON response with the given status code and body.
func (u *Utils) RespondJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// RespondError writes a JSON error response using the same envelope shape as
// RespondSuccess: { success: false, message: string, data: null }.
func (u *Utils) RespondError(w http.ResponseWriter, statusCode int, message string) {
	u.RespondJSON(w, statusCode, map[string]interface{}{
		"success": false,
		"message": message,
		"data":    nil,
	})
}

// RespondSuccess writes a JSON success response.
// Shape: { success: true, message: string, data: {...}, meta?: {...} }
func (u *Utils) RespondSuccess(w http.ResponseWriter, statusCode int, message string, data map[string]interface{}) {
	res := map[string]interface{}{
		"success": true,
		"message": message,
		"data":    nil,
	}
	if data != nil {
		if meta, ok := data["meta"]; ok {
			res["meta"] = meta
			delete(data, "meta")
		}
		res["data"] = data
	}
	u.RespondJSON(w, statusCode, res)
}

// CheckRoles checks if the request context contains valid JWT claims using the provided claimsKey,
// and verifies if the user has any of the specified roles. If any check fails, it writes an error
// response using RespondError and returns false. If successful, it returns the claims and true.
func (u *Utils) CheckRoles(r *http.Request, w http.ResponseWriter, claimsKey interface{}, roles ...string) (*JWTClaims, bool) {
	claims, ok := r.Context().Value(claimsKey).(*JWTClaims)
	if !ok || claims == nil {
		u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return nil, false
	}

	if len(roles) > 0 && !claims.HasAnyRole(roles...) {
		u.RespondError(w, http.StatusForbidden, "Forbidden")
		return nil, false
	}

	return claims, true
}

// SuccessResponse represents a generic success response structure for API documentation.
type SuccessResponse struct {
	Success bool                   `json:"success" example:"true"`
	Message string                 `json:"message" example:"Operation successful"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

// ErrorResponse represents a generic error response structure for API documentation.
type ErrorResponse struct {
	Success bool        `json:"success" example:"false"`
	Message string      `json:"message" example:"Error message description"`
	Data    interface{} `json:"data"`
}

type PostgresTestConfig struct {
	Host string
	Port string
}

func FormatPostgresDSN(db_user, db_password, db_host, db_port, db_name, sslMode string) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", db_user, db_password, db_host, db_port, db_name, sslMode)
}

func SetupPostgresTestContainer(db_user, db_password, db_name, db_port string) (PostgresTestConfig, testcontainers.Container, error) {
	ctx := context.Background()

	// Create container request
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16.3-alpine3.20",
		ExposedPorts: []string{fmt.Sprintf("%v/tcp", db_port)},
		Env: map[string]string{
			"POSTGRES_USER":     db_user,
			"POSTGRES_PASSWORD": db_password,
			"POSTGRES_DB":       db_name,
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(300 * time.Second),
	}

	// Create and start the container
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return PostgresTestConfig{}, nil, fmt.Errorf("failed to start container: %w", err)
	}

	host, _ := container.Host(ctx)                   // Get container host (IP)
	port, _ := container.MappedPort(ctx, "5432/tcp") // Get mapped port
	// dsn := fmt.Sprintf(
	// 	"host=%s user=%v password=%v dbname=%v port=%v sslmode=disable", host, db_user, db_password, db_name, port.Port(),
	// )

	return PostgresTestConfig{host, port.Port()}, container, nil
}

func SetupRedisTestContainer(redis_port string) (string, testcontainers.Container, error) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "redis:7.2.13-alpine",
		ExposedPorts: []string{fmt.Sprintf("%s/tcp", redis_port)},
		WaitingFor: wait.ForListeningPort(
			fmt.Sprintf("%s/tcp", redis_port),
		).WithStartupTimeout(300 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to start redis container: %w", err)
	}

	host, _ := container.Host(ctx)
	port, _ := container.MappedPort(ctx, fmt.Sprintf("%s/tcp", redis_port))

	addr := fmt.Sprintf("%s:%s", host, port.Port())
	return addr, container, nil
}

func GenerateOTP() (string, string, error) {
	n, err := cryptoRand.Int(cryptoRand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", "", err
	}

	otp := fmt.Sprintf("%06d", n.Int64())

	hashedOTP, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}

	return otp, string(hashedOTP), nil
}

// function: generates fake_id using the original id
func GenerateFakeID(id int64) int64 {
	front_id := mathRand.Intn(1000)
	back_id := mathRand.Intn(1000)

	fake_id := fmt.Sprintf("%d%d%d", front_id, id, back_id)
	fake_id_int, _ := strconv.ParseInt(fake_id, 10, 64)
	return fake_id_int
}

// JSONDate is a custom wrapper around time.Time that supports unmarshaling
// both standard RFC3339 strings and YYYY-MM-DD date-only strings.
type JSONDate time.Time

// Time returns the underlying time.Time value.
func (jd JSONDate) Time() time.Time {
	return time.Time(jd)
}

// IsZero returns true if the underlying time is zero.
func (jd JSONDate) IsZero() bool {
	return time.Time(jd).IsZero()
}

// UnmarshalJSON implements json.Unmarshaler.
func (jd *JSONDate) UnmarshalJSON(b []byte) error {
	s := string(b)
	s = strings.Trim(s, `"`)
	if s == "" || s == "null" {
		return nil
	}

	// Try RFC3339Nano (covers standard RFC3339 with or without fractional seconds)
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		*jd = JSONDate(t)
		return nil
	}

	// Try date-only YYYY-MM-DD
	if t, err := time.Parse("2006-01-02", s); err == nil {
		*jd = JSONDate(t)
		return nil
	}

	// Try ISO date-time string without timezone (e.g. "2006-01-02T15:04:05")
	if t, err := time.Parse("2006-01-02T15:04:05", s); err == nil {
		*jd = JSONDate(t)
		return nil
	}

	return fmt.Errorf("cannot parse %q as date/time", s)
}

// MarshalJSON implements json.Marshaler.
func (jd JSONDate) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Time(jd))
}

// GetIP extracts the client's actual IP address from the incoming HTTP request.
// It handles scenarios where the application is deployed behind a reverse proxy,
// load balancer, or CDN by checking standard forwarding headers (X-Forwarded-For, X-Real-IP)
// before falling back to the raw remote address.
func GetIP(r *http.Request) string {
	// Check X-Forwarded-For
	forwardedFor := r.Header.Get("X-Forwarded-For")
	if forwardedFor != "" {
		ips := strings.Split(forwardedFor, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return strings.TrimSpace(realIP)
	}

	// Fallback to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	} else {
		ip = strings.TrimSpace(ip)
	}

	return ip
}

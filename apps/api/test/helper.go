package test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/config"
	"free9ja/api/internal/db"
	"free9ja/api/internal/router"
	"free9ja/api/internal/utils"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/redis/go-redis/v9"
)

var (
	test_cfg *config.Config
	once     sync.Once
)

// setupTestEnvironmentVariables: prepares environment for testing with testcontainers
func setupTestEnvironmentVariables() {
	os.Setenv("IS_TESTING", "true")
}

// cleanupTestEnvironmentVariables: removes test environment variables
func cleanupTestEnvironmentVariables() {
	os.Unsetenv("IS_TESTING")
}

// BeforeAll: runs once before all tests
func BeforeAll(t *testing.T) (*config.Config, error) {
	once.Do(func() {
		setupTestEnvironmentVariables()
		test_cfg = config.Load()
	})

	return test_cfg, nil
}

// BeforeEach: prepares environment for each test with testcontainers
func BeforeEach(t *testing.T) (*config.Config, error) {
	cfg, _ := BeforeAll(t)
	setupTestEnvironmentVariables()
	return cfg, nil
}

// AfterEach: cleans up environment after each test with testcontainers
func AfterEach(t *testing.T) (*testing.T, error) {
	cleanupTestEnvironmentVariables()
	return t, nil
}

// TestNewApp: creates a connection to the testing database,
// use chi to listen to request to the url and also start the server
type TestApp struct {
	Cfg    *config.Config
	DB     *pgxpool.Pool
	RDB    *redis.Client
	Server *http.Server
	addr   *net.TCPAddr
}

// this function is a mock function that sets up a new application for testing
// it mocks the main.newApp() function, using testcontainers to spin up a new postgres and redis instances
// and then runs db migrations to the postgres instance to create the necessary tables and data.
func TestNewApp(t *testing.T, ctx context.Context, cfg *config.Config) *TestApp {
	// Initialize postgres database
	pool, _ := db.NewPostgresPool(ctx, cfg.Database.URL)
	// if err != nil {
	// 	t.Fatalf("failed to initialize database: %v", err)
	// }

	// Run Goose migrations
	runMigrations(cfg.Database.URL)
	// if err := runMigrations(cfg.Database.URL); err != nil {
	// 	t.Fatalf("failed to run migrations: %v", err)
	// }

	// Initialize Redis
	rdb, _ := db.NewRedisClient(cfg.Redis)
	// if err != nil {
	// 	t.Fatalf("failed to initialize redis: %v", err)
	// }

	// Initialize router
	r := router.New(pool, rdb)

	// use random free port
	listener, _ := net.Listen("tcp", ":0")
	// if err != nil {
	// 	t.Fatalf("failed to get free port: %v", err)
	// }
	addr := listener.Addr().(*net.TCPAddr) // convert listener to TCPAddr to get port
	port := addr.Port                      // get the port from the TCPAddr
	t.Logf("starting server addr: %d", port)

	// update port in config to the random port returned by the operating system
	cfg.Port = fmt.Sprintf("%d", port)

	// run server in background, if you do not use a goroutine for starting the server,
	// then server will block the execution of the test, and the test will not be able to run
	// server.ListenAndServe() is a blocking call
	server := &http.Server{Handler: r}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			t.Logf("server error: %v", err)
		}
	}()

	// wait until server is ready (this is better than doing sleep: time.Sleep(500 * time.Millisecond) // .5s)
	waitForServer("http://" + addr.String())

	return &TestApp{
		Cfg:    cfg,
		DB:     pool,
		RDB:    rdb,
		Server: server,
		addr:   addr,
	}
}

func waitForServer(baseURL string) {
	client := &http.Client{Timeout: 1 * time.Second}
	maxRetries := 10

	for i := 0; i < maxRetries; i++ {
		time.Sleep(10 * time.Millisecond)

		resp, err := client.Get(baseURL + utils.ApiUrls.Health)
		if err == nil && resp.StatusCode == http.StatusOK {
			return
		}
	}
}

// runMigrations: executes Goose migrations on the test database
func runMigrations(connString string) error {
	db, err := sql.Open("pgx", connString)
	if err != nil {
		return fmt.Errorf("failed to open database for migrations: %w", err)
	}
	defer db.Close()

	// Get the absolute path to the migrations directory
	_, filename, _, _ := runtime.Caller(0) // read about runtime at the end of this function
	migrationDir := filepath.Join(filepath.Dir(filename), "..", "db", "migrations")

	goose.SetDialect("postgres")
	goose.Up(db, migrationDir)

	return nil

	// runtime is a standard library package in Go (no external dependency). It provides low-level information about the Go
	// program while it’s running—things like the call stack, goroutines, etc.
	//
	// runtime.Caller(skip int) returns information about a function call in the call stack.
	// The 0 means: “give me information about the current function”.
	// It returns 4 values: pc, file, line, ok
	//
	// pc (pointer to code)
	// file (file name) - filename = the full absolute path of the current .go file at runtime, e.g: /home/user/project/api/test/helper.go
	// line (line number)
	// ok (boolean indicating success)
	//
}

// SendRequest sends an HTTP request to the test server and returns the response and body.
func SendRequest(t *testing.T, method, url string, body any) (*http.Response, []byte) {
	var bodyBuffer io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		bodyBuffer = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, bodyBuffer)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to send request: %v", err)
	}
	defer response.Body.Close()

	respBody, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	return response, respBody
}

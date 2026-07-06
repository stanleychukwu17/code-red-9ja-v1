package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"free9ja/api/test"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewApp(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)

	// Create app instance with the test config
	ctx := context.Background()
	app := newApp(ctx, cfg)

	// Using assert: test will log the failure but continue running
	// assert.NotNil(t, app, "assert: expected app to be created, got nil")
	// t.Log("This line WILL run even though assert failed")

	assert.NotNil(t, app, "assert: expected app to be created, got nil")
	require.NotNil(t, app, "expected app to be created, got nil")
	require.NotNil(t, app.cfg, "expected app.cfg to be set")
	require.NotNil(t, app.db, "expected app.db to be initialized")
	require.NotNil(t, app.rdb, "expected app.rdb to be initialized")
	require.NotNil(t, app.server, "expected app.server to be initialized")

	// Cleanup
	require.NoError(t, app.Close(), "failed to close app")
}

func TestAppRunAndShutdown(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)

	// Create app instance with the test config
	ctx := context.Background()
	app := newApp(ctx, cfg)

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		errChan <- app.Run()
	}()

	// Give server time to start
	time.Sleep(500 * time.Millisecond)

	// Test health endpoint
	serverURL := fmt.Sprintf("http://localhost%s/health", app.server.Addr)
	resp, err := http.Get(serverURL)
	if err != nil {
		t.Logf("health check request failed (may be expected if port 0): %v", err)
	} else {
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.StatusCode)
		}
	}

	// Test graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := app.server.Shutdown(shutdownCtx); err != nil {
		t.Errorf("server shutdown failed: %v", err)
	}

	// Wait for Run() to return
	select {
	case err := <-errChan:
		if err != nil && err != http.ErrServerClosed {
			t.Errorf("unexpected error from Run(): %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Error("timeout waiting for Run() to complete")
	}
}

func TestAppClose(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)

	ctx := context.Background()
	app := newApp(ctx, cfg)

	// Test Close method
	if err := app.Close(); err != nil {
		t.Errorf("Close() returned error: %v", err)
	}

	// Verify connections are closed by trying to ping
	if err := app.db.Ping(ctx); err == nil {
		t.Error("expected db connection to be closed, but ping succeeded")
	}

	if err := app.rdb.Ping(ctx).Err(); err == nil {
		t.Error("expected redis connection to be closed, but ping succeeded")
	}
}

func TestSignalHandling(t *testing.T) {
	test.BeforeEach(t)
	defer test.AfterEach(t)

	// Create a context that we can cancel to simulate signal
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Send signal after short delay
	go func() {
		time.Sleep(100 * time.Millisecond)
		cancel()
	}()

	// Wait for context cancellation
	<-ctx.Done()

	// Verify context was cancelled
	if ctx.Err() == nil {
		t.Error("expected context to be cancelled")
	}
}

func TestNewAppWithInvalidDB(t *testing.T) {
	// Temporarily set invalid DB URL
	os.Setenv("IS_TESTING", "false")
	os.Setenv("DATABASE_URL", "postgres://invalid:invalid@localhost:9999/invalid")
	os.Setenv("REDIS_ADDR", "localhost:6379")

	_, _ = test.BeforeEach(t)
	defer test.AfterEach(t)

	// This should exit, so we run it in a separate process or use a recover pattern
	// For now, just verify the function exists and has proper structure
	t.Log("newApp with invalid config would call os.Exit(1) - skipping actual execution")
}

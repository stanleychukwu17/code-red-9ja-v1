package router_test

import (
	"context"
	"free9ja/api/internal/db"
	"free9ja/api/internal/router"
	"free9ja/api/test"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/require"
)

func TestNewRouter(t *testing.T) {
	cfg, _ := test.BeforeEach(t)
	defer test.AfterEach(t)

	// Initialize database
	pool, err := db.NewPostgresPool(context.Background(), cfg.Database.URL)
	if err != nil {
		t.Fatalf("failed to create connection pool: %v", err)
	}
	defer pool.Close()

	// Initialize Redis
	rdb, err := db.NewRedisClient(cfg.Redis)
	if err != nil {
		slog.Error("failed to initialize redis", "err", err)
		os.Exit(1)
	}
	defer rdb.Close()

	// Initialize router
	r := router.New(pool, rdb)

	req := httptest.NewRequest(http.MethodGet, utils.ApiUrls.Health, nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	require.NotNil(t, r)
}

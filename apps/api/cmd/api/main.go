package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db"
	"free9ja/api/internal/logger"
	"free9ja/api/internal/router"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// @title Free9ja API
// @version 1.0
// @description API for the Free9ja platform.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:4000
// @BasePath /api/v1

type App struct {
	cfg    *config.Config
	server *http.Server
	db     *pgxpool.Pool
	rdb    *redis.Client
}

func (a *App) Close() {
	a.db.Close()
	a.rdb.Close()
}

func newApp(ctx context.Context, cfg *config.Config) *App {
	// Initialize database
	pool, err := db.NewPostgresPool(context.Background(), cfg.Database.URL)
	if err != nil {
		slog.Error("failed to initialize database", "err", err)
		os.Exit(1)
	}

	// Initialize Redis
	rdb, err := db.NewRedisClient(cfg.Redis)
	if err != nil {
		slog.Error("failed to initialize redis", "err", err)
		os.Exit(1)
	}

	// Initialize router
	r := router.New(pool, rdb)
	addr := fmt.Sprintf(":%s", cfg.Port)
	slog.Info("starting server", "addr", addr)

	return &App{
		cfg: cfg,
		db:  pool,
		rdb: rdb,
		server: &http.Server{
			Addr:    addr,
			Handler: r,
		},
	}
}

func (a *App) Run() {
	if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}

func main() {
	cfg := config.Load()

	// Setup better structured logging, can now do:
	// slog.Info("hello", "key", "value")
	// slog.Error("uh oh", "err", err)
	// slog.Warn("careful", "msg", "something might be wrong")
	// slog.Debug("deep details", "data", "lots of info")
	// slog.Error("payment failed", "user_id", userID, "order_id", orderID, "step", "charge_card")
	logger.SetupLogger(version, commit)

	app := newApp(context.Background(), cfg)

	app.Run()

	// postgres: defer pool.Close(), redis: defer rdb.Close()
	defer app.Close()

	// Start server
	// if err := http.ListenAndServe(addr, r); err != nil {
	// 	slog.Error("server failed", "err", err)
	// 	os.Exit(1)
	// }
}

package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

func newApp(ctx context.Context, cfg *config.Config) *App {
	// Setup better structured logging, can now do:
	// slog.Info("hello", "key", "value")
	// slog.Error("uh oh", "err", err)
	// slog.Warn("careful", "msg", "something might be wrong")
	// slog.Debug("deep details", "data", "lots of info")
	// slog.Error("payment failed", "user_id", userID, "order_id", orderID, "step", "charge_card")
	// version and commit are located in version.go, but during production,
	// they will be added when building the app during ci/cd
	logger.SetupLogger(version, commit)

	// Initialize postgres database
	pool, err := db.NewPostgresPool(ctx, cfg.Database.URL)
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

func (a *App) Close() error {
	slog.Info("closing all db connections")
	a.db.Close()
	a.rdb.Close()
	return nil
}

func (a *App) Run() error {
	slog.Info("starting server", "addr", a.server.Addr)

	if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server failed", "err", err)
		return fmt.Errorf("server failed, err: %w", err)
	}

	return nil
}

func main() {
	// loads the config
	cfg := config.Load()

	// Setup signal handling for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Initialize app
	app := newApp(context.Background(), cfg)

	// Start the server in a goroutine so that it doesn't block the main function
	go func() {
		if err := app.Run(); err != nil {
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal, e.g. Ctrl+C or docker container closes
	// When the program receives an interrupt signal,
	// the context's Done "channel" is closed, triggering this
	// goroutine to continue and shut down the server gracefully.
	<-ctx.Done()
	slog.Info("shutting down gracefully...")

	// 🔑 Add timeout for shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Proper HTTP shutdown
	if err := app.server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown failed", "err", err)
	}

	// Close other resources (DB, Redis, etc.)
	if err := app.Close(); err != nil {
		slog.Error("app close failed", "err", err)
	}

	slog.Info("shutdown complete")
}

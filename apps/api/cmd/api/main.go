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
func main() {
	cfg := config.Load()

	// Setup better structured logging, can now do:
	// slog.Info("hello", "key", "value")
	// slog.Error("uh oh", "err", err)
	// slog.Warn("careful", "msg", "something might be wrong")
	// slog.Debug("deep details", "data", "lots of info")
	// slog.Error("payment failed", "user_id", userID, "order_id", orderID, "step", "charge_card")
	logger.SetupLogger(version, commit)

	// Initialize database
	pool, err := db.NewPostgresPool(context.Background(), cfg.Database.URL)
	if err != nil {
		slog.Error("failed to initialize database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Initialize router
	r := router.New(pool)

	// Create server address
	addr := fmt.Sprintf(":%s", cfg.Port)
	slog.Info("starting server", "addr", addr)

	// Start server
	if err := http.ListenAndServe(addr, r); err != nil {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}

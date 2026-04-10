package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"free9ja/api/internal/router"

	"github.com/joho/godotenv"
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
	// Load .env and .env.local
	// Note: .env.local is usually loaded first if you want it to take precedence
	err := godotenv.Load(".env.local", ".env")
	if err != nil {
		// We don't always want to exit here, because in Production
		// variables might be set via the system/docker instead of a file.
		slog.Warn("\033[31m No .env files found, falling back to system environment\033[0m")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := router.New()

	addr := fmt.Sprintf(":%s", port)
	slog.Info("\033[32m starting server\033[0m", "addr", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}

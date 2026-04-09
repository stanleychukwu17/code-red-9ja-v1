package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

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
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := router.New()

	addr := fmt.Sprintf(":%s", port)
	slog.Info("starting server", "addr", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}

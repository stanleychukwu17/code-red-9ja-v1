package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"free9ja/api/internal/router"
)

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

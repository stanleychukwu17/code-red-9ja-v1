package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"free9ja/api/internal/handler"
)

// New creates and returns a configured Chi router.
func New() http.Handler {
	r := chi.NewRouter()

	// Core middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Health check
	r.Get("/health", handler.Health)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/", handler.Root)
	})

	return r
}

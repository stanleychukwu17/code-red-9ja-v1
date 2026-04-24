package router

import (
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "free9ja/api/docs"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/handler"
	authhandler "free9ja/api/internal/handler/auth"
	authservice "free9ja/api/internal/service/auth"
)

// New creates and returns a configured Chi router.
func New(pool *pgxpool.Pool, rdb *redis.Client) http.Handler {
	mainRouter := chi.NewRouter()

	// Initialize dependencies
	q := queries.New(pool)
	authService := authservice.NewAuthService(q, rdb)
	authHandler := authhandler.NewHandler(authService)

	// Core middleware
	mainRouter.Use(middleware.RequestID)
	mainRouter.Use(middleware.RealIP)
	mainRouter.Use(middleware.Logger)
	mainRouter.Use(middleware.Recoverer)

	// Health check
	mainRouter.Get("/health", handler.Health)

	// Swagger documentation (Dev only)
	if os.Getenv("ENV") != "production" {
		mainRouter.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
		))
	}

	mainRouter.Route("/api/v1", func(r chi.Router) {
		// API v1 routes
		r.Get("/", handler.Root)

		// Auth routes group
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
		})

	})

	// Add v2 auth routes later because of mobile apps users
	// r.Route("/v2", func(r chi.Router) {})

	return mainRouter
}

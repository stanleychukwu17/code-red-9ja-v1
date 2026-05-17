package router

import (
	"log/slog"
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
	countrieshandler "free9ja/api/internal/handler/countries"
	authservice "free9ja/api/internal/service/auth"
	countriesservice "free9ja/api/internal/service/countries"
	messagingservice "free9ja/api/internal/service/messaging"
	"free9ja/api/internal/utils"
)

// New creates and returns a configured Chi router.
func New(pool *pgxpool.Pool, rdb *redis.Client) http.Handler {
	mainRouter := chi.NewRouter()

	// Initialize dependencies
	q := queries.New(pool)
	messagingService, err := messagingservice.NewMessagingService()
	if err != nil {
		slog.Error("failed to initialize messaging service", "err", err)
	}
	authService := authservice.NewAuthService(q, rdb, messagingService)
	countryService := countriesservice.NewCountryService(q, rdb)
	utilsInstance := utils.NewUtils(pool)
	authHandler := authhandler.NewHandler(authService, utilsInstance)
	countriesHandler := countrieshandler.NewHandler(countryService, utilsInstance)

	// Core middleware
	mainRouter.Use(middleware.RequestID)
	mainRouter.Use(middleware.RealIP)
	mainRouter.Use(middleware.Logger)
	mainRouter.Use(middleware.Recoverer)

	// Swagger documentation (Dev only)
	if os.Getenv("ENV") != "production" {
		mainRouter.Get("/api/v1/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
		))
	}

	mainRouter.Get(utils.ApiUrls.Health, handler.Health) // Health check

	// API v1 routes
	mainRouter.Get(utils.ApiUrls.Root, handler.Root)                                         // Root endpoint
	mainRouter.Post(utils.ApiUrls.Auth.RegisterPhaseSignUp, authHandler.RegisterPhaseSignUp) // Register endpoint
	mainRouter.Post(utils.ApiUrls.Auth.ResendOtp, authHandler.ResendOtp)                     // Resend OTP endpoint
	mainRouter.Post(utils.ApiUrls.Auth.VerifyOtp, authHandler.VerifyOtp)                     // Verify OTP endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Register, authHandler.Register)                       // Register endpoint
	mainRouter.Get(utils.ApiUrls.Countries.GetAll, countriesHandler.GetCountries)            // Get all countries

	return mainRouter
}

package router

import (
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "free9ja/api/docs"
	"free9ja/api/internal/config"
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
func New(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client) http.Handler {
	mainRouter := chi.NewRouter()

	// Initialize dependencies
	q := queries.New(pool)
	messagingService, err := messagingservice.NewMessagingService()
	if err != nil {
		slog.Error("failed to initialize messaging service", "err", err)
	}
	authService := authservice.NewAuthService(q, rdb, messagingService, cfg.JWTSecret, cfg.JWTAccessExpiration, cfg.JWTRefreshExpiration)
	countryService := countriesservice.NewCountryService(q, rdb)
	utilsInstance := utils.NewUtils(pool)
	authHandler := authhandler.NewHandler(authService, utilsInstance)
	countriesHandler := countrieshandler.NewHandler(countryService, utilsInstance)

	// Core middleware
	mainRouter.Use(corsMiddleware)
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

	// API v1 routes
	mainRouter.Get(utils.ApiUrls.Root, handler.Root)     // Root endpoint
	mainRouter.Get(utils.ApiUrls.Health, handler.Health) // Health check

	// for auths
	mainRouter.Post(utils.ApiUrls.Auth.RegisterPhaseSignUp, authHandler.RegisterPhaseSignUp) // Register first phase
	mainRouter.Post(utils.ApiUrls.Auth.ResendOtp, authHandler.ResendOtp)                     // Resend OTP endpoint
	mainRouter.Post(utils.ApiUrls.Auth.VerifyOtp, authHandler.VerifyOtp)                     // Verify OTP endpoint
	mainRouter.Post(utils.ApiUrls.Auth.CheckNin, authHandler.CheckNin)                       // Check NIN endpoint
	mainRouter.Post(utils.ApiUrls.Auth.CheckUsername, authHandler.CheckUsername)             // Check Username endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Register, authHandler.Register)                       // Register endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Login, authHandler.Login)                             // Login endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Refresh, authHandler.Refresh)                         // Refresh token endpoint

	// countries, states, cities
	mainRouter.Get(utils.ApiUrls.Countries.GetAll, countriesHandler.GetCountries) // Get all countries
	mainRouter.Get(utils.ApiUrls.Countries.GetStates, countriesHandler.GetStates) // Get states of a country
	mainRouter.Get(utils.ApiUrls.Countries.GetCities, countriesHandler.GetCities) // Get cities of a state

	return mainRouter
}

// corsMiddleware handles Cross-Origin Resource Sharing with credentials support
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Configure allowed origins (add more as needed)
		// allowedOrigins := map[string]bool{
		// 	"https://free9ja.com":       true,
		// 	"https://www.free9ja.com":   true,
		// 	"https://admin.free9ja.com": true,
		// 	"http://localhost:3001":     true,
		// }

		// Set dynamic allowed origin based on request origin
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Always include Vary: Origin header when using a dynamic origin
		// This prevents caching and ensures the correct origin is used
		w.Header().Set("Vary", "Origin")

		// set access control allow credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Set allowed methods
		w.Header().Set(
			"Access-Control-Allow-Methods",
			strings.Join([]string{http.MethodOptions, http.MethodPost, http.MethodGet, http.MethodPut, http.MethodDelete}, ", "),
		)

		// Set allowed headers
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Cookie")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Call the next handler in the chain
		next.ServeHTTP(w, r)
	})
}

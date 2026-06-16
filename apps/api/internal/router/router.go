package router

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "free9ja/api/docs"
	"free9ja/api/internal/logger"
	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/handler"
	authhandler "free9ja/api/internal/handler/auth"
	bodieshandler "free9ja/api/internal/handler/bodies"
	electiongroupshandler "free9ja/api/internal/handler/election_groups"
	electionshandler "free9ja/api/internal/handler/elections"
	officeshandler "free9ja/api/internal/handler/offices"
	federalconstituencieshandler "free9ja/api/internal/handler/federal_constituencies"
	fileshandler "free9ja/api/internal/handler/files"
	partieshandler "free9ja/api/internal/handler/parties"
	pollingunitshandler "free9ja/api/internal/handler/polling_units"
	senatorialdistrictshandler "free9ja/api/internal/handler/senatorial_districts"
	stateassemblyconstituencieshandler "free9ja/api/internal/handler/state_assembly_constituencies"
	stateshandler "free9ja/api/internal/handler/states"
	usershandler "free9ja/api/internal/handler/users"
	wardshandler "free9ja/api/internal/handler/wards"
	apimiddleware "free9ja/api/internal/middleware"
	authservice "free9ja/api/internal/service/auth"
	bodiesservice "free9ja/api/internal/service/bodies"
	electiongroupsservice "free9ja/api/internal/service/election_groups"
	electionsservice "free9ja/api/internal/service/elections"
	officesservice "free9ja/api/internal/service/offices"
	federalconstituenciesservice "free9ja/api/internal/service/federal_constituencies"
	messagingservice "free9ja/api/internal/service/messaging"
	partiesservice "free9ja/api/internal/service/parties"
	pollingunitsservice "free9ja/api/internal/service/polling_units"
	r2service "free9ja/api/internal/service/r2"
	senatorialdistrictsservice "free9ja/api/internal/service/senatorial_districts"
	stateassemblyconstituenciesservice "free9ja/api/internal/service/state_assembly_constituencies"
	statesservice "free9ja/api/internal/service/states"
	usersservice "free9ja/api/internal/service/users"
	wardsservice "free9ja/api/internal/service/wards"
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
	var jwtSecret string
	var accessExp, refreshExp time.Duration
	if cfg != nil {
		jwtSecret = cfg.JWTSecret
		accessExp = cfg.JWTAccessExpiration
		refreshExp = cfg.JWTRefreshExpiration
	}
	authService := authservice.NewAuthService(q, rdb, messagingService, jwtSecret, accessExp, refreshExp)
	bodiesService := bodiesservice.NewBodiesService(q, rdb)
	partiesService := partiesservice.NewPartiesService(q, rdb)
	statesService := statesservice.NewStatesService(q, rdb)
	senatorialDistrictsService := senatorialdistrictsservice.NewSenatorialDistrictsService(q, rdb)
	stateAssemblyConstituenciesService := stateassemblyconstituenciesservice.NewStateAssemblyConstituenciesService(q, rdb)
	federalConstituenciesService := federalconstituenciesservice.NewFederalConstituenciesService(q, rdb)
	wardsService := wardsservice.NewWardsService(q, rdb)
	pollingUnitsService := pollingunitsservice.NewPollingUnitsService(q, rdb)
	officesService := officesservice.NewOfficesService(q, rdb)
	electionGroupsService := electiongroupsservice.NewElectionGroupsService(q, rdb)
	electionsService := electionsservice.NewElectionsService(q, pool, rdb)
	usersService := usersservice.NewUsersService(q, rdb)
	utilsInstance := utils.NewUtils(pool)
	authHandler := authhandler.NewHandler(authService, utilsInstance)
	bodiesHandler := bodieshandler.NewHandler(bodiesService, q, utilsInstance)
	partiesHandler := partieshandler.NewHandler(partiesService, utilsInstance)
	statesHandler := stateshandler.NewHandler(statesService, utilsInstance)
	senatorialDistrictsHandler := senatorialdistrictshandler.NewHandler(senatorialDistrictsService, q, utilsInstance)
	stateAssemblyConstituenciesHandler := stateassemblyconstituencieshandler.NewHandler(stateAssemblyConstituenciesService, q, utilsInstance)
	federalConstituenciesHandler := federalconstituencieshandler.NewHandler(federalConstituenciesService, q, utilsInstance)
	wardsHandler := wardshandler.NewHandler(wardsService, q, utilsInstance)
	pollingUnitsHandler := pollingunitshandler.NewHandler(pollingUnitsService, q, utilsInstance)
	officesHandler := officeshandler.NewHandler(officesService, utilsInstance)
	electionGroupsHandler := electiongroupshandler.NewHandler(electionGroupsService, utilsInstance)
	electionsHandler := electionshandler.NewHandler(electionsService, utilsInstance)
	usersHandler := usershandler.NewHandler(usersService, utilsInstance)

	// Initialise the R2 service (nil-safe: file endpoints return an error if unconfigured)
	var filesHandler *fileshandler.Handler
	var r2Svc *r2service.R2Service
	var r2Err error
	if cfg != nil {
		r2Svc, r2Err = r2service.New(r2service.Config{
			AccountID:       cfg.R2.AccountID,
			AccessKeyID:     cfg.R2.AccessKeyID,
			SecretAccessKey: cfg.R2.SecretAccessKey,
			BucketName:      cfg.R2.BucketName,
			PublicURL:       cfg.R2.PublicURL,
		})
	} else {
		r2Err = errors.New("no config provided")
	}
	if r2Err != nil {
		slog.Warn("R2 service not configured — file upload endpoints will be unavailable", "reason", r2Err)
	} else {
		filesHandler = fileshandler.NewHandler(q, r2Svc, utilsInstance)
	}

	// Core middleware
	mainRouter.Use(corsMiddleware)
	mainRouter.Use(middleware.RequestID)
	mainRouter.Use(middleware.RealIP)
	mainRouter.Use(requestLoggerMiddleware)
	mainRouter.Use(middleware.Recoverer)

	// Swagger documentation (Dev only)
	if os.Getenv("ENV") != "production" {
		mainRouter.Get("/api/v1/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/api/v1/swagger/doc.json"),
		))
	}

	// API v1 routes
	mainRouter.Get(utils.ApiUrls.Root, handler.Root)     // Root endpoint
	mainRouter.Get(utils.ApiUrls.Health, handler.Health) // Health check

	// for auths
	mainRouter.Post(utils.ApiUrls.Auth.RegisterPhaseSignUp, authHandler.RegisterPhaseSignUp)         // Register first phase
	mainRouter.Post(utils.ApiUrls.Auth.CheckNin, authHandler.CheckNin)                               // Check NIN endpoint
	mainRouter.Post(utils.ApiUrls.Auth.CheckUsername, authHandler.CheckUsername)                     // Check Username endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Register, authHandler.Register)                               // Register endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Login, authHandler.Login)                                     // Login endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Logout, authHandler.Logout)                                   // Logout endpoint
	mainRouter.Post(utils.ApiUrls.Auth.Refresh, authHandler.Refresh)                                 // Refresh token endpoint
	mainRouter.Post(utils.ApiUrls.Auth.VerifySecurityQuestions, authHandler.VerifySecurityQuestions) // Verify security questions endpoint
	mainRouter.Post(utils.ApiUrls.Auth.ForgotPassword, authHandler.ForgotPassword)                   // Forgot password endpoint
	mainRouter.Post(utils.ApiUrls.Auth.AdminLogin, authHandler.AdminLogin)                           // Admin login endpoint
	mainRouter.Post(utils.ApiUrls.Auth.AdminRegister, authHandler.AdminRegister)                     // Admin register endpoint
	mainRouter.Post(utils.ApiUrls.Auth.PartyLogin, authHandler.PartyLogin)                           // Party login endpoint


	// political & geographic bodies
	mainRouter.Get(utils.ApiUrls.Bodies.GetAll, bodiesHandler.GetCountries)
	mainRouter.Get(utils.ApiUrls.Bodies.GetStates, statesHandler.GetStates)
	mainRouter.Get(utils.ApiUrls.Bodies.GetCities, bodiesHandler.GetCities)
	mainRouter.Get(utils.ApiUrls.Bodies.GetSenatorialDistricts, senatorialDistrictsHandler.GetSenatorialDistricts)
	mainRouter.Get(utils.ApiUrls.Bodies.GetFederalConstituencies, federalConstituenciesHandler.GetFederalConstituencies)
	mainRouter.Get(utils.ApiUrls.Bodies.GetStateAssemblyConstituencies, stateAssemblyConstituenciesHandler.GetStateAssemblyConstituencies)
	mainRouter.Get(utils.ApiUrls.Bodies.GetLGAs, bodiesHandler.GetLGAs)
	mainRouter.Get(utils.ApiUrls.Bodies.GetWards, wardsHandler.GetWards)
	mainRouter.Get(utils.ApiUrls.Bodies.GetPollingUnits, pollingUnitsHandler.GetPollingUnits)

	// political parties public routes
	mainRouter.Get("/api/v1/parties", partiesHandler.ListParties)
	mainRouter.Get("/api/v1/parties/{id}", partiesHandler.GetParty)

	// states public routes
	mainRouter.Get("/api/v1/states/{id}", statesHandler.GetState)

	// senatorial districts public routes
	mainRouter.Get("/api/v1/senatorial-districts/{id}", senatorialDistrictsHandler.GetSenatorialDistrict)

	// state assembly constituencies public routes
	mainRouter.Get("/api/v1/state-assembly-constituencies/{id}", stateAssemblyConstituenciesHandler.GetStateAssemblyConstituency)

	// federal constituencies public routes
	mainRouter.Get("/api/v1/federal-constituencies/{id}", federalConstituenciesHandler.GetFederalConstituency)

	// wards public routes
	mainRouter.Get("/api/v1/wards/{id}", wardsHandler.GetWard)

	// polling units public routes
	mainRouter.Get("/api/v1/polling-units/{id}", pollingUnitsHandler.GetPollingUnit)

	// offices public routes
	mainRouter.Get("/api/v1/offices", officesHandler.ListOffices)
	mainRouter.Get("/api/v1/offices/{id}", officesHandler.GetOffice)

	// election groups public routes
	mainRouter.Get("/api/v1/election-groups", electionGroupsHandler.ListElectionGroups)
	mainRouter.Get("/api/v1/election-groups/{id}", electionGroupsHandler.GetElectionGroup)

	// elections public routes
	mainRouter.Get("/api/v1/elections", electionsHandler.ListElections)
	mainRouter.Get("/api/v1/elections/{id}", electionsHandler.GetElection)

	// file metadata — public reads (nil-safe: returns 503 when R2 is not configured)
	mainRouter.Get("/api/v1/files", fileRoute(utilsInstance, filesHandler, func(h *fileshandler.Handler) http.HandlerFunc { return h.ListFiles }))
	mainRouter.Get("/api/v1/files/{id}", fileRoute(utilsInstance, filesHandler, func(h *fileshandler.Handler) http.HandlerFunc { return h.GetFile }))

	// Admin protected routes
	mainRouter.Group(func(r chi.Router) {
		jwtSecret := ""
		if cfg != nil {
			jwtSecret = cfg.JWTSecret
		}
		r.Use(apimiddleware.AuthMiddleware(jwtSecret))
		r.Use(apimiddleware.RequireRole("admin"))

		r.Get("/api/v1/admin/dashboard", func(w http.ResponseWriter, r *http.Request) {
			utilsInstance.RespondSuccess(w, http.StatusOK, "Welcome to the Admin Dashboard!", nil)
		})

		r.Get("/api/v1/admin/users", authHandler.ListAdmins)
		r.Put("/api/v1/admin/users/{id}", usersHandler.AdminUpdateUser)
		r.Delete("/api/v1/admin/users/{id}", usersHandler.DeleteUser)

		r.Post("/api/v1/auth/register-candidate", authHandler.RegisterCandidatePlaceholder)

		// political parties admin mutations
		r.Post("/api/v1/parties", partiesHandler.CreateParty)
		r.Put("/api/v1/parties/{id}", partiesHandler.UpdateParty)
		r.Delete("/api/v1/parties/{id}", partiesHandler.DeleteParty)

		// states admin mutations
		r.Post("/api/v1/states", statesHandler.CreateState)
		r.Put("/api/v1/states/{id}", statesHandler.UpdateState)
		r.Delete("/api/v1/states/{id}", statesHandler.DeleteState)

		// lgas admin mutations
		r.Post("/api/v1/lgas", bodiesHandler.CreateLGA)
		r.Put("/api/v1/lgas/{id}", bodiesHandler.UpdateLGA)
		r.Delete("/api/v1/lgas/{id}", bodiesHandler.DeleteLGA)


		// senatorial districts admin mutations
		r.Post("/api/v1/senatorial-districts", senatorialDistrictsHandler.CreateSenatorialDistrict)
		r.Put("/api/v1/senatorial-districts/{id}", senatorialDistrictsHandler.UpdateSenatorialDistrict)
		r.Delete("/api/v1/senatorial-districts/{id}", senatorialDistrictsHandler.DeleteSenatorialDistrict)

		// state assembly constituencies admin mutations
		r.Post("/api/v1/state-assembly-constituencies", stateAssemblyConstituenciesHandler.CreateStateAssemblyConstituency)
		r.Put("/api/v1/state-assembly-constituencies/{id}", stateAssemblyConstituenciesHandler.UpdateStateAssemblyConstituency)
		r.Delete("/api/v1/state-assembly-constituencies/{id}", stateAssemblyConstituenciesHandler.DeleteStateAssemblyConstituency)

		// federal constituencies admin mutations
		r.Post("/api/v1/federal-constituencies", federalConstituenciesHandler.CreateFederalConstituency)
		r.Put("/api/v1/federal-constituencies/{id}", federalConstituenciesHandler.UpdateFederalConstituency)
		r.Delete("/api/v1/federal-constituencies/{id}", federalConstituenciesHandler.DeleteFederalConstituency)

		// wards admin mutations
		r.Post("/api/v1/wards", wardsHandler.CreateWard)
		r.Put("/api/v1/wards/{id}", wardsHandler.UpdateWard)
		r.Delete("/api/v1/wards/{id}", wardsHandler.DeleteWard)

		// polling units admin mutations
		r.Post("/api/v1/polling-units", pollingUnitsHandler.CreatePollingUnit)
		r.Put("/api/v1/polling-units/{id}", pollingUnitsHandler.UpdatePollingUnit)
		r.Delete("/api/v1/polling-units/{id}", pollingUnitsHandler.DeletePollingUnit)

		// offices admin mutations
		r.Post("/api/v1/offices", officesHandler.CreateOffice)
		r.Put("/api/v1/offices/{id}", officesHandler.UpdateOffice)
		r.Delete("/api/v1/offices/{id}", officesHandler.DeleteOffice)

		// election groups admin mutations
		r.Post("/api/v1/election-groups", electionGroupsHandler.CreateElectionGroup)
		r.Put("/api/v1/election-groups/{id}", electionGroupsHandler.UpdateElectionGroup)
		r.Delete("/api/v1/election-groups/{id}", electionGroupsHandler.DeleteElectionGroup)

		// elections admin mutations
		r.Post("/api/v1/elections", electionsHandler.CreateElection)
		r.Post("/api/v1/elections/nationwide", electionsHandler.CreateNationwideElection)
		r.Post("/api/v1/elections/state", electionsHandler.CreateStateElection)
		r.Post("/api/v1/elections/senatorial-district", electionsHandler.CreateSenatorialDistrictElection)
		r.Post("/api/v1/elections/federal-constituency", electionsHandler.CreateFederalConstituencyElection)
		r.Post("/api/v1/elections/state-constituency", electionsHandler.CreateStateConstituencyElection)
		r.Post("/api/v1/elections/lga", electionsHandler.CreateLgaElection)
		r.Post("/api/v1/elections/ward", electionsHandler.CreateWardElection)
		r.Put("/api/v1/elections/{id}", electionsHandler.UpdateElection)
		r.Delete("/api/v1/elections/{id}", electionsHandler.DeleteElection)
		r.Get("/api/v1/elections/{id}/candidates", electionsHandler.GetElectionCandidates)
		r.Post("/api/v1/elections/{id}/candidates", electionsHandler.SyncElectionCandidates)
 
		// only admins can permanently delete files
		r.Delete("/api/v1/files/{id}", fileRoute(utilsInstance, filesHandler, func(h *fileshandler.Handler) http.HandlerFunc { return h.DeleteFile }))
	})

	// Auth-only routes (any authenticated user, regardless of role)
	mainRouter.Group(func(r chi.Router) {
		jwtSecret := ""
		if cfg != nil {
			jwtSecret = cfg.JWTSecret
		}
		r.Use(apimiddleware.AuthMiddleware(jwtSecret))

		// any logged-in user can request an upload URL and confirm their upload
		r.Post("/api/v1/files/upload-url", fileRoute(utilsInstance, filesHandler, func(h *fileshandler.Handler) http.HandlerFunc { return h.GenerateUploadURL }))
		r.Post("/api/v1/files/{id}/confirm", fileRoute(utilsInstance, filesHandler, func(h *fileshandler.Handler) http.HandlerFunc { return h.ConfirmUpload }))

		// users routes
		r.Get(utils.ApiUrls.Users.GetMe, usersHandler.GetMe)
		r.Put(utils.ApiUrls.Users.UpdateProfile, usersHandler.UpdateProfile)
		r.Get(utils.ApiUrls.Users.ListUsers, usersHandler.ListUsers)
	})

	return mainRouter
}

// fileRoute returns an http.HandlerFunc that is nil-safe: when the files handler
// is not initialised (i.e. R2 credentials are absent) it responds with 503.
func fileRoute(
	u *utils.Utils,
	h *fileshandler.Handler,
	picker func(*fileshandler.Handler) http.HandlerFunc,
) http.HandlerFunc {
	if h == nil {
		return func(w http.ResponseWriter, r *http.Request) {
			u.RespondError(w, http.StatusServiceUnavailable, "File storage is not configured")
		}
	}
	return picker(h)
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

// requestLoggerMiddleware injects a request-scoped logger into the context
// and logs the start and end of HTTP requests.
func requestLoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := middleware.GetReqID(r.Context())
		if reqID == "" {
			reqID = "unknown"
		}

		// Create a child logger with the request_id
		log := slog.Default().With("request_id", reqID, "component", logger.ComponentRouter)

		// Inject into context
		ctx := logger.WithContext(r.Context(), log)
		r = r.WithContext(ctx)

		// We need to wrap the response writer to get the status code
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		start := time.Now()

		defer func() {
			log.Info(logger.EventHTTPRequest,
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"duration", time.Since(start).String(),
				"ip", r.RemoteAddr,
			)
		}()

		next.ServeHTTP(ww, r)
	})
}

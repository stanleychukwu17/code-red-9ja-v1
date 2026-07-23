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
	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/handler"
	authhandler "free9ja/api/internal/handler/auth"
	bodieshandler "free9ja/api/internal/handler/bodies"
	electiongroupshandler "free9ja/api/internal/handler/election_groups"
	electionresultshandler "free9ja/api/internal/handler/election_results"
	electionstatshandler "free9ja/api/internal/handler/election_stats"
	electionshandler "free9ja/api/internal/handler/elections"
	federalconstituencieshandler "free9ja/api/internal/handler/federal_constituencies"
	fileshandler "free9ja/api/internal/handler/files"
	officeshandler "free9ja/api/internal/handler/offices"
	partieshandler "free9ja/api/internal/handler/parties"
	partyapplicationshandler "free9ja/api/internal/handler/party_applications"
	pageverificationshandler "free9ja/api/internal/handler/page_verifications"
	puassignmentshandler "free9ja/api/internal/handler/polling_unit_assignments"
	puresultshandler "free9ja/api/internal/handler/polling_unit_results"
	puupdateshandler "free9ja/api/internal/handler/polling_unit_updates"
	pollingunitshandler "free9ja/api/internal/handler/polling_units"
	senatorialdistrictshandler "free9ja/api/internal/handler/senatorial_districts"
	stateassemblyconstituencieshandler "free9ja/api/internal/handler/state_assembly_constituencies"
	stateshandler "free9ja/api/internal/handler/states"
	supervisorassignmentshandler "free9ja/api/internal/handler/supervisor_assignments"
	usershandler "free9ja/api/internal/handler/users"
	wardshandler "free9ja/api/internal/handler/wards"
	webhookshandler "free9ja/api/internal/handler/webhooks"
	"free9ja/api/internal/logger"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/audit"
	authservice "free9ja/api/internal/service/auth"
	bodiesservice "free9ja/api/internal/service/bodies"
	electiongroupsservice "free9ja/api/internal/service/election_groups"
	electionstats "free9ja/api/internal/service/election_stats"
	electionsservice "free9ja/api/internal/service/elections"
	federalconstituenciesservice "free9ja/api/internal/service/federal_constituencies"
	messagingservice "free9ja/api/internal/service/messaging"
	monnifyservice "free9ja/api/internal/service/monnify"
	officesservice "free9ja/api/internal/service/offices"
	partiesservice "free9ja/api/internal/service/parties"
	partyapplications "free9ja/api/internal/service/party_applications"
	pageverificationsservice "free9ja/api/internal/service/page_verifications"
	puassignments "free9ja/api/internal/service/polling_unit_assignments"
	puresults "free9ja/api/internal/service/polling_unit_results"
	puupdates "free9ja/api/internal/service/polling_unit_updates"
	pollingunitsservice "free9ja/api/internal/service/polling_units"
	r2service "free9ja/api/internal/service/r2"
	senatorialdistrictsservice "free9ja/api/internal/service/senatorial_districts"
	stateassemblyconstituenciesservice "free9ja/api/internal/service/state_assembly_constituencies"
	statesservice "free9ja/api/internal/service/states"
	supervisorassignmentsservice "free9ja/api/internal/service/supervisor_assignments"
	usersservice "free9ja/api/internal/service/users"
	wardsservice "free9ja/api/internal/service/wards"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
)

// New creates and returns a configured Chi router.
func New(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client, distributor worker.TaskDistributor) http.Handler {
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
	// Initializes Monnify client (nil-safe: wallet creation is skipped if un-configured)
	var monnifyClient *monnifyservice.Client
	if cfg != nil && cfg.Monnify.APIKey != "" && cfg.Monnify.SecretKey != "" {
		monnifyClient = monnifyservice.New(monnifyservice.Config{
			BaseURL:      cfg.Monnify.BaseURL,
			APIKey:       cfg.Monnify.APIKey,
			SecretKey:    cfg.Monnify.SecretKey,
			ContractCode: cfg.Monnify.ContractCode,
		})
	} else {
		slog.Warn("Monnify not configured — party/user wallet creation will be unavailable",
			"reason", "MONNIFY_API_KEY or MONNIFY_SECRET_KEY is empty")
	}

	usersService := usersservice.NewUsersService(q, rdb, monnifyClient)
	partiesService := partiesservice.NewPartiesService(q, pool, rdb, monnifyClient)
	bodiesService := bodiesservice.NewBodiesService(q, rdb)
	authService := authservice.NewAuthService(q, rdb, messagingService, usersService, partiesService, bodiesService, jwtSecret, accessExp, refreshExp)

	statesService := statesservice.NewStatesService(q, rdb)
	senatorialDistrictsService := senatorialdistrictsservice.NewSenatorialDistrictsService(q, rdb)
	stateAssemblyConstituenciesService := stateassemblyconstituenciesservice.NewStateAssemblyConstituenciesService(q, rdb)
	federalConstituenciesService := federalconstituenciesservice.NewFederalConstituenciesService(q, rdb)
	wardsService := wardsservice.NewWardsService(q, rdb)
	pollingUnitsService := pollingunitsservice.NewPollingUnitsService(q, rdb)
	officesService := officesservice.NewOfficesService(q, rdb)
	electionGroupsService := electiongroupsservice.NewElectionGroupsService(q, rdb, distributor)
	electionsService := electionsservice.NewElectionsService(q, pool, rdb, distributor)
	pollingUnitAssignmentsService := puassignments.NewService(q, rdb, distributor)
	partyApplicationsService := partyapplications.NewService(q, pool, rdb)
	pollingUnitUpdatesService := puupdates.NewService(q, pool)
	pollingUnitResultsService := puresults.NewService(q, pool, distributor)
	supervisorAssignmentsService := supervisorassignmentsservice.NewService(q)
	utilsInstance := utils.NewUtils(pool)
	authHandler := authhandler.NewHandler(authService, utilsInstance)
	bodiesHandler := bodieshandler.NewHandler(bodiesService, q, utilsInstance, rdb)
	partiesHandler := partieshandler.NewHandler(partiesService, utilsInstance)
	statesHandler := stateshandler.NewHandler(statesService, utilsInstance)
	senatorialDistrictsHandler := senatorialdistrictshandler.NewHandler(senatorialDistrictsService, q, utilsInstance)
	stateAssemblyConstituenciesHandler := stateassemblyconstituencieshandler.NewHandler(stateAssemblyConstituenciesService, q, utilsInstance)
	federalConstituenciesHandler := federalconstituencieshandler.NewHandler(federalConstituenciesService, q, utilsInstance)
	wardsHandler := wardshandler.NewHandler(wardsService, q, utilsInstance)
	pollingUnitsHandler := pollingunitshandler.NewHandler(pollingUnitsService, q, utilsInstance)
	officesHandler := officeshandler.NewHandler(officesService, utilsInstance)
	electionGroupsHandler := electiongroupshandler.NewHandler(electionGroupsService, utilsInstance)
	electionStatsService := electionstats.NewElectionStatsService(q)
	electionStatsHandler := electionstatshandler.NewHandler(electionStatsService, utilsInstance)
	electionsHandler := electionshandler.NewHandler(electionsService, usersService, utilsInstance)
	auditService := audit.NewAuditService(q)
	usersHandler := usershandler.NewHandler(usersService, auditService, bodiesService, utilsInstance)
	pageVerificationsService := pageverificationsservice.NewPageVerificationsService(q, usersService, partiesService, auditService)
	pageVerificationsHandler := pageverificationshandler.NewHandler(pageVerificationsService, utilsInstance)
	pollingUnitAssignmentsHandler := puassignmentshandler.NewHandler(pollingUnitAssignmentsService, usersService, pollingUnitUpdatesService, utilsInstance, distributor)
	partyApplicationsHandler := partyapplicationshandler.NewHandler(partyApplicationsService, usersService, utilsInstance)
	pollingUnitUpdatesHandler := puupdateshandler.NewHandler(pollingUnitUpdatesService, utilsInstance, distributor)
	pollingUnitResultsHandler := puresultshandler.NewHandler(pollingUnitResultsService, utilsInstance, distributor)
	supervisorAssignmentsHandler := supervisorassignmentshandler.NewHandler(supervisorAssignmentsService, utilsInstance)
	webhookHandler := webhookshandler.NewHandler(partiesService, usersService, monnifyClient, utilsInstance)
	electionResultsHandler := electionresultshandler.NewHandler(pool, utilsInstance)

	// Initialize the R2 service (nil-safe: file endpoints return an error if un-configured)
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
	mainRouter.Post(utils.ApiUrls.Auth.ChangePasswordByEmail, authHandler.ChangePasswordByEmail)     // Change password by email endpoint
	mainRouter.Post(utils.ApiUrls.Auth.AdminLogin, authHandler.AdminLogin)                           // Admin login endpoint
	mainRouter.Post(utils.ApiUrls.Auth.PartyLogin, authHandler.PartyLogin)                           // Party login endpoint
	mainRouter.Post(utils.ApiUrls.Auth.SuperAdmin, authHandler.MakeUserSuperAdmin)                   // Make superAdmin endpoint
	mainRouter.Post("/api/v1/auth/assign-role", authHandler.AssignUserRole)                          // Assign role endpoint
	mainRouter.Post("/api/v1/auth/seed", authHandler.SeedUsers)                                      // Seed users endpoint

	// Banks
	mainRouter.Get("/api/v1/banks", usersHandler.GetBanks)
	mainRouter.Get("/api/v1/banks/validate", usersHandler.ValidateBankAccount)

	// political & geographic bodies
	mainRouter.Get(utils.ApiUrls.Bodies.GetAll, bodiesHandler.GetCountries)
	mainRouter.Get(utils.ApiUrls.Bodies.GetStates, bodiesHandler.GetStates)
	mainRouter.Get(utils.ApiUrls.Bodies.GetCities, bodiesHandler.GetCities)
	mainRouter.Get(utils.ApiUrls.Bodies.GetSenatorialDistricts, senatorialDistrictsHandler.GetSenatorialDistricts)
	mainRouter.Get(utils.ApiUrls.Bodies.GetFederalConstituencies, federalConstituenciesHandler.GetFederalConstituencies)
	mainRouter.Get(utils.ApiUrls.Bodies.GetStateAssemblyConstituencies, stateAssemblyConstituenciesHandler.GetStateAssemblyConstituencies)
	mainRouter.Get(utils.ApiUrls.Bodies.GetLGAs, bodiesHandler.GetLGAs)
	mainRouter.Get(utils.ApiUrls.Bodies.GetWards, wardsHandler.GetWards)
	mainRouter.Get(utils.ApiUrls.Bodies.GetPollingUnits, pollingUnitsHandler.GetPollingUnits)

	// election geo-results endpoints (geography joined with final results)
	mainRouter.Get("/api/v1/elections/results/states", electionResultsHandler.GetStatesWithResults)
	mainRouter.Get("/api/v1/elections/results/senatorial-districts", electionResultsHandler.GetSenatorialDistrictsWithResults)
	mainRouter.Get("/api/v1/elections/results/federal-constituencies", electionResultsHandler.GetFederalConstituenciesWithResults)
	mainRouter.Get("/api/v1/elections/results/lgas", electionResultsHandler.GetLGAsWithResults)
	mainRouter.Get("/api/v1/elections/results/wards", electionResultsHandler.GetWardsWithResults)
	mainRouter.Get("/api/v1/elections/results/polling-units", electionResultsHandler.GetPollingUnitsWithResults)

	// political parties public routes
	mainRouter.Get("/api/v1/parties", partiesHandler.ListParties)
	mainRouter.Get("/api/v1/parties/{id}", partiesHandler.GetParty)
	mainRouter.Get("/api/v1/parties/{id}/wallet", partiesHandler.GetPartyWallet)

	// page verifications public routes
	mainRouter.Get("/api/v1/verifications/types", pageVerificationsHandler.ListVerificationTypes)
	mainRouter.Get("/api/v1/verifications/{pageType}/{pageID}", pageVerificationsHandler.GetPageVerifications)

	// Monnify webhook — must be public (Monnify POSTs from their servers)
	mainRouter.Post("/api/v1/webhooks/monnify", webhookHandler.HandleMonnify)

	// Testing & recovery wallet provisioning (public/unauthenticated)
	mainRouter.Post("/api/v1/parties/wallets/provision-missing", partiesHandler.ProvisionMissingPartyWallets)
	mainRouter.Post("/api/v1/users/wallets/provision-missing", usersHandler.ProvisionMissingUserWallets)

	// bodies national metrics (public)
	mainRouter.Get("/api/v1/bodies/metrics", bodiesHandler.GetNationalMetrics)

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
	mainRouter.Get("/api/v1/election-groups/{id}/elections", electionGroupsHandler.ListGroupElections)

	// elections public routes
	mainRouter.Get("/api/v1/elections", electionsHandler.ListElections)
	mainRouter.Get("/api/v1/elections/non-voting-reasons", electionsHandler.GetNonVotingReasons)
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
		r.Use(apimiddleware.RequireRole("admin", "super_admin"))

		r.Get("/api/v1/admin/dashboard", func(w http.ResponseWriter, r *http.Request) {
			utilsInstance.RespondSuccess(w, http.StatusOK, "Welcome to the Admin Dashboard!", nil)
		})

		r.Get("/api/v1/admin/users", authHandler.ListAdmins)
		r.Post("/api/v1/auth/roles/update", authHandler.UpdateUserRoles)
		r.Post("/api/v1/bodies/recalculate", bodiesHandler.RecalculateBodyMetrics)

		// political parties admin mutations
		r.Post("/api/v1/parties", partiesHandler.CreateParty)
		r.Put("/api/v1/parties/{id}", partiesHandler.UpdateParty)
		r.Delete("/api/v1/parties/{id}", partiesHandler.DeleteParty)
		r.Put("/api/v1/admin/parties/{id}/discount", partiesHandler.UpdatePartyDiscount)
		// manual wallet creation for a party (in case auto-create failed)
		r.Post("/api/v1/parties/{id}/wallet", partiesHandler.CreatePartyWalletHandler)
		// slot pricing settings
		r.Get("/api/v1/admin/settings/slot-price", partiesHandler.GetGlobalSlotPrice)
		r.Put("/api/v1/admin/settings/slot-price", partiesHandler.UpdateGlobalSlotPrice)

		// page verifications admin mutations
		r.Post("/api/v1/admin/verifications", pageVerificationsHandler.AssignVerification)
		r.Delete("/api/v1/admin/verifications", pageVerificationsHandler.RemoveVerification)

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
		r.Put("/api/v1/admin/users/{id}", usersHandler.AdminUpdateUser)
		r.Delete("/api/v1/admin/users/{id}", usersHandler.DeleteUser)
		r.Get("/api/v1/admin/users/{id}/roles", usersHandler.GetUserRolesAdmin)
		r.Get("/api/v1/admin/users/{id}/phones", usersHandler.GetUserPhoneNumbers)
		r.Put("/api/v1/admin/users/{id}/phones", usersHandler.UpdateUserPhoneNumbers)
		r.Delete("/api/v1/admin/users/phones/{id}", usersHandler.DeleteUserPhoneNumber)
		r.Get("/api/v1/users/me/wallet", usersHandler.GetMyWallet)
		r.Get("/api/v1/users/me/wallet/transactions", usersHandler.ListMyWalletTransactions)
		r.Post("/api/v1/users/me/wallet/withdraw", usersHandler.WithdrawFromUserWallet)
		r.Post("/api/v1/users/{id}/wallet", usersHandler.CreateUserWalletHandler)
		r.Post("/api/v1/auth/register-candidate", authHandler.RegisterCandidatePlaceholder)
		r.Post("/api/v1/elections/did-not-vote", electionsHandler.CreateDidNotVoteReason)
		r.Get("/api/v1/elections/eligible", electionsHandler.GetEligibleElectionsForPollingUnit)
		r.Post("/api/v1/elections/votes", electionsHandler.SubmitElectionVotes)
		r.Get("/api/v1/elections/{id}/candidates", electionsHandler.GetElectionCandidates)
		r.Get("/api/v1/election-groups/{id}/vote-status", electionsHandler.GetUserElectionGroupVoteStatus)
		r.Put("/api/v1/election-groups/{id}/party-stats", electionGroupsHandler.UpsertPartyElectionGroupStats)

		// Geographic Stats pre-aggregated endpoints
		r.Get("/api/v1/election-groups/{id}/stats/polling-units", electionStatsHandler.GetPollingUnitStats)
		r.Get("/api/v1/election-groups/{id}/stats/wards", electionStatsHandler.GetWardStats)
		r.Get("/api/v1/election-groups/{id}/stats/lgas", electionStatsHandler.GetLGAStats)
		r.Get("/api/v1/election-groups/{id}/stats/state-constituencies", electionStatsHandler.GetStateConstituencyStats)
		r.Get("/api/v1/election-groups/{id}/stats/federal-constituencies", electionStatsHandler.GetFederalConstituencyStats)
		r.Get("/api/v1/election-groups/{id}/stats/senatorial-districts", electionStatsHandler.GetSenatorialDistrictStats)
		r.Get("/api/v1/election-groups/{id}/stats/states", electionStatsHandler.GetStateStats)
		
		// Single unit dedicated endpoints
		r.Get("/api/v1/election-groups/{id}/stats", electionStatsHandler.GetSingleElectionGroupStats)
		r.Get("/api/v1/election-groups/{id}/stats/states/{state_id}", electionStatsHandler.GetSingleStateStats)
		r.Get("/api/v1/election-groups/{id}/stats/senatorial-districts/{sd_id}", electionStatsHandler.GetSingleSenatorialDistrictStats)
		r.Get("/api/v1/election-groups/{id}/stats/federal-constituencies/{fc_id}", electionStatsHandler.GetSingleFederalConstituencyStats)
		r.Get("/api/v1/election-groups/{id}/stats/state-constituencies/{sc_id}", electionStatsHandler.GetSingleStateConstituencyStats)
		r.Get("/api/v1/election-groups/{id}/stats/lgas/{lga_id}", electionStatsHandler.GetSingleLGAStats)
		r.Get("/api/v1/election-groups/{id}/stats/wards/{ward_id}", electionStatsHandler.GetSingleWardStats)

		r.Post("/api/v1/elections/{id}/field-candidate", electionsHandler.FieldPartyCandidate)
		r.Post("/api/v1/parties/{id}/wallet/withdraw", partiesHandler.WithdrawFromPartyWallet)
		r.Get("/api/v1/parties/{id}/slots/price", partiesHandler.GetPartySlotPrice)
		r.Post("/api/v1/parties/{id}/slots/buy", partiesHandler.BuySlots)
		r.Post("/api/v1/parties/{id}/allowances/deposit", partiesHandler.DepositAllowance)
		r.Put("/api/v1/parties/{id}/allowances/settings", partiesHandler.UpdateStateAllowances)
		r.Post("/api/v1/parties/{id}/wallet/deposit-test", partiesHandler.DepositTest)

		// polling unit assignments routes
		r.Post("/api/v1/polling-unit-assignments", pollingUnitAssignmentsHandler.CreateAssignment)
		r.Get("/api/v1/polling-unit-assignments", pollingUnitAssignmentsHandler.ListAssignments)
		r.Get("/api/v1/polling-unit-assignments/{id}", pollingUnitAssignmentsHandler.GetAssignment)
		r.Patch("/api/v1/polling-unit-assignments/{id}/tracking", pollingUnitAssignmentsHandler.UpdateAssignmentTracking)
		r.Delete("/api/v1/polling-unit-assignments/{id}", pollingUnitAssignmentsHandler.DeleteAssignment)

		// supervisor assignments
		r.Get("/api/v1/supervisor-assignments", supervisorAssignmentsHandler.GetSupervisorAssignments)

		// party applications routes
		r.Post("/api/v1/party-applications", partyApplicationsHandler.SubmitApplication)
		r.Get("/api/v1/party-applications", partyApplicationsHandler.ListApplications)
		r.Get("/api/v1/party-applications/recommendations", partyApplicationsHandler.GetPollingUnitRecommendations)
		r.Get("/api/v1/party-applications/{id}", partyApplicationsHandler.GetApplication)
		r.Post("/api/v1/party-applications/{id}/approve", partyApplicationsHandler.ApproveApplication)
		r.Post("/api/v1/party-applications/{id}/reject", partyApplicationsHandler.RejectApplication)
		r.Post("/api/v1/party-applications/{id}/cancel", partyApplicationsHandler.CancelApplication)

		// polling unit updates routes
		r.Post("/api/v1/polling-unit-updates", pollingUnitUpdatesHandler.CreateUpdate)
		r.Get("/api/v1/polling-unit-updates", pollingUnitUpdatesHandler.ListUpdates)

		// polling unit results routes
		r.Post("/api/v1/polling-unit-results", pollingUnitResultsHandler.SubmitResult)
		r.Get("/api/v1/polling-unit-results", pollingUnitResultsHandler.ListResults)
		r.Get("/api/v1/polling-unit-final-results", pollingUnitResultsHandler.ListFinalResults)
		r.Get("/api/v1/polling-unit-results/final", pollingUnitResultsHandler.GetFinalResult)
		r.Get("/api/v1/polling-unit-results/{id}", pollingUnitResultsHandler.GetResult)
		r.Patch("/api/v1/polling-unit-results/{id}/vote", pollingUnitResultsHandler.VoteOnResult)
		r.Patch("/api/v1/polling-unit-results/{id}/review", pollingUnitResultsHandler.ReviewResult)
	})

	// Party-admin routes: authenticated users with role=party_admin AND roleLevel=admin
	mainRouter.Group(func(r chi.Router) {
		jwtSecret := ""
		if cfg != nil {
			jwtSecret = cfg.JWTSecret
		}
		r.Use(apimiddleware.AuthMiddleware(jwtSecret))
		r.Use(apimiddleware.RequireRole("party_admin", "super_party_admin"))

		// party admins can view their own party's wallet transaction ledger
		r.Get("/api/v1/parties/{id}/wallet/transactions", partiesHandler.ListPartyWalletTransactions)
	})

	return mainRouter
}

// fileRoute returns an http.HandlerFunc that is nil-safe: when the files handler
// is not initialized (i.e. R2 credentials are absent) it responds with 503.
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

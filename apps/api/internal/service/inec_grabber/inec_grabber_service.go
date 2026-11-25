package inecgrabber

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	r2service "free9ja/api/internal/service/r2"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func cleanStr(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, `"'\`)
	return strings.TrimSpace(s)
}

func isDevEnv() bool {
	return config.Load().Env == "development"
}

type ResultNotifierFunc func(ctx context.Context, electionID int32, pollingUnitID int32)

type INECGrabberService struct {
	queries        *queries.Queries
	pool           *pgxpool.Pool
	rdb            *redis.Client
	r2Svc          *r2service.R2Service
	client         *http.Client
	geminiAPIKey   string
	resultNotifier ResultNotifierFunc
}

func NewINECGrabberService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	r2Svc *r2service.R2Service,
	geminiAPIKey string,
	notifier ResultNotifierFunc,
) *INECGrabberService {
	return &INECGrabberService{
		queries:        q,
		pool:           pool,
		rdb:            rdb,
		r2Svc:          r2Svc,
		geminiAPIKey:   geminiAPIKey,
		resultNotifier: notifier,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

type SyncOptions struct {
	UploadToR2     *bool   `json:"upload_to_r2"`
	SaveToLocal    *bool   `json:"save_to_local"`
	AIExtract      *bool   `json:"ai_extract"`
	Force          *bool   `json:"force"`
	Year           *int    `json:"year"`
	INECElectionID *string `json:"inec_election_id"`
	LGAID          *string `json:"lga_id"`
	WardID         *string `json:"ward_id"`
	MaxPUs         *int    `json:"max_pus"`
}

type INECAPIConfig struct {
	BaseURL             string        `json:"base_url"`
	SyncIntervalMinutes int           `json:"sync_interval_minutes"`
	ActiveSyncDaysLimit int           `json:"active_sync_days_limit"`
	UploadToR2Default   bool          `json:"upload_to_r2_default"`
	AIExtractDefault    bool          `json:"ai_extract_default"`
	Endpoints           INECEndpoints `json:"endpoints"`
}

type INECEndpoints struct {
	Elections    string `json:"elections"`
	LGAs         string `json:"lgas"`
	StateLGAs    string `json:"state_lgas"`
	PollingUnits string `json:"polling_units"`
}

type INECElectionsResponse struct {
	Success bool           `json:"success"`
	Data    []INECElection `json:"data"`
}

type INECElection struct {
	ID           string     `json:"_id"`
	FullName     string     `json:"full_name"`
	ElectionDate string     `json:"election_date"`
	Domain       INECDomain `json:"domain"`
	State        *INECState `json:"state"`
}

type INECDomain struct {
	ID   string `json:"_id"`
	Name string `json:"name"`
}

type INECState struct {
	ID   int64  `json:"state_id"`
	Name string `json:"name"`
}

type INECLGAsResponse struct {
	Success bool      `json:"success"`
	Data    []INECLGA `json:"data"`
}

type INECNestedLGA struct {
	ID    string `json:"_id"`
	Name  string `json:"name"`
	Code  string `json:"code"`
	LGAID int32  `json:"lga_id"`
}

type INECLGA struct {
	ID    string         `json:"_id"`
	Name  string         `json:"name"`
	LGA   *INECNestedLGA `json:"lga"`
	Wards []INECWard     `json:"wards"`
}

type INECWard struct {
	ID     string `json:"_id"`
	Name   string `json:"name"`
	Code   string `json:"code"`
	WardID int32  `json:"ward_id"`
}

type INECPUsResponse struct {
	Success bool     `json:"success"`
	Data    []INECPU `json:"data"`
}

type INECPU struct {
	ID          string        `json:"_id"`
	Name        string        `json:"name"`
	Code        string        `json:"code"`
	PUCode      string        `json:"pu_code"`
	Ward        *INECWard     `json:"ward"`
	Document    *INECDocument `json:"document"`
	PollingUnit *INECPUNested `json:"polling_unit"`
}

type INECPUNested struct {
	ID     string    `json:"_id"`
	Name   string    `json:"name"`
	PUCode string    `json:"pu_code"`
	Ward   *INECWard `json:"ward"`
}

type INECDocument struct {
	URL string `json:"url"`
}

func (s *INECGrabberService) GetINECAPIConfig(ctx context.Context) (INECAPIConfig, error) {
	defaultCfg := INECAPIConfig{
		BaseURL:             "https://dolphin-app-sleqh.ondigitalocean.app/api/v1",
		SyncIntervalMinutes: 15,
		ActiveSyncDaysLimit: 14,
		UploadToR2Default:   true,
		AIExtractDefault:    true,
		Endpoints: INECEndpoints{
			Elections:    "/elections?election_type={inec_election_type_id}",
			LGAs:         "/elections/{election_id}/lga",
			StateLGAs:    "/elections/{election_id}/lga/state/{state_id}",
			PollingUnits: "/elections/{election_id}/pus?ward={ward_id}",
		},
	}

	setting, err := s.queries.GetSystemSetting(ctx, "inec_api_config")
	if err != nil || len(setting.Value) == 0 {
		return defaultCfg, nil
	}

	cfg := defaultCfg
	if err := json.Unmarshal(setting.Value, &cfg); err != nil {
		return defaultCfg, nil
	}
	cfg.BaseURL = strings.TrimRight(cleanStr(cfg.BaseURL), "/")
	if cfg.BaseURL == "" {
		cfg.BaseURL = defaultCfg.BaseURL
	}
	if cfg.SyncIntervalMinutes <= 0 {
		cfg.SyncIntervalMinutes = 15
	}
	if cfg.ActiveSyncDaysLimit <= 0 {
		cfg.ActiveSyncDaysLimit = 14
	}
	return cfg, nil
}

// SyncGrabber runs an INEC result sync for the given grabber ID: it validates status/options,
// executes the upstream scrape via executeSync, updates grabber metrics/status, and records a run log.
func (s *INECGrabberService) SyncGrabber(ctx context.Context, grabberID int64, opts SyncOptions) (*queries.InecResultGrabberLog, error) {
	startTime := time.Now()

	grabber, err := s.queries.GetINECResultGrabberByID(ctx, grabberID)
	if err != nil {
		slog.Error("INEC grabber not found", "grabber_id", grabberID, "err", err)
		return nil, fmt.Errorf("grabber not found: %w", err)
	}

	slog.Info("INEC SyncGrabber service starting run",
		"grabber_id", grabberID,
		"election_id", grabber.ElectionID,
		"election_group_id", grabber.ElectionGroupID,
		"scope", grabber.Scope,
		"sync_status", grabber.SyncStatus,
		"upload_to_r2", opts.UploadToR2,
		"ai_extract", opts.AIExtract,
		"force", opts.Force,
	)

	// Check if paused or completed and force is not requested (do NOT insert log records)
	if grabber.SyncStatus == "paused" && (opts.Force == nil || !*opts.Force) {
		slog.Warn("INEC SyncGrabber skipped: grabber is paused", "grabber_id", grabberID)
		return nil, fmt.Errorf("This INEC result grabber is currently paused. Resume it to allow syncing.")
	}
	if grabber.SyncStatus == "completed" && (opts.Force == nil || !*opts.Force) {
		slog.Warn("INEC SyncGrabber skipped: grabber is already completed", "grabber_id", grabberID)
		return nil, fmt.Errorf("This INEC result grabber has already completed all polling unit results for this election.")
	}

	config, err := s.GetINECAPIConfig(ctx)
	if err != nil {
		slog.Error("INEC grabber failed to load API config", "err", err)
		return nil, fmt.Errorf("failed to load inec api config: %w", err)
	}

	uploadToR2 := config.UploadToR2Default
	if opts.UploadToR2 != nil {
		uploadToR2 = *opts.UploadToR2
	}

	aiExtract := config.AIExtractDefault
	if opts.AIExtract != nil {
		aiExtract = *opts.AIExtract
	}
	if opts.SaveToLocal != nil && *opts.SaveToLocal && !isDevEnv() {
		return nil, fmt.Errorf("save_to_local is only allowed in development environment")
	}

	// Mark status as syncing
	_, _ = s.queries.UpdateINECResultGrabberSyncStatus(ctx, queries.UpdateINECResultGrabberSyncStatusParams{
		ID:               grabber.ID,
		SyncStatus:       "syncing",
		SyncErrorMessage: pgtype.Text{},
	})

	newResultsCount, syncErr := s.executeSync(ctx, grabber, config, uploadToR2, aiExtract, opts)

	// Check if all LGAs have complete results
	metrics, calcErr := s.queries.CalculateElectionMetrics(ctx, grabber.ElectionID)
	isFullyComplete := calcErr == nil && metrics.TotalLgasCount > 0 && metrics.LgasWithCompleteResultsCount >= metrics.TotalLgasCount

	endedTime := time.Now()
	var statusStr string
	var errMsg pgtype.Text
	if syncErr != nil {
		statusStr = "failed"
		errMsg = pgtype.Text{String: syncErr.Error(), Valid: true}
		slog.Error("INEC grabber sync failed", "grabber_id", grabberID, "err", syncErr)
	} else if isFullyComplete {
		statusStr = "completed"
	} else {
		statusStr = "pending"
	}

	// Update grabber sync status
	_, _ = s.queries.UpdateINECResultGrabberSyncStatus(ctx, queries.UpdateINECResultGrabberSyncStatusParams{
		ID:               grabber.ID,
		SyncStatus:       statusStr,
		SyncErrorMessage: errMsg,
	})

	// Create execution log
	logRecord, logErr := s.queries.CreateINECResultGrabberLog(ctx, queries.CreateINECResultGrabberLogParams{
		InecResultGrabberID:   grabber.ID,
		ElectionGroupID:       grabber.ElectionGroupID,
		ElectionID:            grabber.ElectionID,
		ResultsCollectedCount: int32(newResultsCount),
		Status:                statusStr,
		ErrorMessage:          errMsg,
		StartedAt:             pgtype.Timestamptz{Time: startTime, Valid: true},
		EndedAt:               pgtype.Timestamptz{Time: endedTime, Valid: true},
	})
	if logErr != nil {
		slog.Error("failed to create inec result grabber log", "err", logErr)
	}

	return &logRecord, syncErr
}

func (s *INECGrabberService) fetchINECElections(ctx context.Context, baseURL string, inecTypeID string, stateID pgtype.Int2) ([]INECElection, error) {
	// Build IReV elections URL with optional state_id filter for non-nationwide elections
	electionsURL := fmt.Sprintf("%s/elections?election_type=%s", baseURL, url.QueryEscape(inecTypeID))
	if stateID.Valid && stateID.Int16 > 0 {
		electionsURL = fmt.Sprintf("%s&state_id=%d", electionsURL, stateID.Int16)
	}
	slog.Info("INEC SyncGrabber: querying INEC elections API", "url", electionsURL, "inec_type_id", inecTypeID, "state_id", stateID.Int16)

	// Execute GET request against upstream INEC API
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, electionsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create inec elections request: %w", err)
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call inec elections endpoint: %w", err)
	}
	defer resp.Body.Close()

	// Read and decode the JSON response envelope
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read inec elections response: %w", err)
	}

	var electionsResp INECElectionsResponse
	if err := json.Unmarshal(bodyBytes, &electionsResp); err != nil {
		return nil, fmt.Errorf("failed to parse inec elections JSON: %w", err)
	}

	if !electionsResp.Success {
		return nil, nil
	}

	return electionsResp.Data, nil
}

// DiscoverINECElections queries INEC elections directly by local office ID, optional state ID, and optional year.
func (s *INECGrabberService) DiscoverINECElections(ctx context.Context, officeID int16, stateID *int16, year *int) ([]INECElection, error) {
	// Resolve the local office to its upstream INEC election_type ID
	office, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("office not found: %w", err)
	}

	inecTypeID := cleanStr(office.InecElectionTypeID.String)
	if !office.InecElectionTypeID.Valid || inecTypeID == "" {
		return nil, fmt.Errorf("office %q has no inec_election_type_id configured", office.Name)
	}

	// Convert optional state pointer into pgtype.Int2 for the shared election query helper
	var statePgID pgtype.Int2
	if stateID != nil && *stateID > 0 {
		statePgID = pgtype.Int2{Int16: *stateID, Valid: true}
	}

	return s.filterINECElections(ctx, inecTypeID, statePgID, year)
}

// filterINECElections fetches INEC elections for an office type + optional state and filters by year.
func (s *INECGrabberService) filterINECElections(ctx context.Context, inecTypeID string, stateID pgtype.Int2, year *int) ([]INECElection, error) {
	// Load base URL and INEC API settings from system_settings
	cfg, err := s.GetINECAPIConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load inec api config: %w", err)
	}

	// Fetch all upstream INEC elections for the given election type (and optional state)
	allElections, err := s.fetchINECElections(ctx, cfg.BaseURL, inecTypeID, stateID)
	if err != nil {
		return nil, err
	}

	// Skip year filtering if no target year was specified
	if year == nil || *year <= 0 {
		return allElections, nil
	}

	// Keep only elections whose parsed election_date year matches the target year
	filtered := make([]INECElection, 0, len(allElections))
	for _, el := range allElections {
		elDate, parseErr := time.Parse(time.RFC3339, el.ElectionDate)
		if parseErr != nil {
			elDate, _ = time.Parse("2006-01-02", el.ElectionDate)
		}
		if elDate.Year() == *year {
			filtered = append(filtered, el)
		}
	}

	return filtered, nil
}

// PreviewINECElections fetches candidate INEC elections for a grabber, optionally filtered by year.
func (s *INECGrabberService) PreviewINECElections(ctx context.Context, grabberID int64, year *int) ([]INECElection, error) {
	grabber, err := s.queries.GetINECResultGrabberByID(ctx, grabberID)
	if err != nil {
		return nil, fmt.Errorf("grabber not found: %w", err)
	}
	inecTypeID := cleanStr(grabber.InecElectionTypeID.String)
	if !grabber.InecElectionTypeID.Valid || inecTypeID == "" {
		return nil, fmt.Errorf("office for this election has no inec_election_type_id configured")
	}

	return s.filterINECElections(ctx, inecTypeID, grabber.StateID, year)
}

// syncLGAsAndWardsMongoIDs batch-backfills lgas.mongo_id and wards.mongo_id directly by local primary key (lga_id / ward_id).
func (s *INECGrabberService) syncLGAsAndWardsMongoIDs(ctx context.Context, lgas []INECLGA) (int, int) {
	// Pre-allocate parallel slices for batch SQL updates
	lgaIDs := make([]int32, 0, len(lgas))
	lgaMongoIDs := make([]string, 0, len(lgas))
	wardIDs := make([]int32, 0, len(lgas)*10)
	wardMongoIDs := make([]string, 0, len(lgas)*10)

	for i := range lgas {
		// Use the nested lga object's _id and lga_id (matching local lgas.id) when available
		var lgaMongoID string
		var localLGAID int32
		if lgas[i].LGA != nil {
			lgaMongoID = cleanStr(lgas[i].LGA.ID)
			localLGAID = lgas[i].LGA.LGAID
		}
		// Fallback to outer wrapper _id if nested lga._id is missing
		if lgaMongoID == "" {
			lgaMongoID = cleanStr(lgas[i].ID)
		}
		if lgaMongoID != "" && localLGAID > 0 {
			lgaIDs = append(lgaIDs, localLGAID)
			lgaMongoIDs = append(lgaMongoIDs, lgaMongoID)
		}

		// Collect valid ward_id -> mongo_id pairs
		for _, ward := range lgas[i].Wards {
			wardMongoID := cleanStr(ward.ID)
			if wardMongoID != "" && ward.WardID > 0 {
				wardIDs = append(wardIDs, ward.WardID)
				wardMongoIDs = append(wardMongoIDs, wardMongoID)
			}
		}
	}

	// Persist LGA and ward mongo_ids in two batch queries
	var lgasSynced, wardsSynced int
	if len(lgaIDs) > 0 {
		if n, err := s.queries.BatchUpdateLGAMongoIDs(ctx, queries.BatchUpdateLGAMongoIDsParams{
			Ids:      lgaIDs,
			MongoIds: lgaMongoIDs,
		}); err == nil {
			lgasSynced = int(n)
		} else {
			slog.Warn("BatchUpdateLGAMongoIDs failed", "err", err)
		}
	}

	if len(wardIDs) > 0 {
		if n, err := s.queries.BatchUpdateWardMongoIDs(ctx, queries.BatchUpdateWardMongoIDsParams{
			Ids:      wardIDs,
			MongoIds: wardMongoIDs,
		}); err == nil {
			wardsSynced = int(n)
		} else {
			slog.Warn("BatchUpdateWardMongoIDs failed", "err", err)
		}
	}

	return lgasSynced, wardsSynced
}

// SyncAllStatesMongoIDs loops through all states (1..37) with bounded concurrency (5 workers)
// for a nationwide INEC election and batch-backfills lgas.mongo_id and wards.mongo_id.
func (s *INECGrabberService) SyncAllStatesMongoIDs(ctx context.Context, inecElectionID string) (int, int, error) {
	// Load INEC base URL from system_settings
	cfg, err := s.GetINECAPIConfig(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to load inec api config: %w", err)
	}

	// Fetch only Nigerian states (country_id = 161, 37 states including FCT)
	states, err := s.queries.GetStatesByCountryID(ctx, 161)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to list Nigerian states: %w", err)
	}

	// Fetch and batch-update up to 3 states concurrently to avoid rate-limiting IReV
	var totalLGAs, totalWards atomic.Int64
	var wg sync.WaitGroup
	sem := make(chan struct{}, 3)

	for _, st := range states {
		wg.Add(1)

		go func(stateID int16) {
			defer wg.Done()
			// Acquire a semaphore slot (max 5 concurrent IReV requests) and release on exit
			sem <- struct{}{}
			defer func() { <-sem }()

			// Fetch this state's LGA/ward tree from INEC IReV
			lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", cfg.BaseURL, cleanStr(inecElectionID), stateID)
			lgas, err := s.fetchLGAs(ctx, lgasURL)
			if err != nil {
				slog.Warn("SyncAllStatesMongoIDs: failed fetching state LGAs", "state_id", stateID, "err", err)
				return
			}

			// Batch-update lgas.mongo_id and wards.mongo_id and accumulate counts atomically
			lCount, wCount := s.syncLGAsAndWardsMongoIDs(ctx, lgas)
			totalLGAs.Add(int64(lCount))
			totalWards.Add(int64(wCount))
		}(st.ID)
	}

	wg.Wait()
	return int(totalLGAs.Load()), int(totalWards.Load()), nil
}

func (s *INECGrabberService) executeSync(
	ctx context.Context,
	grabber queries.GetINECResultGrabberByIDRow,
	config INECAPIConfig,
	uploadToR2 bool,
	aiExtract bool,
	opts SyncOptions,
) (int, error) {
	inecTypeID := cleanStr(grabber.InecElectionTypeID.String)
	if !grabber.InecElectionTypeID.Valid || inecTypeID == "" {
		return 0, fmt.Errorf("office for this election has no inec_election_type_id configured")
	}

	baseURL := config.BaseURL

	// 1. Resolve INEC Election (pinned ID from controlled scrape or year+name match)
	var matchedINECElection *INECElection
	if opts.INECElectionID != nil && cleanStr(*opts.INECElectionID) != "" {
		pinnedID := cleanStr(*opts.INECElectionID)
		matchedINECElection = &INECElection{ID: pinnedID}
		slog.Info("INEC SyncGrabber: using pinned INEC election ID", "grabber_id", grabber.ID, "inec_election_id", pinnedID)
	} else {
		// No pinned INEC election ID provided: fetch upstream elections for this type/state and match by year/name
		electionsData, err := s.fetchINECElections(ctx, baseURL, inecTypeID, grabber.StateID)
		if err != nil {
			slog.Error("INEC SyncGrabber: failed fetching elections list", "grabber_id", grabber.ID, "err", err)
			return 0, err
		}

		// Exit early with 0 results if IReV returned no candidate elections
		if len(electionsData) == 0 {
			slog.Info("INEC SyncGrabber: no elections returned from INEC API", "grabber_id", grabber.ID)
			return 0, nil
		}

		// Log the number of elections received from IReV
		slog.Info("INEC SyncGrabber: received elections list from INEC API", "grabber_id", grabber.ID, "count", len(electionsData))

		// Resolve target election year (defaulting to the local grabber's year, or overridden by opts.Year)
		appYear := grabber.ElectionDate.Time.Year()
		if opts.Year != nil && *opts.Year > 0 {
			appYear = *opts.Year
		}

		// loops through the electionData received from inec
		for i := range electionsData {
			// Parse the upstream election date (RFC3339 or YYYY-MM-DD) and skip non-matching years
			el := &electionsData[i]
			elDate, err := time.Parse(time.RFC3339, el.ElectionDate)
			if err != nil {
				elDate, _ = time.Parse("2006-01-02", el.ElectionDate)
			}
			if elDate.Year() != appYear {
				continue
			}

			if grabber.Scope == "nationwide" {
				matchedINECElection = el
				break
			} else {
				domainName := strings.TrimSpace(strings.ToLower(el.Domain.Name))
				fullName := strings.TrimSpace(strings.ToLower(el.FullName))
				stateName := ""
				if el.State != nil {
					stateName = strings.TrimSpace(strings.ToLower(el.State.Name))
				}
				grabberName := strings.TrimSpace(strings.ToLower(grabber.Name.String))

				// Tier 1: Exact Match (Case-Insensitive)
				if (domainName != "" && domainName == grabberName) ||
					(stateName != "" && stateName == grabberName) ||
					(fullName != "" && fullName == grabberName) {
					matchedINECElection = el
					break
				}

				// Tier 2: Ends With / Suffix Match
				if (domainName != "" && strings.HasSuffix(grabberName, domainName)) ||
					(domainName != "" && strings.HasSuffix(domainName, grabberName)) ||
					(stateName != "" && strings.HasSuffix(grabberName, stateName)) ||
					(fullName != "" && strings.HasSuffix(fullName, grabberName)) {
					matchedINECElection = el
					break
				}

				// Tier 3: Contains / Substring Match
				if (domainName != "" && (strings.Contains(grabberName, domainName) || strings.Contains(domainName, grabberName))) ||
					(stateName != "" && strings.Contains(grabberName, stateName)) ||
					(fullName != "" && strings.Contains(fullName, grabberName)) {
					matchedINECElection = el
					break
				}
			}
		}
	}

	if matchedINECElection == nil {
		slog.Warn("INEC SyncGrabber: no matching INEC election found", "grabber_id", grabber.ID, "target_year", grabber.ElectionDate.Time.Year(), "scope", grabber.Scope, "grabber_name", grabber.Name.String)
		return 0, nil
	}

	slog.Info("INEC SyncGrabber: matched INEC election successfully", "grabber_id", grabber.ID, "inec_election_id", matchedINECElection.ID, "inec_full_name", matchedINECElection.FullName, "inec_domain", matchedINECElection.Domain.Name)

	// 2. Traversal and result collection (optionally scoped by LGA, Ward, and MaxPUs)
	maxPUs := 0
	if opts.MaxPUs != nil && *opts.MaxPUs > 0 {
		maxPUs = *opts.MaxPUs
	}
	budget := &scrapeBudget{limit: int64(maxPUs)}
	saveToLocal := opts.SaveToLocal != nil && *opts.SaveToLocal && isDevEnv()

	if grabber.Scope == "nationwide" && grabber.StateID.Valid && grabber.StateID.Int16 > 0 {
		stID := grabber.StateID.Int16
		lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", baseURL, cleanStr(matchedINECElection.ID), stID)
		lgas, err := s.fetchLGAs(ctx, lgasURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch LGAs for state %d: %w", stID, err)
		}
		s.traverseLGAs(ctx, traverseLGAsParams{
			grabber:        grabber,
			inecElectionID: matchedINECElection.ID,
			lgas:           lgas,
			baseURL:        baseURL,
			uploadToR2:     uploadToR2,
			saveToLocal:    saveToLocal,
			aiExtract:      aiExtract,
			opts:           opts,
			budget:         budget,
		})
	} else if grabber.Scope == "nationwide" {
		states, err := s.queries.GetStatesByCountryID(ctx, 161)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch Nigerian states from DB: %w", err)
		}

		// Fan out state-level LGA fetches and ward scraping across a bounded pool of 3 state workers
		const stateWorkers = 3
		stateCh := make(chan queries.CState)
		var stateWG sync.WaitGroup
		for range stateWorkers {
			stateWG.Add(1)
			go func() {
				defer stateWG.Done()
				for st := range stateCh {
					if budget.exhausted() || ctx.Err() != nil {
						continue
					}
					lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", baseURL, cleanStr(matchedINECElection.ID), st.ID)
					lgas, err := s.fetchLGAs(ctx, lgasURL)
					if err != nil {
						slog.Warn("failed to fetch LGAs for state", "state_id", st.ID, "err", err)
						continue
					}
					s.traverseLGAs(ctx, traverseLGAsParams{
						grabber:        grabber,
						inecElectionID: matchedINECElection.ID,
						lgas:           lgas,
						stateName:      st.Name,
						baseURL:        baseURL,
						uploadToR2:     uploadToR2,
						saveToLocal:    saveToLocal,
						aiExtract:      aiExtract,
						opts:           opts,
						budget:         budget,
					})
				}
			}()
		}

		for _, st := range states {
			if budget.exhausted() || ctx.Err() != nil {
				break
			}
			stateCh <- st
		}
		close(stateCh)
		stateWG.Wait()
	} else {
		lgasURL := fmt.Sprintf("%s/elections/%s/lga", baseURL, cleanStr(matchedINECElection.ID))
		lgas, err := s.fetchLGAs(ctx, lgasURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch LGAs for inec election %s: %w", matchedINECElection.ID, err)
		}
		s.traverseLGAs(ctx, traverseLGAsParams{
			grabber:        grabber,
			inecElectionID: matchedINECElection.ID,
			lgas:           lgas,
			baseURL:        baseURL,
			uploadToR2:     uploadToR2,
			saveToLocal:    saveToLocal,
			aiExtract:      aiExtract,
			opts:           opts,
			budget:         budget,
		})
	}

	return int(budget.collected.Load()), nil
}

// scrapeBudget coordinates max_pus across concurrent state/ward workers without overshooting.
type scrapeBudget struct {
	limit     int64
	claimed   atomic.Int64
	collected atomic.Int64
}

func (b *scrapeBudget) exhausted() bool {
	return b.limit > 0 && b.claimed.Load() >= b.limit
}

func (b *scrapeBudget) tryClaim() bool {
	if b.limit <= 0 {
		return true
	}
	for {
		cur := b.claimed.Load()
		if cur >= b.limit {
			return false
		}
		if b.claimed.CompareAndSwap(cur, cur+1) {
			return true
		}
	}
}

func (b *scrapeBudget) addCollected() {
	b.collected.Add(1)
}

type traverseLGAsParams struct {
	grabber        queries.GetINECResultGrabberByIDRow
	inecElectionID string
	lgas           []INECLGA
	stateName      string
	baseURL        string
	uploadToR2     bool
	saveToLocal    bool
	aiExtract      bool
	opts           SyncOptions
	budget         *scrapeBudget
}

type processWardPUsParams struct {
	grabber        queries.GetINECResultGrabberByIDRow
	inecElectionID string
	wardID         string
	wardName       string
	lgaName        string
	stateName      string
	baseURL        string
	uploadToR2     bool
	saveToLocal    bool
	aiExtract      bool
	budget         *scrapeBudget
}

func (s *INECGrabberService) traverseLGAs(ctx context.Context, params traverseLGAsParams) {
	filterLGA := ""
	if params.opts.LGAID != nil {
		filterLGA = cleanStr(*params.opts.LGAID)
	}
	filterWard := ""
	if params.opts.WardID != nil {
		filterWard = cleanStr(*params.opts.WardID)
	}

	type wardTask struct {
		lgaName string
		ward    INECWard
	}
	var tasks []wardTask
	for _, lga := range params.lgas {
		if filterLGA != "" && cleanStr(lga.ID) != filterLGA {
			continue
		}
		for _, ward := range lga.Wards {
			if filterWard != "" && cleanStr(ward.ID) != filterWard {
				continue
			}
			tasks = append(tasks, wardTask{lgaName: lga.Name, ward: ward})
		}
	}
	if len(tasks) == 0 {
		return
	}

	// Process wards concurrently using a bounded pool of up to 5 workers
	workerCount := 5
	if len(tasks) < workerCount {
		workerCount = len(tasks)
	}
	taskCh := make(chan wardTask)
	var wg sync.WaitGroup
	for range workerCount {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range taskCh {
				if params.budget.exhausted() || ctx.Err() != nil {
					continue
				}
				if _, err := s.processWardPUs(ctx, processWardPUsParams{
					grabber:        params.grabber,
					inecElectionID: params.inecElectionID,
					wardID:         t.ward.ID,
					wardName:       t.ward.Name,
					lgaName:        t.lgaName,
					stateName:      params.stateName,
					baseURL:        params.baseURL,
					uploadToR2:     params.uploadToR2,
					saveToLocal:    params.saveToLocal,
					aiExtract:      params.aiExtract,
					budget:         params.budget,
				}); err != nil {
					slog.Warn("error processing ward PUs", "ward_id", t.ward.ID, "err", err)
				}
			}
		}()
	}

	for _, t := range tasks {
		if params.budget.exhausted() || ctx.Err() != nil {
			break
		}
		taskCh <- t
	}
	close(taskCh)
	wg.Wait()
}

// fetchLGAs retrieves LGAs and their nested wards from the upstream INEC API.
func (s *INECGrabberService) fetchLGAs(ctx context.Context, url string) ([]INECLGA, error) {
	// Build and execute GET request for the election's LGAs/wards
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected HTTP %d from %s", resp.StatusCode, url)
	}

	// Decode the JSON envelope and return the LGA list
	var res INECLGAsResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	// Populate top-level Name from the nested lga object when IReV omits it at the root
	for i := range res.Data {
		if res.Data[i].Name == "" && res.Data[i].LGA != nil {
			res.Data[i].Name = cleanStr(res.Data[i].LGA.Name)
		}
	}

	return res.Data, nil
}

// processWardPUs fetches polling unit results for a single ward from INEC, skips already-ingested PUs,
// claims a max_pus budget slot, optionally uploads/saves the sheet and runs Gemini OCR, and upserts the result.
func (s *INECGrabberService) processWardPUs(ctx context.Context, params processWardPUsParams) (int, error) {
	// Build the ward polling-unit results endpoint URL and prepare the GET request
	pusURL := fmt.Sprintf("%s/elections/%s/pus?ward=%s", params.baseURL, cleanStr(params.inecElectionID), url.QueryEscape(cleanStr(params.wardID)))
	slog.Info("INEC SyncGrabber: fetching ward PUs from INEC API", "ward_id", params.wardID, "ward_name", params.wardName, "lga_name", params.lgaName, "url", pusURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pusURL, nil)
	if err != nil {
		slog.Error("INEC SyncGrabber: failed to create ward PUs request", "ward_id", params.wardID, "err", err)
		return 0, err
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		slog.Error("INEC SyncGrabber: failed to call ward PUs endpoint", "ward_id", params.wardID, "err", err)
		return 0, err
	}
	defer resp.Body.Close()

	// Decode the ward PUs JSON payload from IReV
	var pusResp INECPUsResponse
	if err := json.NewDecoder(resp.Body).Decode(&pusResp); err != nil {
		slog.Error("INEC SyncGrabber: failed to parse ward PUs JSON", "ward_id", params.wardID, "err", err)
		return 0, err
	}

	slog.Info("INEC SyncGrabber: received ward PUs from INEC API", "ward_name", params.wardName, "pu_count", len(pusResp.Data))

	// Iterate through each polling unit in the ward and ingest any new result sheets until budget is exhausted
	newResults := 0
	for _, item := range pusResp.Data {
		if params.budget.exhausted() || ctx.Err() != nil {
			break
		}

		docURL := ""
		if item.Document != nil && item.Document.URL != "" {
			docURL = cleanStr(item.Document.URL)
		}
		if docURL == "" {
			continue
		}

		rawPUCode := item.PUCode
		if rawPUCode == "" && item.PollingUnit != nil {
			rawPUCode = item.PollingUnit.PUCode
		}
		if rawPUCode == "" {
			continue
		}

		formattedPUCode := strings.ReplaceAll(rawPUCode, "/", "-")

		puName := item.Name
		if puName == "" && item.PollingUnit != nil {
			puName = item.PollingUnit.Name
		}

		// Check DB polling unit by pu_code (trying raw, formatted '-', and slash '/' variants)
		pu, puErr := s.queries.GetPollingUnitByPUCode(ctx, pgtype.Text{String: rawPUCode, Valid: true})
		if puErr != nil {
			pu, puErr = s.queries.GetPollingUnitByPUCode(ctx, pgtype.Text{String: formattedPUCode, Valid: true})
		}
		if puErr != nil {
			slashPUCode := strings.ReplaceAll(rawPUCode, "-", "/")
			pu, puErr = s.queries.GetPollingUnitByPUCode(ctx, pgtype.Text{String: slashPUCode, Valid: true})
		}

		if puErr == nil {
			if _, err := s.queries.GetINECPollingUnitResultByElectionAndPU(ctx, queries.GetINECPollingUnitResultByElectionAndPUParams{
				ElectionID:    params.grabber.ElectionID,
				PollingUnitID: pu.ID,
			}); err == nil {
				slog.Debug("INEC SyncGrabber: PU result already ingested, skipping", "pu_code", rawPUCode)
				continue
			}
		} else {
			// Check if already queued in unmatched_polling_unit_results
			alreadyUnmatched, _ := s.queries.CheckUnmatchedPollingUnitResultExists(ctx, queries.CheckUnmatchedPollingUnitResultExistsParams{
				ElectionID:         params.grabber.ElectionID,
				RawPollingUnitCode: pgtype.Text{String: rawPUCode, Valid: rawPUCode != ""},
			})
			if alreadyUnmatched {
				slog.Debug("INEC SyncGrabber: PU result already in unmatched queue, skipping", "raw_pu_code", rawPUCode)
				continue
			}
		}

		// Atomically claim a max_pus slot before doing R2/local/OCR/DB work
		if !params.budget.tryClaim() {
			break
		}

		// Final Result Image URL
		finalImageURL := docURL
		if params.uploadToR2 && s.r2Svc != nil {
			slog.Info("INEC SyncGrabber: uploading result sheet image to Cloudflare R2", "pu_code", rawPUCode)
			r2URL, uploadErr := s.uploadImageToR2(ctx, docURL, formattedPUCode)
			if uploadErr == nil && r2URL != "" {
				finalImageURL = r2URL
			} else if uploadErr != nil {
				slog.Warn("INEC SyncGrabber: R2 upload failed, falling back to CDN URL", "pu_code", rawPUCode, "err", uploadErr)
			}
		}
		if params.saveToLocal && isDevEnv() {
			if localPath, saveErr := s.saveImageLocally(ctx, docURL, params.inecElectionID, formattedPUCode); saveErr == nil {
				slog.Info("INEC SyncGrabber: saved result sheet image locally", "pu_code", rawPUCode, "path", localPath)
			} else {
				slog.Warn("INEC SyncGrabber: failed saving result sheet locally", "pu_code", rawPUCode, "err", saveErr)
			}
		}

		// AI extraction via Gemini if enabled
		var accreditedVoters, votesCast, validVotes, rejectedVotes int32
		candidateResultsBytes := []byte("[]")
		var extractedCandidates []utils.GeminiExtractedPartyScore
		statusStr := "submitted"
		var rawJSONBytes []byte
		var isAIGenerated pgtype.Bool
		var confidenceScore pgtype.Numeric

		apiKey := s.geminiAPIKey
		if apiKey == "" {
			apiKey = os.Getenv("GEMINI_API_KEY")
		}

		if params.aiExtract && apiKey != "" {
			slog.Info("INEC SyncGrabber: extracting result sheet counts via Gemini AI Vision API", "pu_code", rawPUCode)
			extractedData, rawJSON, aiErr := utils.ExtractPollingUnitResultFromImage(ctx, apiKey, config.Load().GeminiModel, finalImageURL, true)
			if aiErr != nil {
				slog.Warn("AI result extraction failed for INEC PU sheet", "pu_code", rawPUCode, "err", aiErr)
			} else if extractedData != nil {
				accreditedVoters = int32(extractedData.AccreditedVoters)
				votesCast = int32(extractedData.VotesCast)
				validVotes = int32(extractedData.ValidVotes)
				rejectedVotes = int32(extractedData.RejectedVotes)
				if len(extractedData.Parties) > 0 {
					extractedCandidates = extractedData.Parties
					if cBytes, err := json.Marshal(extractedData.Parties); err == nil {
						candidateResultsBytes = cBytes
					}
				}
				rawJSONBytes = rawJSON
				isAIGenerated = pgtype.Bool{Bool: extractedData.IsAIGenerated, Valid: true}
				_ = confidenceScore.Scan("0.9500")
				if extractedData.IsAIGenerated {
					statusStr = "submitted"
				} else {
					statusStr = "ai_verified"
				}
				slog.Info("INEC SyncGrabber: AI extraction successful", "pu_code", rawPUCode, "status", statusStr, "valid_votes", validVotes)
			}
		}

		if puErr != nil {
			// UNMATCHED: Queue in unmatched_polling_unit_results
			slog.Warn("INEC SyncGrabber: Polling unit code not matched in database, queuing as unmatched result", "raw_pu_code", rawPUCode, "pu_name", puName, "ward_name", params.wardName)
			_ = s.createUnmatchedRecord(ctx, params.grabber, rawPUCode, puName, params.wardName, params.lgaName, params.stateName, docURL, accreditedVoters, votesCast, validVotes, rejectedVotes, candidateResultsBytes)
			newResults++
			params.budget.addCollected()
			continue
		}

		// Insert or update in inec_polling_unit_results
		submittedRes, err := s.queries.UpsertINECPollingUnitResult(ctx, queries.UpsertINECPollingUnitResultParams{
			ElectionID:            params.grabber.ElectionID,
			ElectionGroupID:       params.grabber.ElectionGroupID,
			PollingUnitID:         pu.ID,
			StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:  pgtype.Int4{},
			FederalConstituencyID: pgtype.Int4{},
			StateConstituencyID:   pgtype.Int4{},
			LgaID:                 pgtype.Int4{Int32: pu.LgaID, Valid: true},
			WardID:                pgtype.Int4{Int32: pu.WardID, Valid: true},
			AccreditedVoters:      accreditedVoters,
			VotesCast:             votesCast,
			ValidVotes:            validVotes,
			RejectedVotes:         rejectedVotes,
			ResultSheetImageUrl:   pgtype.Text{String: finalImageURL, Valid: true},
			IrevDocumentUrl:       pgtype.Text{String: docURL, Valid: docURL != ""},
			Status:                pgtype.Text{String: statusStr, Valid: true},
			AiExtractedData:       rawJSONBytes,
			ResultIsAiGenerated:   isAIGenerated,
			AiConfidenceScore:     confidenceScore,
		})

		if err != nil {
			slog.Error("failed to submit INEC polling unit result", "pu_code", rawPUCode, "err", err)
			continue
		}

		s.saveINECResultScores(ctx, submittedRes.ID, params.grabber.ElectionGroupID, params.grabber.ElectionID, pu.ID, extractedCandidates)

		slog.Info("INEC SyncGrabber: successfully ingested matched PU result",
			"pu_code", rawPUCode,
			"pu_id", pu.ID,
			"pu_name", pu.Name,
			"result_id", submittedRes.ID,
			"election_id", params.grabber.ElectionID,
			"status", statusStr,
		)

		// Update local election final results and trigger rollups
		_, _ = s.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
			ElectionID:               params.grabber.ElectionID,
			ElectionGroupID:          params.grabber.ElectionGroupID,
			PollingUnitID:            pu.ID,
			StateID:                  pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:     pgtype.Int4{},
			FederalConstituencyID:    pgtype.Int4{},
			StateConstituencyID:      pgtype.Int4{},
			LgaID:                    pgtype.Int4{Int32: pu.LgaID, Valid: true},
			WardID:                   pgtype.Int4{Int32: pu.WardID, Valid: true},
			PollingUnitResultID:      pgtype.Int8{Int64: submittedRes.ID, Valid: true},
			AccreditedVoters:         accreditedVoters,
			VotesCast:                votesCast,
			ValidVotes:               validVotes,
			RejectedVotes:            rejectedVotes,
			CandidateResults:         candidateResultsBytes,
			MatchingSubmissionsCount: 1,
			TotalSubmissionsCount:    1,
		})

		// Notify background task processor if notifier callback is present
		if s.resultNotifier != nil {
			s.resultNotifier(ctx, params.grabber.ElectionID, pu.ID)
		}

		newResults++
		params.budget.addCollected()
	}

	return newResults, nil
}

func (s *INECGrabberService) createUnmatchedRecord(
	ctx context.Context,
	grabber queries.GetINECResultGrabberByIDRow,
	rawPUCode, rawPUName, rawWardName, rawLGAName, rawStateName, imageURL string,
	accreditedVoters, votesCast, validVotes, rejectedVotes int32,
	candidateResults []byte,
) error {
	_, err := s.queries.CreateUnmatchedPollingUnitResult(ctx, queries.CreateUnmatchedPollingUnitResultParams{
		ElectionID:            grabber.ElectionID,
		ElectionGroupID:       grabber.ElectionGroupID,
		SubmittedBy:           pgtype.Int8{}, // NULL - ingested by INEC system, not a user
		PartyID:               pgtype.Int2{},
		RawPollingUnitCode:    pgtype.Text{String: rawPUCode, Valid: rawPUCode != ""},
		RawPollingUnitName:    pgtype.Text{String: rawPUName, Valid: rawPUName != ""},
		RawWardName:           pgtype.Text{String: rawWardName, Valid: rawWardName != ""},
		RawLgaName:            pgtype.Text{String: rawLGAName, Valid: rawLGAName != ""},
		RawStateName:          pgtype.Text{String: rawStateName, Valid: rawStateName != ""},
		StateID:               pgtype.Int2{},
		SenatorialDistrictID:  pgtype.Int4{},
		FederalConstituencyID: pgtype.Int4{},
		StateConstituencyID:   pgtype.Int4{},
		LgaID:                 pgtype.Int4{},
		WardID:                pgtype.Int4{},
		AccreditedVoters:      accreditedVoters,
		VotesCast:             votesCast,
		ValidVotes:            validVotes,
		RejectedVotes:         rejectedVotes,
		CandidateResults:      candidateResults,
		ResultSheetImageUrl:   pgtype.Text{String: imageURL, Valid: imageURL != ""},
		ResultSheetVideoUrl:   pgtype.Text{},
		ResolutionStatus:      "pending",
	})
	return err
}

func (s *INECGrabberService) fetchAndCompressImage(ctx context.Context, imageURL, puCode string) ([]byte, string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, "", "", err
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", "", fmt.Errorf("unexpected HTTP status %d fetching image", resp.StatusCode)
	}

	imgData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", "", err
	}

	uploadBytes := imgData
	contentType := "image/jpeg"
	extension := "jpg"

	// Optimize image (Quality 80: lossless-grade text/handwriting clarity with 75-85% size reduction)
	if img, _, decodeErr := image.Decode(bytes.NewReader(imgData)); decodeErr == nil {
		var buf bytes.Buffer
		if encodeErr := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80}); encodeErr == nil && buf.Len() > 0 {
			uploadBytes = buf.Bytes()
			contentType = "image/jpeg"
			extension = "jpg"
			slog.Info("Successfully compressed INEC result sheet image",
				"pu_code", puCode,
				"original_size_kb", len(imgData)/1024,
				"compressed_size_kb", buf.Len()/1024,
				"savings_pct", 100-(buf.Len()*100/len(imgData)))
		}
	}

	return uploadBytes, contentType, extension, nil
}

func (s *INECGrabberService) uploadImageToR2(ctx context.Context, imageURL, puCode string) (string, error) {
	uploadBytes, contentType, extension, err := s.fetchAndCompressImage(ctx, imageURL, puCode)
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("inec-results/%s-%d.%s", puCode, time.Now().Unix(), extension)
	r2URL, err := s.r2Svc.UploadFile(ctx, filename, bytes.NewReader(uploadBytes), int64(len(uploadBytes)), contentType)
	if err != nil {
		return "", err
	}
	return r2URL, nil
}

// saveImageLocally writes the INEC result sheet to a gitignored local folder in development only.
func (s *INECGrabberService) saveImageLocally(ctx context.Context, imageURL, inecElectionID, puCode string) (string, error) {
	if !isDevEnv() {
		return "", fmt.Errorf("local saving is only allowed in development environment")
	}

	imgBytes, _, extension, err := s.fetchAndCompressImage(ctx, imageURL, puCode)
	if err != nil {
		return "", err
	}

	safeElection := cleanStr(inecElectionID)
	if safeElection == "" {
		safeElection = "unknown"
	}
	dir := filepath.Join(".data", "inec-results", filepath.Base(safeElection))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	safePU := strings.ReplaceAll(filepath.Base(puCode), string(filepath.Separator), "_")
	filePath := filepath.Join(dir, fmt.Sprintf("%s-%d.%s", safePU, time.Now().Unix(), extension))
	if err := os.WriteFile(filePath, imgBytes, 0o644); err != nil {
		return "", err
	}
	return filePath, nil
}

func (s *INECGrabberService) ListLogs(ctx context.Context, grabberID int64, limit, offset int32) ([]queries.InecResultGrabberLog, error) {
	return s.queries.ListINECResultGrabberLogs(ctx, queries.ListINECResultGrabberLogsParams{
		InecResultGrabberID: grabberID,
		Limit:               limit,
		Offset:              offset,
	})
}

func (s *INECGrabberService) ListUnmatchedResults(ctx context.Context, electionID *int32, status *string, limit, offset int32) ([]queries.UnmatchedPollingUnitResult, error) {
	var elID pgtype.Int4
	if electionID != nil {
		elID = pgtype.Int4{Int32: *electionID, Valid: true}
	}
	var stText pgtype.Text
	if status != nil {
		stText = pgtype.Text{String: *status, Valid: true}
	}
	return s.queries.ListUnmatchedPollingUnitResults(ctx, queries.ListUnmatchedPollingUnitResultsParams{
		ElectionID:       elID,
		ResolutionStatus: stText,
		Limit:            limit,
		Offset:           offset,
	})
}

func (s *INECGrabberService) ResolveUnmatchedResult(
	ctx context.Context,
	id int64,
	status string,
	notes string,
	pollingUnitID *int32,
	adminUserID int64,
) (queries.UnmatchedPollingUnitResult, error) {
	unmatched, err := s.queries.GetUnmatchedPollingUnitResultByID(ctx, id)
	if err != nil {
		return queries.UnmatchedPollingUnitResult{}, fmt.Errorf("unmatched record not found: %w", err)
	}

	var resolvedPU pgtype.Int4
	var resolvedResult pgtype.Int8

	if (status == "resolved_mapped" || status == "resolved_created_pu") && pollingUnitID != nil && *pollingUnitID > 0 {
		pu, err := s.queries.GetPollingUnitByID(ctx, *pollingUnitID)
		if err == nil {
			resolvedPU = pgtype.Int4{Int32: pu.ID, Valid: true}

			// Copy into inec_polling_unit_results
			imgURL := unmatched.ResultSheetImageUrl.String

			pur, err := s.queries.UpsertINECPollingUnitResult(ctx, queries.UpsertINECPollingUnitResultParams{
				ElectionID:                   unmatched.ElectionID,
				ElectionGroupID:              unmatched.ElectionGroupID,
				PollingUnitID:                pu.ID,
				StateID:                      pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
				SenatorialDistrictID:         pgtype.Int4{},
				FederalConstituencyID:        pgtype.Int4{},
				StateConstituencyID:          pgtype.Int4{},
				LgaID:                        pgtype.Int4{Int32: pu.LgaID, Valid: true},
				WardID:                       pgtype.Int4{Int32: pu.WardID, Valid: true},
				RegisteredVoters:             pgtype.Int4{Int32: unmatched.RegisteredVoters, Valid: true},
				AccreditedVoters:             unmatched.AccreditedVoters,
				BallotPapersIssued:           pgtype.Int4{Int32: unmatched.BallotPapersIssued, Valid: true},
				UnusedBallotPapers:           pgtype.Int4{Int32: unmatched.UnusedBallotPapers, Valid: true},
				SpoiledBallotPapers:          pgtype.Int4{Int32: unmatched.SpoiledBallotPapers, Valid: true},
				RejectedVotes:                unmatched.RejectedVotes,
				ValidVotes:                   unmatched.ValidVotes,
				UsedBallotPapers:             pgtype.Int4{Int32: unmatched.UsedBallotPapers, Valid: true},
				VotesCast:                    unmatched.VotesCast,
				ResultSheetImageUrl:          pgtype.Text{String: imgURL, Valid: imgURL != ""},
				SerialNumber:                 unmatched.SerialNumber,
				SheetDate:                    unmatched.SheetDate,
				PresidingOfficerName:         unmatched.PresidingOfficerName,
				HasPresidingOfficerSignature: pgtype.Bool{Bool: unmatched.HasPresidingOfficerSignature, Valid: true},
			})
			if err == nil {
				resolvedResult = pgtype.Int8{Int64: pur.ID, Valid: true}

				var unmatchedCandidates []utils.GeminiExtractedPartyScore
				if len(unmatched.CandidateResults) > 0 {
					_ = json.Unmarshal(unmatched.CandidateResults, &unmatchedCandidates)
				}
				s.saveINECResultScores(ctx, pur.ID, unmatched.ElectionGroupID, unmatched.ElectionID, pu.ID, unmatchedCandidates)

				// Upsert election_polling_unit_final_results directly
				_, _ = s.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
					ElectionID:               unmatched.ElectionID,
					ElectionGroupID:          unmatched.ElectionGroupID,
					PollingUnitID:            pu.ID,
					StateID:                  pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
					SenatorialDistrictID:     pgtype.Int4{},
					FederalConstituencyID:    pgtype.Int4{},
					StateConstituencyID:      pgtype.Int4{},
					LgaID:                    pgtype.Int4{Int32: pu.LgaID, Valid: true},
					WardID:                   pgtype.Int4{Int32: pu.WardID, Valid: true},
					PollingUnitResultID:      pgtype.Int8{},
					AccreditedVoters:         unmatched.AccreditedVoters,
					VotesCast:                unmatched.VotesCast,
					ValidVotes:               unmatched.ValidVotes,
					RejectedVotes:            unmatched.RejectedVotes,
					CandidateResults:         unmatched.CandidateResults,
					MatchingSubmissionsCount: 1,
					TotalSubmissionsCount:    1,
				})

				// Notify background worker to trigger geographic rollups
				if s.resultNotifier != nil {
					s.resultNotifier(ctx, unmatched.ElectionID, pu.ID)
				}
			}
		}
	}

	return s.queries.UpdateUnmatchedPollingUnitResultStatus(ctx, queries.UpdateUnmatchedPollingUnitResultStatusParams{
		ID:                    id,
		ResolutionStatus:      status,
		ResolutionNotes:       pgtype.Text{String: notes, Valid: notes != ""},
		ResolvedPollingUnitID: resolvedPU,
		ResolvedResultID:      resolvedResult,
		ResolvedBy:            pgtype.Int8{Int64: adminUserID, Valid: true},
	})
}

func (s *INECGrabberService) ListGrabbersPaginated(ctx context.Context, cursor *int64, limit int32) ([]queries.ListINECResultGrabbersPaginatedRow, error) {
	if limit <= 0 {
		limit = 20
	}
	cur := utils.PgInt8FromPtr(cursor)
	return s.queries.ListINECResultGrabbersPaginated(ctx, queries.ListINECResultGrabbersPaginatedParams{
		Cursor: cur,
		Limit:  limit,
	})
}

func (s *INECGrabberService) ListLogsPaginated(ctx context.Context, grabberID *int64, cursor *int64, limit int32) ([]queries.ListINECResultGrabberLogsPaginatedRow, error) {
	if limit <= 0 {
		limit = 20
	}
	gID := utils.PgInt8FromPtr(grabberID)
	cur := utils.PgInt8FromPtr(cursor)
	return s.queries.ListINECResultGrabberLogsPaginated(ctx, queries.ListINECResultGrabberLogsPaginatedParams{
		GrabberID: gID,
		Cursor:    cur,
		Limit:     limit,
	})
}

func (s *INECGrabberService) TogglePause(ctx context.Context, id int64) (queries.InecResultGrabber, error) {
	return s.queries.ToggleINECResultGrabberPause(ctx, id)
}

// saveINECResultScores replaces the normalized per-party scores for an INEC polling unit result.
func (s *INECGrabberService) saveINECResultScores(ctx context.Context, inecResultID int64, electionGroupID, electionID, pollingUnitID int32, candidates []utils.GeminiExtractedPartyScore) {
	if err := s.queries.DeleteINECPollingUnitResultScoresByResultID(ctx, inecResultID); err != nil {
		slog.Warn("failed to clear old INEC result scores", "inec_result_id", inecResultID, "err", err)
		return
	}
	for _, c := range candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		if shortName == "" {
			continue
		}
		if _, err := s.queries.UpsertINECPollingUnitResultScore(ctx, queries.UpsertINECPollingUnitResultScoreParams{
			InecResultID:    inecResultID,
			ElectionGroupID: electionGroupID,
			ElectionID:      electionID,
			PollingUnitID:   pollingUnitID,
			PartyShortName:  shortName,
			VoteCount:       int32(c.VoteCount),
			AgentName:       utils.PgTextFromString(strings.TrimSpace(c.AgentName)),
			HasSignature:    c.HasSignature,
		}); err != nil {
			slog.Warn("failed to upsert INEC result score", "inec_result_id", inecResultID, "party", shortName, "err", err)
		}
	}
}

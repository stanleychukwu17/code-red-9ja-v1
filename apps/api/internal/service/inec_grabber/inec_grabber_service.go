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

	// Mark status as syncing
	_, _ = s.queries.UpdateINECResultGrabberSyncStatus(ctx, queries.UpdateINECResultGrabberSyncStatusParams{
		ID:               grabber.ID,
		SyncStatus:       "syncing",
		SyncErrorMessage: pgtype.Text{},
	})

	newResultsCount, syncErr := s.executeSync(ctx, grabber, config, uploadToR2, aiExtract, opts)

	// Calculate election metrics
	metrics, calcErr := s.queries.CalculateElectionMetrics(ctx, grabber.ElectionID)
	var uploadedCount, completedWards, completedLgas int32
	isFullyComplete := false
	if calcErr == nil {
		uploadedCount = int32(metrics.UploadedResultsCount)
		completedWards = int32(metrics.WardsWithCompleteResultsCount)
		completedLgas = int32(metrics.LgasWithCompleteResultsCount)
		if metrics.TotalLgasCount > 0 && metrics.LgasWithCompleteResultsCount >= metrics.TotalLgasCount {
			isFullyComplete = true
		}
	} else {
		uploadedCount = grabber.UploadedResultsCount + int32(newResultsCount)
		completedWards = grabber.WardsWithCompleteResultsCount
		completedLgas = grabber.LgasWithCompleteResultsCount
	}

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

	// Update grabber metrics & status
	_, _ = s.queries.UpdateINECResultGrabberMetrics(ctx, queries.UpdateINECResultGrabberMetricsParams{
		ID:                            grabber.ID,
		UploadedResultsCount:          uploadedCount,
		WardsWithCompleteResultsCount: completedWards,
		LgasWithCompleteResultsCount:  completedLgas,
		SyncStatus:                    statusStr,
		SyncErrorMessage:              errMsg,
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

type ControlledScrapeParams struct {
	OfficeID       int16   `json:"office_id"`
	StateID        *int16  `json:"state_id"`
	Year           *int    `json:"year"`
	INECElectionID string  `json:"inec_election_id"`
	LGAID          *string `json:"lga_id"`
	WardID         *string `json:"ward_id"`
	MaxPUs         *int    `json:"max_pus"`
	UploadToR2     *bool   `json:"upload_to_r2"`
	AIExtract      *bool   `json:"ai_extract"`
	Force          *bool   `json:"force"`
}

type ControlledScrapeResult struct {
	ResultsCollected  int                           `json:"results_collected"`
	MatchedElectionID *int32                        `json:"matched_election_id,omitempty"`
	Log               *queries.InecResultGrabberLog `json:"log,omitempty"`
}

// ControlledScrape scrapes a pinned upstream INEC election. If a matching local election exists in our DB,
// it links election_id and election_group_id; otherwise it saves standalone results with election_id = NULL.
func (s *INECGrabberService) ControlledScrape(ctx context.Context, params ControlledScrapeParams) (*ControlledScrapeResult, error) {
	if cleanStr(params.INECElectionID) == "" {
		return nil, fmt.Errorf("inec_election_id is required")
	}

	var statePgID pgtype.Int2
	if params.StateID != nil && *params.StateID > 0 {
		statePgID = pgtype.Int2{Int16: *params.StateID, Valid: true}
	}
	var yearPg pgtype.Int4
	if params.Year != nil && *params.Year > 0 {
		yearPg = pgtype.Int4{Int32: int32(*params.Year), Valid: true}
	}

	syncOpts := SyncOptions{
		UploadToR2:     params.UploadToR2,
		AIExtract:      params.AIExtract,
		Force:          params.Force,
		Year:           params.Year,
		INECElectionID: &params.INECElectionID,
		LGAID:          params.LGAID,
		WardID:         params.WardID,
		MaxPUs:         params.MaxPUs,
	}

	// Try to match an existing local election + grabber in our DB
	matchedGrabber, matchErr := s.queries.FindMatchingGrabberForINECScrape(ctx, queries.FindMatchingGrabberForINECScrapeParams{
		OfficeID: params.OfficeID,
		StateID:  statePgID,
		Year:     yearPg,
	})
	if matchErr == nil {
		logRec, syncErr := s.SyncGrabber(ctx, matchedGrabber.ID, syncOpts)
		collected := 0
		if logRec != nil {
			collected = int(logRec.ResultsCollectedCount)
		}
		electionID := matchedGrabber.ElectionID
		return &ControlledScrapeResult{
			ResultsCollected:  collected,
			MatchedElectionID: &electionID,
			Log:               logRec,
		}, syncErr
	}

	// No local election match: run standalone scrape with election_id = NULL
	office, err := s.queries.GetOfficeByID(ctx, params.OfficeID)
	if err != nil {
		return nil, fmt.Errorf("office not found: %w", err)
	}
	cfg, err := s.GetINECAPIConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load inec api config: %w", err)
	}

	uploadToR2 := cfg.UploadToR2Default
	if params.UploadToR2 != nil {
		uploadToR2 = *params.UploadToR2
	}
	aiExtract := cfg.AIExtractDefault
	if params.AIExtract != nil {
		aiExtract = *params.AIExtract
	}

	standaloneGrabber := queries.GetINECResultGrabberByIDRow{
		Scope:              office.Scope,
		StateID:            statePgID,
		OfficeID:           office.ID,
		InecElectionTypeID: office.InecElectionTypeID,
		OfficeName:         office.Name,
	}

	collected, syncErr := s.executeSync(ctx, standaloneGrabber, cfg, uploadToR2, aiExtract, syncOpts)
	if syncErr != nil {
		return nil, syncErr
	}

	return &ControlledScrapeResult{
		ResultsCollected:  collected,
		MatchedElectionID: nil,
	}, nil
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

// PreviewINECLGAs fetches LGAs and their wards for a specific INEC election ID.
func (s *INECGrabberService) PreviewINECLGAs(ctx context.Context, inecElectionID string, stateID *int16) ([]INECLGA, error) {
	// Load base URL and INEC API settings from system_settings
	cfg, err := s.GetINECAPIConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load inec api config: %w", err)
	}

	// Use state-scoped LGA endpoint when stateID is provided, otherwise fetch election-wide LGAs
	lgasURL := fmt.Sprintf("%s/elections/%s/lga", cfg.BaseURL, cleanStr(inecElectionID))
	if stateID != nil && *stateID > 0 {
		lgasURL = fmt.Sprintf("%s/elections/%s/lga/state/%d", cfg.BaseURL, cleanStr(inecElectionID), *stateID)
	}

	return s.fetchLGAs(ctx, lgasURL)
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
		electionsData, err := s.fetchINECElections(ctx, baseURL, inecTypeID, grabber.StateID)
		if err != nil {
			slog.Error("INEC SyncGrabber: failed fetching elections list", "grabber_id", grabber.ID, "err", err)
			return 0, err
		}
		if len(electionsData) == 0 {
			slog.Info("INEC SyncGrabber: no elections returned from INEC API", "grabber_id", grabber.ID)
			return 0, nil
		}

		slog.Info("INEC SyncGrabber: received elections list from INEC API", "grabber_id", grabber.ID, "count", len(electionsData))

		// Match INEC election
		appYear := grabber.ElectionDate.Time.Year()
		if opts.Year != nil && *opts.Year > 0 {
			appYear = *opts.Year
		}

		for i := range electionsData {
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
		slog.Warn("INEC SyncGrabber: no matching INEC election found",
			"grabber_id", grabber.ID,
			"target_year", grabber.ElectionDate.Time.Year(),
			"scope", grabber.Scope,
			"grabber_name", grabber.Name.String,
		)
		return 0, nil
	}

	slog.Info("INEC SyncGrabber: matched INEC election successfully",
		"grabber_id", grabber.ID,
		"inec_election_id", matchedINECElection.ID,
		"inec_full_name", matchedINECElection.FullName,
		"inec_domain", matchedINECElection.Domain.Name,
	)

	// 2. Traversal and result collection (optionally scoped by LGA, Ward, and MaxPUs)
	newResultsCount := 0
	maxPUs := 0
	if opts.MaxPUs != nil && *opts.MaxPUs > 0 {
		maxPUs = *opts.MaxPUs
	}

	if grabber.Scope == "nationwide" && grabber.StateID.Valid && grabber.StateID.Int16 > 0 {
		stID := grabber.StateID.Int16
		lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", baseURL, cleanStr(matchedINECElection.ID), stID)
		lgas, err := s.fetchLGAs(ctx, lgasURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch LGAs for state %d: %w", stID, err)
		}
		newResultsCount += s.traverseLGAs(ctx, grabber, matchedINECElection.ID, lgas, "", baseURL, uploadToR2, aiExtract, opts, maxPUs)
	} else if grabber.Scope == "nationwide" {
		states, err := s.queries.GetStatesByCountryID(ctx, 161)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch Nigerian states from DB: %w", err)
		}

		for _, st := range states {
			if maxPUs > 0 && newResultsCount >= maxPUs {
				break
			}
			lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", baseURL, cleanStr(matchedINECElection.ID), st.ID)
			lgas, err := s.fetchLGAs(ctx, lgasURL)
			if err != nil {
				slog.Warn("failed to fetch LGAs for state", "state_id", st.ID, "err", err)
				continue
			}
			newResultsCount += s.traverseLGAs(ctx, grabber, matchedINECElection.ID, lgas, st.Name, baseURL, uploadToR2, aiExtract, opts, maxPUs-newResultsCount)
		}
	} else {
		lgasURL := fmt.Sprintf("%s/elections/%s/lga", baseURL, cleanStr(matchedINECElection.ID))
		lgas, err := s.fetchLGAs(ctx, lgasURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch LGAs for inec election %s: %w", matchedINECElection.ID, err)
		}
		newResultsCount += s.traverseLGAs(ctx, grabber, matchedINECElection.ID, lgas, "", baseURL, uploadToR2, aiExtract, opts, maxPUs)
	}

	return newResultsCount, nil
}

func (s *INECGrabberService) traverseLGAs(
	ctx context.Context,
	grabber queries.GetINECResultGrabberByIDRow,
	inecElectionID string,
	lgas []INECLGA,
	stateName string,
	baseURL string,
	uploadToR2 bool,
	aiExtract bool,
	opts SyncOptions,
	remainingMaxPUs int,
) int {
	filterLGA := ""
	if opts.LGAID != nil {
		filterLGA = cleanStr(*opts.LGAID)
	}
	filterWard := ""
	if opts.WardID != nil {
		filterWard = cleanStr(*opts.WardID)
	}

	collected := 0
	for _, lga := range lgas {
		if filterLGA != "" && cleanStr(lga.ID) != filterLGA {
			continue
		}
		for _, ward := range lga.Wards {
			if filterWard != "" && cleanStr(ward.ID) != filterWard {
				continue
			}
			budget := 0
			if remainingMaxPUs > 0 {
				budget = remainingMaxPUs - collected
				if budget <= 0 {
					return collected
				}
			}
			count, err := s.processWardPUs(ctx, grabber, inecElectionID, ward.ID, ward.Name, lga.Name, stateName, baseURL, uploadToR2, aiExtract, budget)
			if err != nil {
				slog.Warn("error processing ward PUs", "ward_id", ward.ID, "err", err)
			}
			collected += count
		}
	}
	return collected
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

func (s *INECGrabberService) processWardPUs(
	ctx context.Context,
	grabber queries.GetINECResultGrabberByIDRow,
	inecElectionID string,
	wardID string,
	wardName string,
	lgaName string,
	stateName string,
	baseURL string,
	uploadToR2 bool,
	aiExtract bool,
	maxPUs int,
) (int, error) {
	pusURL := fmt.Sprintf("%s/elections/%s/pus?ward=%s", baseURL, cleanStr(inecElectionID), url.QueryEscape(cleanStr(wardID)))
	slog.Info("INEC SyncGrabber: fetching ward PUs from INEC API", "ward_id", wardID, "ward_name", wardName, "lga_name", lgaName, "url", pusURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pusURL, nil)
	if err != nil {
		slog.Error("INEC SyncGrabber: failed to create ward PUs request", "ward_id", wardID, "err", err)
		return 0, err
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		slog.Error("INEC SyncGrabber: failed to call ward PUs endpoint", "ward_id", wardID, "err", err)
		return 0, err
	}
	defer resp.Body.Close()

	var pusResp INECPUsResponse
	if err := json.NewDecoder(resp.Body).Decode(&pusResp); err != nil {
		slog.Error("INEC SyncGrabber: failed to parse ward PUs JSON", "ward_id", wardID, "err", err)
		return 0, err
	}

	slog.Info("INEC SyncGrabber: received ward PUs from INEC API", "ward_name", wardName, "pu_count", len(pusResp.Data))

	newResults := 0

	for _, item := range pusResp.Data {
		if maxPUs > 0 && newResults >= maxPUs {
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
			if grabber.ElectionID > 0 {
				if _, err := s.queries.GetINECPollingUnitResultByElectionAndPU(ctx, queries.GetINECPollingUnitResultByElectionAndPUParams{
					ElectionID:    pgtype.Int4{Int32: grabber.ElectionID, Valid: true},
					PollingUnitID: pu.ID,
				}); err == nil {
					slog.Debug("INEC SyncGrabber: PU result already ingested, skipping", "pu_code", rawPUCode)
					continue
				}
			} else if cleanStr(inecElectionID) != "" {
				if _, err := s.queries.GetINECPollingUnitResultByINECElectionAndPU(ctx, queries.GetINECPollingUnitResultByINECElectionAndPUParams{
					InecElectionID: pgtype.Text{String: cleanStr(inecElectionID), Valid: true},
					PollingUnitID:  pu.ID,
				}); err == nil {
					slog.Debug("INEC SyncGrabber: standalone PU result already ingested, skipping", "pu_code", rawPUCode)
					continue
				}
			}
		} else {
			if grabber.ElectionID == 0 {
				slog.Warn("INEC SyncGrabber: PU code not matched in standalone mode, skipping", "raw_pu_code", rawPUCode, "pu_name", puName)
				continue
			}
			// Check if already queued in unmatched_polling_unit_results
			alreadyUnmatched, _ := s.queries.CheckUnmatchedPollingUnitResultExists(ctx, queries.CheckUnmatchedPollingUnitResultExistsParams{
				ElectionID:         grabber.ElectionID,
				RawPollingUnitCode: pgtype.Text{String: rawPUCode, Valid: rawPUCode != ""},
			})
			if alreadyUnmatched {
				slog.Debug("INEC SyncGrabber: PU result already in unmatched queue, skipping", "raw_pu_code", rawPUCode)
				continue
			}
		}

		// Final Result Image URL
		finalImageURL := docURL
		if uploadToR2 && s.r2Svc != nil {
			slog.Info("INEC SyncGrabber: uploading result sheet image to Cloudflare R2", "pu_code", rawPUCode)
			r2URL, uploadErr := s.uploadImageToR2(ctx, docURL, formattedPUCode)
			if uploadErr == nil && r2URL != "" {
				finalImageURL = r2URL
			} else if uploadErr != nil {
				slog.Warn("INEC SyncGrabber: R2 upload failed, falling back to CDN URL", "pu_code", rawPUCode, "err", uploadErr)
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

		if aiExtract && apiKey != "" {
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
			slog.Warn("INEC SyncGrabber: Polling unit code not matched in database, queuing as unmatched result", "raw_pu_code", rawPUCode, "pu_name", puName, "ward_name", wardName)
			_ = s.createUnmatchedRecord(ctx, grabber, rawPUCode, puName, wardName, lgaName, stateName, docURL, accreditedVoters, votesCast, validVotes, rejectedVotes, candidateResultsBytes)
			newResults++
			continue
		}

		// Insert or update in inec_polling_unit_results (linked to local election if matched, else election_id = NULL)
		var submittedRes queries.InecPollingUnitResult
		if grabber.ElectionID > 0 {
			submittedRes, err = s.queries.UpsertINECPollingUnitResult(ctx, queries.UpsertINECPollingUnitResultParams{
				ElectionID:            pgtype.Int4{Int32: grabber.ElectionID, Valid: true},
				ElectionGroupID:       pgtype.Int4{Int32: grabber.ElectionGroupID, Valid: true},
				InecElectionID:        pgtype.Text{String: cleanStr(inecElectionID), Valid: cleanStr(inecElectionID) != ""},
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
		} else {
			submittedRes, err = s.queries.UpsertStandaloneINECPollingUnitResult(ctx, queries.UpsertStandaloneINECPollingUnitResultParams{
				InecElectionID:        pgtype.Text{String: cleanStr(inecElectionID), Valid: cleanStr(inecElectionID) != ""},
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
		}

		if err != nil {
			slog.Error("failed to submit INEC polling unit result", "pu_code", rawPUCode, "err", err)
			continue
		}

		s.saveINECResultScores(ctx, submittedRes.ID, grabber.ElectionGroupID, grabber.ElectionID, pu.ID, extractedCandidates)

		slog.Info("INEC SyncGrabber: successfully ingested matched PU result",
			"pu_code", rawPUCode,
			"pu_id", pu.ID,
			"pu_name", pu.Name,
			"result_id", submittedRes.ID,
			"election_id", grabber.ElectionID,
			"status", statusStr,
		)

		// Only update local election final results and trigger rollups when linked to a local election
		if grabber.ElectionID > 0 {
			_, _ = s.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
				ElectionID:               grabber.ElectionID,
				ElectionGroupID:          grabber.ElectionGroupID,
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
				s.resultNotifier(ctx, grabber.ElectionID, pu.ID)
			}
		}

		newResults++
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

func (s *INECGrabberService) uploadImageToR2(ctx context.Context, imageURL, puCode string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return "", err
	}

	// Send HTTP request using the service's configured timeout client
	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	imgData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
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

	filename := fmt.Sprintf("inec-results/%s-%d.%s", puCode, time.Now().Unix(), extension)
	r2URL, err := s.r2Svc.UploadFile(ctx, filename, bytes.NewReader(uploadBytes), int64(len(uploadBytes)), contentType)
	if err != nil {
		return "", err
	}
	return r2URL, nil
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
				ElectionID:                   pgtype.Int4{Int32: unmatched.ElectionID, Valid: true},
				ElectionGroupID:              pgtype.Int4{Int32: unmatched.ElectionGroupID, Valid: true},
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
	var egPg, ePg pgtype.Int4
	if electionGroupID > 0 {
		egPg = pgtype.Int4{Int32: electionGroupID, Valid: true}
	}
	if electionID > 0 {
		ePg = pgtype.Int4{Int32: electionID, Valid: true}
	}
	for _, c := range candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		if shortName == "" {
			continue
		}
		if _, err := s.queries.UpsertINECPollingUnitResultScore(ctx, queries.UpsertINECPollingUnitResultScoreParams{
			InecResultID:    inecResultID,
			ElectionGroupID: egPg,
			ElectionID:      ePg,
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

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
	"time"

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

type ResultNotifierFunc func(ctx context.Context, electionID int64, pollingUnitID int32)

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
	UploadToR2 *bool `json:"upload_to_r2"`
	AIExtract  *bool `json:"ai_extract"`
	Force      *bool `json:"force"`
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

type INECLGA struct {
	ID    string     `json:"_id"`
	Name  string     `json:"name"`
	Wards []INECWard `json:"wards"`
}

type INECWard struct {
	ID   string `json:"_id"`
	Name string `json:"name"`
	Code string `json:"code"`
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
		return nil, fmt.Errorf("grabber not found: %w", err)
	}

	// Check if paused or completed and force is not requested (do NOT insert log records)
	if grabber.SyncStatus == "paused" && (opts.Force == nil || !*opts.Force) {
		return nil, fmt.Errorf("This INEC result grabber is currently paused. Resume it to allow syncing.")
	}
	if grabber.SyncStatus == "completed" && (opts.Force == nil || !*opts.Force) {
		return nil, fmt.Errorf("This INEC result grabber has already completed all polling unit results for this election.")
	}

	config, err := s.GetINECAPIConfig(ctx)
	if err != nil {
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

	newResultsCount, syncErr := s.executeSync(ctx, grabber, config, uploadToR2, aiExtract)

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
		ID:                             grabber.ID,
		UploadedResultsCount:          uploadedCount,
		WardsWithCompleteResultsCount: completedWards,
		LgasWithCompleteResultsCount:  completedLgas,
		SyncStatus:                    statusStr,
		SyncErrorMessage:              errMsg,
	})

	// Create execution log
	logRecord, logErr := s.queries.CreateINECResultGrabberLog(ctx, queries.CreateINECResultGrabberLogParams{
		InecResultGrabberID:  grabber.ID,
		ElectionGroupID:      grabber.ElectionGroupID,
		ElectionID:           grabber.ElectionID,
		ResultsCollectedCount: int32(newResultsCount),
		Status:               statusStr,
		ErrorMessage:         errMsg,
		StartedAt:            pgtype.Timestamptz{Time: startTime, Valid: true},
		EndedAt:              pgtype.Timestamptz{Time: endedTime, Valid: true},
	})
	if logErr != nil {
		slog.Error("failed to create inec result grabber log", "err", logErr)
	}

	return &logRecord, syncErr
}

func (s *INECGrabberService) executeSync(
	ctx context.Context,
	grabber queries.GetINECResultGrabberByIDRow,
	config INECAPIConfig,
	uploadToR2 bool,
	aiExtract bool,
) (int, error) {
	inecTypeID := cleanStr(grabber.InecElectionTypeID.String)
	if !grabber.InecElectionTypeID.Valid || inecTypeID == "" {
		return 0, fmt.Errorf("office for this election has no inec_election_type_id configured")
	}

	baseURL := strings.TrimRight(cleanStr(config.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://dolphin-app-sleqh.ondigitalocean.app/api/v1"
	}

	// 1. Fetch Elections list from INEC API
	electionsURL := fmt.Sprintf("%s/elections?election_type=%s", baseURL, url.QueryEscape(inecTypeID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, electionsURL, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create inec elections request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to call inec elections endpoint: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read inec elections response: %w", err)
	}

	var electionsResp INECElectionsResponse
	if err := json.Unmarshal(bodyBytes, &electionsResp); err != nil {
		return 0, fmt.Errorf("failed to parse inec elections JSON: %w", err)
	}

	if !electionsResp.Success || len(electionsResp.Data) == 0 {
		slog.Info("no inec elections returned", "grabber_id", grabber.ID)
		return 0, nil
	}

	// Match INEC election
	var matchedINECElection *INECElection
	appYear := grabber.ElectionDate.Time.Year()

	for i := range electionsResp.Data {
		el := &electionsResp.Data[i]
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
			domainName := strings.ToLower(el.Domain.Name)
			fullName := strings.ToLower(el.FullName)
			stateName := ""
			if el.State != nil {
				stateName = strings.ToLower(el.State.Name)
			}
			grabberName := strings.ToLower(grabber.Name.String)

			if (domainName != "" && (strings.Contains(grabberName, domainName) || strings.Contains(domainName, grabberName))) ||
				(stateName != "" && strings.Contains(grabberName, stateName)) ||
				(fullName != "" && strings.Contains(fullName, grabberName)) {
				matchedINECElection = el
				break
			}
		}
	}

	if matchedINECElection == nil {
		slog.Info("no matching INEC election found for year and scope", "grabber_id", grabber.ID, "year", appYear, "scope", grabber.Scope)
		return 0, nil
	}

	// 2. Traversal and result collection
	newResultsCount := 0

	if grabber.Scope == "nationwide" {
		states, err := s.queries.ListAllStates(ctx)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch states from DB: %w", err)
		}

		for _, st := range states {
			lgasURL := fmt.Sprintf("%s/elections/%s/lga/state/%d", baseURL, cleanStr(matchedINECElection.ID), st.ID)
			lgas, err := s.fetchLGAs(ctx, lgasURL)
			if err != nil {
				slog.Warn("failed to fetch LGAs for state", "state_id", st.ID, "err", err)
				continue
			}

			for _, lga := range lgas {
				for _, ward := range lga.Wards {
					count, err := s.processWardPUs(ctx, grabber, matchedINECElection.ID, ward.ID, ward.Name, lga.Name, st.Name, baseURL, uploadToR2, aiExtract)
					if err != nil {
						slog.Warn("error processing ward PUs", "ward_id", ward.ID, "err", err)
					}
					newResultsCount += count
				}
			}
		}
	} else {
		lgasURL := fmt.Sprintf("%s/elections/%s/lga", baseURL, cleanStr(matchedINECElection.ID))
		lgas, err := s.fetchLGAs(ctx, lgasURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch LGAs for inec election %s: %w", matchedINECElection.ID, err)
		}

		for _, lga := range lgas {
			for _, ward := range lga.Wards {
				count, err := s.processWardPUs(ctx, grabber, matchedINECElection.ID, ward.ID, ward.Name, lga.Name, "", baseURL, uploadToR2, aiExtract)
				if err != nil {
					slog.Warn("error processing ward PUs", "ward_id", ward.ID, "err", err)
				}
				newResultsCount += count
			}
		}
	}

	return newResultsCount, nil
}

func (s *INECGrabberService) fetchLGAs(ctx context.Context, url string) ([]INECLGA, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var res INECLGAsResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
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
) (int, error) {
	pusURL := fmt.Sprintf("%s/elections/%s/pus?ward=%s", baseURL, cleanStr(inecElectionID), url.QueryEscape(cleanStr(wardID)))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pusURL, nil)
	if err != nil {
		return 0, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var pusResp INECPUsResponse
	if err := json.NewDecoder(resp.Body).Decode(&pusResp); err != nil {
		return 0, err
	}

	newResults := 0

	for _, item := range pusResp.Data {
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

		formattedDelimitation := strings.ReplaceAll(rawPUCode, "/", "-")

		puName := item.Name
		if puName == "" && item.PollingUnit != nil {
			puName = item.PollingUnit.Name
		}

		// Check DB polling unit and existing ingestion BEFORE doing expensive R2 upload or Gemini AI calls
		pu, puErr := s.queries.GetPollingUnitByDelimitation(ctx, pgtype.Text{String: formattedDelimitation, Valid: true})
		if puErr == nil {
			existingResults, _ := s.queries.GetAllPollingUnitResultsByPU(ctx, queries.GetAllPollingUnitResultsByPUParams{
				ElectionID:    grabber.ElectionID,
				PollingUnitID: pu.ID,
			})
			alreadyIngested := false
			for _, r := range existingResults {
				if r.UploadedByInec {
					alreadyIngested = true
					break
				}
			}
			if alreadyIngested {
				// Skip immediately! Saves network, R2 uploads, and Gemini AI quota!
				continue
			}
		}

		// Final Result Image URL
		finalImageURL := docURL
		if uploadToR2 && s.r2Svc != nil {
			r2URL, uploadErr := s.uploadImageToR2(ctx, docURL, formattedDelimitation)
			if uploadErr == nil && r2URL != "" {
				finalImageURL = r2URL
			}
		}

		// AI extraction via Gemini if enabled
		var accreditedVoters, votesCast, validVotes, rejectedVotes int32
		candidateResultsBytes := []byte("[]")
		statusStr := "submitted"
		var rawJSONBytes []byte
		var isAIGenerated pgtype.Bool
		var confidenceScore pgtype.Numeric

		apiKey := s.geminiAPIKey
		if apiKey == "" {
			apiKey = os.Getenv("GEMINI_API_KEY")
		}

		if aiExtract && apiKey != "" {
			extractedData, rawJSON, aiErr := utils.ExtractPollingUnitResultFromImage(ctx, apiKey, finalImageURL)
			if aiErr != nil {
				slog.Warn("AI result extraction failed for INEC PU sheet", "pu_delimitation", formattedDelimitation, "err", aiErr)
			} else if extractedData != nil {
				accreditedVoters = int32(extractedData.AccreditedVoters)
				votesCast = int32(extractedData.VotesCast)
				validVotes = int32(extractedData.ValidVotes)
				rejectedVotes = int32(extractedData.RejectedVotes)
				if len(extractedData.Candidates) > 0 {
					if cBytes, err := json.Marshal(extractedData.Candidates); err == nil {
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
			}
		}

		if puErr != nil {
			// UNMATCHED: Queue in unmatched_polling_unit_results
			_ = s.createUnmatchedRecord(ctx, grabber, rawPUCode, puName, wardName, lgaName, stateName, docURL, accreditedVoters, votesCast, validVotes, rejectedVotes, candidateResultsBytes)
			continue
		}

		// Insert into polling_unit_results
		submittedRes, err := s.queries.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
			AssignmentID:           pgtype.Int8{},
			ElectionID:             grabber.ElectionID,
			ElectionGroupID:        grabber.ElectionGroupID,
			PollingUnitID:          pu.ID,
			SubmittedBy:            pgtype.Int8{}, // NULL - ingested by INEC system, not a user
			PartyID:                pgtype.Int2{},
			StateID:                pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:   pgtype.Int4{}, // NULL - senatorial district not known during INEC ingestion
			FederalConstituencyID:  pgtype.Int4{},
			StateConstituencyID:    pgtype.Int4{},
			LgaID:                  pgtype.Int4{Int32: pu.LgaID, Valid: true},
			WardID:                 pgtype.Int4{Int32: pu.WardID, Valid: true},
			AccreditedVoters:       accreditedVoters,
			VotesCast:              votesCast,
			ValidVotes:             validVotes,
			RejectedVotes:          rejectedVotes,
			CandidateResults:       candidateResultsBytes,
			ResultSheetImageUrl:    pgtype.Text{String: finalImageURL, Valid: true},
			ResultSheetVideoUrl:    pgtype.Text{},
			UploadedByInec:         true,
			Status:                 pgtype.Text{String: statusStr, Valid: true},
			AiExtractedData:        rawJSONBytes,
			ResultIsAiGenerated:   isAIGenerated,
			AiConfidenceScore:      confidenceScore,
		})

		if err != nil {
			slog.Error("failed to submit INEC polling unit result", "pu_delimitation", formattedDelimitation, "err", err)
			continue
		}

		// Increment election & election group results_submitted_count counters
		_ = s.queries.IncrementElectionResultCount(ctx, grabber.ElectionID)
		_ = s.queries.IncrementElectionGroupResultCount(ctx, grabber.ElectionGroupID)

		// Always upsert election_polling_unit_final_results directly so final result is immediately populated
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
			CandidateResultsLive:     candidateResultsBytes,
			MatchingSubmissionsCount: 1,
			TotalSubmissionsCount:    1,
		})

		// Notify background task processor if notifier callback is present
		if s.resultNotifier != nil {
			s.resultNotifier(ctx, grabber.ElectionID, pu.ID)
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
		ElectionID:          grabber.ElectionID,
		ElectionGroupID:      grabber.ElectionGroupID,
		SubmittedBy:          pgtype.Int8{}, // NULL - ingested by INEC system, not a user
		PartyID:              pgtype.Int2{},
		RawPollingUnitCode:  pgtype.Text{String: rawPUCode, Valid: rawPUCode != ""},
		RawPollingUnitName:  pgtype.Text{String: rawPUName, Valid: rawPUName != ""},
		RawWardName:         pgtype.Text{String: rawWardName, Valid: rawWardName != ""},
		RawLgaName:          pgtype.Text{String: rawLGAName, Valid: rawLGAName != ""},
		RawStateName:        pgtype.Text{String: rawStateName, Valid: rawStateName != ""},
		StateID:             pgtype.Int2{},
		SenatorialDistrictID: pgtype.Int4{},
		FederalConstituencyID: pgtype.Int4{},
		StateConstituencyID: pgtype.Int4{},
		LgaID:               pgtype.Int4{},
		WardID:              pgtype.Int4{},
		AccreditedVoters:    accreditedVoters,
		VotesCast:           votesCast,
		ValidVotes:          validVotes,
		RejectedVotes:       rejectedVotes,
		CandidateResults:    candidateResults,
		ResultSheetImageUrl: pgtype.Text{String: imageURL, Valid: imageURL != ""},
		ResultSheetVideoUrl: pgtype.Text{},
		ResolutionStatus:    "pending",
	})
	return err
}

func (s *INECGrabberService) uploadImageToR2(ctx context.Context, imageURL, delimitation string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return "", err
	}

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
				"delimitation", delimitation,
				"original_size_kb", len(imgData)/1024,
				"compressed_size_kb", buf.Len()/1024,
				"savings_pct", 100-(buf.Len()*100/len(imgData)))
		}
	}

	filename := fmt.Sprintf("inec-results/%s-%d.%s", delimitation, time.Now().Unix(), extension)
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

func (s *INECGrabberService) ListUnmatchedResults(ctx context.Context, electionID *int64, status *string, limit, offset int32) ([]queries.UnmatchedPollingUnitResult, error) {
	var elID pgtype.Int8
	if electionID != nil {
		elID = pgtype.Int8{Int64: *electionID, Valid: true}
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

			// Copy into polling_unit_results
			imgURL := unmatched.ResultSheetImageUrl.String
			vidURL := unmatched.ResultSheetVideoUrl.String

			pur, err := s.queries.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
				AssignmentID:           pgtype.Int8{},
				ElectionID:             unmatched.ElectionID,
				ElectionGroupID:        unmatched.ElectionGroupID,
				PollingUnitID:          pu.ID,
				SubmittedBy:            pgtype.Int8{Int64: adminUserID, Valid: adminUserID > 0},
				PartyID:                unmatched.PartyID,
				StateID:                pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
				SenatorialDistrictID:   pgtype.Int4{},
				FederalConstituencyID:  pgtype.Int4{},
				StateConstituencyID:    pgtype.Int4{},
				LgaID:                  pgtype.Int4{Int32: pu.LgaID, Valid: true},
				WardID:                 pgtype.Int4{Int32: pu.WardID, Valid: true},
				AccreditedVoters:       unmatched.AccreditedVoters,
				VotesCast:              unmatched.VotesCast,
				ValidVotes:             unmatched.ValidVotes,
				RejectedVotes:          unmatched.RejectedVotes,
				CandidateResults:       unmatched.CandidateResults,
				ResultSheetImageUrl:    pgtype.Text{String: imgURL, Valid: imgURL != ""},
				ResultSheetVideoUrl:    pgtype.Text{String: vidURL, Valid: vidURL != ""},
				UploadedByInec:         true,
			})
			if err == nil {
				resolvedResult = pgtype.Int8{Int64: pur.ID, Valid: true}

				// Increment election & election group results_submitted_count counters
				_ = s.queries.IncrementElectionResultCount(ctx, unmatched.ElectionID)
				_ = s.queries.IncrementElectionGroupResultCount(ctx, unmatched.ElectionGroupID)

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
					PollingUnitResultID:      pgtype.Int8{Int64: pur.ID, Valid: true},
					AccreditedVoters:         unmatched.AccreditedVoters,
					VotesCast:                unmatched.VotesCast,
					ValidVotes:               unmatched.ValidVotes,
					RejectedVotes:            unmatched.RejectedVotes,
					CandidateResults:         unmatched.CandidateResults,
					CandidateResultsLive:     unmatched.CandidateResults,
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
		ResolutionStatus:     status,
		ResolutionNotes:      pgtype.Text{String: notes, Valid: notes != ""},
		ResolvedPollingUnitID: resolvedPU,
		ResolvedResultID:     resolvedResult,
		ResolvedBy:           pgtype.Int8{Int64: adminUserID, Valid: true},
	})
}

func (s *INECGrabberService) ListGrabbersPaginated(ctx context.Context, cursor *int64, limit int32) ([]queries.ListINECResultGrabbersPaginatedRow, error) {
	if limit <= 0 {
		limit = 20
	}
	var cur pgtype.Int8
	if cursor != nil {
		cur = pgtype.Int8{Int64: *cursor, Valid: true}
	}
	return s.queries.ListINECResultGrabbersPaginated(ctx, queries.ListINECResultGrabbersPaginatedParams{
		Cursor: cur,
		Limit:  limit,
	})
}

func (s *INECGrabberService) ListLogsPaginated(ctx context.Context, grabberID *int64, cursor *int64, limit int32) ([]queries.ListINECResultGrabberLogsPaginatedRow, error) {
	if limit <= 0 {
		limit = 20
	}
	var gID pgtype.Int8
	if grabberID != nil {
		gID = pgtype.Int8{Int64: *grabberID, Valid: true}
	}
	var cur pgtype.Int8
	if cursor != nil {
		cur = pgtype.Int8{Int64: *cursor, Valid: true}
	}
	return s.queries.ListINECResultGrabberLogsPaginated(ctx, queries.ListINECResultGrabberLogsPaginatedParams{
		GrabberID: gID,
		Cursor:    cur,
		Limit:     limit,
	})
}

func (s *INECGrabberService) TogglePause(ctx context.Context, id int64) (queries.InecResultGrabber, error) {
	return s.queries.ToggleINECResultGrabberPause(ctx, id)
}

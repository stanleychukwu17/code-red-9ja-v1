package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	TaskExtractPUResultAI = "pu_result:ai_extract"
)

type ExtractPUResultAIPayload struct {
	ResultID            int64  `json:"result_id"`
	ElectionID          int32  `json:"election_id"`
	PollingUnitID       int32  `json:"polling_unit_id"`
	ResultSheetImageURL string `json:"result_sheet_image_url"`
}

type ExtractedCandidateResult struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
	AgentName      string `json:"agent_name"`
	HasSignature   bool   `json:"has_signature"`
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskExtractPUResultAI(
	ctx context.Context,
	payload *ExtractPUResultAIPayload,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal extract PU result AI payload: %w", err)
	}

	defaults := []asynq.Option{
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.Queue("default"),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskExtractPUResultAI, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue extract PU result AI task: %w", err)
	}

	slog.Info("enqueued PU result AI extraction task", "result_id", payload.ResultID, "queue", info.Queue)
	return nil
}

func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskExtractPUResultAI(ctx context.Context, task *asynq.Task) error {
	var payload ExtractPUResultAIPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal extract PU result payload: %w", err)
	}

	slog.Info("starting AI result extraction", "result_id", payload.ResultID, "image_url", payload.ResultSheetImageURL)

	cfg := config.Load()
	extracted, rawJSON, err := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, payload.ResultSheetImageURL)
	if err != nil {
		slog.Error("failed to extract PU result from image with Gemini", "result_id", payload.ResultID, "err", err)
		// Mark as disputed with reason if failure persists
		_, _ = redisTaskProcessor.queries.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
			ID:             payload.ResultID,
			Status:         "disputed",
			DisputedReason: pgtype.Text{String: fmt.Sprintf("AI extraction failed: %v", err), Valid: true},
		})
		return fmt.Errorf("gemini extraction failed for result #%d: %w", payload.ResultID, err)
	}

	// Validate vote arithmetic
	status := "ai_verified"
	var disputedReason pgtype.Text
	if extracted.ValidVotes+extracted.RejectedVotes != extracted.VotesCast {
		slog.Warn("AI extracted vote counts discrepancy", "result_id", payload.ResultID, "valid", extracted.ValidVotes, "rejected", extracted.RejectedVotes, "cast", extracted.VotesCast)
		status = "disputed"
		disputedReason = pgtype.Text{
			String: fmt.Sprintf("Vote arithmetic mismatch: valid(%d) + rejected(%d) != cast(%d)", extracted.ValidVotes, extracted.RejectedVotes, extracted.VotesCast),
			Valid:  true,
		}
	}

	var confidence pgtype.Numeric
	_ = confidence.Scan("0.9500")

	var sheetDate pgtype.Date
	if parsedDate, parseErr := time.Parse("2006-01-02", strings.TrimSpace(extracted.SheetDate)); parseErr == nil {
		sheetDate = pgtype.Date{Time: parsedDate, Valid: true}
	}

	// Update the polling unit result record with extracted numbers
	updatedResult, err := redisTaskProcessor.queries.UpdatePollingUnitResultAIExtraction(ctx, queries.UpdatePollingUnitResultAIExtractionParams{
		ID:                           payload.ResultID,
		RegisteredVoters:             int32(extracted.RegisteredVoters),
		AccreditedVoters:             int32(extracted.AccreditedVoters),
		BallotPapersIssued:           int32(extracted.BallotPapersIssued),
		UnusedBallotPapers:           int32(extracted.UnusedBallotPapers),
		SpoiledBallotPapers:          int32(extracted.SpoiledBallotPapers),
		VotesCast:                    int32(extracted.VotesCast),
		ValidVotes:                   int32(extracted.ValidVotes),
		RejectedVotes:                int32(extracted.RejectedVotes),
		UsedBallotPapers:             int32(extracted.UsedBallotPapers),
		SerialNumber:                 utils.PgTextFromString(strings.TrimSpace(extracted.SerialNumber)),
		SheetDate:                    sheetDate,
		PresidingOfficerName:         utils.PgTextFromString(strings.TrimSpace(extracted.PresidingOfficerName)),
		HasPresidingOfficerSignature: extracted.HasPresidingOfficerSignature,
		Status:                       status,
		AiExtractedData:              rawJSON,
		ResultIsAiGenerated:          pgtype.Bool{Bool: extracted.IsAIGenerated, Valid: true},
		AiConfidenceScore:            confidence,
		DisputedReason:               disputedReason,
	})
	if err != nil {
		return fmt.Errorf("failed to save AI extracted data for result #%d: %w", payload.ResultID, err)
	}

	// Replace normalized per-party scores for this result
	if err := redisTaskProcessor.queries.DeletePollingUnitResultScoresByResultID(ctx, payload.ResultID); err != nil {
		return fmt.Errorf("failed to clear old scores for result #%d: %w", payload.ResultID, err)
	}
	for _, c := range extracted.Candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		if shortName == "" {
			continue
		}
		if _, err := redisTaskProcessor.queries.UpsertPollingUnitResultScore(ctx, queries.UpsertPollingUnitResultScoreParams{
			ResultID:        payload.ResultID,
			ElectionID:      updatedResult.ElectionID,
			ElectionGroupID: updatedResult.ElectionGroupID,
			PollingUnitID:   updatedResult.PollingUnitID,
			PartyShortName:  shortName,
			VoteCount:       int32(c.VoteCount),
			AgentName:       utils.PgTextFromString(strings.TrimSpace(c.AgentName)),
			HasSignature:    c.HasSignature,
		}); err != nil {
			return fmt.Errorf("failed to save score for party %s on result #%d: %w", shortName, payload.ResultID, err)
		}
	}

	slog.Info("successfully extracted and saved AI result", "result_id", payload.ResultID, "status", status)

	// Trigger consensus calculation and hierarchical rollup
	if status == "ai_verified" {
		err = redisTaskProcessor.taskDistributor.DistributeTaskCalculateFinalResult(ctx, &CalculateFinalResultPayload{
			ElectionID:    payload.ElectionID,
			PollingUnitID: payload.PollingUnitID,
		})
		if err != nil {
			slog.Error("failed to enqueue calculate final result task", "err", err)
		}
	}

	return nil
}

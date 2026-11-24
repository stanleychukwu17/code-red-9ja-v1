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

func clampNonNegInt32(v int) int32 {
	if v < 0 {
		return 0
	}
	return int32(v)
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

	cfg := config.Load()
	extracted, rawJSON, err := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, cfg.GeminiModel, payload.ResultSheetImageURL)
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

	// Escalate to Pro model once if Flash hit an OCR-solvable math mismatch or low confidence (and not AI-generated)
	if !extracted.IsAIGenerated && cfg.GeminiFallbackModel != "" && cfg.GeminiFallbackModel != cfg.GeminiModel {
		validV := clampNonNegInt32(extracted.ValidVotes)
		rejectedV := clampNonNegInt32(extracted.RejectedVotes)
		castV := clampNonNegInt32(extracted.VotesCast)
		if validV+rejectedV != castV || extracted.ConfidenceScore < 0.75 {
			slog.Warn("escalating ambiguous sheet to fallback Gemini model", "result_id", payload.ResultID, "fallback_model", cfg.GeminiFallbackModel, "confidence", extracted.ConfidenceScore)
			if fbExtracted, fbRawJSON, fbErr := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, cfg.GeminiFallbackModel, payload.ResultSheetImageURL); fbErr != nil {
				slog.Warn("fallback Gemini extraction failed, keeping primary result", "result_id", payload.ResultID, "err", fbErr)
			} else {
				extracted = fbExtracted
				rawJSON = fbRawJSON
			}
		}
	}

	// Validate integrity & vote arithmetic
	status := "ai_verified"
	var disputeReasons []string

	if extracted.IsAIGenerated {
		disputeReasons = append(disputeReasons, "Result sheet image flagged as potentially AI-generated or manipulated")
	}

	registeredVoters := clampNonNegInt32(extracted.RegisteredVoters)
	accreditedVoters := clampNonNegInt32(extracted.AccreditedVoters)
	ballotPapersIssued := clampNonNegInt32(extracted.BallotPapersIssued)
	unusedBallotPapers := clampNonNegInt32(extracted.UnusedBallotPapers)
	spoiledBallotPapers := clampNonNegInt32(extracted.SpoiledBallotPapers)
	rejectedVotes := clampNonNegInt32(extracted.RejectedVotes)
	validVotes := clampNonNegInt32(extracted.ValidVotes)
	usedBallotPapers := clampNonNegInt32(extracted.UsedBallotPapers)
	votesCast := clampNonNegInt32(extracted.VotesCast)

	if validVotes+rejectedVotes != votesCast {
		slog.Warn("AI extracted vote counts discrepancy", "result_id", payload.ResultID, "valid", validVotes, "rejected", rejectedVotes, "cast", votesCast)
		disputeReasons = append(disputeReasons, fmt.Sprintf("Vote arithmetic mismatch: valid(%d) + rejected(%d) != cast(%d)", validVotes, rejectedVotes, votesCast))
	}
	if accreditedVoters > 0 && votesCast > accreditedVoters {
		disputeReasons = append(disputeReasons, fmt.Sprintf("Over-voting detected: cast(%d) > accredited(%d)", votesCast, accreditedVoters))
	}

	var disputedReason pgtype.Text
	if len(disputeReasons) > 0 {
		status = "disputed"
		disputedReason = pgtype.Text{String: strings.Join(disputeReasons, "; "), Valid: true}
	}

	confVal := extracted.ConfidenceScore
	if confVal < 0 {
		confVal = 0
	} else if confVal > 1 {
		confVal = 1
	}
	var confidence pgtype.Numeric
	_ = confidence.Scan(fmt.Sprintf("%.4f", confVal))

	var sheetDate pgtype.Date
	if parsedDate, parseErr := time.Parse("2006-01-02", strings.TrimSpace(extracted.SheetDate)); parseErr == nil {
		sheetDate = pgtype.Date{Time: parsedDate, Valid: true}
	}

	tx, err := redisTaskProcessor.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for result #%d: %w", payload.ResultID, err)
	}
	defer tx.Rollback(ctx)
	qtx := redisTaskProcessor.queries.WithTx(tx)

	// Update the polling unit result record with extracted numbers
	updatedResult, err := qtx.UpdatePollingUnitResultAIExtraction(ctx, queries.UpdatePollingUnitResultAIExtractionParams{
		ID:                           payload.ResultID,
		RegisteredVoters:             registeredVoters,
		AccreditedVoters:             accreditedVoters,
		BallotPapersIssued:           ballotPapersIssued,
		UnusedBallotPapers:           unusedBallotPapers,
		SpoiledBallotPapers:          spoiledBallotPapers,
		VotesCast:                    votesCast,
		ValidVotes:                   validVotes,
		RejectedVotes:                rejectedVotes,
		UsedBallotPapers:             usedBallotPapers,
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

	// Replace normalized per-party scores for this result atomically
	if err := qtx.DeletePollingUnitResultScoresByResultID(ctx, payload.ResultID); err != nil {
		return fmt.Errorf("failed to clear old scores for result #%d: %w", payload.ResultID, err)
	}
	for _, c := range extracted.Candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		if shortName == "" {
			continue
		}
		if _, err := qtx.UpsertPollingUnitResultScore(ctx, queries.UpsertPollingUnitResultScoreParams{
			ResultID:        payload.ResultID,
			ElectionID:      updatedResult.ElectionID,
			ElectionGroupID: updatedResult.ElectionGroupID,
			PollingUnitID:   updatedResult.PollingUnitID,
			PartyShortName:  shortName,
			VoteCount:       clampNonNegInt32(c.VoteCount),
			AgentName:       utils.PgTextFromString(strings.TrimSpace(c.AgentName)),
			HasSignature:    c.HasSignature,
		}); err != nil {
			return fmt.Errorf("failed to save score for party %s on result #%d: %w", shortName, payload.ResultID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit AI extraction for result #%d: %w", payload.ResultID, err)
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

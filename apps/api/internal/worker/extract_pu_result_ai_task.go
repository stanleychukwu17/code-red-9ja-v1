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
	ElectionID          int64  `json:"election_id"`
	PollingUnitID       int32  `json:"polling_unit_id"`
	ResultSheetImageURL string `json:"result_sheet_image_url"`
}

type ExtractedCandidateResult struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
	AgentName      string `json:"agent_name"`
	HasSignature   bool   `json:"has_signature"`
}

func (distributor *RedisTaskDistributor) DistributeTaskExtractPUResultAI(
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
	info, err := distributor.client.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue extract PU result AI task: %w", err)
	}

	slog.Info("enqueued PU result AI extraction task", "result_id", payload.ResultID, "queue", info.Queue)
	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskExtractPUResultAI(ctx context.Context, task *asynq.Task) error {
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
		_, _ = processor.q.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
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

	// Format candidate results array
	var finalCandidates []ExtractedCandidateResult
	for _, c := range extracted.Candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		finalCandidates = append(finalCandidates, ExtractedCandidateResult{
			PartyShortName: shortName,
			VoteCount:      int32(c.VoteCount),
			AgentName:      strings.TrimSpace(c.AgentName),
			HasSignature:   c.HasSignature,
		})
	}

	candidateJSON, err := json.Marshal(finalCandidates)
	if err != nil {
		return fmt.Errorf("failed to marshal candidate results: %w", err)
	}

	var confidence pgtype.Numeric
	_ = confidence.Scan("0.9500")

	// Update the polling unit result record with extracted numbers
	_, err = processor.q.UpdatePollingUnitResultAIExtraction(ctx, queries.UpdatePollingUnitResultAIExtractionParams{
		ID:                  payload.ResultID,
		AccreditedVoters:    int32(extracted.AccreditedVoters),
		VotesCast:           int32(extracted.VotesCast),
		ValidVotes:          int32(extracted.ValidVotes),
		RejectedVotes:       int32(extracted.RejectedVotes),
		CandidateResults:    candidateJSON,
		Status:              status,
		AiExtractedData:     rawJSON,
		ResultIsAiGenerated: pgtype.Bool{Bool: extracted.IsAIGenerated, Valid: true},
		AiConfidenceScore:   confidence,
		DisputedReason:      disputedReason,
	})
	if err != nil {
		return fmt.Errorf("failed to save AI extracted data for result #%d: %w", payload.ResultID, err)
	}

	slog.Info("successfully extracted and saved AI result", "result_id", payload.ResultID, "status", status)

	// Trigger consensus calculation and hierarchical rollup
	if status == "ai_verified" {
		err = processor.taskDistributor.DistributeTaskCalculateFinalResult(ctx, &CalculateFinalResultPayload{
			ElectionID:    payload.ElectionID,
			PollingUnitID: payload.PollingUnitID,
		})
		if err != nil {
			slog.Error("failed to enqueue calculate final result task", "err", err)
		}
	}

	return nil
}

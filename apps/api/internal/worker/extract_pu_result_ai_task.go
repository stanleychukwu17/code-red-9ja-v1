package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"free9ja/api/internal/config"
	"free9ja/api/internal/constants"
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

	// Load Configuration
	cfg := config.Load()

	// Pass 1: fast, low-thinking OCR extraction via primary Flash model
	extracted, rawJSON, err := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, cfg.GeminiModel, payload.ResultSheetImageURL, true)
	if err != nil {
		slog.Error("failed to extract PU result from image with Gemini", "result_id", payload.ResultID, "err", err)

		// Mark as disputed with reason if failure persists
		_, _ = redisTaskProcessor.queries.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
			ID:             payload.ResultID,
			Status:         constants.ResultStatusDisputed,
			DisputeCodes:   []string{constants.DisputeCodeAIExtractionFailed},
			DisputedReason: pgtype.Text{String: fmt.Sprintf("AI extraction failed: %v", err), Valid: true},
		})

		return fmt.Errorf("gemini extraction failed for result #%d: %w", payload.ResultID, err)
	}

	// Escalate to fallback model (e.g. gemini-4-hydrogen with thinking enabled) if Flash hit an OCR-solvable mismatch or low confidence
	if extracted.IsValidEC8AForm && !extracted.IsAIGenerated && needsFallbackEscalation(extracted) {
		slog.Warn("escalating ambiguous sheet to fallback Gemini model", "result_id", payload.ResultID, "fallback_model", cfg.GeminiFallbackModel, "confidence", extracted.ConfidenceScore)
		if fbExtracted, fbRawJSON, fbErr := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, cfg.GeminiFallbackModel, payload.ResultSheetImageURL, false); fbErr != nil {
			slog.Warn("fallback Gemini extraction failed, keeping primary result", "result_id", payload.ResultID, "err", fbErr)
		} else {
			extracted = fbExtracted
			rawJSON = fbRawJSON
		}
	}

	// Clamp OCR confidence score to [0.0, 1.0] to fit NUMERIC(5, 4)
	confidenceScore := extracted.ConfidenceScore
	if confidenceScore < 0 {
		confidenceScore = 0
	} else if confidenceScore > 1 {
		confidenceScore = 1
	}

	// Validate integrity & vote arithmetic
	status := constants.ResultStatusAIVerified
	var disputeCodes []string
	var disputeReasons []string

	// Record each unique dispute code alongside its human-readable detail message
	seenCodes := make(map[string]bool)
	addDispute := func(code, reason string) {
		if !seenCodes[code] {
			seenCodes[code] = true
			disputeCodes = append(disputeCodes, code)
		}
		disputeReasons = append(disputeReasons, reason)
	}

	if extracted.IsAIGenerated {
		addDispute(constants.DisputeCodeAIGeneratedImage, "Result sheet image flagged as potentially AI-generated or manipulated")
	}

	// Clamp extracted counts to non-negative int32 before running arithmetic checks or DB writes
	registeredVoters := clampNonNegInt32(extracted.RegisteredVoters)
	accreditedVoters := clampNonNegInt32(extracted.AccreditedVoters)
	ballotPapersIssued := clampNonNegInt32(extracted.BallotPapersIssued)
	unusedBallotPapers := clampNonNegInt32(extracted.UnusedBallotPapers)
	spoiledBallotPapers := clampNonNegInt32(extracted.SpoiledBallotPapers)
	rejectedVotes := clampNonNegInt32(extracted.RejectedVotes)
	validVotes := clampNonNegInt32(extracted.ValidVotes)
	usedBallotPapers := clampNonNegInt32(extracted.UsedBallotPapers)
	votesCast := clampNonNegInt32(extracted.VotesCast)

	// Reject non-EC8A uploads immediately; otherwise run arithmetic, turnout, and confidence checks
	if !extracted.IsValidEC8AForm {
		addDispute(constants.DisputeCodeInvalidEC8AForm, "Uploaded image is not a valid INEC Form EC8A result sheet")
	} else {
		// Box #7 + Box #6 must equal total votes cast
		if validVotes+rejectedVotes != votesCast {
			addDispute(constants.DisputeCodeVoteArithmeticMismatch, fmt.Sprintf("Vote arithmetic mismatch: valid(%d) + rejected(%d) != cast(%d)", validVotes, rejectedVotes, votesCast))
		}
		// Box #5 + Box #6 + Box #7 must equal Box #8 (total used ballot papers) when Box #8 is present
		if usedBallotPapers > 0 && spoiledBallotPapers+rejectedVotes+validVotes != usedBallotPapers {
			addDispute(constants.DisputeCodeUsedBallotsMismatch, fmt.Sprintf("Used ballots mismatch: spoiled(%d) + rejected(%d) + valid(%d) != used(%d)", spoiledBallotPapers, rejectedVotes, validVotes, usedBallotPapers))
		}
		// Sum of individual party scores must equal Box #7 (valid votes)
		if len(extracted.Parties) == 0 {
			addDispute(constants.DisputeCodeNoPartyScores, "No political party scores could be extracted from the result sheet")
		} else {
			var partySum int32
			for _, c := range extracted.Parties {
				partySum += clampNonNegInt32(c.VoteCount)
			}
			if partySum != validVotes {
				addDispute(constants.DisputeCodePartySumMismatch, fmt.Sprintf("Party vote sum(%d) != valid_votes(%d)", partySum, validVotes))
			}
		}
		// Turnout sanity: total votes cast cannot exceed accredited voters, nor accredited exceed registered
		if accreditedVoters > 0 && votesCast > accreditedVoters {
			addDispute(constants.DisputeCodeOverVoting, fmt.Sprintf("Over-voting detected: cast(%d) > accredited(%d)", votesCast, accreditedVoters))
		}
		if registeredVoters > 0 && accreditedVoters > registeredVoters {
			addDispute(constants.DisputeCodeAccreditedExceedsRegistered, fmt.Sprintf("Accredited voters(%d) > registered_voters(%d)", accreditedVoters, registeredVoters))
		}
		// Flag unreadable/ambiguous sheets that remained low-confidence even after fallback
		if confidenceScore < 0.6 {
			addDispute(constants.DisputeCodeLowConfidence, fmt.Sprintf("Low OCR confidence score (%.2f)", confidenceScore))
		}
	}

	// Mark the result as disputed and join all failure reasons if any validation check triggered
	var disputedReason pgtype.Text
	if len(disputeReasons) > 0 {
		status = constants.ResultStatusDisputed
		disputedReason = utils.PgTextFromString(strings.Join(disputeReasons, "; "))
	}

	// Format confidenceScore to 4 decimal places for the PostgreSQL NUMERIC column
	var confidence pgtype.Numeric
	_ = confidence.Scan(fmt.Sprintf("%.4f", confidenceScore))

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
		SheetDate:                    utils.PgDateFromString(strings.TrimSpace(extracted.SheetDate)),
		PresidingOfficerName:         utils.PgTextFromString(strings.TrimSpace(extracted.PresidingOfficerName)),
		HasPresidingOfficerSignature: extracted.HasPresidingOfficerSignature,
		Status:                       status,
		AiExtractedData:              rawJSON,
		IsValidResultSheet:           utils.PgBool(extracted.IsValidEC8AForm),
		ResultIsAiGenerated:          utils.PgBool(extracted.IsAIGenerated),
		AiConfidenceScore:            confidence,
		DisputeCodes:                 disputeCodes,
		DisputedReason:               disputedReason,
	})
	if err != nil {
		return fmt.Errorf("failed to save AI extracted data for result #%d: %w", payload.ResultID, err)
	}

	// Replace normalized per-party scores for this result atomically
	if err := qtx.DeletePollingUnitResultScoresByResultID(ctx, payload.ResultID); err != nil {
		return fmt.Errorf("failed to clear old scores for result #%d: %w", payload.ResultID, err)
	}

	// loop through each extracted party score and save it
	for _, c := range extracted.Parties {
		// Normalize party acronym to match uq_pu_result_score_party and skip blank rows
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		if shortName == "" {
			continue
		}

		// Upsert so duplicate party entries from OCR update in place instead of violating the unique index
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

	// Credit agent "results" earnings only after AI verifies the image is a genuine EC8A sheet
	if updatedResult.AssignmentID.Valid && extracted.IsValidEC8AForm && !extracted.IsAIGenerated {
		if err := redisTaskProcessor.taskDistributor.DistributeTaskCalculateAgentEarnings(ctx, &CalculateAgentEarningsPayload{
			AssignmentID: updatedResult.AssignmentID.Int64,
			TaskType:     "results",
		}); err != nil {
			slog.Error("failed to enqueue agent earnings task", "result_id", payload.ResultID, "assignment_id", updatedResult.AssignmentID.Int64, "err", err)
		}
	}

	// DONE: above NOTE:

	// Trigger consensus calculation and hierarchical rollup
	if status == constants.ResultStatusAIVerified {
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

func needsFallbackEscalation(extracted *utils.GeminiExtractedResult) bool {
	// Escalate borderline/gray-zone legibility (0.60-0.74) before it settles at < 0.60 disputed
	if extracted.ConfidenceScore < 0.75 {
		return true
	}

	// Escalate if valid (#7) + rejected (#6) does not equal total votes cast
	validVotes := clampNonNegInt32(extracted.ValidVotes)
	rejectedVotes := clampNonNegInt32(extracted.RejectedVotes)
	votesCast := clampNonNegInt32(extracted.VotesCast)
	if validVotes+rejectedVotes != votesCast {
		return true
	}

	// Escalate if spoiled (#5) + rejected (#6) + valid (#7) does not equal used ballots (#8)
	spoiledBallots := clampNonNegInt32(extracted.SpoiledBallotPapers)
	usedBallots := clampNonNegInt32(extracted.UsedBallotPapers)
	if usedBallots > 0 && spoiledBallots+rejectedVotes+validVotes != usedBallots {
		return true
	}

	// Escalate if total party votes != valid_votes (#7)
	if len(extracted.Parties) > 0 {
		var partySum int32
		for _, party := range extracted.Parties {
			partySum += clampNonNegInt32(party.VoteCount)
		}
		if partySum != validVotes {
			return true
		}
	}
	return false
}

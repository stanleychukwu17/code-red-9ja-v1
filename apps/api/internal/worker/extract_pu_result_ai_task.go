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

	cfg := config.Load()
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

	confVal := extracted.ConfidenceScore
	if confVal < 0 {
		confVal = 0
	} else if confVal > 1 {
		confVal = 1
	}

	// Validate integrity & vote arithmetic
	status := constants.ResultStatusAIVerified
	var disputeCodes []string
	var disputeReasons []string
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

	registeredVoters := clampNonNegInt32(extracted.RegisteredVoters)
	accreditedVoters := clampNonNegInt32(extracted.AccreditedVoters)
	ballotPapersIssued := clampNonNegInt32(extracted.BallotPapersIssued)
	unusedBallotPapers := clampNonNegInt32(extracted.UnusedBallotPapers)
	spoiledBallotPapers := clampNonNegInt32(extracted.SpoiledBallotPapers)
	rejectedVotes := clampNonNegInt32(extracted.RejectedVotes)
	validVotes := clampNonNegInt32(extracted.ValidVotes)
	usedBallotPapers := clampNonNegInt32(extracted.UsedBallotPapers)
	votesCast := clampNonNegInt32(extracted.VotesCast)

	if !extracted.IsValidEC8AForm {
		addDispute(constants.DisputeCodeInvalidEC8AForm, "Uploaded image is not a valid INEC Form EC8A result sheet")
	} else {
		if validVotes+rejectedVotes != votesCast {
			slog.Warn("AI extracted vote counts discrepancy", "result_id", payload.ResultID, "valid", validVotes, "rejected", rejectedVotes, "cast", votesCast)
			addDispute(constants.DisputeCodeVoteArithmeticMismatch, fmt.Sprintf("Vote arithmetic mismatch: valid(%d) + rejected(%d) != cast(%d)", validVotes, rejectedVotes, votesCast))
		}
		if usedBallotPapers > 0 && spoiledBallotPapers+rejectedVotes+validVotes != usedBallotPapers {
			addDispute(constants.DisputeCodeUsedBallotsMismatch, fmt.Sprintf("Used ballots mismatch: spoiled(%d) + rejected(%d) + valid(%d) != used(%d)", spoiledBallotPapers, rejectedVotes, validVotes, usedBallotPapers))
		}
		if len(extracted.Parties) == 0 {
			addDispute(constants.DisputeCodeNoPartyScores, "No political party scores could be extracted from the result sheet")
		} else {
			var partySum int32
			for _, c := range extracted.Parties {
				vc := clampNonNegInt32(c.VoteCount)
				partySum += vc
				if words := strings.TrimSpace(c.VotesInWords); words != "" {
					if parsedWords, ok := parseEnglishNumber(words); ok && int32(parsedWords) != vc {
						addDispute(constants.DisputeCodePartyWordsMismatch, fmt.Sprintf("Party %s figure(%d) != words(%q)", strings.ToUpper(strings.TrimSpace(c.PartyShortName)), vc, words))
					}
				}
			}
			if partySum != validVotes {
				addDispute(constants.DisputeCodePartySumMismatch, fmt.Sprintf("Party vote sum(%d) != valid_votes(%d)", partySum, validVotes))
			}
		}
		if accreditedVoters > 0 && votesCast > accreditedVoters {
			addDispute(constants.DisputeCodeOverVoting, fmt.Sprintf("Over-voting detected: cast(%d) > accredited(%d)", votesCast, accreditedVoters))
		}
		if registeredVoters > 0 && accreditedVoters > registeredVoters {
			addDispute(constants.DisputeCodeAccreditedExceedsRegistered, fmt.Sprintf("Accredited voters(%d) > registered_voters(%d)", accreditedVoters, registeredVoters))
		}
		if confVal < 0.6 {
			addDispute(constants.DisputeCodeLowConfidence, fmt.Sprintf("Low OCR confidence score (%.2f)", confVal))
		}
	}

	var disputedReason pgtype.Text
	if len(disputeReasons) > 0 {
		status = constants.ResultStatusDisputed
		disputedReason = pgtype.Text{String: strings.Join(disputeReasons, "; "), Valid: true}
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
		IsValidResultSheet:           pgtype.Bool{Bool: extracted.IsValidEC8AForm, Valid: true},
		ResultIsAiGenerated:          pgtype.Bool{Bool: extracted.IsAIGenerated, Valid: true},
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
	for _, c := range extracted.Parties {
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

	// Credit agent "results" earnings only after AI verifies the image is a genuine EC8A sheet
	if updatedResult.AssignmentID.Valid && extracted.IsValidEC8AForm && !extracted.IsAIGenerated {
		if err := redisTaskProcessor.taskDistributor.DistributeTaskCalculateAgentEarnings(ctx, &CalculateAgentEarningsPayload{
			AssignmentID: updatedResult.AssignmentID.Int64,
			TaskType:     "results",
		}); err != nil {
			slog.Error("failed to enqueue agent earnings task", "result_id", payload.ResultID, "assignment_id", updatedResult.AssignmentID.Int64, "err", err)
		}
	}

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
	if extracted.ConfidenceScore < 0.75 {
		return true
	}
	validV := clampNonNegInt32(extracted.ValidVotes)
	rejectedV := clampNonNegInt32(extracted.RejectedVotes)
	castV := clampNonNegInt32(extracted.VotesCast)

	if validV+rejectedV != castV {
		return true
	}

	spoiledV := clampNonNegInt32(extracted.SpoiledBallotPapers)
	usedV := clampNonNegInt32(extracted.UsedBallotPapers)
	if usedV > 0 && spoiledV+rejectedV+validV != usedV {
		return true
	}

	if len(extracted.Parties) > 0 {
		var partySum int32
		for _, c := range extracted.Parties {
			vc := clampNonNegInt32(c.VoteCount)
			partySum += vc
			if words := strings.TrimSpace(c.VotesInWords); words != "" {
				if parsedWords, ok := parseEnglishNumber(words); ok && int32(parsedWords) != vc {
					return true
				}
			}
		}
		if partySum != validV {
			return true
		}
	}
	return false
}

var englishNumberWords = map[string]int{
	"zero": 0, "nil": 0, "none": 0,
	"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
	"six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
	"eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
	"sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
	"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
	"sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}

// parseEnglishNumber parses English number words (e.g. "One hundred and forty two") into an integer.
func parseEnglishNumber(s string) (int, bool) {
	cleaned := strings.NewReplacer("-", " ", ",", " ").Replace(strings.ToLower(strings.TrimSpace(s)))
	fields := strings.Fields(cleaned)
	if len(fields) == 0 {
		return 0, false
	}

	total, current := 0, 0
	matched := false
	for _, w := range fields {
		if w == "and" {
			continue
		}
		if v, ok := englishNumberWords[w]; ok {
			current += v
			matched = true
		} else if w == "hundred" {
			if current == 0 {
				current = 1
			}
			current *= 100
			matched = true
		} else if w == "thousand" {
			if current == 0 {
				current = 1
			}
			total += current * 1000
			current = 0
			matched = true
		} else {
			return 0, false
		}
	}
	if !matched {
		return 0, false
	}
	return total + current, true
}

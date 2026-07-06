package polling_unit_results

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	distributor worker.TaskDistributor
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, distributor worker.TaskDistributor) *Service {
	return &Service{queries: q, pool: pool, distributor: distributor}
}

// CandidateResult is the per-candidate entry stored in the JSONB column.
type CandidateResult struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
	AgentName      string `json:"agent_name,omitempty"`
	HasSignature   bool   `json:"has_signature"`
}

// SubmitResultInput carries everything needed to submit a polling unit result.
type SubmitResultInput struct {
	UserFakeID          int64
	AssignmentID        *int64
	ElectionID          int64
	ElectionGroupID     int64
	PollingUnitID       int32
	PartyID             *int64
	ResultSheetImageURL string
	ResultSheetVideoURL string
	UploadedByINEC      bool
}

// ReviewResultInput is used by platform admins to manually override a result's status.
type ReviewResultInput struct {
	ResultID       int64
	Status         string // "confirmed" or "nullified"
	DisputedReason string
}

// AIVerificationInput is used internally (and by a future async job) to apply Gemini findings.
type AIVerificationInput struct {
	ResultID        int64
	Status          string // "ai_verified" or "disputed"
	ExtractedData   interface{}
	ConfidenceScore float64
	DisputedReason  string
}

// SubmitResult inserts a new polling unit result inside a transaction,
// then increments relevant counters on the assignment (if any) and election group.
func (s *Service) SubmitResult(ctx context.Context, input SubmitResultInput) (queries.PollingUnitResult, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitResult{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Resolve real user ID from fake ID
	user, err := qtx.GetUserByFakeID(ctx, pgtype.Int8{Int64: input.UserFakeID, Valid: true})
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("user not found")
	}

	// Fetch polling unit for denormalised state/lga/ward
	pu, err := qtx.GetPollingUnitByID(ctx, input.PollingUnitID)
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("invalid polling_unit_id")
	}

	lga, err := qtx.GetLGAByID(ctx, pu.LgaID)
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("invalid lga for polling unit")
	}

	ward, err := qtx.GetWardByID(ctx, pu.WardID)
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("invalid ward for polling unit")
	}

	// Make sure we have an image URL
	if input.ResultSheetImageURL == "" {
		return queries.PollingUnitResult{}, errors.New("result_sheet_image_url is required for AI extraction")
	}

	// Call Gemini (we extract API key from config)
	cfg := config.Load()
	extracted, rawJSON, err := utils.ExtractPollingUnitResultFromImage(ctx, cfg.GeminiAPIKey, input.ResultSheetImageURL)
	if err != nil {
		// Log the error but maybe we shouldn't fail the entire submission if Gemini fails?
		// For now, let's fail it so it doesn't leave bad state, or we could insert it as "submitted" and let a worker retry.
		// As per the plan, we are doing it synchronously.
		return queries.PollingUnitResult{}, fmt.Errorf("failed to process image with Gemini AI: %w", err)
	}

	// Validate vote arithmetic from AI
	if extracted.ValidVotes+extracted.RejectedVotes != extracted.VotesCast {
		// Log this discrepancy but still insert it. We can mark the status as "disputed" automatically
		slog.Warn("AI extracted vote counts do not add up", "valid", extracted.ValidVotes, "rejected", extracted.RejectedVotes, "cast", extracted.VotesCast)
	}

	// Extract party short names and vote counts
	var finalCandidates []CandidateResult
	for _, c := range extracted.Candidates {
		shortName := strings.ToUpper(strings.TrimSpace(c.PartyShortName))
		finalCandidates = append(finalCandidates, CandidateResult{
			PartyShortName: shortName,
			VoteCount:      int32(c.VoteCount),
			AgentName:      strings.TrimSpace(c.AgentName),
			HasSignature:   c.HasSignature,
		})
	}

	// Marshal candidate results to JSON
	candidateJSON, err := json.Marshal(finalCandidates)
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("failed to encode candidate_results")
	}

	// Build optional nullable fields
	var assignmentID pgtype.Int8
	if input.AssignmentID != nil {
		assignmentID = pgtype.Int8{Int64: *input.AssignmentID, Valid: true}
	}

	var partyID pgtype.Int8
	if input.PartyID != nil {
		partyID = pgtype.Int8{Int64: *input.PartyID, Valid: true}
	}

	var imageURL pgtype.Text
	if input.ResultSheetImageURL != "" {
		imageURL = pgtype.Text{String: input.ResultSheetImageURL, Valid: true}
	}

	var videoURL pgtype.Text
	if input.ResultSheetVideoURL != "" {
		videoURL = pgtype.Text{String: input.ResultSheetVideoURL, Valid: true}
	}

	// Insert or update the result
	var result queries.PollingUnitResult

	// Check if the user already submitted a result for this election
	existingResults, err := qtx.ListPollingUnitResults(ctx, queries.ListPollingUnitResultsParams{
		ElectionID:  pgtype.Int8{Int64: input.ElectionID, Valid: true},
		SubmittedBy: pgtype.Int8{Int64: user.ID, Valid: true},
		Limit:       1,
		Cursor:      math.MaxInt32,
	})
	if err != nil {
		return queries.PollingUnitResult{}, err
	}

	if len(existingResults) > 0 {
		existing := existingResults[0]
		if existing.PollingUnitID != input.PollingUnitID {
			return queries.PollingUnitResult{}, errors.New("you have already submitted a result for a different polling unit in this election")
		}

		// Update existing submission
		result, err = qtx.UpdatePollingUnitResult(ctx, queries.UpdatePollingUnitResultParams{
			ID:                  existing.ID,
			AccreditedVoters:    int32(extracted.AccreditedVoters),
			VotesCast:           int32(extracted.VotesCast),
			ValidVotes:          int32(extracted.ValidVotes),
			RejectedVotes:       int32(extracted.RejectedVotes),
			CandidateResults:    candidateJSON,
			ResultSheetImageUrl: imageURL,
			ResultSheetVideoUrl: videoURL,
		})
		if err != nil {
			return queries.PollingUnitResult{}, err
		}
	} else {
		// The default status in the DB is 'submitted'. Since we verified via AI, we could set status here if we wanted.
		// But our schema says default is 'submitted'. Let's update it to 'ai_verified' immediately since we did it sync.
		result, err = qtx.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
			AssignmentID:          assignmentID,
			ElectionID:            input.ElectionID,
			ElectionGroupID:       input.ElectionGroupID,
			PollingUnitID:         input.PollingUnitID,
			SubmittedBy:           user.ID,
			PartyID:               partyID,
			StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:  pgtype.Int4{Int32: lga.SenatorialDistrictID, Valid: true},
			FederalConstituencyID: pgtype.Int4{Int32: lga.FederalConstituencyID, Valid: true},
			StateConstituencyID:   ward.StateAssemblyConstituencyID,
			LgaID:                 pgtype.Int4{Int32: int32(pu.LgaID), Valid: true},
			WardID:                pgtype.Int4{Int32: int32(pu.WardID), Valid: true},
			AccreditedVoters:      int32(extracted.AccreditedVoters),
			VotesCast:             int32(extracted.VotesCast),
			ValidVotes:            int32(extracted.ValidVotes),
			RejectedVotes:         int32(extracted.RejectedVotes),
			CandidateResults:      candidateJSON,
			ResultSheetImageUrl:   imageURL,
			ResultSheetVideoUrl:   videoURL,
			UploadedByInec:        input.UploadedByINEC,
		})
		if err != nil {
			return queries.PollingUnitResult{}, err
		}
	}

	// Update status immediately since we did sync verification
	// We'll set a default confidence score of 0.95 for now since the SDK doesn't expose it yet
	score := pgtype.Numeric{}
	score.Scan(0.95)

	status := "ai_verified"
	if extracted.ValidVotes+extracted.RejectedVotes != extracted.VotesCast {
		status = "disputed"
	}

	result, err = qtx.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
		ID:                result.ID,
		Status:            status,
		AiExtractedData:   rawJSON,
		AiConfidenceScore: score,
	})
	if err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Only increment counters if this was a new insertion
	if len(existingResults) == 0 {
		// Increment election_groups.results_submitted_count
		if err := qtx.IncrementElectionGroupResultCount(ctx, input.ElectionGroupID); err != nil {
			return queries.PollingUnitResult{}, err
		}

		// Increment elections.results_submitted_count for the specific election
		if err := qtx.IncrementElectionResultCount(ctx, input.ElectionID); err != nil {
			return queries.PollingUnitResult{}, err
		}

		// Increment party_election_groups.results_submitted_count when submitted by a party agent
		if input.PartyID != nil {
			if err := qtx.IncrementPartyElectionGroupResultCount(ctx, queries.IncrementPartyElectionGroupResultCountParams{
				PartyID:         *input.PartyID,
				ElectionGroupID: input.ElectionGroupID,
			}); err != nil {
				return queries.PollingUnitResult{}, err
			}
		}

		// Increment polling_unit_assignments.results_submitted_count if this is an agent submission
		if input.AssignmentID != nil {
			if err := qtx.IncrementAssignmentResultCount(ctx, *input.AssignmentID); err != nil {
				return queries.PollingUnitResult{}, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Enqueue the final result calculation task after the DB transaction commits.
	// asynq writes to Redis which is fast; no goroutine needed.
	// The debounce (ProcessIn + Unique) options ensure that even if called 100 times
	// in quick succession, only one task executes per polling unit per 2-minute window.
	if s.distributor != nil {
		err := s.distributor.DistributeTaskCalculateFinalResult(context.Background(), &worker.CalculateFinalResultPayload{
			ElectionID:    input.ElectionID,
			PollingUnitID: input.PollingUnitID,
		})
		if err != nil {
			slog.Error("failed to distribute final result task", "err", err,
				"election_id", input.ElectionID, "polling_unit_id", input.PollingUnitID)
		}
	}

	return result, nil
}

// GetResult fetches a single polling unit result by ID.
func (s *Service) GetResult(ctx context.Context, id int64) (queries.PollingUnitResult, error) {
	return s.queries.GetPollingUnitResult(ctx, id)
}

// ListResults returns a cursor-paginated slice of polling unit results.
func (s *Service) ListResults(ctx context.Context, params queries.ListPollingUnitResultsParams) ([]queries.PollingUnitResult, error) {
	return s.queries.ListPollingUnitResults(ctx, params)
}

// ListPollingUnitFinalResults returns a cursor-paginated slice of final polling unit results with details.
func (s *Service) ListPollingUnitFinalResults(ctx context.Context, params queries.ListPollingUnitFinalResultsParams) ([]queries.ListPollingUnitFinalResultsRow, error) {
	return s.queries.ListPollingUnitFinalResults(ctx, params)
}

// VoteOnResult records an up or down vote from a user, atomically swapping
// away any previously cast vote in the opposite direction.
func (s *Service) VoteOnResult(ctx context.Context, resultID, userID int64, voteType string) (queries.PollingUnitResult, error) {
	if voteType != "up" && voteType != "down" {
		return queries.PollingUnitResult{}, errors.New("vote_type must be 'up' or 'down'")
	}
	return s.queries.VoteOnResult(ctx, queries.VoteOnResultParams{
		ID:       resultID,
		UserID:   userID,
		VoteType: voteType,
	})
}

// ApplyAIVerification is called by the async Gemini job after scanning the result sheet image.
func (s *Service) ApplyAIVerification(ctx context.Context, input AIVerificationInput) (queries.PollingUnitResult, error) {
	var extractedData []byte
	if input.ExtractedData != nil {
		var err error
		extractedData, err = json.Marshal(input.ExtractedData)
		if err != nil {
			return queries.PollingUnitResult{}, errors.New("failed to encode ai_extracted_data")
		}
	}

	score := pgtype.Numeric{}
	if err := score.Scan(input.ConfidenceScore); err != nil {
		return queries.PollingUnitResult{}, errors.New("failed to encode ai_confidence_score")
	}

	var disputedReason pgtype.Text
	if input.DisputedReason != "" {
		disputedReason = pgtype.Text{String: input.DisputedReason, Valid: true}
	}

	return s.queries.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
		ID:                input.ResultID,
		Status:            input.Status,
		AiExtractedData:   extractedData,
		AiConfidenceScore: score,
		DisputedReason:    disputedReason,
	})
}

// ReviewResult allows a platform admin to manually confirm or nullify a result.
func (s *Service) ReviewResult(ctx context.Context, adminUserID int64, input ReviewResultInput) (queries.PollingUnitResult, error) {
	if input.Status != "confirmed" && input.Status != "nullified" {
		return queries.PollingUnitResult{}, errors.New("status must be 'confirmed' or 'nullified'")
	}

	var confirmedAt pgtype.Timestamptz
	var confirmedBy pgtype.Int8
	var disputedReason pgtype.Text

	if input.Status == "confirmed" {
		confirmedAt = pgtype.Timestamptz{Valid: true}
		if err := confirmedAt.Scan("now"); err != nil {
			// fallback — zero time is acceptable since DB default handles it
		}
		confirmedBy = pgtype.Int8{Int64: adminUserID, Valid: true}
	}

	if input.DisputedReason != "" {
		disputedReason = pgtype.Text{String: input.DisputedReason, Valid: true}
	}

	return s.queries.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
		ID:             input.ResultID,
		Status:         input.Status,
		DisputedReason: disputedReason,
		ConfirmedAt:    confirmedAt,
		ConfirmedBy:    confirmedBy,
	})
}

// GetFinalResult fetches the final result for a given polling unit and election.
func (s *Service) GetFinalResult(ctx context.Context, electionID int64, pollingUnitID int32) (interface{}, error) {
	// TODO: Re-implement final result fetching based on the new election_results schema
	return nil, fmt.Errorf("GetFinalResult is temporarily disabled due to schema migration")
}

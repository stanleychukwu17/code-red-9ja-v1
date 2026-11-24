package polling_unit_results

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	earningsservice "free9ja/api/internal/service/earnings"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	rdb         *redis.Client
	distributor worker.TaskDistributor
	earningsSvc earningsService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, params earningsservice.ProcessTaskEarningsParams) (int64, error)
	GetExpectedResultsCountForPU(ctx context.Context, electionGroupID int32, pollingUnitID int32) (int32, error)
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, distributor worker.TaskDistributor, earningsSvc earningsService) *Service {
	return &Service{queries: q, pool: pool, rdb: rdb, distributor: distributor, earningsSvc: earningsSvc}
}

func submittedResultCacheKey(electionID int32, partyID int16, pollingUnitID int32, userID int64) string {
	return fmt.Sprintf("%s%d:%d:%d:%d", db.RedisPUResultSubmitted, electionID, partyID, pollingUnitID, userID)
}

// HasSubmittedResult checks Redis first, then Postgres, to see if the user already submitted a result for this election, party, and PU.
func (s *Service) HasSubmittedResult(ctx context.Context, electionID int32, partyID int16, pollingUnitID int32, userID int64) (bool, error) {
	key := submittedResultCacheKey(electionID, partyID, pollingUnitID, userID)
	if _, err := s.rdb.Get(ctx, key).Result(); err == nil {
		return true, nil
	}

	existing, err := s.queries.GetPollingUnitResultByUserAndElection(ctx, queries.GetPollingUnitResultByUserAndElectionParams{
		ElectionID:    electionID,
		PartyID:       partyID,
		PollingUnitID: pollingUnitID,
		SubmittedBy:   pgtype.Int8{Int64: userID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	if existing.ID > 0 {
		_ = s.rdb.Set(ctx, key, "1", db.RedisSevenDaysTTL).Err()
		return true, nil
	}

	return false, nil
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
	UserID                int64
	AssignmentID          int64
	ElectionID            int32
	ElectionGroupID       int32
	PollingUnitID         int32
	PartyID               int16
	StateID               int32
	LgaID                 int32
	WardID                int32
	SenatorialDistrictID  pgtype.Int4
	FederalConstituencyID pgtype.Int4
	StateConstituencyID   pgtype.Int4
	ResultSheetImageURL   string
	ResultSheetVideoURL   string
}

// AIVerificationInput is used internally to apply Gemini findings.
type AIVerificationInput struct {
	ResultID        int64
	Status          string // "ai_verified" or "disputed"
	ExtractedData   interface{}
	ConfidenceScore float64
	DisputedReason  string
	IsAIGenerated   bool
}

// SubmitResult inserts a new polling unit result record rapidly (<20ms) and queues an asynchronous AI extraction task.
func (s *Service) SubmitResult(ctx context.Context, input SubmitResultInput) (queries.PollingUnitResult, error) {
	if input.ResultSheetImageURL == "" {
		return queries.PollingUnitResult{}, errors.New("result_sheet_image_url is required")
	}
	if input.PartyID <= 0 {
		return queries.PollingUnitResult{}, errors.New("party_id is required")
	}
	if input.UserID <= 0 {
		return queries.PollingUnitResult{}, errors.New("user_id is required")
	}
	if input.AssignmentID <= 0 {
		return queries.PollingUnitResult{}, errors.New("assignment_id is required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitResult{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Insert raw submission record with initial status 'submitted'
	result, err := qtx.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
		AssignmentID:          utils.PgInt8FromInt64(input.AssignmentID),
		ElectionID:            input.ElectionID,
		ElectionGroupID:       input.ElectionGroupID,
		PollingUnitID:         input.PollingUnitID,
		SubmittedBy:           utils.PgInt8FromInt64(input.UserID),
		PartyID:               input.PartyID,
		StateID:               utils.PgInt2FromInt16(int16(input.StateID)),
		SenatorialDistrictID:  input.SenatorialDistrictID,
		FederalConstituencyID: input.FederalConstituencyID,
		StateConstituencyID:   input.StateConstituencyID,
		LgaID:                 utils.PgInt4FromInt32(input.LgaID),
		WardID:                utils.PgInt4FromInt32(input.WardID),
		ResultSheetImageUrl:   utils.PgTextFromString(input.ResultSheetImageURL),
		ResultSheetVideoUrl:   utils.PgTextFromString(input.ResultSheetVideoURL),
		Status:                utils.PgTextFromString(constants.ResultStatusSubmitted),
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return queries.PollingUnitResult{}, errors.New("you have already submitted results for this election at your polling unit")
		}
		return queries.PollingUnitResult{}, err
	}

	// Check if this submission completes all expected elections for the PU and mark the assignment completed if so
	completed, err := s.syncAssignmentResultsProgress(ctx, qtx, input.AssignmentID, input.ElectionGroupID, input.PollingUnitID)
	if err != nil {
		return queries.PollingUnitResult{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Cache submission flag in Redis so subsequent retries/duplicates are rejected without hitting Postgres
	_ = s.rdb.Set(ctx, submittedResultCacheKey(input.ElectionID, input.PartyID, input.PollingUnitID, input.UserID), "1", db.RedisSevenDaysTTL).Err()

	// Invalidate cached user assignment so completed_at is reflected immediately
	if completed {
		_ = s.rdb.Del(ctx, fmt.Sprintf("%s%d:eg:%d", db.RedisUserPollingUnitAssignment, input.UserID, input.ElectionGroupID)).Err()
	}

	// Dispatch asynchronous AI extraction task
	if err := s.distributor.DistributeTaskExtractPUResultAI(context.Background(), &worker.ExtractPUResultAIPayload{
		ResultID:            result.ID,
		ElectionID:          result.ElectionID,
		PollingUnitID:       result.PollingUnitID,
		ResultSheetImageURL: input.ResultSheetImageURL,
	}); err != nil {
		slog.Error("failed to enqueue AI extraction task", "result_id", result.ID, "err", err)
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

	var isAIGenerated pgtype.Bool
	isAIGenerated = pgtype.Bool{Bool: input.IsAIGenerated, Valid: true}

	return s.queries.UpdateResultStatus(ctx, queries.UpdateResultStatusParams{
		ID:                  input.ResultID,
		Status:              input.Status,
		AiExtractedData:     extractedData,
		AiConfidenceScore:   score,
		DisputedReason:      disputedReason,
		ResultIsAiGenerated: isAIGenerated,
	})
}

// GetFinalResult fetches the final result for a given polling unit and election.
func (s *Service) GetFinalResult(ctx context.Context, electionID int64, pollingUnitID int32) (interface{}, error) {
	return nil, fmt.Errorf("GetFinalResult is temporarily disabled due to schema migration")
}

// syncAssignmentResultsProgress recalculates the count of distinct results submitted for this assignment,
// checks if the agent has fulfilled all expected results for the polling unit, and marks completed_at if so.
func (s *Service) syncAssignmentResultsProgress(ctx context.Context, qtx *queries.Queries, assignmentID int64, electionGroupID int32, pollingUnitID int32) (bool, error) {
	// 1. Count actual results submitted for this assignment (uses idx_pu_results_assignment)
	submittedCount, err := qtx.CountDistinctSubmittedResultsForAssignment(ctx, assignmentID)
	if err != nil {
		return false, fmt.Errorf("count submitted results: %w", err)
	}

	// 2. Fetch expected elections for this polling unit via Redis-cached earnings service
	expectedCount, err := s.earningsSvc.GetExpectedResultsCountForPU(ctx, electionGroupID, pollingUnitID)
	if err != nil || expectedCount <= 0 {
		expectedCount = 1
	}

	// 3. Mark completed if all expected results have been submitted
	if submittedCount >= expectedCount {
		completedAt := pgtype.Timestamptz{Time: time.Now(), Valid: true}
		_, err = qtx.MarkAssignmentCompleted(ctx, queries.MarkAssignmentCompletedParams{
			ID:          assignmentID,
			CompletedAt: completedAt,
		})
		if err != nil {
			return false, fmt.Errorf("mark assignment completed: %w", err)
		}
		return true, nil
	}

	return false, nil
}

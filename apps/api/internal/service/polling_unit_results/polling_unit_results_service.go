package polling_unit_results

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/db/queries"
	earningsservice "free9ja/api/internal/service/earnings"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type usersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	distributor worker.TaskDistributor
	earningsSvc earningsService
	usersSvc    usersService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, params earningsservice.ProcessTaskEarningsParams) (int64, error)
	GetExpectedResultsCountForPU(ctx context.Context, electionGroupID int32, pollingUnitID int32) (int32, error)
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, distributor worker.TaskDistributor, earningsSvc earningsService, usersSvc usersService) *Service {
	return &Service{queries: q, pool: pool, distributor: distributor, earningsSvc: earningsSvc, usersSvc: usersSvc}
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
	UserFakeID            int64
	AssignmentID          *int64
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

// validateUserEligibility verifies the election reporting window, registered voter polling unit (when no assignment),
// and ensures the user is not submitting results for a different polling unit in this election group.
func (s *Service) validateUserEligibility(
	ctx context.Context,
	qtx *queries.Queries,
	user queries.UserWithPlaces,
	assignmentID *int64,
	electionGroupID int32,
	pollingUnitID int32,
) error {
	// 1. Verify election group exists and current time is within the election reporting window
	eg, err := qtx.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return errors.New("invalid election_group_id")
	}
	if err := utils.ValidateElectionReportingWindow(eg.ElectionDate.Time, time.Now(), utils.PostElectionCollationGraceDays); err != nil {
		return err
	}

	// 2. Registered voter validation when submitting without a polling agent assignment
	if assignmentID == nil {
		if !user.PollingUnitID.Valid || user.PollingUnitID.Int32 == 0 {
			return errors.New("you do not have a registered polling unit. Please update your profile with your polling unit to submit results")
		}
		if user.PollingUnitID.Int32 != pollingUnitID {
			return errors.New("you can only upload election results for your registered polling unit")
		}
	}

	// 3. Cross-polling unit lock: ensure user has not submitted results for a different PU in this election group
	existingPUID, err := qtx.GetUserPollingUnitResultInElectionGroup(ctx, queries.GetUserPollingUnitResultInElectionGroupParams{
		SubmittedBy:     pgtype.Int8{Int64: user.ID, Valid: true},
		ElectionGroupID: electionGroupID,
	})
	if err == nil && existingPUID > 0 && existingPUID != pollingUnitID {
		return fmt.Errorf("you have already submitted election results for polling unit #%d and cannot submit for other polling units", existingPUID)
	}

	return nil
}

// SubmitResult inserts a new polling unit result record rapidly (<20ms) and queues an asynchronous AI extraction task.
func (s *Service) SubmitResult(ctx context.Context, input SubmitResultInput) (queries.PollingUnitResult, error) {
	if input.ResultSheetImageURL == "" {
		return queries.PollingUnitResult{}, errors.New("result_sheet_image_url is required")
	}
	if input.PartyID <= 0 {
		return queries.PollingUnitResult{}, errors.New("party_id is required")
	}

	user, err := s.usersSvc.GetUserByFakeID(ctx, input.UserFakeID)
	if err != nil {
		return queries.PollingUnitResult{}, errors.New("user not found")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitResult{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	if err := s.validateUserEligibility(
		ctx,
		qtx,
		user,
		input.AssignmentID,
		input.ElectionGroupID,
		input.PollingUnitID,
	); err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Verify election exists and belongs to the requested election group
	election, err := qtx.GetElectionInstanceByID(ctx, input.ElectionID)
	if err != nil || election.ElectionGroupID != input.ElectionGroupID {
		return queries.PollingUnitResult{}, errors.New("invalid election_id for this election group")
	}

	// Check if this user already submitted results for this specific election at this PU
	existingResult, err := qtx.GetPollingUnitResultByUserAndElection(ctx, queries.GetPollingUnitResultByUserAndElectionParams{
		ElectionID:    input.ElectionID,
		PollingUnitID: input.PollingUnitID,
		SubmittedBy:   pgtype.Int8{Int64: user.ID, Valid: true},
	})
	if err == nil && existingResult.ID > 0 {
		return queries.PollingUnitResult{}, errors.New("you have already submitted results for this election at your polling unit")
	}

	// Insert raw submission record with initial status 'submitted'
	result, err := qtx.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
		AssignmentID:          utils.PgInt8FromPtr(input.AssignmentID),
		ElectionID:            input.ElectionID,
		ElectionGroupID:       input.ElectionGroupID,
		PollingUnitID:         input.PollingUnitID,
		SubmittedBy:           utils.PgInt8FromInt64(user.ID),
		PartyID:               input.PartyID,
		StateID:               utils.PgInt2FromInt16(int16(input.StateID)),
		SenatorialDistrictID:  input.SenatorialDistrictID,
		FederalConstituencyID: input.FederalConstituencyID,
		StateConstituencyID:   input.StateConstituencyID,
		LgaID:                 utils.PgInt4FromInt32(input.LgaID),
		WardID:                utils.PgInt4FromInt32(input.WardID),
		AccreditedVoters:      0,
		VotesCast:             0,
		ValidVotes:            0,
		RejectedVotes:         0,
		ResultSheetImageUrl:   utils.PgTextFromString(input.ResultSheetImageURL),
		ResultSheetVideoUrl:   utils.PgTextFromString(input.ResultSheetVideoURL),
		Status:                utils.PgTextFromString("submitted"),
	})
	if err != nil {
		return queries.PollingUnitResult{}, err
	}

	if input.AssignmentID != nil {
		if err := s.syncAssignmentResultsProgress(ctx, qtx, *input.AssignmentID, input.ElectionGroupID, input.PollingUnitID); err != nil {
			return queries.PollingUnitResult{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Agent earnings processing via Redis worker queue
	if input.AssignmentID != nil && s.distributor != nil {
		_ = s.distributor.DistributeTaskCalculateAgentEarnings(context.Background(), &worker.CalculateAgentEarningsPayload{
			AssignmentID: *input.AssignmentID,
			TaskType:     "results",
		})
	}

	// Dispatch asynchronous AI extraction task
	if s.distributor != nil && input.ResultSheetImageURL != "" {
		err := s.distributor.DistributeTaskExtractPUResultAI(context.Background(), &worker.ExtractPUResultAIPayload{
			ResultID:            result.ID,
			ElectionID:          result.ElectionID,
			PollingUnitID:       result.PollingUnitID,
			ResultSheetImageURL: input.ResultSheetImageURL,
		})
		if err != nil {
			slog.Error("failed to enqueue AI extraction task", "result_id", result.ID, "err", err)
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
func (s *Service) syncAssignmentResultsProgress(ctx context.Context, qtx *queries.Queries, assignmentID int64, electionGroupID int32, pollingUnitID int32) error {
	// 1. Count actual distinct elections submitted for this assignment
	submittedCount, err := qtx.CountDistinctSubmittedResultsForAssignment(ctx, assignmentID)
	if err != nil {
		return fmt.Errorf("count submitted results: %w", err)
	}

	// 2. Fetch expected elections for this polling unit via Redis-cached earnings service
	expectedCount, err := s.earningsSvc.GetExpectedResultsCountForPU(ctx, electionGroupID, pollingUnitID)
	if err != nil || expectedCount <= 0 {
		expectedCount = 1
	}

	// 3. Mark completed if all expected results have been submitted
	if submittedCount >= expectedCount {
		completedAt := pgtype.Timestamptz{Time: time.Now(), Valid: true}
		slog.Info("agent completed all expected polling unit results",
			"assignment_id", assignmentID,
			"submitted_count", submittedCount,
			"expected_count", expectedCount,
		)
		_, err = qtx.MarkAssignmentCompleted(ctx, queries.MarkAssignmentCompletedParams{
			ID:          assignmentID,
			CompletedAt: completedAt,
		})
		if err != nil {
			return fmt.Errorf("mark assignment completed: %w", err)
		}
	}

	return nil
}

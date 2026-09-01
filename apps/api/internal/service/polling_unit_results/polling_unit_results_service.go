package polling_unit_results

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	queries     *queries.Queries
	pool        *pgxpool.Pool
	distributor worker.TaskDistributor
	earningsSvc earningsService
}

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, distributor worker.TaskDistributor) *Service {
	return &Service{queries: q, pool: pool, distributor: distributor}
}

func (s *Service) SetEarningsService(es earningsService) {
	s.earningsSvc = es
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
	PartyID             *int16
	ResultSheetImageURL string
	ResultSheetVideoURL string
	UploadedByINEC      bool
}

// SingleElectionSubmission is an item in a batch upload
type SingleElectionSubmission struct {
	ElectionID          int64  `json:"election_id"`
	ResultSheetImageURL string `json:"result_sheet_image_url"`
	ResultSheetVideoURL string `json:"result_sheet_video_url,omitempty"`
}

// SubmitBatchResultsInput carries submissions for multiple elections at a polling unit.
type SubmitBatchResultsInput struct {
	UserFakeID      int64                      `json:"user_fake_id"`
	AssignmentID    *int64                     `json:"assignment_id,omitempty"`
	ElectionGroupID int64                      `json:"election_group_id"`
	PollingUnitID   int32                      `json:"polling_unit_id"`
	PartyID         *int16                     `json:"party_id,omitempty"`
	UploadedByINEC  bool                       `json:"uploaded_by_inec"`
	Submissions     []SingleElectionSubmission `json:"submissions"`
}

// ReviewResultInput is used by platform admins to manually override a result's status.
type ReviewResultInput struct {
	ResultID       int64
	Status         string // "confirmed" or "nullified"
	DisputedReason string
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

// validateUserEligibility verifies user identity, polling agent assignment or registered voter status,
// and ensures the user is not submitting results for a different polling unit in this election group.
func (s *Service) validateUserEligibility(
	ctx context.Context,
	qtx *queries.Queries,
	userFakeID int64,
	assignmentID *int64,
	electionGroupID int64,
	pollingUnitID int32,
) (queries.GetUserByFakeIDRow, queries.PollingUnit, queries.Lga, queries.Ward, error) {
	// 1. Resolve real user from fake ID
	user, err := qtx.GetUserByFakeID(ctx, pgtype.Int8{Int64: userFakeID, Valid: true})
	if err != nil {
		return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("user not found")
	}

	// 2. Fetch Polling Unit, LGA, and Ward
	pu, err := qtx.GetPollingUnitByID(ctx, pollingUnitID)
	if err != nil {
		return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("invalid polling_unit_id")
	}

	lga, err := qtx.GetLGAByID(ctx, pu.LgaID)
	if err != nil {
		return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("invalid lga for polling unit")
	}

	ward, err := qtx.GetWardByID(ctx, pu.WardID)
	if err != nil {
		return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("invalid ward for polling unit")
	}

	// 3. Verify Polling Agent assignment OR Registered Voter polling unit
	if assignmentID != nil {
		assignment, err := qtx.GetAssignmentByID(ctx, *assignmentID)
		if err != nil || assignment.UserID != user.ID {
			return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("invalid or unauthorized polling unit assignment")
		}
		if assignment.PollingUnitID != pollingUnitID {
			return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("you can only upload results for your assigned polling unit")
		}
	} else {
		// Registered Voter validation
		if !user.PollingUnitID.Valid || user.PollingUnitID.Int32 == 0 {
			return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("you do not have a registered polling unit. Please update your profile with your polling unit to submit results")
		}
		if user.PollingUnitID.Int32 != pollingUnitID {
			return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, errors.New("you can only upload election results for your registered polling unit")
		}
	}

	// 4. Cross-polling unit lock: Check if user already submitted results for a different polling unit in this election group
	existingPUID, err := qtx.GetUserPollingUnitResultInElectionGroup(ctx, queries.GetUserPollingUnitResultInElectionGroupParams{
		SubmittedBy:     pgtype.Int8{Int64: user.ID, Valid: true},
		ElectionGroupID: electionGroupID,
	})
	if err == nil && existingPUID > 0 && existingPUID != pollingUnitID {
		return queries.GetUserByFakeIDRow{}, queries.PollingUnit{}, queries.Lga{}, queries.Ward{}, fmt.Errorf("you have already submitted election results for polling unit #%d and cannot submit for other polling units", existingPUID)
	}

	return user, pu, lga, ward, nil
}

// SubmitResult inserts a new polling unit result record rapidly (<20ms) and queues an asynchronous AI extraction task.
func (s *Service) SubmitResult(ctx context.Context, input SubmitResultInput) (queries.PollingUnitResult, error) {
	if input.ResultSheetImageURL == "" {
		return queries.PollingUnitResult{}, errors.New("result_sheet_image_url is required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PollingUnitResult{}, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	user, pu, lga, ward, err := s.validateUserEligibility(
		ctx,
		qtx,
		input.UserFakeID,
		input.AssignmentID,
		input.ElectionGroupID,
		input.PollingUnitID,
	)
	if err != nil {
		return queries.PollingUnitResult{}, err
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

	var assignmentID pgtype.Int8
	if input.AssignmentID != nil {
		assignmentID = pgtype.Int8{Int64: *input.AssignmentID, Valid: true}
	}

	var partyID pgtype.Int2
	if input.PartyID != nil {
		partyID = pgtype.Int2{Int16: int16(*input.PartyID), Valid: true}
	}

	var imageURL pgtype.Text
	if input.ResultSheetImageURL != "" {
		imageURL = pgtype.Text{String: input.ResultSheetImageURL, Valid: true}
	}

	var videoURL pgtype.Text
	if input.ResultSheetVideoURL != "" {
		videoURL = pgtype.Text{String: input.ResultSheetVideoURL, Valid: true}
	}

	// Insert raw submission record with initial status 'submitted'
	result, err := qtx.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
		AssignmentID:          assignmentID,
		ElectionID:            input.ElectionID,
		ElectionGroupID:       input.ElectionGroupID,
		PollingUnitID:         input.PollingUnitID,
		SubmittedBy:           pgtype.Int8{Int64: user.ID, Valid: true},
		PartyID:               partyID,
		StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
		SenatorialDistrictID:  lga.SenatorialDistrictID,
		FederalConstituencyID: lga.FederalConstituencyID,
		StateConstituencyID:   ward.StateConstituencyID,
		LgaID:                 pgtype.Int4{Int32: int32(pu.LgaID), Valid: true},
		WardID:                pgtype.Int4{Int32: int32(pu.WardID), Valid: true},
		AccreditedVoters:      0,
		VotesCast:             0,
		ValidVotes:            0,
		RejectedVotes:         0,
		CandidateResults:      []byte("[]"),
		ResultSheetImageUrl:   imageURL,
		ResultSheetVideoUrl:   videoURL,
		UploadedByInec:        input.UploadedByINEC,
		Status:                pgtype.Text{String: "submitted", Valid: true},
	})
	if err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Increment relevant counters
	if err := qtx.IncrementElectionGroupResultCount(ctx, input.ElectionGroupID); err != nil {
		return queries.PollingUnitResult{}, err
	}
	if err := qtx.IncrementElectionResultCount(ctx, input.ElectionID); err != nil {
		return queries.PollingUnitResult{}, err
	}
	if input.PartyID != nil {
		_ = qtx.IncrementPartyElectionGroupResultCount(ctx, queries.IncrementPartyElectionGroupResultCountParams{
			PartyID:         int16(*input.PartyID),
			ElectionGroupID: input.ElectionGroupID,
		})
	}
	if input.AssignmentID != nil {
		_ = qtx.IncrementAssignmentResultCount(ctx, *input.AssignmentID)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.PollingUnitResult{}, err
	}

	// Agent earnings processing
	if input.AssignmentID != nil && s.earningsSvc != nil {
		go s.earningsSvc.ProcessTaskEarnings(context.Background(), *input.AssignmentID, "results")
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

// SubmitBatchResults allows uploading multiple election results for a polling unit in a single fast transaction.
func (s *Service) SubmitBatchResults(ctx context.Context, input SubmitBatchResultsInput) ([]queries.PollingUnitResult, error) {
	if len(input.Submissions) == 0 {
		return nil, errors.New("submissions array cannot be empty")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	user, pu, lga, ward, err := s.validateUserEligibility(
		ctx,
		qtx,
		input.UserFakeID,
		input.AssignmentID,
		input.ElectionGroupID,
		input.PollingUnitID,
	)
	if err != nil {
		return nil, err
	}

	var assignmentID pgtype.Int8
	if input.AssignmentID != nil {
		assignmentID = pgtype.Int8{Int64: *input.AssignmentID, Valid: true}
	}

	var partyID pgtype.Int2
	if input.PartyID != nil {
		partyID = pgtype.Int2{Int16: int16(*input.PartyID), Valid: true}
	}

	var createdResults []queries.PollingUnitResult

	for _, sub := range input.Submissions {
		if sub.ResultSheetImageURL == "" {
			return nil, fmt.Errorf("result_sheet_image_url is required for election #%d", sub.ElectionID)
		}

		// Check if already submitted for this election
		existingResult, err := qtx.GetPollingUnitResultByUserAndElection(ctx, queries.GetPollingUnitResultByUserAndElectionParams{
			ElectionID:    sub.ElectionID,
			PollingUnitID: input.PollingUnitID,
			SubmittedBy:   pgtype.Int8{Int64: user.ID, Valid: true},
		})
		if err == nil && existingResult.ID > 0 {
			return nil, fmt.Errorf("you have already submitted results for election #%d at your polling unit", sub.ElectionID)
		}

		var imageURL pgtype.Text
		if sub.ResultSheetImageURL != "" {
			imageURL = pgtype.Text{String: sub.ResultSheetImageURL, Valid: true}
		}

		var videoURL pgtype.Text
		if sub.ResultSheetVideoURL != "" {
			videoURL = pgtype.Text{String: sub.ResultSheetVideoURL, Valid: true}
		}

		result, err := qtx.SubmitPollingUnitResult(ctx, queries.SubmitPollingUnitResultParams{
			AssignmentID:          assignmentID,
			ElectionID:            sub.ElectionID,
			ElectionGroupID:       input.ElectionGroupID,
			PollingUnitID:         input.PollingUnitID,
			SubmittedBy:           pgtype.Int8{Int64: user.ID, Valid: true},
			PartyID:               partyID,
			StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:  lga.SenatorialDistrictID,
			FederalConstituencyID: lga.FederalConstituencyID,
			StateConstituencyID:   ward.StateConstituencyID,
			LgaID:                 pgtype.Int4{Int32: int32(pu.LgaID), Valid: true},
			WardID:                pgtype.Int4{Int32: int32(pu.WardID), Valid: true},
			AccreditedVoters:      0,
			VotesCast:             0,
			ValidVotes:            0,
			RejectedVotes:         0,
			CandidateResults:      []byte("[]"),
			ResultSheetImageUrl:   imageURL,
			ResultSheetVideoUrl:   videoURL,
			UploadedByInec:        input.UploadedByINEC,
			Status:                pgtype.Text{String: "submitted", Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to insert result for election #%d: %w", sub.ElectionID, err)
		}

		_ = qtx.IncrementElectionResultCount(ctx, sub.ElectionID)
		createdResults = append(createdResults, result)
	}

	_ = qtx.IncrementElectionGroupResultCount(ctx, input.ElectionGroupID)
	if input.PartyID != nil {
		_ = qtx.IncrementPartyElectionGroupResultCount(ctx, queries.IncrementPartyElectionGroupResultCountParams{
			PartyID:         int16(*input.PartyID),
			ElectionGroupID: input.ElectionGroupID,
		})
	}
	if input.AssignmentID != nil {
		_ = qtx.IncrementAssignmentResultCount(ctx, *input.AssignmentID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if input.AssignmentID != nil && s.earningsSvc != nil {
		go s.earningsSvc.ProcessTaskEarnings(context.Background(), *input.AssignmentID, "results")
	}

	// Dispatch asynchronous AI extraction tasks for all submitted results
	if s.distributor != nil {
		for i, res := range createdResults {
			imgURL := input.Submissions[i].ResultSheetImageURL
			if imgURL != "" {
				_ = s.distributor.DistributeTaskExtractPUResultAI(context.Background(), &worker.ExtractPUResultAIPayload{
					ResultID:            res.ID,
					ElectionID:          res.ElectionID,
					PollingUnitID:       res.PollingUnitID,
					ResultSheetImageURL: imgURL,
				})
			}
		}
	}

	return createdResults, nil
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
		_ = confirmedAt.Scan("now")
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
	return nil, fmt.Errorf("GetFinalResult is temporarily disabled due to schema migration")
}

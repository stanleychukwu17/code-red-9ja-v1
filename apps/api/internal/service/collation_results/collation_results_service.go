package collation_results

import (
	"context"
	"errors"
	"fmt"
	"time"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type usersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type Service struct {
	queries  *queries.Queries
	pool     *pgxpool.Pool
	usersSvc usersService
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, usersSvc usersService) *Service {
	return &Service{
		queries:  q,
		pool:     pool,
		usersSvc: usersSvc,
	}
}

// SubmitCollationResultInput carries all parameters needed to submit an EC8B, EC8C, or EC8D collation sheet.
type SubmitCollationResultInput struct {
	UserFakeID            int64
	ElectionID            int32
	ElectionGroupID       int32
	RoleType              string
	PartyID               int16
	StateID               int16
	SenatorialDistrictID  pgtype.Int4
	FederalConstituencyID pgtype.Int4
	StateConstituencyID   pgtype.Int4
	LgaID                 *int32
	WardID                *int32
	ResultSheetImageURL   string
	ResultSheetVideoURL   string
}

// SubmitCollationResult verifies the election window, validates geographic scope according to supervisor role,
// and records the collation result sheet (EC8B / EC8C / EC8D).
func (s *Service) SubmitCollationResult(ctx context.Context, input SubmitCollationResultInput) (queries.CollationResult, error) {
	if input.ResultSheetImageURL == "" {
		return queries.CollationResult{}, errors.New("result_sheet_image_url is required")
	}
	if input.PartyID <= 0 {
		return queries.CollationResult{}, errors.New("party_id is required")
	}

	user, err := s.usersSvc.GetUserByFakeID(ctx, input.UserFakeID)
	if err != nil {
		return queries.CollationResult{}, errors.New("user not found")
	}

	// 1. Verify election group reporting window
	eg, err := s.queries.GetElectionGroupByID(ctx, input.ElectionGroupID)
	if err != nil {
		return queries.CollationResult{}, errors.New("invalid election_group_id")
	}
	if err := utils.ValidateElectionReportingWindow(eg.ElectionDate.Time, time.Now(), utils.PostElectionCollationGraceDays); err != nil {
		return queries.CollationResult{}, err
	}

	// 2. Determine form_type & validate geographic hierarchy matching DB check constraints
	var formType string
	var lgaID pgtype.Int4
	var wardID pgtype.Int4

	switch input.RoleType {
	case constants.RoleWardElectionSupervisor:
		formType = "EC8B"
		if input.WardID == nil || *input.WardID <= 0 || input.LgaID == nil || *input.LgaID <= 0 {
			return queries.CollationResult{}, errors.New("ward_id and lga_id are required for ward collation results (EC8B)")
		}
		wardID = pgtype.Int4{Int32: *input.WardID, Valid: true}
		lgaID = pgtype.Int4{Int32: *input.LgaID, Valid: true}

	case constants.RoleLgaElectionSupervisor:
		formType = "EC8C"
		if input.LgaID == nil || *input.LgaID <= 0 {
			return queries.CollationResult{}, errors.New("lga_id is required for LGA collation results (EC8C)")
		}
		lgaID = pgtype.Int4{Int32: *input.LgaID, Valid: true}
		wardID = pgtype.Int4{Valid: false} // must be NULL per DB constraint

	case constants.RoleStateElectionSupervisor:
		formType = "EC8D"
		lgaID = pgtype.Int4{Valid: false}  // must be NULL per DB constraint
		wardID = pgtype.Int4{Valid: false} // must be NULL per DB constraint

	default:
		return queries.CollationResult{}, fmt.Errorf("invalid supervisor role type: %s", input.RoleType)
	}

	// 3. Prepare parameters
	var videoURL pgtype.Text
	if input.ResultSheetVideoURL != "" {
		videoURL = pgtype.Text{String: input.ResultSheetVideoURL, Valid: true}
	}

	params := queries.SubmitCollationResultParams{
		ElectionID:            input.ElectionID,
		ElectionGroupID:       input.ElectionGroupID,
		SubmittedBy:           pgtype.Int8{Int64: user.ID, Valid: true},
		PartyID:               input.PartyID,
		FormType:              formType,
		RoleType:              input.RoleType,
		StateID:               input.StateID,
		SenatorialDistrictID:  input.SenatorialDistrictID,
		FederalConstituencyID: input.FederalConstituencyID,
		StateConstituencyID:   input.StateConstituencyID,
		LgaID:                 lgaID,
		WardID:                wardID,
		ResultSheetImageUrl:   input.ResultSheetImageURL,
		ResultSheetVideoUrl:   videoURL,
	}

	return s.queries.SubmitCollationResult(ctx, params)
}

// GetCollationResultByID fetches a single collation result by ID.
func (s *Service) GetCollationResultByID(ctx context.Context, id int64) (queries.CollationResult, error) {
	return s.queries.GetCollationResultByID(ctx, id)
}

// ListCollationResults returns collation results scoped by geography and election.
func (s *Service) ListCollationResults(ctx context.Context, params queries.ListCollationResultsByScopeParams) ([]queries.CollationResult, error) {
	return s.queries.ListCollationResultsByScope(ctx, params)
}

package electionsservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/notifications"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const createElectionInstanceSQL = `
INSERT INTO elections (
  name, election_date, election_group_id,
  office_id, scope,
  state_id, senatorial_district_id, federal_constituency_id,
  state_constituency_id, lga_id, ward_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
`

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

type officesService interface {
	GetOfficeByID(ctx context.Context, id int16) (queries.Office, error)
}

type bodiesService interface {
	GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.CState, error)
}

type notificationsService interface {
	NotifyCandidateNominated(ctx context.Context, params notifications.NotifyCandidateNominatedParams)
	NotifyCandidateWithdrawn(ctx context.Context, params notifications.NotifyCandidateWithdrawnParams)
}

type pageVerificationsService interface {
	EnsurePoliticianVerification(ctx context.Context, userID int64) error
	RevokePoliticianVerificationIfNoCandidacy(ctx context.Context, userID int64) error
}

type ElectionsService struct {
	queries                  *queries.Queries
	pool                     *pgxpool.Pool
	rdb                      *redis.Client
	taskDistributor          worker.TaskDistributor
	earningsService          earningsService
	officeService            officesService
	bodiesService            bodiesService
	notificationsService     notificationsService
	pageVerificationsService pageVerificationsService
}

// NewElectionsService initializes a new ElectionsService with its required database pool,
// query handlers, Redis client, task distributor, earnings service, offices service, bodies service, and notifications service dependency.
func NewElectionsService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	taskDistributor worker.TaskDistributor,
	earningsService earningsService,
	officeService officesService,
	bodiesService bodiesService,
	notificationsService notificationsService,
) *ElectionsService {
	return &ElectionsService{
		queries:              q,
		pool:                 pool,
		rdb:                  rdb,
		taskDistributor:      taskDistributor,
		earningsService:      earningsService,
		officeService:        officeService,
		bodiesService:        bodiesService,
		notificationsService: notificationsService,
	}
}

// SetPageVerificationsService sets the page verifications service dependency to resolve circular dependencies.
func (s *ElectionsService) SetPageVerificationsService(pvs pageVerificationsService) {
	s.pageVerificationsService = pvs
}

// invalidateCache purges the Redis cache for a specific election instance by ID.
func (s *ElectionsService) invalidateCache(ctx context.Context, electionID int32) {
	s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionByID, electionID))
}

// invalidateBulkCache purges the Redis cache for multiple election instances in a single Del call.
func (s *ElectionsService) invalidateBulkCache(ctx context.Context, electionIDs []int32) {
	if len(electionIDs) == 0 {
		return
	}
	keys := make([]string, len(electionIDs))
	for i, id := range electionIDs {
		keys[i] = fmt.Sprintf("%s%d", db.RedisElectionByID, id)
	}
	s.rdb.Del(ctx, keys...)
}

// validateElectionGroup ensures that the target election group exists and is active.
func (s *ElectionsService) validateElectionGroup(ctx context.Context, q *queries.Queries, groupID int32) (queries.ElectionGroup, error) {
	eg, err := q.GetElectionGroupByID(ctx, groupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.ElectionGroup{}, fmt.Errorf("election group with ID %d does not exist", groupID)
		}
		return queries.ElectionGroup{}, fmt.Errorf("failed to verify election group: %w", err)
	}
	if !eg.Active {
		return queries.ElectionGroup{}, fmt.Errorf("election group '%s' is not active", eg.Name)
	}
	return eg, nil
}

// deDupeSlice returns a new slice with duplicate elements removed, preserving original order.
func deDupeSlice[T comparable](slice []T) []T {
	// Return early if the slice is empty or nil
	if len(slice) == 0 {
		return slice
	}

	// Track seen elements using a hash set for O(1) membership checks
	seen := make(map[T]struct{}, len(slice))
	// Preallocate result slice capacity to minimize heap allocations
	result := make([]T, 0, len(slice))

	// Iterate and append only elements encountered for the first time
	for _, v := range slice {
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			result = append(result, v)
		}
	}

	return result
}

// batchCreateElections pipelines multiple election inserts into the active transaction using pgx.Batch in chunks of 1000,
// without returning full rows for maximum throughput. Returns the number of inserted elections.
func (s *ElectionsService) batchCreateElections(ctx context.Context, tx pgx.Tx, paramsList []queries.CreateElectionInstanceParams) (int, error) {
	if len(paramsList) == 0 {
		return 0, nil
	}

	const chunkSize = 1000
	totalInserted := 0

	for i := 0; i < len(paramsList); i += chunkSize {
		end := i + chunkSize
		if end > len(paramsList) {
			end = len(paramsList)
		}
		chunk := paramsList[i:end]

		batch := &pgx.Batch{}
		for _, p := range chunk {
			batch.Queue(createElectionInstanceSQL,
				p.Name,
				p.ElectionDate,
				p.ElectionGroupID,
				p.OfficeID,
				p.Scope,
				p.StateID,
				p.SenatorialDistrictID,
				p.FederalConstituencyID,
				p.StateConstituencyID,
				p.LgaID,
				p.WardID,
			)
		}

		batchResults := tx.SendBatch(ctx, batch)
		for _, p := range chunk {
			ct, err := batchResults.Exec()
			if err != nil {
				batchResults.Close()
				return totalInserted, fmt.Errorf("failed to insert batch election %q: %w", p.Name, err)
			}
			totalInserted += int(ct.RowsAffected())
		}

		if err := batchResults.Close(); err != nil {
			return totalInserted, fmt.Errorf("failed to close batch results: %w", err)
		}
	}

	return totalInserted, nil
}

// CreateNationwideElection sets up a country-wide election (e.g., Presidential).
func (s *ElectionsService) CreateNationwideElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32) (queries.ElectionDetails, error) {
	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.ElectionDetails{}, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return queries.ElectionDetails{}, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "nationwide" {
		return queries.ElectionDetails{}, fmt.Errorf("office %s is not a nationwide office (expected scope 'nationwide', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.ElectionDetails{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return queries.ElectionDetails{}, err
	}

	// Create election record (nationwide scope has no geographic sub-boundary IDs)
	name := fmt.Sprintf("%d %s Election", electionDate.Year(), officeElection)
	election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
		Name:            name,
		ElectionDate:    pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID: electionGroupID,
		OfficeID:        officeID,
		Scope:           "nationwide",
	})
	if err != nil {
		return queries.ElectionDetails{}, fmt.Errorf("failed to create election: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return queries.ElectionDetails{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return electionDetails(election, time.Now()), nil
}

// CreateStateElection sets up multiple state-level elections (e.g., Governorship) under a shared election group.
func (s *ElectionsService) CreateStateElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateIDs []int16) (int, error) {
	// Early return if no states provided
	if len(stateIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of state IDs
	stateIDs = deDupeSlice(stateIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "state" {
		return 0, fmt.Errorf("office %s is not a state-level office (expected scope 'state', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all states into map for O(1) in-memory lookups via bodiesService Redis cache
	states, err := s.bodiesService.GetStatesByCountryID(ctx, constants.NigeriaCountryID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch states: %w", err)
	}
	stateMap := make(map[int16]string, len(states))
	for _, s := range states {
		stateMap[s.ID] = s.Name
	}

	// Build election parameters for each state (skipping non-existent states)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(stateIDs))
	for _, stateID := range stateIDs {
		stateName, found := stateMap[stateID]
		if !found {
			// Skip state IDs that do not exist
			continue
		}

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, stateName)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:            name,
			ElectionDate:    pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID: electionGroupID,
			OfficeID:        officeID,
			Scope:           "state",
			StateID:         pgtype.Int2{Int16: stateID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// CreateSenatorialDistrictElection sets up elections across one or more Senatorial Districts.
func (s *ElectionsService) CreateSenatorialDistrictElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, senatorialDistrictIDs []int32) (int, error) {
	// Early return if no senatorial districts provided
	if len(senatorialDistrictIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of senatorial district IDs
	senatorialDistrictIDs = deDupeSlice(senatorialDistrictIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "senatorial-district" {
		return 0, fmt.Errorf("office %s is not a senatorial district office (expected scope 'senatorial-district', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all senatorial districts into map for O(1) in-memory lookups
	districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch senatorial districts: %w", err)
	}
	districtMap := make(map[int32]queries.SenatorialDistrict, len(districts))
	for _, d := range districts {
		districtMap[d.ID] = d
	}

	// Build election parameters for each senatorial district (skipping non-existent districts)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(senatorialDistrictIDs))
	for _, districtID := range senatorialDistrictIDs {
		districtRow, found := districtMap[districtID]
		if !found {
			// Skip district IDs that do not exist
			continue
		}

		stateID := utils.PgInt2FromPositive(districtRow.StateID)

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, districtRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                 name,
			ElectionDate:         pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:      electionGroupID,
			OfficeID:             officeID,
			Scope:                "senatorial-district",
			StateID:              stateID,
			SenatorialDistrictID: pgtype.Int4{Int32: districtID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// CreateFederalConstituencyElection sets up elections across one or more Federal Constituencies (House of Representatives).
func (s *ElectionsService) CreateFederalConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, federalConstituencyIDs []int32) (int, error) {
	// Early return if no federal constituencies provided
	if len(federalConstituencyIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of federal constituency IDs
	federalConstituencyIDs = deDupeSlice(federalConstituencyIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "federal-constituency" {
		return 0, fmt.Errorf("office %s is not a federal constituency office (expected scope 'federal-constituency', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all federal constituencies into map for O(1) in-memory lookups
	constituencies, err := txQueries.GetFederalConstituencies(ctx, queries.GetFederalConstituenciesParams{
		StateID:              0,
		SenatorialDistrictID: 0,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch federal constituencies: %w", err)
	}
	fcMap := make(map[int32]queries.FederalConstituency, len(constituencies))
	for _, c := range constituencies {
		fcMap[c.ID] = c
	}

	// Build election parameters for each federal constituency (skipping non-existent constituencies)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(federalConstituencyIDs))
	for _, constituencyID := range federalConstituencyIDs {
		cRow, found := fcMap[constituencyID]
		if !found {
			// Skip constituency IDs that do not exist
			continue
		}

		stateID := utils.PgInt2FromPositive(cRow.StateID)
		var senatorialDistrictID pgtype.Int4
		if cRow.SenatorialDistrictID.Valid && cRow.SenatorialDistrictID.Int32 > 0 {
			senatorialDistrictID = cRow.SenatorialDistrictID
		}

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, cRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                  name,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       electionGroupID,
			OfficeID:              officeID,
			Scope:                 "federal-constituency",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: pgtype.Int4{Int32: constituencyID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// CreateStateConstituencyElection sets up elections across one or more State Assembly Constituencies.
func (s *ElectionsService) CreateStateConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateConstituencyIDs []int32) (int, error) {
	// Early return if no state constituencies provided
	if len(stateConstituencyIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of state constituency IDs
	stateConstituencyIDs = deDupeSlice(stateConstituencyIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "state-constituency" {
		return 0, fmt.Errorf("office %s is not a state constituency office (expected scope 'state-constituency', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all state constituencies into map for O(1) in-memory lookups
	constituencies, err := txQueries.GetStateConstituencies(ctx, queries.GetStateConstituenciesParams{
		StateID:               0,
		FederalConstituencyID: 0,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch state constituencies: %w", err)
	}
	scMap := make(map[int32]queries.StateConstituency, len(constituencies))
	for _, c := range constituencies {
		scMap[c.ID] = c
	}

	// Build election parameters for each state constituency (skipping non-existent constituencies)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(stateConstituencyIDs))
	for _, constituencyID := range stateConstituencyIDs {
		cRow, found := scMap[constituencyID]
		if !found {
			// Skip constituency IDs that do not exist
			continue
		}

		stateID := utils.PgInt2FromPositive(cRow.StateID)
		lgaID := utils.PgInt4FromPositive(cRow.LgaID)
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4

		if cRow.SenatorialDistrictID.Valid && cRow.SenatorialDistrictID.Int32 > 0 {
			senatorialDistrictID = cRow.SenatorialDistrictID
		}
		if cRow.FederalConstituencyID.Valid && cRow.FederalConstituencyID.Int32 > 0 {
			federalConstituencyID = cRow.FederalConstituencyID
		}

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, cRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                  name,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       electionGroupID,
			OfficeID:              officeID,
			Scope:                 "state-constituency",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 lgaID,
			StateConstituencyID:   pgtype.Int4{Int32: constituencyID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// CreateLgaElection sets up elections across one or more Local Government Areas (LGAs) (e.g., LGA Chairmanship).
func (s *ElectionsService) CreateLgaElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, lgaIDs []int32) (int, error) {
	// Early return if no LGAs provided
	if len(lgaIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of LGA IDs
	lgaIDs = deDupeSlice(lgaIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "lga" {
		return 0, fmt.Errorf("office %s is not an LGA office (expected scope 'lga', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all LGAs into map for O(1) in-memory lookups
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch LGAs: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// Build election parameters for each LGA (skipping non-existent LGAs)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(lgaIDs))
	for _, lgaID := range lgaIDs {
		lgaRow, found := lgaMap[lgaID]
		if !found {
			// Skip LGA IDs that do not exist
			continue
		}

		stateID := utils.PgInt2FromPositive(lgaRow.StateID)
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4
		if lgaRow.SenatorialDistrictID.Valid && lgaRow.SenatorialDistrictID.Int32 > 0 {
			senatorialDistrictID = lgaRow.SenatorialDistrictID
		}
		if lgaRow.FederalConstituencyID.Valid && lgaRow.FederalConstituencyID.Int32 > 0 {
			federalConstituencyID = lgaRow.FederalConstituencyID
		}

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, lgaRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                  name,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       electionGroupID,
			OfficeID:              officeID,
			Scope:                 "lga",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 pgtype.Int4{Int32: lgaID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

type CreateWardElectionParams struct {
	OfficeID        int16
	ElectionDate    time.Time
	ElectionGroupID int32
	AllWards        bool
	WardIDs         []int32
}

// CreateWardElection sets up elections across one or more Wards (e.g., Councillorship).
func (s *ElectionsService) CreateWardElection(ctx context.Context, params CreateWardElectionParams) (int, error) {
	// Early return if not all wards and no wards provided
	if !params.AllWards && len(params.WardIDs) == 0 {
		return 0, nil
	}

	wardIDs := params.WardIDs
	if !params.AllWards {
		// In-memory deduplication of ward IDs
		wardIDs = deDupeSlice(wardIDs)
	}

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, params.OfficeID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return 0, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "ward" {
		return 0, fmt.Errorf("office %s is not a ward office (expected scope 'ward', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, params.ElectionGroupID); err != nil {
		return 0, err
	}

	// Resolve target wards: fetch all nationwide wards if requested, or only the selected wards
	var targetWards []queries.Ward
	if params.AllWards {
		// Fetch all nationwide wards when AllWards preset is active
		var err error
		targetWards, err = txQueries.GetWards(ctx, queries.GetWardsParams{
			LgaID:   0,
			StateID: 0,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to fetch all wards: %w", err)
		}
	} else {
		// Query only the specifically selected wards by IDs to avoid dumping all nationwide records
		var err error
		targetWards, err = txQueries.GetWardsByIDs(ctx, wardIDs)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch selected wards: %w", err)
		}
	}

	// Build election parameters for each Ward directly using its stored ancestral IDs (State, LGA, Senatorial, Constituency)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(targetWards))
	for _, wardRow := range targetWards {
		name := fmt.Sprintf("%d %s Election (%s)", params.ElectionDate.Year(), officeElection, wardRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                  name,
			ElectionDate:          pgtype.Date{Time: params.ElectionDate, Valid: true},
			ElectionGroupID:       params.ElectionGroupID,
			OfficeID:              params.OfficeID,
			Scope:                 "ward",
			StateID:               utils.PgInt2FromPositive(wardRow.StateID),
			SenatorialDistrictID:  wardRow.SenatorialDistrictID,
			FederalConstituencyID: wardRow.FederalConstituencyID,
			LgaID:                 utils.PgInt4FromPositive(wardRow.LgaID),
			StateConstituencyID:   wardRow.StateConstituencyID,
			WardID:                pgtype.Int4{Int32: wardRow.ID, Valid: true},
		})
	}

	count, err := s.batchCreateElections(ctx, tx, paramsList)
	if err != nil {
		return 0, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// GetElectionByID fetches an election instance by its unique identifier.
// Raw election record is cached for RedisOneEightyDaysTTL; derived status is evaluated dynamically on each read.
func (s *ElectionsService) GetElectionByID(ctx context.Context, id int32) (queries.ElectionDetails, error) {
	now := time.Now()
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionByID, id)

	// 1. Attempt to fetch pre-cached election from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var el queries.Election
		if err := json.Unmarshal([]byte(val), &el); err == nil {
			return electionDetails(el, now), nil
		}
	}

	// 2. Cache miss: fetch election instance directly from the database
	el, err := s.queries.GetElectionInstanceByID(ctx, id)
	if err != nil {
		return queries.ElectionDetails{}, err
	}

	// 3. Serialize and populate Redis cache
	if elBytes, err := json.Marshal(el); err == nil {
		s.rdb.Set(ctx, cacheKey, elBytes, db.RedisOneEightyDaysTTL)
	}

	return electionDetails(el, now), nil
}

func electionDetails(election queries.Election, now time.Time) queries.ElectionDetails {
	return queries.ElectionDetails{
		Election:        election,
		Status:          utils.ElectionStatusForDate(election.ElectionDate.Time, now),
		NominationsOpen: utils.IsElectionNominationOpen(election.ElectionDate.Time, now),
	}
}

// GetElectionGroupByID retrieves an election group record by its unique identifier, utilizing Redis caching.
func (s *ElectionsService) GetElectionGroupByID(ctx context.Context, id int32) (queries.ElectionGroup, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionGroupByID, id)

	// 1. Attempt to fetch pre-cached election group from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var eg queries.ElectionGroup
		if err := json.Unmarshal([]byte(val), &eg); err == nil {
			return eg, nil
		}
	}

	// 2. Cache miss: fetch election group directly from the database
	eg, err := s.queries.GetElectionGroupByID(ctx, id)
	if err != nil {
		return eg, err
	}

	// 3. Serialize and populate Redis cache
	if egBytes, err := json.Marshal(eg); err == nil {
		s.rdb.Set(ctx, cacheKey, egBytes, db.RedisNinetyDaysTTL)
	}

	return eg, nil
}

// ListElectionsFilter defines the filtering and pagination criteria for listing elections.
type ListElectionsFilter struct {
	Limit            int32
	Cursor           int64
	Search           string
	ElectionGroupIDs []int32
	Scopes           []string
	Statuses         []string
	StateIDs         []int16
	OfficeIDs        []int16
	DateFrom         string
	DateTo           string
}

// ListElections returns paginated election instances in the system using keyset cursor pagination and optional multi-criteria filters.
// Each row includes joined office and election group metadata.
func (s *ElectionsService) ListElections(ctx context.Context, filter ListElectionsFilter) ([]queries.ElectionListItem, error) {
	now := time.Now()
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var cursorElectionDate pgtype.Date
	var cursorID int32

	// If cursor is provided, fetch its election_date and id to seek the next page
	if filter.Cursor > 0 {
		cursorEl, err := s.queries.GetElectionInstanceByID(ctx, int32(filter.Cursor))
		if err == nil {
			cursorElectionDate = cursorEl.ElectionDate
			cursorID = cursorEl.ID
		}
	}

	search := utils.PgTextFromString(strings.TrimSpace(filter.Search))
	dateFrom := utils.PgDateFromString(filter.DateFrom)
	dateTo := utils.PgDateFromString(filter.DateTo)

	// Fetch limit + 1 to determine if there are more records
	params := queries.ListElectionInstancesParams{
		CursorElectionDate: cursorElectionDate,
		CursorID:           cursorID,
		Search:             search,
		ElectionGroupIds:   filter.ElectionGroupIDs,
		Scopes:             filter.Scopes,
		Statuses:           filter.Statuses,
		Today:              pgtype.Date{Time: utils.LagosDate(now), Valid: true},
		StateIds:           filter.StateIDs,
		OfficeIds:          filter.OfficeIDs,
		DateFrom:           dateFrom,
		DateTo:             dateTo,
		LimitCount:         limit + 1,
	}

	rows, err := s.queries.ListElectionInstances(ctx, params)
	if err != nil {
		return nil, err
	}
	items := make([]queries.ElectionListItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, queries.ElectionListItem{
			ListElectionInstancesRow: row,
			Status:                   utils.ElectionStatusForDate(row.ElectionDate.Time, now),
			NominationsOpen:          utils.IsElectionNominationOpen(row.ElectionDate.Time, now),
		})
	}
	return items, nil
}

// UpdateElectionParams encapsulates the attributes that can be modified on an existing election.
type UpdateElectionParams struct {
	ID              int32
	Name            string
	ElectionDate    time.Time
	ElectionGroupID int32
}

// UpdateElection modifies an existing election instance's name, date, and election group,
// and invalidates the related Redis cache keys upon success.
func (s *ElectionsService) UpdateElection(ctx context.Context, params UpdateElectionParams) (queries.ElectionDetails, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.ElectionDetails{}, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)
	// 1. Validate that the target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, qtx, params.ElectionGroupID); err != nil {
		return queries.ElectionDetails{}, err
	}
	affected, err := qtx.ListElectionCandidacyUsers(ctx, []int32{params.ID})
	if err != nil {
		return queries.ElectionDetails{}, fmt.Errorf("failed to load affected candidates: %w", err)
	}

	// 2. Update election instance in database
	el, err := qtx.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
		ID:              params.ID,
		Name:            params.Name,
		ElectionDate:    pgtype.Date{Time: params.ElectionDate, Valid: true},
		ElectionGroupID: params.ElectionGroupID,
	})
	if err != nil {
		return queries.ElectionDetails{}, err
	}
	// Keep the denormalized candidate group in the same transaction. Otherwise
	// refreshing a candidacy after moving an election would return its old group.
	if err := qtx.BulkUpdateElectionCandidatesGroup(ctx, queries.BulkUpdateElectionCandidatesGroupParams{
		ElectionGroupID: params.ElectionGroupID, ElectionIds: []int32{params.ID},
	}); err != nil {
		return queries.ElectionDetails{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return queries.ElectionDetails{}, err
	}

	// 3. Invalidate Redis caches on successful update
	s.invalidateCache(ctx, params.ID)
	s.invalidateCandidacyUsers(ctx, affected, false)
	return electionDetails(el, time.Now()), nil
}

// DeleteElection removes an election instance and invalidates the cache.
// It prevents deletion if candidates are already registered for the election.
func (s *ElectionsService) DeleteElection(ctx context.Context, id int32) error {
	// Guard: Do not allow deletion if the election already has candidates registered
	candidateCount, err := s.queries.GetElectionCandidatesCount(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to verify election candidates: %w", err)
	}
	if candidateCount > 0 {
		return fmt.Errorf("cannot delete election: %d candidate(s) are already registered for this election", candidateCount)
	}

	// Ensure Redis cache invalidation occurs when the operation completes
	defer s.invalidateCache(ctx, id)

	return s.queries.DeleteElectionInstance(ctx, id)
}

// BulkUpdateElectionGroupParams encapsulates parameters for bulk reassigning elections to a new election group.
type BulkUpdateElectionGroupParams struct {
	ElectionIDs         []int32
	ElectionGroupID     int32
	FromElectionGroupID *int32
}

// BulkUpdateElectionGroup reassigns multiple election instances to a new election group within a transaction.
// It verifies:
// 1. Target election group exists and is active.
// 2. All target election IDs exist.
// 3. None of the elections are already in the target group.
// 4. None of the elections are in 'ongoing' or 'ended' status.
// 5. If FromElectionGroupID is provided, all elections must belong to that group.
func (s *ElectionsService) BulkUpdateElectionGroup(ctx context.Context, params BulkUpdateElectionGroupParams) error {
	if len(params.ElectionIDs) == 0 {
		return nil
	}

	// In-memory deduplication of election IDs
	// remove duplicate ids
	electionIDs := deDupeSlice(params.ElectionIDs)

	// Validate target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, s.queries, params.ElectionGroupID); err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch existing elections to perform validation checks
	existing, err := txQueries.GetElectionsByIDs(ctx, electionIDs)
	if err != nil {
		return fmt.Errorf("failed to fetch elections: %w", err)
	}
	if len(existing) != len(electionIDs) {
		return fmt.Errorf("found %d of %d requested elections: one or more election IDs are invalid", len(existing), len(electionIDs))
	}

	for _, el := range existing {
		// Guard: Cannot move ongoing or ended elections
		status := utils.ElectionStatusForDate(el.ElectionDate.Time, time.Now())
		if status == "ongoing" || status == "ended" {
			return fmt.Errorf("cannot reassign election %q: status is '%s'", el.Name, status)
		}
		// Guard: Already assigned to the target election group
		if el.ElectionGroupID == params.ElectionGroupID {
			return fmt.Errorf("election %q is already assigned to target election group", el.Name)
		}
		// Guard: Source election group mismatch
		if params.FromElectionGroupID != nil && *params.FromElectionGroupID > 0 && el.ElectionGroupID != *params.FromElectionGroupID {
			return fmt.Errorf("election %q belongs to election group %d, expected %d", el.Name, el.ElectionGroupID, *params.FromElectionGroupID)
		}
	}

	// Reassign elections to the target election group
	affected, err := txQueries.ListElectionCandidacyUsers(ctx, electionIDs)
	if err != nil {
		return fmt.Errorf("failed to load affected candidates: %w", err)
	}
	if err := txQueries.BulkUpdateElectionGroup(ctx, queries.BulkUpdateElectionGroupParams{
		ElectionGroupID: params.ElectionGroupID,
		ElectionIds:     electionIDs,
	}); err != nil {
		return fmt.Errorf("failed to bulk update elections: %w", err)
	}

	// Reassign any candidates on these elections to the target election group
	if err := txQueries.BulkUpdateElectionCandidatesGroup(ctx, queries.BulkUpdateElectionCandidatesGroupParams{
		ElectionGroupID: params.ElectionGroupID,
		ElectionIds:     electionIDs,
	}); err != nil {
		return fmt.Errorf("failed to bulk update election candidates group: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateBulkCache(ctx, electionIDs)
	s.invalidateCandidacyUsers(ctx, affected, false)
	return nil
}

// BulkDeleteElectionsParams encapsulates parameters for bulk deleting election instances.
type BulkDeleteElectionsParams struct {
	ElectionIDs     []int32
	ElectionGroupID *int32
}

// BulkDeleteElectionsResult encapsulates the result of bulk deletion, including affected election groups for audit logging.
type BulkDeleteElectionsResult struct {
	ElectionGroupIDs []int32
}

// BulkDeleteElections deletes multiple election instances.
// It verifies:
// 1. All target election IDs exist.
// 2. None of the elections are in 'ongoing' or 'ended' status.
// 3. If ElectionGroupID is provided, all elections must belong to that group.
// 4. None of the elections have candidates registered.
func (s *ElectionsService) BulkDeleteElections(ctx context.Context, params BulkDeleteElectionsParams) (BulkDeleteElectionsResult, error) {
	result := BulkDeleteElectionsResult{}
	if len(params.ElectionIDs) == 0 {
		return result, nil
	}

	// In-memory deduplication of election IDs
	electionIDs := deDupeSlice(params.ElectionIDs)

	// Fetch existing elections to perform validation checks
	existing, err := s.queries.GetElectionsByIDs(ctx, electionIDs)
	if err != nil {
		return result, fmt.Errorf("failed to fetch elections: %w", err)
	}
	if len(existing) != len(electionIDs) {
		return result, fmt.Errorf("found %d of %d requested elections: one or more election IDs are invalid", len(existing), len(electionIDs))
	}

	groupIDsMap := make(map[int32]struct{})
	for _, el := range existing {
		// Guard: Cannot delete ongoing or ended elections
		status := utils.ElectionStatusForDate(el.ElectionDate.Time, time.Now())
		if status == "ongoing" || status == "ended" {
			return result, fmt.Errorf("cannot delete election %q: status is '%s'", el.Name, status)
		}
		// Guard: Source election group mismatch
		if params.ElectionGroupID != nil && *params.ElectionGroupID > 0 && el.ElectionGroupID != *params.ElectionGroupID {
			return result, fmt.Errorf("election %q belongs to election group %d, expected %d", el.Name, el.ElectionGroupID, *params.ElectionGroupID)
		}
		groupIDsMap[el.ElectionGroupID] = struct{}{}
	}

	result.ElectionGroupIDs = make([]int32, 0, len(groupIDsMap))
	for gid := range groupIDsMap {
		result.ElectionGroupIDs = append(result.ElectionGroupIDs, gid)
	}

	// Guard: Do not allow deletion if any of the elections have candidates registered
	candidateCounts, err := s.queries.GetCandidateCountsForElections(ctx, electionIDs)
	if err != nil {
		return result, fmt.Errorf("failed to verify candidate counts for elections: %w", err)
	}
	if len(candidateCounts) > 0 {
		return result, fmt.Errorf("cannot delete elections: %d election(s) already have registered candidates", len(candidateCounts))
	}

	if err := s.queries.BulkDeleteElectionInstances(ctx, electionIDs); err != nil {
		return result, fmt.Errorf("failed to bulk delete elections: %w", err)
	}

	s.invalidateBulkCache(ctx, electionIDs)
	return result, nil
}

// GetElectionCandidates retrieves all candidate records associated with an election,
// including candidate user details, party affiliation, and ballot data.
func (s *ElectionsService) GetElectionCandidates(ctx context.Context, electionID int32) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error) {
	return s.queries.ListElectionCandidatesDetailedByElectionID(ctx, electionID)
}

// CheckIfUserEverContested checks if a user has ever contested an election as a candidate or running mate.
func (s *ElectionsService) CheckIfUserEverContested(ctx context.Context, userID int64) (bool, error) {
	return s.queries.CheckIfUserEverContested(ctx, userID)
}

// FieldPartyCandidate assigns or updates a political party's candidate or running mate for an election.
// slot is "candidate" or "running_mate". Requires newCandidateID > 0.
func (s *ElectionsService) FieldPartyCandidate(ctx context.Context, electionID int32, partyID int16, newCandidateID int64, slot string) error {
	if newCandidateID <= 0 {
		return fmt.Errorf("candidate ID must be greater than zero")
	}

	targetSlot := "candidate"
	if slot == "running_mate" {
		targetSlot = "running_mate"
	}

	// Retrieve any existing ballot ticket for this party in the election
	existingTicket, err := s.queries.GetElectionCandidateForParty(ctx, queries.GetElectionCandidateForPartyParams{
		ElectionID: electionID,
		PartyID:    partyID,
	})
	ticketExists := err == nil

	type candidateAction struct {
		userID int64
		slot   string
	}
	var nominated []candidateAction
	var withdrawn []candidateAction

	if targetSlot == "running_mate" {
		if !ticketExists {
			return fmt.Errorf("cannot assign running mate: ticket has no principal candidate yet")
		}

		currentRunningMateID := utils.PgInt8OrDefault(existingTicket.RunningMateID, 0)

		// If already the active running mate, no changes needed
		if currentRunningMateID == newCandidateID {
			return nil
		}

		// Ensure running mate is not the same user as the principal candidate
		if existingTicket.CandidateID == newCandidateID {
			return fmt.Errorf("running mate cannot be the same person as the principal candidate")
		}

		// Update running mate assignment on the party's ticket
		_, err = s.queries.UpdateElectionCandidateRunningMate(ctx, queries.UpdateElectionCandidateRunningMateParams{
			RunningMateID: pgtype.Int8{Int64: newCandidateID, Valid: true},
			ElectionID:    electionID,
			PartyID:       partyID,
		})
		if err != nil {
			return fmt.Errorf("failed to update running mate: %w", err)
		}

		// Queue replaced running mate for withdrawal if one was previously assigned
		if currentRunningMateID > 0 {
			withdrawn = append(withdrawn, candidateAction{userID: currentRunningMateID, slot: "running_mate"})
		}

		// Queue new running mate for nomination notification and verification
		nominated = append(nominated, candidateAction{userID: newCandidateID, slot: "running_mate"})
	} else {
		if ticketExists {
			currentCandidateID := existingTicket.CandidateID
			currentRunningMateID := utils.PgInt8OrDefault(existingTicket.RunningMateID, 0)

			// If already the active principal candidate, no changes needed
			if currentCandidateID == newCandidateID {
				return nil
			}

			// Prevent principal candidate from colliding with current running mate
			if currentRunningMateID == newCandidateID {
				return fmt.Errorf("principal candidate cannot be the same person as the running mate")
			}

			// Update principal candidate on existing ticket
			_, err = s.queries.UpdateElectionCandidatePrincipal(ctx, queries.UpdateElectionCandidatePrincipalParams{
				CandidateID: newCandidateID,
				ElectionID:  electionID,
				PartyID:     partyID,
			})
			if err != nil {
				return fmt.Errorf("failed to update principal candidate: %w", err)
			}

			// Queue previous principal candidate for withdrawal processing
			if currentCandidateID > 0 {
				withdrawn = append(withdrawn, candidateAction{userID: currentCandidateID, slot: "candidate"})
			}

			// Queue new principal candidate for nomination notification and verification
			nominated = append(nominated, candidateAction{userID: newCandidateID, slot: "candidate"})
		} else {
			// Create a brand new election ticket for this party
			election, err := s.queries.GetElectionInstanceByID(ctx, electionID)
			if err != nil {
				return fmt.Errorf("failed to retrieve election for fielding candidate: %w", err)
			}

			// Insert new ballot ticket record with the fielded principal candidate
			_, err = s.queries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
				ElectionID:      electionID,
				ElectionGroupID: election.ElectionGroupID,
				CandidateID:     newCandidateID,
				PartyID:         partyID,
			})
			if err != nil {
				return err
			}

			// Queue newly created principal candidate for nomination processing
			nominated = append(nominated, candidateAction{userID: newCandidateID, slot: "candidate"})
		}
	}

	// Notify newly nominated candidates, grant verification badges, and refresh active candidacies cache
	for _, c := range nominated {
		s.notificationsService.NotifyCandidateNominated(ctx, notifications.NotifyCandidateNominatedParams{
			PartyID:      partyID,
			ElectionID:   electionID,
			TargetUserID: c.userID,
			Slot:         c.slot,
		})

		// Grant politician verification badge to candidate if not already held
		if err := s.pageVerificationsService.EnsurePoliticianVerification(ctx, c.userID); err != nil {
			slog.Warn("failed to ensure politician verification for candidate", "userID", c.userID, "error", err)
		}

		// Invalidate cached active candidacies for the newly nominated candidate
		s.InvalidateUserActiveCandidacies(ctx, c.userID)
	}

	// Notify superseded/replaced candidates, revoke politician badges if no other races remain, and refresh cache
	for _, c := range withdrawn {
		s.notificationsService.NotifyCandidateWithdrawn(ctx, notifications.NotifyCandidateWithdrawnParams{
			PartyID:      partyID,
			ElectionID:   electionID,
			TargetUserID: c.userID,
			Slot:         c.slot,
		})

		// Revoke politician badge if the user is no longer actively contesting any elections
		if err := s.pageVerificationsService.RevokePoliticianVerificationIfNoCandidacy(ctx, c.userID); err != nil {
			slog.Warn("failed to revoke politician verification for candidate", "userID", c.userID, "error", err)
		}

		// Invalidate cached active candidacies for the withdrawn candidate
		s.InvalidateUserActiveCandidacies(ctx, c.userID)
	}

	return nil
}

// UnfieldPartyCandidate removes an assigned candidate or running mate from an election.
// If slot is "running_mate", only the running mate is removed from the ticket.
// If slot is "candidate" (or empty), the entire party ticket is removed.
func (s *ElectionsService) UnfieldPartyCandidate(ctx context.Context, electionID int32, partyID int16, slot string) error {
	existingTicket, err := s.queries.GetElectionCandidateForParty(ctx, queries.GetElectionCandidateForPartyParams{
		ElectionID: electionID,
		PartyID:    partyID,
	})
	if err != nil {
		// Nothing to unfield
		return nil
	}

	type candidateAction struct {
		userID int64
		slot   string
	}
	var withdrawn []candidateAction

	if slot == "running_mate" {
		currentRunningMateID := utils.PgInt8OrDefault(existingTicket.RunningMateID, 0)
		if currentRunningMateID <= 0 {
			// No running mate currently assigned to remove
			return nil
		}

		// Clear running mate slot on existing candidate ticket
		_, err = s.queries.UpdateElectionCandidateRunningMate(ctx, queries.UpdateElectionCandidateRunningMateParams{
			RunningMateID: pgtype.Int8{Valid: false},
			ElectionID:    electionID,
			PartyID:       partyID,
		})
		if err != nil {
			return fmt.Errorf("failed to remove running mate: %w", err)
		}

		withdrawn = append(withdrawn, candidateAction{userID: currentRunningMateID, slot: "running_mate"})
	} else {
		if existingTicket.CandidateID <= 0 {
			// No candidate currently assigned to unfield
			return nil
		}

		// Unfielding main candidate removes the entire party ticket from this election
		err = s.queries.DeleteElectionCandidateForParty(ctx, queries.DeleteElectionCandidateForPartyParams{
			ElectionID: electionID,
			PartyID:    partyID,
		})
		if err != nil {
			return err
		}

		// Queue candidate and running mate (if present) for withdrawal processing
		withdrawn = append(withdrawn, candidateAction{userID: existingTicket.CandidateID, slot: "candidate"})
		currentRunningMateID := utils.PgInt8OrDefault(existingTicket.RunningMateID, 0)
		if currentRunningMateID > 0 {
			withdrawn = append(withdrawn, candidateAction{userID: currentRunningMateID, slot: "running_mate"})
		}
	}

	// Dispatch withdrawal notifications, revoke politician verification if no candidacies remain, and invalidate active candidacies cache
	for _, c := range withdrawn {
		s.notificationsService.NotifyCandidateWithdrawn(ctx, notifications.NotifyCandidateWithdrawnParams{
			PartyID:      partyID,
			ElectionID:   electionID,
			TargetUserID: c.userID,
			Slot:         c.slot,
		})
		if err := s.pageVerificationsService.RevokePoliticianVerificationIfNoCandidacy(ctx, c.userID); err != nil {
			slog.Warn("failed to revoke politician verification for candidate", "userID", c.userID, "error", err)
		}
		s.InvalidateUserActiveCandidacies(ctx, c.userID)
	}

	return nil
}

type VoteInput struct {
	ElectionID int32 `json:"election_id"`
	PartyID    int16 `json:"party_id"`
}

// ElectionWithCandidates embeds a base Election and attaches its registered candidates.
type ElectionWithCandidates struct {
	queries.ElectionDetails
	Candidates []queries.ListElectionCandidatesDetailedByElectionIDRow `json:"candidates"`
}

// GetEligibleElectionsForPollingUnit finds all elections within an election group that are valid
// for a specific polling unit (matching nationwide, state, district, constituency, LGA, or ward scopes)
// and hydrates each election with its list of registered candidates.
func (s *ElectionsService) GetEligibleElectionsForPollingUnit(ctx context.Context, electionGroupID int32, pollingUnitID int32) ([]ElectionWithCandidates, error) {
	// 1. Fetch elections matching the polling unit's geographic hierarchy
	elections, err := s.queries.GetEligibleElectionsForPollingUnit(ctx, queries.GetEligibleElectionsForPollingUnitParams{
		ElectionGroupID: electionGroupID,
		ID:              int32(pollingUnitID),
	})
	if err != nil {
		return nil, err
	}

	// 2. Hydrate each election with its registered candidates
	result := make([]ElectionWithCandidates, 0, len(elections))
	for _, election := range elections {
		candidates, err := s.queries.ListElectionCandidatesDetailedByElectionID(ctx, election.ID)
		if err != nil || candidates == nil {
			candidates = []queries.ListElectionCandidatesDetailedByElectionIDRow{}
		}
		result = append(result, ElectionWithCandidates{
			ElectionDetails: electionDetails(election, time.Now()),
			Candidates:      candidates,
		})
	}

	return result, nil
}

// SubmitElectionVotes records user votes across one or more elections in an election group at a specific polling unit.
// Within a database transaction, it:
//  1. Validates that voting has not ended (not past election day).
//  2. Resolves geographic hierarchy for the polling unit (State, LGA, Senatorial District, Federal Constituency).
//  3. Clears prior votes and did-not-vote reasons for this user and group (allowing edits / ballot updates).
//  4. Inserts vote records for each election in the ballot.
//  5. Updates user's PVC (Voter's Card) image if provided.
//  6. Enqueues background debounced tasks for real-time live results aggregation.
//  7. Evaluates referral bonuses: if the voter was referred by an assigned agent within the last 6 months,
//     increments the agent's live-voter referral tally and triggers async commission processing.
func (s *ElectionsService) SubmitElectionVotes(
	ctx context.Context,
	userID int64,
	electionGroupID int32,
	pollingUnitID int32,
	votes []VoteInput,
	votersCardImage string,
) error {
	// 1. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// 2. Fetch election group, ensure active, and validate election date (voting closes after election day)
	eg, err := s.validateElectionGroup(ctx, qtx, electionGroupID)
	if err != nil {
		return fmt.Errorf("invalid election group: %w", err)
	}

	now := time.Now()
	if int(eg.Year) < now.Year() {
		return fmt.Errorf("voting for this election cycle has ended")
	}

	// 3. Fetch polling unit and parent LGA to resolve geographic hierarchy (State, LGA, Senatorial District, Federal Constituency)
	pu, err := qtx.GetPollingUnitByID(ctx, int32(pollingUnitID))
	if err != nil {
		return fmt.Errorf("invalid polling unit: %w", err)
	}

	lga, err := qtx.GetLGAByID(ctx, pu.LgaID)
	if err != nil {
		return fmt.Errorf("invalid LGA: %w", err)
	}

	// 4. Delete existing votes and non-voting reasons for this user and group to allow edits and ballot revisions
	err = qtx.DeleteUserVotesByElectionGroup(ctx, queries.DeleteUserVotesByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete existing votes: %w", err)
	}
	err = qtx.DeleteUserDidNotVoteReasonByElectionGroup(ctx, queries.DeleteUserDidNotVoteReasonByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete existing non-voting reason: %w", err)
	}

	// 5. Insert votes for each election in the ballot
	for _, v := range votes {
		_, err = qtx.CreateElectionVote(ctx, queries.CreateElectionVoteParams{
			StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
			SenatorialDistrictID:  lga.SenatorialDistrictID,
			FederalConstituencyID: lga.FederalConstituencyID,
			LgaID:                 pgtype.Int4{Int32: pu.LgaID, Valid: true},
			WardID:                pgtype.Int4{Int32: pu.WardID, Valid: true},
			PollingUnitID:         pgtype.Int4{Int32: int32(pollingUnitID), Valid: true},
			UserID:                userID,
			ElectionGroupID:       electionGroupID,
			ElectionID:            v.ElectionID,
			PartyID:               int16(v.PartyID),
		})
		if err != nil {
			return fmt.Errorf("failed to submit vote for election %d: %w", v.ElectionID, err)
		}
	}

	// 6. Update user's PVC details with uploaded verification image
	err = qtx.UpdateUserVotersCard(ctx, queries.UpdateUserVotersCardParams{
		ID:              userID,
		VotersCardImage: pgtype.Text{String: votersCardImage, Valid: votersCardImage != ""},
	})
	if err != nil {
		return fmt.Errorf("failed to update PVC details: %w", err)
	}

	// 7. Fetch ward to resolve state_constituency_id for live vote aggregation
	ward, err := qtx.GetWardByID(ctx, pu.WardID)
	if err != nil {
		return fmt.Errorf("invalid ward: %w", err)
	}

	// 8. Enqueue background debounced task to refresh live vote counts across all administrative levels
	for _, v := range votes {
		err = s.taskDistributor.DistributeTaskAggregateLiveVotes(ctx, &worker.AggregateLiveVotesPayload{
			Params: queries.RefreshPollingUnitLiveResultsParams{
				ElectionID:            v.ElectionID,
				PollingUnitID:         int32(pollingUnitID),
				ElectionGroupID:       electionGroupID,
				StateID:               pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
				SenatorialDistrictID:  lga.SenatorialDistrictID,
				FederalConstituencyID: lga.FederalConstituencyID,
				StateConstituencyID:   ward.StateConstituencyID,
				LgaID:                 pgtype.Int4{Int32: pu.LgaID, Valid: true},
				WardID:                pgtype.Int4{Int32: pu.WardID, Valid: true},
			},
		})
		if err != nil {
			return fmt.Errorf("failed to enqueue live results refresh for election %d: %w", v.ElectionID, err)
		}
	}

	// 9. Check for live voter referral bonus
	// Conditions:
	//  1. Voter was referred by an agent (referral record exists)
	//  2. Voter registered their account within the last 6 months
	//  3. Referrer has an active assignment for the exact same election group
	//  4. Referrer has not reached the target_live_voters_referred_count threshold (default 20)
	voterUser, uErr := qtx.GetUserByID(ctx, userID)
	referrerID, refErr := qtx.GetUserReferredByID(ctx, userID)
	if uErr == nil && refErr == nil && referrerID > 0 {
		sixMonthsAgo := time.Now().AddDate(0, -6, 0)
		if voterUser.CreatedAt.Valid && voterUser.CreatedAt.Time.After(sixMonthsAgo) {
			// Find referrer's assignment for this election group
			refAssignments, asgnErr := qtx.ListAssignments(ctx, queries.ListAssignmentsParams{
				ElectionGroupID: electionGroupID,
				PartyID:         0,
				PollingUnitID:   0,
				UserID:          referrerID,
				Limit:           1,
				Offset:          0,
			})

			if asgnErr == nil && len(refAssignments) > 0 {
				refAsgn := refAssignments[0]

				// Fetch target_live_voters_referred_count system setting (default 20)
				var targetLiveVoters float64 = 20
				if lvrSetting, settingErr := qtx.GetSystemSetting(ctx, "target_live_voters_referred_count"); settingErr == nil {
					_ = json.Unmarshal(lvrSetting.Value, &targetLiveVoters)
				}
				if targetLiveVoters <= 0 {
					targetLiveVoters = 20
				}

				// Only increment and credit if target threshold has not been reached yet
				if float64(refAsgn.LiveVotersReferredCount) < targetLiveVoters {
					updatedRefAsgn, incErr := qtx.IncrementAssignmentLiveVotersReferredCount(ctx, refAsgn.ID)
					if incErr == nil && s.earningsService != nil {
						// Process earnings asynchronously post-commit
						defer func(asgnID int64) {
							go s.earningsService.ProcessTaskEarnings(context.Background(), asgnID, "live_voters_referred", "Referred User: Voted")
						}(updatedRefAsgn.ID)
					}
				}
			}
		}
	}

	// 10. Commit transaction
	return tx.Commit(ctx)
}

type UserVoteStatus struct {
	Status                string                                   `json:"status"` // "voted", "did_not_vote", "none"
	Votes                 []queries.GetUserVotesByElectionGroupRow `json:"votes,omitempty"`
	DidNotVoteReason      *string                                  `json:"did_not_vote_reason,omitempty"`
	DidNotVoteExplanation *string                                  `json:"did_not_vote_explanation,omitempty"`
}

// GetUserElectionGroupVoteStatus checks whether a user has cast votes, submitted a non-voting reason,
// or taken no action for a specific election group.
func (s *ElectionsService) GetUserElectionGroupVoteStatus(ctx context.Context, userID int64, electionGroupID int32) (UserVoteStatus, error) {
	// 1. Check if the user has cast votes for this election group
	votes, err := s.queries.GetUserVotesByElectionGroup(ctx, queries.GetUserVotesByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		return UserVoteStatus{}, fmt.Errorf("failed to check user votes: %w", err)
	}

	if len(votes) > 0 {
		return UserVoteStatus{
			Status: "voted",
			Votes:  votes,
		}, nil
	}

	// 2. If no votes, check if the user provided an explanation/reason for not voting
	reason, err := s.queries.GetUserDidNotVoteReason(ctx, queries.GetUserDidNotVoteReasonParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})

	if err == nil {
		var explanation string
		if reason.Explanation.Valid {
			explanation = reason.Explanation.String
		}
		var predefinedReason string
		if reason.PredefinedReason.Valid {
			predefinedReason = reason.PredefinedReason.String
		}

		return UserVoteStatus{
			Status:                "did_not_vote",
			DidNotVoteReason:      &predefinedReason,
			DidNotVoteExplanation: &explanation,
		}, nil
	}

	// 3. Neither votes nor non-voting reasons found
	return UserVoteStatus{
		Status: "none",
	}, nil
}

// GetUserActiveCandidacies lists active contested candidacies a user is running in (principal or running mate).
// Results are cached in Redis to minimize database lookups.
func (s *ElectionsService) GetUserActiveCandidacies(ctx context.Context, candidateID int64) ([]queries.UserActiveCandidacy, error) {
	now := time.Now()
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, candidateID)

	// 1. Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []queries.UserActiveCandidacy
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	rows, err := s.queries.GetUserActiveCandidacies(ctx, candidateID)
	if err != nil {
		return nil, err
	}

	candidacies := make([]queries.UserActiveCandidacy, 0, len(rows))
	for _, row := range rows {
		candidacies = append(candidacies, queries.UserActiveCandidacy{
			GetUserActiveCandidaciesRow: row,
			ElectionStatus:              utils.ElectionStatusForDate(row.ElectionDate.Time, now),
		})
	}

	// Cache candidacies with 30-day TTL
	if jsonBytes, err := json.Marshal(candidacies); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisThirtyDaysTTL).Err()
	}

	return candidacies, nil
}

// InvalidateUserActiveCandidacies clears the cached active candidacies for a user.
func (s *ElectionsService) InvalidateUserActiveCandidacies(ctx context.Context, candidateID int64) {
	if candidateID == 0 {
		return
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, candidateID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// Include both the old and new roster, and running mates. Core profiles only
// need eviction when a mutation also changes the stored user party affiliation.
func (s *ElectionsService) invalidateCandidacyUsers(ctx context.Context, users []queries.ListElectionCandidacyUsersRow, includeProfile bool) {
	keys := make([]string, 0, len(users)*2)
	seen := make(map[int64]bool)

	for _, user := range users {
		// Deduplicate and skip empty user records
		if user.ID == 0 || seen[user.ID] {
			continue
		}
		seen[user.ID] = true

		// Invalidate user's active candidacies cache
		keys = append(keys, fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, user.ID))

		// Invalidate user profile cache if affiliation changed
		if includeProfile && user.FakeID.Valid {
			keys = append(keys, fmt.Sprintf("%s%d", db.RedisUserInfo, user.FakeID.Int64))
		}
	}

	// Purge collected keys from Redis in a single call
	if len(keys) > 0 {
		if err := s.rdb.Del(ctx, keys...).Err(); err != nil {
			slog.Error("failed to invalidate candidacy caches", "error", err)
		}
	}
}

package electionsservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
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

type ElectionsService struct {
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
	earningsService earningsService
	officeService   officesService
	bodiesService   bodiesService
}

// NewElectionsService initializes a new ElectionsService with its required database pool,
// query handlers, Redis client, task distributor, earnings service, offices service, and bodies service dependency.
func NewElectionsService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	taskDistributor worker.TaskDistributor,
	earningsService earningsService,
	officeService officesService,
	bodiesService bodiesService,
) *ElectionsService {
	return &ElectionsService{
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: taskDistributor,
		earningsService: earningsService,
		officeService:   officeService,
		bodiesService:   bodiesService,
	}
}

// invalidateCache purges the Redis cache for a specific election instance by ID.
func (s *ElectionsService) invalidateCache(ctx context.Context, electionID int32) {
	s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionByID, electionID))
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

// dedupeSlice returns a new slice with duplicate elements removed, preserving original order.
func dedupeSlice[T comparable](slice []T) []T {
	if len(slice) == 0 {
		return slice
	}
	seen := make(map[T]struct{}, len(slice))
	result := make([]T, 0, len(slice))
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

// CandidateInput holds candidate and party identification for election registration.
type CandidateInput struct {
	CandidateID    int64
	PartyID        int16
	PartyShortName string
}

// CreateNationwideElection sets up a country-wide election (e.g., Presidential).
func (s *ElectionsService) CreateNationwideElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32) (queries.Election, error) {
	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to fetch office: %w", err)
	}
	if !office.IsContested {
		return queries.Election{}, fmt.Errorf("office %s is not contestable in elections", office.Name)
	}
	if office.Scope != "nationwide" {
		return queries.Election{}, fmt.Errorf("office %s is not a nationwide office (expected scope 'nationwide', got '%s')", office.Name, office.Scope)
	}
	officeElection := utils.PgTextOrDefault(office.Election, office.Name)

	// Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Bind queries to active transaction
	txQueries := s.queries.WithTx(tx)

	// Verify target election group exists and is active
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return queries.Election{}, err
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
		return queries.Election{}, fmt.Errorf("failed to create election: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return queries.Election{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return election, nil
}

// CreateStateElection sets up multiple state-level elections (e.g., Governorship) under a shared election group.
func (s *ElectionsService) CreateStateElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, stateIDs []int16) (int, error) {
	// Early return if no states provided
	if len(stateIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of state IDs
	stateIDs = dedupeSlice(stateIDs)

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
	senatorialDistrictIDs = dedupeSlice(senatorialDistrictIDs)

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

		var stateID pgtype.Int2
		if districtRow.StateID > 0 {
			stateID = pgtype.Int2{Int16: int16(districtRow.StateID), Valid: true}
		}

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
	federalConstituencyIDs = dedupeSlice(federalConstituencyIDs)

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

		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4

		if cRow.StateID > 0 {
			stateID = pgtype.Int2{Int16: int16(cRow.StateID), Valid: true}
		}
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
	stateConstituencyIDs = dedupeSlice(stateConstituencyIDs)

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

		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4
		var lgaID pgtype.Int4

		if cRow.StateID > 0 {
			stateID = pgtype.Int2{Int16: int16(cRow.StateID), Valid: true}
		}
		if cRow.SenatorialDistrictID.Valid && cRow.SenatorialDistrictID.Int32 > 0 {
			senatorialDistrictID = cRow.SenatorialDistrictID
		}
		if cRow.FederalConstituencyID.Valid && cRow.FederalConstituencyID.Int32 > 0 {
			federalConstituencyID = cRow.FederalConstituencyID
		}
		if cRow.LgaID > 0 {
			lgaID = pgtype.Int4{Int32: cRow.LgaID, Valid: true}
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
	lgaIDs = dedupeSlice(lgaIDs)

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

		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4

		if lgaRow.StateID > 0 {
			stateID = pgtype.Int2{Int16: int16(lgaRow.StateID), Valid: true}
		}
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

// CreateWardElection sets up elections across one or more Wards (e.g., Councillorship).
func (s *ElectionsService) CreateWardElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID int32, wardIDs []int32) (int, error) {
	// Early return if no wards provided
	if len(wardIDs) == 0 {
		return 0, nil
	}

	// In-memory deduplication of ward IDs
	wardIDs = dedupeSlice(wardIDs)

	// Fetch and validate the target office definition
	office, err := s.officeService.GetOfficeByID(ctx, officeID)
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
	if _, err := s.validateElectionGroup(ctx, txQueries, electionGroupID); err != nil {
		return 0, err
	}

	// Pre-fetch all wards once to resolve parent IDs in memory
	wards, err := txQueries.GetWards(ctx, queries.GetWardsParams{
		LgaID:   0,
		StateID: 0,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch wards: %w", err)
	}
	wardMap := make(map[int32]queries.Ward, len(wards))
	for _, w := range wards {
		wardMap[w.ID] = w
	}

	// Pre-fetch LGAs to resolve senatorial district & federal constituency for wards via parent LGA
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch LGAs for ward parent resolution: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// Build election parameters for each Ward with full ancestral resolution (skipping non-existent wards)
	paramsList := make([]queries.CreateElectionInstanceParams, 0, len(wardIDs))
	for _, wardID := range wardIDs {
		wardRow, foundWard := wardMap[wardID]
		if !foundWard {
			// Skip ward IDs that do not exist
			continue
		}

		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4
		var stateConstituencyID pgtype.Int4
		var lgaID pgtype.Int4

		if wardRow.StateID > 0 {
			stateID = pgtype.Int2{Int16: int16(wardRow.StateID), Valid: true}
		}
		if wardRow.LgaID > 0 {
			lgaID = pgtype.Int4{Int32: wardRow.LgaID, Valid: true}
			if lgaRow, foundLga := lgaMap[wardRow.LgaID]; foundLga {
				if lgaRow.SenatorialDistrictID.Valid && lgaRow.SenatorialDistrictID.Int32 > 0 {
					senatorialDistrictID = lgaRow.SenatorialDistrictID
				}
				if lgaRow.FederalConstituencyID.Valid && lgaRow.FederalConstituencyID.Int32 > 0 {
					federalConstituencyID = lgaRow.FederalConstituencyID
				}
			}
		}
		if wardRow.StateConstituencyID.Valid {
			stateConstituencyID = wardRow.StateConstituencyID
		}

		name := fmt.Sprintf("%d %s Election (%s)", electionDate.Year(), officeElection, wardRow.Name)
		paramsList = append(paramsList, queries.CreateElectionInstanceParams{
			Name:                  name,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       electionGroupID,
			OfficeID:              officeID,
			Scope:                 "ward",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 lgaID,
			StateConstituencyID:   stateConstituencyID,
			WardID:                pgtype.Int4{Int32: wardID, Valid: true},
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
// It leverages Redis caching with a 24-hour TTL to minimize database queries for election metadata.
func (s *ElectionsService) GetElectionByID(ctx context.Context, id int32) (queries.Election, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionByID, id)

	// 1. Attempt to fetch pre-cached election from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var el queries.Election
		if err := json.Unmarshal([]byte(val), &el); err == nil {
			return el, nil
		}
	}

	// 2. Cache miss: fetch election instance directly from the database
	el, err := s.queries.GetElectionInstanceByID(ctx, id)
	if err != nil {
		return el, err
	}

	// 3. Serialize and populate Redis cache
	if elBytes, err := json.Marshal(el); err == nil {
		s.rdb.Set(ctx, cacheKey, elBytes, db.RedisNinetyDaysTTL)
	}

	return el, nil
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
func (s *ElectionsService) ListElections(ctx context.Context, filter ListElectionsFilter) ([]queries.ListElectionInstancesRow, error) {
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
		StateIds:           filter.StateIDs,
		OfficeIds:          filter.OfficeIDs,
		DateFrom:           dateFrom,
		DateTo:             dateTo,
		LimitCount:         limit + 1,
	}

	return s.queries.ListElectionInstances(ctx, params)
}

// UpdateElection modifies an existing election instance's name, date, and election group,
// and invalidates the related Redis cache keys upon success.
func (s *ElectionsService) UpdateElection(
	ctx context.Context,
	id int32,
	name string,
	electionDate time.Time,
	electionGroupID int32,
) (queries.Election, error) {
	// 1. Validate that the election group exists and is active
	if _, err := s.validateElectionGroup(ctx, s.queries, electionGroupID); err != nil {
		return queries.Election{}, err
	}

	// 2. Update election instance in database
	el, err := s.queries.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
		ID:              id,
		Name:            name,
		ElectionDate:    pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID: electionGroupID,
	})

	// 3. Invalidate Redis caches on successful update
	if err == nil {
		s.invalidateCache(ctx, id)
	}
	return el, err
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

// GetElectionCandidates retrieves all candidate records associated with an election,
// including candidate user details, party affiliation, and ballot data.
func (s *ElectionsService) GetElectionCandidates(ctx context.Context, electionID int32) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error) {
	return s.queries.ListElectionCandidatesDetailedByElectionID(ctx, electionID)
}

// SyncElectionCandidates completely synchronizes the roster of candidates for an election within a transaction.
// It removes all prior candidates, inserts the new candidate set, updates each candidate's party in users table,
// and updates the election's candidates_count.
func (s *ElectionsService) SyncElectionCandidates(ctx context.Context, electionID int32, candidates []CandidateInput) error {
	// 1. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// 2. Fetch the election to obtain its election_group_id
	election, err := txQueries.GetElectionInstanceByID(ctx, electionID)
	if err != nil {
		return fmt.Errorf("failed to retrieve election for candidate sync: %w", err)
	}

	// 3. Remove all existing candidates associated with this election
	err = txQueries.DeleteElectionCandidatesForElection(ctx, electionID)
	if err != nil {
		return err
	}

	// 4. Link new candidates to the election and synchronize their user party affiliation
	for _, cand := range candidates {
		_, err = txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:      electionID,
			ElectionGroupID: election.ElectionGroupID,
			CandidateID:     cand.CandidateID,
			PartyID:         int16(cand.PartyID),
			PartyShortName:  cand.PartyShortName,
		})
		if err != nil {
			return err
		}

		err = txQueries.UpdateUserParty(ctx, queries.UpdateUserPartyParams{
			ID:      cand.CandidateID,
			PartyID: pgtype.Int2{Int16: int16(cand.PartyID), Valid: int16(cand.PartyID) != 0},
		})
		if err != nil {
			return err
		}
	}

	// 5. Invalidate Redis caches and commit
	s.invalidateCache(ctx, electionID)
	return tx.Commit(ctx)
}

// FieldPartyCandidate assigns or replaces a political party's candidate for an election within a transaction.
// It removes any existing candidate for the party, inserts the new nominee if candidateID > 0,
// and updates the election's candidates_count.
func (s *ElectionsService) FieldPartyCandidate(ctx context.Context, electionID int32, partyID int16, candidateID int64) error {
	// 1. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// 2. Delete any existing candidate of this party on the election
	err = txQueries.DeleteElectionCandidateForParty(ctx, queries.DeleteElectionCandidateForPartyParams{
		ElectionID: electionID,
		PartyID:    pgtype.Int2{Int16: int16(partyID), Valid: true},
	})
	if err != nil {
		return err
	}

	// 3. If a valid candidateID is provided (> 0), insert the candidate record
	if candidateID > 0 {
		election, err := txQueries.GetElectionInstanceByID(ctx, electionID)
		if err != nil {
			return fmt.Errorf("failed to retrieve election for fielding candidate: %w", err)
		}

		party, err := txQueries.GetPartyByID(ctx, partyID)
		if err != nil {
			return fmt.Errorf("party not found: %w", err)
		}

		_, err = txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:      electionID,
			ElectionGroupID: election.ElectionGroupID,
			CandidateID:     candidateID,
			PartyID:         partyID,
			PartyShortName:  party.ShortName,
		})
		if err != nil {
			return err
		}
	}

	// 4. Commit transaction
	s.invalidateCache(ctx, electionID)
	return tx.Commit(ctx)
}

type VoteInput struct {
	ElectionID int32 `json:"election_id"`
	PartyID    int16 `json:"party_id"`
}

// ElectionWithCandidates embeds a base Election and attaches its registered candidates.
type ElectionWithCandidates struct {
	queries.Election
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
			Election:   election,
			Candidates: candidates,
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

// resolveGeographicHierarchy takes optional geographic identifiers and resolves missing ancestor IDs
// bottom-up using the geographic relationship tree (Ward -> State Constituency/LGA -> Senatorial District/Federal Constituency -> State).
// Returns pgtype-compatible values suitable for database insertion.
func (s *ElectionsService) resolveGeographicHierarchy(
	ctx context.Context,
	txQueries *queries.Queries,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (pgtype.Int2, pgtype.Int4, pgtype.Int4, pgtype.Int4, pgtype.Int4, pgtype.Int4) {
	// Unpack optional pointer values into local variables
	var sID int16
	var sdID, fcID, scID, lID, wID int32

	if stateID != nil {
		sID = *stateID
	}
	if senatorialDistrictID != nil {
		sdID = *senatorialDistrictID
	}
	if federalConstituencyID != nil {
		fcID = *federalConstituencyID
	}
	if stateConstituencyID != nil {
		scID = *stateConstituencyID
	}
	if lgaID != nil {
		lID = *lgaID
	}
	if wardID != nil {
		wID = *wardID
	}

	// 1. If Ward ID is supplied, fill missing parent IDs (State, LGA, State Constituency) from Ward
	if wID > 0 {
		wards, err := txQueries.GetWards(ctx, queries.GetWardsParams{LgaID: 0, StateID: 0})
		if err == nil {
			for _, w := range wards {
				if w.ID == wID {
					if sID == 0 && w.StateID > 0 {
						sID = int16(w.StateID)
					}
					if lID == 0 && w.LgaID > 0 {
						lID = w.LgaID
					}
					if scID == 0 && w.StateConstituencyID.Valid {
						scID = w.StateConstituencyID.Int32
					}
					break
				}
			}
		}
	}

	// 2. If State Constituency ID is supplied, fill missing parent IDs (State, Senatorial District, Federal Constituency, LGA)
	if scID > 0 {
		constituencies, err := txQueries.GetStateConstituencies(ctx, queries.GetStateConstituenciesParams{StateID: 0, FederalConstituencyID: 0})
		if err == nil {
			for _, sc := range constituencies {
				if sc.ID == scID {
					if sID == 0 && sc.StateID > 0 {
						sID = int16(sc.StateID)
					}
					if sdID == 0 && sc.SenatorialDistrictID.Valid {
						sdID = sc.SenatorialDistrictID.Int32
					}
					if fcID == 0 && sc.FederalConstituencyID.Valid {
						fcID = sc.FederalConstituencyID.Int32
					}
					if lID == 0 && sc.LgaID > 0 {
						lID = sc.LgaID
					}
					break
				}
			}
		}
	}

	// 3. If LGA ID is supplied, fill missing parent IDs (State, Senatorial District, Federal Constituency)
	if lID > 0 {
		lgas, err := txQueries.GetLGAs(ctx, 0)
		if err == nil {
			for _, l := range lgas {
				if l.ID == lID {
					if sID == 0 && l.StateID > 0 {
						sID = int16(l.StateID)
					}
					if sdID == 0 && l.SenatorialDistrictID.Valid {
						sdID = l.SenatorialDistrictID.Int32
					}
					if fcID == 0 && l.FederalConstituencyID.Valid {
						fcID = l.FederalConstituencyID.Int32
					}
					break
				}
			}
		}
	}

	// 4. If Federal Constituency ID is supplied, fill missing parent IDs (State, Senatorial District)
	if fcID > 0 {
		constituencies, err := txQueries.GetFederalConstituencies(ctx, queries.GetFederalConstituenciesParams{StateID: 0, SenatorialDistrictID: 0})
		if err == nil {
			for _, fc := range constituencies {
				if fc.ID == fcID {
					if sID == 0 && fc.StateID > 0 {
						sID = int16(fc.StateID)
					}
					if sdID == 0 && fc.SenatorialDistrictID.Valid {
						sdID = fc.SenatorialDistrictID.Int32
					}
					break
				}
			}
		}
	}

	// 5. If Senatorial District ID is supplied, fill missing parent State ID
	if sdID > 0 {
		districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
		if err == nil {
			for _, d := range districts {
				if d.ID == sdID {
					if sID == 0 && d.StateID > 0 {
						sID = int16(d.StateID)
					}
					break
				}
			}
		}
	}

	// Format resolved IDs into pgtype nullable types
	return pgtype.Int2{Int16: sID, Valid: sID > 0},
		pgtype.Int4{Int32: sdID, Valid: sdID > 0},
		pgtype.Int4{Int32: fcID, Valid: fcID > 0},
		pgtype.Int4{Int32: scID, Valid: scID > 0},
		pgtype.Int4{Int32: lID, Valid: lID > 0},
		pgtype.Int4{Int32: wID, Valid: wID > 0}
}

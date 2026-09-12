package electionsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/worker"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type earningsService interface {
	ProcessTaskEarnings(ctx context.Context, assignmentID int64, taskType string, customNarration ...string) (int64, error)
}

type electionGroupsService interface {
	GetSafeNationalMetrics(ctx context.Context) queries.NationalMetric
}

type ElectionsService struct {
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
	earningsSvc     earningsService
	egSvc           electionGroupsService
}

// NewElectionsService initializes a new ElectionsService with its required database pool,
// query handlers, Redis client, task distributor, and election groups service dependency.
func NewElectionsService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	taskDistributor worker.TaskDistributor,
	egSvc electionGroupsService,
	earningsSvc earningsService,
) *ElectionsService {
	return &ElectionsService{
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: taskDistributor,
		egSvc:           egSvc,
		earningsSvc:     earningsSvc,
	}
}

// SetElectionGroupsService sets or updates the injected election groups service.
func (s *ElectionsService) SetElectionGroupsService(egs electionGroupsService) {
	s.egSvc = egs
}

// getSafeNationalMetrics retrieves national administrative counts via the injected election
// groups service (using Redis cache and DB), or returns standard hardcoded Nigerian metrics as a safe fallback.
func (s *ElectionsService) getSafeNationalMetrics(ctx context.Context) queries.NationalMetric {
	return s.egSvc.GetSafeNationalMetrics(ctx)
}

// invalidateCache clears Redis cached lists for elections and election groups, as well as single election details.
func (s *ElectionsService) invalidateCache(ctx context.Context, id *int32) {
	s.rdb.Del(ctx, db.RedisElectionsAll)
	s.rdb.Del(ctx, db.RedisElectionGroupsAll)
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("%s%d", db.RedisElectionInfo, *id))
	}
}

// CreateElection creates an individual election instance under an existing election group with full geographic resolution.
func (s *ElectionsService) CreateElection(
	ctx context.Context,
	name string,
	candidatesCount int32,
	electionDate time.Time,
	electionGroupID int32,
	officeID int16,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Verify office definition and parent election group exist
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, err
	}
	eg, err := s.queries.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return queries.Election{}, err
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// 3. Determine dynamic election display name based on geographic level
	name = et.Election + " Election"
	if stateID != nil {
		stateRow, err := txQueries.GetStateByID(ctx, queries.GetStateByIDParams{
			ID:        *stateID,
			CountryID: 161,
		})
		if err == nil {
			name = fmt.Sprintf("%s Election (%s)", et.Election, stateRow.Name)
		} else {
			name = fmt.Sprintf("%s Election (State %d)", et.Election, *stateID)
		}
	} else if senatorialDistrictID != nil {
		districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
		if err == nil {
			var districtName string
			for _, d := range districts {
				if d.ID == *senatorialDistrictID {
					districtName = d.Name
					break
				}
			}
			if districtName != "" {
				name = fmt.Sprintf("%s Election (%s)", et.Election, districtName)
			} else {
				name = fmt.Sprintf("%s Election (District %d)", et.Election, *senatorialDistrictID)
			}
		} else {
			name = fmt.Sprintf("%s Election (District %d)", et.Election, *senatorialDistrictID)
		}
	} else if federalConstituencyID != nil {
		constituencies, err := txQueries.GetFederalConstituencies(ctx, queries.GetFederalConstituenciesParams{
			StateID:              0,
			SenatorialDistrictID: 0,
		})
		if err == nil {
			var constituencyName string
			for _, c := range constituencies {
				if c.ID == *federalConstituencyID {
					constituencyName = c.Name
					break
				}
			}
			if constituencyName != "" {
				name = fmt.Sprintf("%s Election (%s)", et.Election, constituencyName)
			} else {
				name = fmt.Sprintf("%s Election (Federal Constituency %d)", et.Election, *federalConstituencyID)
			}
		} else {
			name = fmt.Sprintf("%s Election (Federal Constituency %d)", et.Election, *federalConstituencyID)
		}
	} else if stateConstituencyID != nil {
		constituencies, err := txQueries.GetStateConstituencies(ctx, queries.GetStateConstituenciesParams{
			StateID:               0,
			FederalConstituencyID: 0,
		})
		if err == nil {
			var constituencyName string
			for _, c := range constituencies {
				if c.ID == *stateConstituencyID {
					constituencyName = c.Name
					break
				}
			}
			if constituencyName != "" {
				name = fmt.Sprintf("%s Election (%s)", et.Election, constituencyName)
			} else {
				name = fmt.Sprintf("%s Election (State Constituency %d)", et.Election, *stateConstituencyID)
			}
		} else {
			name = fmt.Sprintf("%s Election (State Constituency %d)", et.Election, *stateConstituencyID)
		}
	} else if lgaID != nil {
		lgas, err := txQueries.GetLGAs(ctx, 0)
		if err == nil {
			var lgaName string
			for _, l := range lgas {
				if l.ID == *lgaID {
					lgaName = l.Name
					break
				}
			}
			if lgaName != "" {
				name = fmt.Sprintf("%s Election (%s)", et.Election, lgaName)
			} else {
				name = fmt.Sprintf("%s Election (LGA %d)", et.Election, *lgaID)
			}
		} else {
			name = fmt.Sprintf("%s Election (LGA %d)", et.Election, *lgaID)
		}
	} else if wardID != nil {
		wards, err := txQueries.GetWards(ctx, queries.GetWardsParams{
			LgaID:   0,
			StateID: 0,
		})
		if err == nil {
			var wardName string
			for _, w := range wards {
				if w.ID == *wardID {
					wardName = w.Name
					break
				}
			}
			if wardName != "" {
				name = fmt.Sprintf("%s Election (%s)", et.Election, wardName)
			} else {
				name = fmt.Sprintf("%s Election (Ward %d)", et.Election, *wardID)
			}
		} else {
			name = fmt.Sprintf("%s Election (Ward %d)", et.Election, *wardID)
		}
	}

	// 4. Resolve full geographic hierarchy (filling missing parent administrative IDs from bottom up)
	stateID2, senatorialDistrictID4, federalConstituencyID4, stateConstituencyID4, lgaID4, wardID4 := s.resolveGeographicHierarchy(
		ctx, txQueries, stateID, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID,
	)

	// 5. Persist the election instance record
	election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
		Name:                  name,
		Rank:                  et.Rank,
		CandidatesCount:       candidatesCount,
		ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID:       electionGroupID,
		ElectionGroupName:     eg.Name,
		OfficeID:              officeID,
		OfficeName:            et.Name,
		Scope:                 et.Scope,
		StateID:               stateID2,
		SenatorialDistrictID:  senatorialDistrictID4,
		FederalConstituencyID: federalConstituencyID4,
		StateConstituencyID:   stateConstituencyID4,
		LgaID:                 lgaID4,
		WardID:                wardID4,
	})
	if err != nil {
		return queries.Election{}, err
	}

	// 6. Synchronize the election group rank and computed name across all child elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, electionGroupID, electionDate.Year()); err != nil {
		return queries.Election{}, err
	}

	// 7. Seed expected polling unit result skeletons for statistics and rollups
	if err := s.syncExpectedResultsForElection(ctx, txQueries, electionGroupID, et.Scope, stateID, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID, false); err != nil {
		return queries.Election{}, err
	}

	// 8. Re-fetch the election with newly synchronized denormalized group name
	updatedElection, err := txQueries.GetElectionInstanceByID(ctx, election.ID)
	if err != nil {
		return queries.Election{}, err
	}

	// 9. Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return queries.Election{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElection, nil
}

// CandidateInput holds candidate and party identification for election registration.
type CandidateInput struct {
	CandidateID    int64
	PartyID        int16
	PartyShortName string
}

// CreateNationwideElection sets up a country-wide election (e.g., Presidential) along with its candidates.
func (s *ElectionsService) CreateNationwideElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, candidates []CandidateInput) (queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return queries.Election{}, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment the number of elections contesting under this group
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + 1,
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return queries.Election{}, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming (e.g., "2027 Presidential Election (1)")
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break // Name is available
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             1,
			StatesCount:                37, // Fixed 36 states + FCT for nationwide elections
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return queries.Election{}, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	// 4. Create election record (nationwide scope has no geographic sub-boundary IDs)
	name := et.Election + " Election"
	election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
		Name:              name,
		Rank:              et.Rank,
		CandidatesCount:   int32(len(candidates)),
		ElectionDate:      pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID:   groupID,
		ElectionGroupName: groupName,
		OfficeID:          officeID,
		OfficeName:        et.Name,
		Scope:             "nationwide",
	})
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to create election: %w", err)
	}

	// 5. Link candidates to this election
	for _, cand := range candidates {
		_, err := txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:     election.ID,
			CandidateID:    cand.CandidateID,
			PartyID:        int16(cand.PartyID),
			PartyShortName: cand.PartyShortName,
		})
		if err != nil {
			return queries.Election{}, fmt.Errorf("failed to create election candidate relation for candidate %d: %w", cand.CandidateID, err)
		}
	}

	// 6. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return queries.Election{}, err
	}

	// 7. Seed expected results skeletons across nationwide polling units
	if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "nationwide", nil, nil, nil, nil, nil, nil, false); err != nil {
		return queries.Election{}, err
	}

	// 8. Fetch updated election with synchronized group name
	updatedElection, err := txQueries.GetElectionInstanceByID(ctx, election.ID)
	if err != nil {
		return queries.Election{}, err
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return queries.Election{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElection, nil
}

// CreateStateElection sets up multiple state-level elections (e.g., Governorship) under a shared or auto-created election group.
func (s *ElectionsService) CreateStateElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, stateIDs []int16) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of states contesting
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(stateIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(stateIDs)),
			StatesCount:                int32(len(stateIDs)),
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(stateIDs))

	// 4. Create individual election records for each state
	for _, stateID := range stateIDs {
		// Fetch state name using GetStateByID (Nigeria country_id is 161)
		stateRow, err := txQueries.GetStateByID(ctx, queries.GetStateByIDParams{
			ID:        stateID,
			CountryID: 161,
		})
		stateName := fmt.Sprintf("State %d", stateID)
		if err == nil {
			stateName = stateRow.Name
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, stateName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:              name,
			Rank:              et.Rank,
			CandidatesCount:   0,
			ElectionDate:      pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:   groupID,
			ElectionGroupName: groupName,
			OfficeID:          officeID,
			OfficeName:        et.Name,
			Scope:             "state",
			StateID:           pgtype.Int2{Int16: stateID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for state %d: %w", stateID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 5. Seed expected result skeletons for each state
	for _, stateID := range stateIDs {
		sid := stateID
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "state", &sid, nil, nil, nil, nil, nil, false); err != nil {
			return nil, err
		}
	}

	// 6. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 7. Fetch updated elections with synced group name
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 8. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// CreateSenatorialDistrictElection sets up elections across one or more Senatorial Districts.
func (s *ElectionsService) CreateSenatorialDistrictElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, senatorialDistrictIDs []int32) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of senatorial districts
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(senatorialDistrictIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(senatorialDistrictIDs)),
			StatesCount:                37,
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(senatorialDistrictIDs))

	// 4. Pre-fetch all senatorial districts into map for O(1) in-memory lookups
	districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch senatorial districts: %w", err)
	}
	districtMap := make(map[int32]queries.SenatorialDistrict, len(districts))
	for _, d := range districts {
		districtMap[d.ID] = d
	}

	// 5. Create election records for each senatorial district
	for _, districtID := range senatorialDistrictIDs {
		districtRow, found := districtMap[districtID]
		districtName := fmt.Sprintf("District %d", districtID)
		var stateID pgtype.Int2
		if found {
			districtName = districtRow.Name
			if districtRow.StateID > 0 {
				stateID = pgtype.Int2{Int16: int16(districtRow.StateID), Valid: true}
			}
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, districtName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                 name,
			Rank:                 et.Rank,
			CandidatesCount:      0,
			ElectionDate:         pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:      groupID,
			ElectionGroupName:    groupName,
			OfficeID:             officeID,
			OfficeName:           et.Name,
			Scope:                "senatorial-district",
			StateID:              stateID,
			SenatorialDistrictID: pgtype.Int4{Int32: districtID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for district %d: %w", districtID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 6. Seed expected result skeletons for each senatorial district
	for _, sdid := range senatorialDistrictIDs {
		dID := sdid
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "senatorial_district", nil, &dID, nil, nil, nil, nil, false); err != nil {
			return nil, err
		}
	}

	// 7. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 8. Fetch updated elections with synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// CreateFederalConstituencyElection sets up elections across one or more Federal Constituencies (House of Representatives).
func (s *ElectionsService) CreateFederalConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, federalConstituencyIDs []int32) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of federal constituencies contesting
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(federalConstituencyIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(federalConstituencyIDs)),
			StatesCount:                37,
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(federalConstituencyIDs))

	// 4. Pre-fetch all federal constituencies into map for O(1) in-memory lookups
	constituencies, err := txQueries.GetFederalConstituencies(ctx, queries.GetFederalConstituenciesParams{
		StateID:              0,
		SenatorialDistrictID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch federal constituencies: %w", err)
	}
	fcMap := make(map[int32]queries.FederalConstituency, len(constituencies))
	for _, c := range constituencies {
		fcMap[c.ID] = c
	}

	// 5. Create election records for each federal constituency
	for _, constituencyID := range federalConstituencyIDs {
		cRow, found := fcMap[constituencyID]
		constituencyName := fmt.Sprintf("Federal Constituency %d", constituencyID)
		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4

		if found {
			constituencyName = cRow.Name
			if cRow.StateID > 0 {
				stateID = pgtype.Int2{Int16: int16(cRow.StateID), Valid: true}
			}
			if cRow.SenatorialDistrictID.Valid && cRow.SenatorialDistrictID.Int32 > 0 {
				senatorialDistrictID = cRow.SenatorialDistrictID
			}
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, constituencyName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                  name,
			Rank:                  et.Rank,
			CandidatesCount:       0,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       groupID,
			ElectionGroupName:     groupName,
			OfficeID:              officeID,
			OfficeName:            et.Name,
			Scope:                 "federal-constituency",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: pgtype.Int4{Int32: constituencyID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for federal constituency %d: %w", constituencyID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 6. Seed expected result skeletons for each federal constituency
	for _, fcid := range federalConstituencyIDs {
		cID := fcid
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "federal_constituency", nil, nil, &cID, nil, nil, nil, false); err != nil {
			return nil, err
		}
	}

	// 7. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 8. Fetch updated elections with synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// CreateStateConstituencyElection sets up elections across one or more State Assembly Constituencies.
func (s *ElectionsService) CreateStateConstituencyElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, stateConstituencyIDs []int32) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of state constituencies
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(stateConstituencyIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(stateConstituencyIDs)),
			StatesCount:                37,
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(stateConstituencyIDs))

	// 4. Pre-fetch all state constituencies into map for O(1) in-memory lookups
	constituencies, err := txQueries.GetStateConstituencies(ctx, queries.GetStateConstituenciesParams{
		StateID:               0,
		FederalConstituencyID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch state constituencies: %w", err)
	}
	scMap := make(map[int32]queries.StateConstituency, len(constituencies))
	for _, c := range constituencies {
		scMap[c.ID] = c
	}

	// 5. Create election records for each state constituency
	for _, constituencyID := range stateConstituencyIDs {
		cRow, found := scMap[constituencyID]
		constituencyName := fmt.Sprintf("State Constituency %d", constituencyID)
		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4
		var lgaID pgtype.Int4

		if found {
			constituencyName = cRow.Name
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
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, constituencyName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                  name,
			Rank:                  et.Rank,
			CandidatesCount:       0,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       groupID,
			ElectionGroupName:     groupName,
			OfficeID:              officeID,
			OfficeName:            et.Name,
			Scope:                 "state-constituency",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 lgaID,
			StateConstituencyID:   pgtype.Int4{Int32: constituencyID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for state constituency %d: %w", constituencyID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 6. Seed expected result skeletons for each state constituency
	for _, scid := range stateConstituencyIDs {
		cID := scid
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "state_constituency", nil, nil, nil, &cID, nil, nil, false); err != nil {
			return nil, err
		}
	}

	// 7. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 8. Fetch updated elections with synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// CreateLgaElection sets up elections across one or more Local Government Areas (LGAs) (e.g., LGA Chairmanship).
func (s *ElectionsService) CreateLgaElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, lgaIDs []int32) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of LGAs contesting
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(lgaIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(lgaIDs)),
			StatesCount:                37,
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(lgaIDs))

	// 4. Pre-fetch all LGAs into map for O(1) in-memory lookups
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LGAs: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// 5. Create election records for each LGA
	for _, lgaID := range lgaIDs {
		lgaRow, found := lgaMap[lgaID]
		lgaName := fmt.Sprintf("LGA %d", lgaID)
		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4

		if found {
			lgaName = lgaRow.Name
			if lgaRow.StateID > 0 {
				stateID = pgtype.Int2{Int16: int16(lgaRow.StateID), Valid: true}
			}
			if lgaRow.SenatorialDistrictID.Valid && lgaRow.SenatorialDistrictID.Int32 > 0 {
				senatorialDistrictID = lgaRow.SenatorialDistrictID
			}
			if lgaRow.FederalConstituencyID.Valid && lgaRow.FederalConstituencyID.Int32 > 0 {
				federalConstituencyID = lgaRow.FederalConstituencyID
			}
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, lgaName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                  name,
			Rank:                  et.Rank,
			CandidatesCount:       0,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       groupID,
			ElectionGroupName:     groupName,
			OfficeID:              officeID,
			OfficeName:            et.Name,
			Scope:                 "lga",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 pgtype.Int4{Int32: lgaID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for LGA %d: %w", lgaID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 6. Seed expected result skeletons for each LGA
	for _, lgaid := range lgaIDs {
		lID := lgaid
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "lga", nil, nil, nil, nil, &lID, nil, false); err != nil {
			return nil, err
		}
	}

	// 7. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 8. Fetch updated elections with synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// CreateWardElection sets up elections across one or more Wards (e.g., Councillorship).
func (s *ElectionsService) CreateWardElection(ctx context.Context, officeID int16, electionDate time.Time, electionGroupID *int32, wardIDs []int32) ([]queries.Election, error) {
	// Invalidate election list caches when this function exits
	defer s.invalidateCache(ctx, nil)

	// 1. Fetch and validate the target office definition
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int32
	var groupName string

	// 3. Resolve parent election group: either join an existing group or auto-create a new one
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count by the number of wards contesting
		_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
			ID:             eg.ID,
			Name:           eg.Name,
			Rank:           eg.Rank,
			ElectionsCount: eg.ElectionsCount + int32(len(wardIDs)),
			StatesCount:    eg.StatesCount,
			ElectionDate:   eg.ElectionDate,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update election group count: %w", err)
		}
	} else {
		// Auto-create election group with collision-safe naming
		baseGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		computedGroupName := baseGroupName
		suffix := 1
		for {
			_, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
			if err != nil {
				break
			}
			suffix++
			computedGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
		}

		// Retrieve nationwide boundary metrics snapshot (from cache/DB)
		metrics := s.getSafeNationalMetrics(ctx)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             int32(len(wardIDs)),
			StatesCount:                37,
			ElectionDate:               pgtype.Date{Time: electionDate, Valid: true},
			SenatorialDistrictsCount:   metrics.SenatorialDistrictsCount,
			FederalConstituenciesCount: metrics.FederalConstituenciesCount,
			LgasCount:                  metrics.LgasCount,
			StateConstituenciesCount:   metrics.StateConstituenciesCount,
			WardsCount:                 metrics.WardsCount,
			PollingUnitsCount:          metrics.PollingUnitsCount,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election group: %w", err)
		}
		groupID = newGroup.ID
		groupName = newGroup.Name
	}

	createdElections := make([]queries.Election, 0, len(wardIDs))

	// 4. Pre-fetch all wards once to resolve parent IDs in memory
	wards, err := txQueries.GetWards(ctx, queries.GetWardsParams{
		LgaID:   0,
		StateID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch wards: %w", err)
	}
	wardMap := make(map[int32]queries.Ward, len(wards))
	for _, w := range wards {
		wardMap[w.ID] = w
	}

	// Pre-fetch LGAs to resolve senatorial district & federal constituency for wards via parent LGA
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LGAs for ward parent resolution: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// 5. Create election records for each Ward with full ancestral resolution
	for _, wardID := range wardIDs {
		wardRow, foundWard := wardMap[wardID]
		wardName := fmt.Sprintf("Ward %d", wardID)

		var stateID pgtype.Int2
		var senatorialDistrictID pgtype.Int4
		var federalConstituencyID pgtype.Int4
		var stateConstituencyID pgtype.Int4
		var lgaID pgtype.Int4

		if foundWard {
			wardName = wardRow.Name
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
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, wardName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                  name,
			Rank:                  et.Rank,
			CandidatesCount:       0,
			ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:       groupID,
			ElectionGroupName:     groupName,
			OfficeID:              officeID,
			OfficeName:            et.Name,
			Scope:                 "ward",
			StateID:               stateID,
			SenatorialDistrictID:  senatorialDistrictID,
			FederalConstituencyID: federalConstituencyID,
			LgaID:                 lgaID,
			StateConstituencyID:   stateConstituencyID,
			WardID:                pgtype.Int4{Int32: wardID, Valid: true},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create election for Ward %d: %w", wardID, err)
		}
		createdElections = append(createdElections, election)
	}

	// 6. Seed expected result skeletons for each ward
	for _, wardid := range wardIDs {
		wID := wardid
		if err := s.syncExpectedResultsForElection(ctx, txQueries, groupID, "ward", nil, nil, nil, nil, nil, &wID, false); err != nil {
			return nil, err
		}
	}

	// 7. Synchronize group rank and name across constituent elections
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// 8. Fetch updated elections with synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// 9. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

// GetElectionByID fetches an election instance by its unique identifier.
// It leverages Redis caching with a 24-hour TTL to minimize database queries for election metadata.
func (s *ElectionsService) GetElectionByID(ctx context.Context, id int32) (queries.Election, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisElectionInfo, id)

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

	// 3. Serialize and populate Redis cache with a 24-hour expiration
	if elBytes, err := json.Marshal(el); err == nil {
		s.rdb.Set(ctx, cacheKey, elBytes, 24*time.Hour)
	}

	return el, nil
}

// ListElections returns all election instances in the system.
// Results are cached in Redis under db.RedisElectionsAll with a 24-hour TTL.
func (s *ElectionsService) ListElections(ctx context.Context) ([]queries.Election, error) {
	cacheKey := db.RedisElectionsAll

	// 1. Attempt to fetch pre-cached election list from Redis
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var els []queries.Election
		if err := json.Unmarshal([]byte(val), &els); err == nil {
			return els, nil
		}
	}

	// 2. Cache miss: retrieve all election instances from the database
	els, err := s.queries.ListElectionInstances(ctx)
	if err != nil {
		return nil, err
	}

	// 3. Cache serialized election list in Redis for 24 hours
	if elsBytes, err := json.Marshal(els); err == nil {
		s.rdb.Set(ctx, cacheKey, elsBytes, 24*time.Hour)
	}

	return els, nil
}

// UpdateElection modifies an existing election instance, resolves any implied geographic ancestor IDs,
// and invalidates the related Redis cache keys upon success.
func (s *ElectionsService) UpdateElection(
	ctx context.Context,
	id int32,
	name string,
	candidatesCount int32,
	electionDate time.Time,
	electionGroupID int32,
	officeID int16,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (queries.Election, error) {
	// 1. Fetch office and election group definitions to validate existence and get metadata
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, err
	}
	eg, err := s.queries.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return queries.Election{}, err
	}

	// 2. Resolve complete geographic hierarchy upwards from the most specific geographic scope
	stateID2, senatorialDistrictID4, federalConstituencyID4, stateConstituencyID4, lgaID4, wardID4 := s.resolveGeographicHierarchy(
		ctx, s.queries, stateID, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID,
	)

	// 3. Update election instance in database
	el, err := s.queries.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
		ID:                    id,
		Name:                  name,
		Rank:                  et.Rank,
		CandidatesCount:       candidatesCount,
		ElectionDate:          pgtype.Date{Time: electionDate, Valid: true},
		ElectionGroupID:       electionGroupID,
		ElectionGroupName:     eg.Name,
		OfficeID:              officeID,
		OfficeName:            et.Name,
		Scope:                 et.Scope,
		StateID:               stateID2,
		SenatorialDistrictID:  senatorialDistrictID4,
		FederalConstituencyID: federalConstituencyID4,
		StateConstituencyID:   stateConstituencyID4,
		LgaID:                 lgaID4,
		WardID:                wardID4,
	})

	// 4. Invalidate Redis caches on successful update
	if err == nil {
		s.invalidateCache(ctx, &id)
	}
	return el, err
}

// DeleteElection removes an election instance in a transaction, decrements expected polling units
// across the election group hierarchy, and cleans up or resynchronizes the parent election group.
func (s *ElectionsService) DeleteElection(ctx context.Context, id int32) error {
	// Ensure Redis cache invalidation occurs when the operation completes
	defer s.invalidateCache(ctx, &id)

	// 1. Fetch the target election record to obtain scope, group ID, and geographic boundaries
	el, err := s.queries.GetElectionInstanceByID(ctx, id)
	if err != nil {
		return err
	}

	// 2. Begin database transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// 3. Delete the election instance
	if err := txQueries.DeleteElectionInstance(ctx, id); err != nil {
		return fmt.Errorf("failed to delete election instance: %w", err)
	}

	// 4. Extract geographic IDs and decrement expected results for this election's scope
	var stID *int16
	if el.StateID.Valid {
		stID = &el.StateID.Int16
	}
	var sdID, fcID, scID, lgID, wdID *int32
	if el.SenatorialDistrictID.Valid {
		sdID = &el.SenatorialDistrictID.Int32
	}
	if el.FederalConstituencyID.Valid {
		fcID = &el.FederalConstituencyID.Int32
	}
	if el.StateConstituencyID.Valid {
		scID = &el.StateConstituencyID.Int32
	}
	if el.LgaID.Valid {
		lgID = &el.LgaID.Int32
	}
	if el.WardID.Valid {
		wdID = &el.WardID.Int32
	}
	_ = s.syncExpectedResultsForElection(ctx, txQueries, el.ElectionGroupID, el.Scope, stID, sdID, fcID, scID, lgID, wdID, true)

	// 5. Inspect remaining elections in the parent group: delete group if empty, else resynchronize
	remainingElections, err := txQueries.ListElectionsDetailedByGroupID(ctx, el.ElectionGroupID)
	if err == nil {
		if len(remainingElections) == 0 {
			// If no elections remain in this group, clean up the empty group record
			_ = txQueries.DeleteElectionGroup(ctx, el.ElectionGroupID)
		} else {
			// Otherwise resynchronize the group name, rank, and election count based on remaining elections
			_ = s.syncElectionGroupNameAndRank(ctx, txQueries, el.ElectionGroupID, el.ElectionDate.Time.Year())
		}
	}

	// 6. Commit transaction
	return tx.Commit(ctx)
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

	// 2. Remove all existing candidates associated with this election
	err = txQueries.DeleteElectionCandidatesForElection(ctx, electionID)
	if err != nil {
		return err
	}

	// 3. Link new candidates to the election and synchronize their user party affiliation
	for _, cand := range candidates {
		_, err = txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:     electionID,
			CandidateID:    cand.CandidateID,
			PartyID:        int16(cand.PartyID),
			PartyShortName: cand.PartyShortName,
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

	// 4. Fetch the election instance
	el, err := txQueries.GetElectionInstanceByID(ctx, electionID)
	if err != nil {
		return err
	}

	// 5. Update candidates count on the election instance
	_, err = txQueries.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
		ID:                    el.ID,
		Name:                  el.Name,
		Rank:                  el.Rank,
		CandidatesCount:       int32(len(candidates)),
		ElectionDate:          el.ElectionDate,
		ElectionGroupID:       el.ElectionGroupID,
		ElectionGroupName:     el.ElectionGroupName,
		OfficeID:              el.OfficeID,
		OfficeName:            el.OfficeName,
		Scope:                 el.Scope,
		StateID:               el.StateID,
		SenatorialDistrictID:  el.SenatorialDistrictID,
		FederalConstituencyID: el.FederalConstituencyID,
		StateConstituencyID:   el.StateConstituencyID,
		LgaID:                 el.LgaID,
		WardID:                el.WardID,
	})
	if err != nil {
		return err
	}

	// 6. Commit transaction
	return tx.Commit(ctx)
}

// syncElectionGroupNameAndRank recalculates and updates an election group's title and rank based on
// its constituent elections. It picks the highest-ranked office (lowest numerical rank), resolves naming
// collisions, updates the group record, and denormalizes the updated group name across all member elections.
func (s *ElectionsService) syncElectionGroupNameAndRank(ctx context.Context, txQueries *queries.Queries, groupID int32, year int) error {
	// 1. Fetch all constituent elections in the group
	elections, err := txQueries.ListElectionsDetailedByGroupID(ctx, groupID)
	if err != nil {
		return fmt.Errorf("failed to list elections for syncing group name: %w", err)
	}

	if len(elections) == 0 {
		return nil
	}

	// 2. Identify the highest-ranked election (lowest rank numerical value)
	highestRanked := elections[0]
	for _, e := range elections {
		if e.Rank < highestRanked.Rank {
			highestRanked = e
		}
	}

	// 3. Compute group name format:
	// - Single election: Year + Election Name (e.g., "2027 Lagos State Governorship Election")
	// - Multi-election bundle: Year + Highest Ranked Office Election + " Election" (e.g., "2027 Presidential Election")
	var baseGroupName string
	if len(elections) == 1 {
		baseGroupName = fmt.Sprintf("%d %s", year, highestRanked.Name)
	} else {
		baseGroupName = fmt.Sprintf("%d %s Election", year, highestRanked.OfficeElection)
	}

	// 4. Resolve naming collisions by appending an incremental suffix if needed
	newGroupName := baseGroupName
	suffix := 1
	for {
		existingGroup, err := txQueries.GetElectionGroupByName(ctx, newGroupName)
		if err != nil {
			break // Name is available
		}
		if existingGroup.ID == groupID {
			break // Name is already ours
		}
		suffix++
		newGroupName = fmt.Sprintf("%s (%d)", baseGroupName, suffix)
	}

	// 5. Update the election group record with new title, rank, and election count
	eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
	if err != nil {
		return fmt.Errorf("failed to fetch election group: %w", err)
	}

	_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
		ID:             groupID,
		Name:           newGroupName,
		Rank:           highestRanked.Rank,
		ElectionsCount: int32(len(elections)),
		StatesCount:    eg.StatesCount, // preserve existing states count
		ElectionDate:   eg.ElectionDate,
	})
	if err != nil {
		return fmt.Errorf("failed to update election group: %w", err)
	}

	// 6. Denormalize the updated group name onto each child election instance for consistent queries
	for _, e := range elections {
		if e.ElectionGroupName != newGroupName {
			_, err = txQueries.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
				ID:                    e.ID,
				Name:                  e.Name,
				Rank:                  e.Rank,
				CandidatesCount:       e.CandidatesCount,
				ElectionDate:          e.ElectionDate,
				ElectionGroupID:       e.ElectionGroupID,
				ElectionGroupName:     newGroupName,
				OfficeID:              e.OfficeID,
				OfficeName:            e.OfficeName,
				Scope:                 e.Scope,
				StateID:               e.StateID,
				SenatorialDistrictID:  e.SenatorialDistrictID,
				FederalConstituencyID: e.FederalConstituencyID,
				StateConstituencyID:   e.StateConstituencyID,
				LgaID:                 e.LgaID,
				WardID:                e.WardID,
			})
			if err != nil {
				return fmt.Errorf("failed to update election group name on election instance: %w", err)
			}
		}
	}

	return nil
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
		party, err := txQueries.GetPartyByID(ctx, partyID)
		if err != nil {
			return fmt.Errorf("party not found: %w", err)
		}

		_, err = txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:     electionID,
			CandidateID:    candidateID,
			PartyID:        partyID,
			PartyShortName: party.ShortName,
		})
		if err != nil {
			return err
		}
	}

	// 4. Count remaining active candidates for the election
	count, err := txQueries.GetElectionCandidatesCount(ctx, electionID)
	if err != nil {
		return err
	}

	// 5. Update candidates_count in elections table
	err = txQueries.UpdateElectionCandidatesCount(ctx, queries.UpdateElectionCandidatesCountParams{
		ID:              electionID,
		CandidatesCount: int32(count),
	})
	if err != nil {
		return err
	}

	// 6. Commit transaction
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

	// 2. Fetch election group and validate election date (voting closes after election day)
	eg, err := qtx.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return fmt.Errorf("invalid election group: %w", err)
	}

	now := time.Now().Truncate(24 * time.Hour)
	egDate := eg.ElectionDate.Time.Truncate(24 * time.Hour)
	if now.After(egDate) {
		return fmt.Errorf("voting for this election has ended")
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
					if incErr == nil && s.earningsSvc != nil {
						// Process earnings asynchronously post-commit
						defer func(asgnID int64) {
							go s.earningsSvc.ProcessTaskEarnings(context.Background(), asgnID, "live_voters_referred", "Referred User: Voted")
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

// syncExpectedResultsForElection maintains the expected results skeleton rows and counts
// for an election group based on an election's geographic scope.
//
// When isDelete is true:
//   - Decrements expected polling unit counts across the election group hierarchy for the given scope.
//
// When isDelete is false:
//   - Upserts polling unit skeleton rows for the target geographic scope.
//   - Ensures all parent administrative skeletons (Ward, LGA, Constituency, District, State) exist.
//   - Triggers rollup calculation to update expected aggregates at all hierarchy levels.
func (s *ElectionsService) syncExpectedResultsForElection(
	ctx context.Context,
	txQueries *queries.Queries,
	electionGroupID int32,
	scope string,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
	isDelete bool,
) error {
	if isDelete {
		// Handle election deletion: decrement expected results according to geographic scope
		switch scope {
		case "nationwide":
			if err := txQueries.DecrementElectionGroupPollingUnitsForNationwideElection(ctx, electionGroupID); err != nil {
				return fmt.Errorf("failed decrementing nationwide expected results: %w", err)
			}
		case "state":
			if stateID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForStateElection(ctx, queries.DecrementElectionGroupPollingUnitsForStateElectionParams{
					ElectionGroupID: electionGroupID,
					StateID:         pgtype.Int2{Int16: *stateID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing state expected results: %w", err)
				}
			}
		case "senatorial_district":
			if senatorialDistrictID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForSenatorialDistrictElection(ctx, queries.DecrementElectionGroupPollingUnitsForSenatorialDistrictElectionParams{
					ElectionGroupID:      electionGroupID,
					SenatorialDistrictID: pgtype.Int4{Int32: *senatorialDistrictID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing senatorial district expected results: %w", err)
				}
			}
		case "federal_constituency":
			if federalConstituencyID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForFederalConstituencyElection(ctx, queries.DecrementElectionGroupPollingUnitsForFederalConstituencyElectionParams{
					ElectionGroupID:       electionGroupID,
					FederalConstituencyID: pgtype.Int4{Int32: *federalConstituencyID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing federal constituency expected results: %w", err)
				}
			}
		case "state_constituency":
			if stateConstituencyID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForStateConstituencyElection(ctx, queries.DecrementElectionGroupPollingUnitsForStateConstituencyElectionParams{
					ElectionGroupID:     electionGroupID,
					StateConstituencyID: pgtype.Int4{Int32: *stateConstituencyID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing state constituency expected results: %w", err)
				}
			}
		case "lga":
			if lgaID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForLgaElection(ctx, queries.DecrementElectionGroupPollingUnitsForLgaElectionParams{
					ElectionGroupID: electionGroupID,
					LgaID:           pgtype.Int4{Int32: *lgaID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing LGA expected results: %w", err)
				}
			}
		case "ward":
			if wardID != nil {
				if err := txQueries.DecrementElectionGroupPollingUnitsForWardElection(ctx, queries.DecrementElectionGroupPollingUnitsForWardElectionParams{
					ElectionGroupID: electionGroupID,
					WardID:          pgtype.Int4{Int32: *wardID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed decrementing ward expected results: %w", err)
				}
			}
		}
	} else {
		// Handle election creation: upsert expected results according to geographic scope
		switch scope {
		case "nationwide":
			if err := txQueries.UpsertElectionGroupPollingUnitsForNationwideElection(ctx, electionGroupID); err != nil {
				return fmt.Errorf("failed upserting nationwide expected results: %w", err)
			}
		case "state":
			if stateID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForStateElection(ctx, queries.UpsertElectionGroupPollingUnitsForStateElectionParams{
					ElectionGroupID: electionGroupID,
					StateID:         int32(*stateID),
				}); err != nil {
					return fmt.Errorf("failed upserting state expected results: %w", err)
				}
			}
		case "senatorial_district":
			if senatorialDistrictID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForSenatorialDistrictElection(ctx, queries.UpsertElectionGroupPollingUnitsForSenatorialDistrictElectionParams{
					ElectionGroupID:      electionGroupID,
					SenatorialDistrictID: pgtype.Int4{Int32: *senatorialDistrictID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed upserting senatorial district expected results: %w", err)
				}
			}
		case "federal_constituency":
			if federalConstituencyID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForFederalConstituencyElection(ctx, queries.UpsertElectionGroupPollingUnitsForFederalConstituencyElectionParams{
					ElectionGroupID:       electionGroupID,
					FederalConstituencyID: pgtype.Int4{Int32: *federalConstituencyID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed upserting federal constituency expected results: %w", err)
				}
			}
		case "state_constituency":
			if stateConstituencyID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForStateConstituencyElection(ctx, queries.UpsertElectionGroupPollingUnitsForStateConstituencyElectionParams{
					ElectionGroupID:     electionGroupID,
					StateConstituencyID: pgtype.Int4{Int32: *stateConstituencyID, Valid: true},
				}); err != nil {
					return fmt.Errorf("failed upserting state constituency expected results: %w", err)
				}
			}
		case "lga":
			if lgaID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForLgaElection(ctx, queries.UpsertElectionGroupPollingUnitsForLgaElectionParams{
					ElectionGroupID: electionGroupID,
					LgaID:           *lgaID,
				}); err != nil {
					return fmt.Errorf("failed upserting LGA expected results: %w", err)
				}
			}
		case "ward":
			if wardID != nil {
				if err := txQueries.UpsertElectionGroupPollingUnitsForWardElection(ctx, queries.UpsertElectionGroupPollingUnitsForWardElectionParams{
					ElectionGroupID: electionGroupID,
					WardID:          *wardID,
				}); err != nil {
					return fmt.Errorf("failed upserting ward expected results: %w", err)
				}
			}
		}

		// Ensure parent skeleton records exist for newly created polling units
		if err := txQueries.EnsureElectionGroupParentSkeletons(ctx, electionGroupID); err != nil {
			return fmt.Errorf("failed ensuring parent skeletons: %w", err)
		}
	}

	// Roll up expected results upwards across all hierarchy levels of the election group
	return txQueries.RollupElectionGroupExpectedResults(ctx, electionGroupID)
}

package electionsservice

import (
	"context"
	"encoding/json"
	"fmt"
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

type ElectionsService struct {
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
	earningsSvc     earningsService
}

func NewElectionsService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, taskDistributor worker.TaskDistributor) *ElectionsService {
	return &ElectionsService{
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: taskDistributor,
	}
}

func (s *ElectionsService) SetEarningsService(es earningsService) {
	s.earningsSvc = es
}

func (s *ElectionsService) invalidateCache(ctx context.Context, id *int64) {
	s.rdb.Del(ctx, "elections:all")
	s.rdb.Del(ctx, "election_groups:all")
	if id != nil {
		s.rdb.Del(ctx, fmt.Sprintf("election:%d", *id))
	}
}

func (s *ElectionsService) CreateElection(
	ctx context.Context,
	name string,
	candidatesCount int32,
	electionDate time.Time,
	electionGroupID, officeID int64,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, err
	}
	eg, err := s.queries.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return queries.Election{}, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

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

	stateID2, senatorialDistrictID4, federalConstituencyID4, stateConstituencyID4, lgaID4, wardID4 := s.resolveGeographicHierarchy(
		ctx, txQueries, stateID, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID,
	)

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

	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, electionGroupID, electionDate.Year()); err != nil {
		return queries.Election{}, err
	}

	updatedElection, err := txQueries.GetElectionInstanceByID(ctx, election.ID)
	if err != nil {
		return queries.Election{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Election{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElection, nil
}

type CandidateInput struct {
	CandidateID    int64
	PartyID        int16
	PartyShortName string
}

func (s *ElectionsService) CreateNationwideElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, candidates []CandidateInput) (queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Election{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return queries.Election{}, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
		newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
			Name:                       computedGroupName,
			Rank:                       et.Rank,
			ElectionsCount:             1,
			StatesCount:                37, // Fixed 37 states for nationwide election
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

	// 3. Create election record (with all geographic IDs NULL)
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

	// 4. Create election candidates mapping
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return queries.Election{}, err
	}

	// Fetch updated election to get the synced group name
	updatedElection, err := txQueries.GetElectionInstanceByID(ctx, election.ID)
	if err != nil {
		return queries.Election{}, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return queries.Election{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElection, nil
}

func (s *ElectionsService) CreateStateElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, stateIDs []int16) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// 3. Create election records for each state
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) CreateSenatorialDistrictElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, senatorialDistrictIDs []int32) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// Pre-fetch all senatorial districts into map for O(1) lookups
	districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch senatorial districts: %w", err)
	}
	districtMap := make(map[int32]queries.SenatorialDistrict, len(districts))
	for _, d := range districts {
		districtMap[d.ID] = d
	}

	// 3. Create election records for each senatorial district
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) CreateFederalConstituencyElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, federalConstituencyIDs []int32) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// Pre-fetch all federal constituencies into map for O(1) lookups
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

	// 3. Create election records for each federal constituency
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) CreateStateConstituencyElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, stateConstituencyIDs []int32) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// Pre-fetch all state constituencies into map for O(1) lookups
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

	// 3. Create election records for each state constituency
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) CreateLgaElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, lgaIDs []int32) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// Pre-fetch all LGAs into map for O(1) lookups
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LGAs: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// 3. Create election records for each LGA
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) CreateWardElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, wardIDs []int32) ([]queries.Election, error) {
	defer s.invalidateCache(ctx, nil)
	// 1. Fetch office
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch office: %w", err)
	}

	// Begin transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	var groupID int64
	var groupName string

	// 2. Resolve/create election group
	if electionGroupID != nil && *electionGroupID > 0 {
		groupID = *electionGroupID
		eg, err := txQueries.GetElectionGroupByID(ctx, groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch election group: %w", err)
		}
		groupName = eg.Name

		// Increment elections_count
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
		// Auto-create election group
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
		// Create new group
		metrics := getSafeNationalMetrics(ctx, txQueries)
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

	// Pre-fetch all wards once to find names & parent IDs in memory
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

	// Pre-fetch LGAs to resolve senatorial district & federal constituency for wards via LGA
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LGAs for ward parent resolution: %w", err)
	}
	lgaMap := make(map[int32]queries.Lga, len(lgas))
	for _, l := range lgas {
		lgaMap[l.ID] = l
	}

	// 3. Create election records for each Ward
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

	// Sync group rank and name
	if err := s.syncElectionGroupNameAndRank(ctx, txQueries, groupID, electionDate.Year()); err != nil {
		return nil, err
	}

	// Fetch updated elections to get the synced group names
	updatedElections := make([]queries.Election, 0, len(createdElections))
	for _, ce := range createdElections {
		ue, err := txQueries.GetElectionInstanceByID(ctx, ce.ID)
		if err != nil {
			return nil, err
		}
		updatedElections = append(updatedElections, ue)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedElections, nil
}

func (s *ElectionsService) GetElectionByID(ctx context.Context, id int64) (queries.Election, error) {
	cacheKey := fmt.Sprintf("election:%d", id)
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var el queries.Election
		if err := json.Unmarshal([]byte(val), &el); err == nil {
			return el, nil
		}
	}

	el, err := s.queries.GetElectionInstanceByID(ctx, id)
	if err != nil {
		return el, err
	}

	if elBytes, err := json.Marshal(el); err == nil {
		s.rdb.Set(ctx, cacheKey, elBytes, 24*time.Hour)
	}

	return el, nil
}

func (s *ElectionsService) ListElections(ctx context.Context) ([]queries.Election, error) {
	cacheKey := "elections:all"
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var els []queries.Election
		if err := json.Unmarshal([]byte(val), &els); err == nil {
			return els, nil
		}
	}

	els, err := s.queries.ListElectionInstances(ctx)
	if err != nil {
		return nil, err
	}

	if elsBytes, err := json.Marshal(els); err == nil {
		s.rdb.Set(ctx, cacheKey, elsBytes, 24*time.Hour)
	}

	return els, nil
}

func (s *ElectionsService) UpdateElection(
	ctx context.Context,
	id int64,
	name string,
	candidatesCount int32,
	electionDate time.Time,
	electionGroupID, officeID int64,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (queries.Election, error) {
	et, err := s.queries.GetOfficeByID(ctx, officeID)
	if err != nil {
		return queries.Election{}, err
	}
	eg, err := s.queries.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return queries.Election{}, err
	}

	stateID2, senatorialDistrictID4, federalConstituencyID4, stateConstituencyID4, lgaID4, wardID4 := s.resolveGeographicHierarchy(
		ctx, s.queries, stateID, senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID,
	)

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

	if err == nil {
		s.invalidateCache(ctx, &id)
	}
	return el, err
}

func (s *ElectionsService) DeleteElection(ctx context.Context, id int64) error {
	defer s.invalidateCache(ctx, &id)

	el, err := s.queries.GetElectionInstanceByID(ctx, id)
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	if err := txQueries.DeleteElectionInstance(ctx, id); err != nil {
		return fmt.Errorf("failed to delete election instance: %w", err)
	}

	// Check remaining elections in the parent group
	remainingElections, err := txQueries.ListElectionsDetailedByGroupID(ctx, el.ElectionGroupID)
	if err == nil {
		if len(remainingElections) == 0 {
			// If no elections remain in this group, clean up the empty group
			_ = txQueries.DeleteElectionGroup(ctx, el.ElectionGroupID)
		} else {
			// Otherwise re-sync the group name, rank, and count
			_ = s.syncElectionGroupNameAndRank(ctx, txQueries, el.ElectionGroupID, el.ElectionDate.Time.Year())
		}
	}

	return tx.Commit(ctx)
}

func (s *ElectionsService) GetElectionCandidates(ctx context.Context, electionID int64) ([]queries.ListElectionCandidatesDetailedByElectionIDRow, error) {
	return s.queries.ListElectionCandidatesDetailedByElectionID(ctx, electionID)
}

func (s *ElectionsService) SyncElectionCandidates(ctx context.Context, electionID int64, candidates []CandidateInput) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Delete existing candidates
	err = txQueries.DeleteElectionCandidatesForElection(ctx, electionID)
	if err != nil {
		return err
	}

	// 4. Link candidates
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

	// Get election instance
	el, err := txQueries.GetElectionInstanceByID(ctx, electionID)
	if err != nil {
		return err
	}

	// Update candidate count
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

	return tx.Commit(ctx)
}

func (s *ElectionsService) syncElectionGroupNameAndRank(ctx context.Context, txQueries *queries.Queries, groupID int64, year int) error {
	// 1. Fetch all elections detailed by group ID
	elections, err := txQueries.ListElectionsDetailedByGroupID(ctx, groupID)
	if err != nil {
		return fmt.Errorf("failed to list elections for syncing group name: %w", err)
	}

	if len(elections) == 0 {
		return nil
	}

	// 2. Find highest ranked election (lowest rank number)
	highestRanked := elections[0]
	for _, e := range elections {
		if e.Rank < highestRanked.Rank {
			highestRanked = e
		}
	}

	// 3. Compute group name
	var baseGroupName string
	if len(elections) == 1 {
		// Single election: Year + Election Name (which contains the entity name in parentheses if sub-national)
		baseGroupName = fmt.Sprintf("%d %s", year, highestRanked.Name)
	} else {
		// 2 or more elections: Year + Highest Ranked Office Election + " Election"
		baseGroupName = fmt.Sprintf("%d %s Election", year, highestRanked.OfficeElection)
	}

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

	// 4. Update the election group
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

	// 5. Update the group name stored on each election in the group to maintain denormalized consistency!
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

func (s *ElectionsService) FieldPartyCandidate(ctx context.Context, electionID int64, partyID int16, candidateID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// 1. Delete any existing candidate of this party on the election
	err = txQueries.DeleteElectionCandidateForParty(ctx, queries.DeleteElectionCandidateForPartyParams{
		ElectionID: electionID,
		PartyID:    pgtype.Int2{Int16: int16(partyID), Valid: true},
	})
	if err != nil {
		return err
	}

	// 2. If a new candidateID is provided (candidateID > 0), insert it
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

	// 3. Count candidates remaining for the election
	count, err := txQueries.GetElectionCandidatesCount(ctx, electionID)
	if err != nil {
		return err
	}

	// 4. Update the candidates_count in elections table
	err = txQueries.UpdateElectionCandidatesCount(ctx, queries.UpdateElectionCandidatesCountParams{
		ID:              electionID,
		CandidatesCount: int32(count),
	})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

type VoteInput struct {
	ElectionID int64 `json:"election_id"`
	PartyID    int16 `json:"party_id"`
}

// ElectionWithCandidates embeds a base Election and attaches its registered candidates.
type ElectionWithCandidates struct {
	queries.Election
	Candidates []queries.ListElectionCandidatesDetailedByElectionIDRow `json:"candidates"`
}

func (s *ElectionsService) GetEligibleElectionsForPollingUnit(ctx context.Context, electionGroupID int64, pollingUnitID int32) ([]ElectionWithCandidates, error) {
	elections, err := s.queries.GetEligibleElectionsForPollingUnit(ctx, queries.GetEligibleElectionsForPollingUnitParams{
		ElectionGroupID: electionGroupID,
		ID:              int32(pollingUnitID),
	})
	if err != nil {
		return nil, err
	}

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

func (s *ElectionsService) SubmitElectionVotes(
	ctx context.Context,
	userID int64,
	electionGroupID int64,
	pollingUnitID int32,
	votes []VoteInput,
	votersCardImage string,
) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Fetch election group to validate date
	eg, err := qtx.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return fmt.Errorf("invalid election group: %w", err)
	}

	// Validate date: cannot submit votes after election day
	now := time.Now().Truncate(24 * time.Hour)
	egDate := eg.ElectionDate.Time.Truncate(24 * time.Hour)
	if now.After(egDate) {
		return fmt.Errorf("voting for this election has ended")
	}

	// Fetch polling unit to get state, lga, ward
	pu, err := qtx.GetPollingUnitByID(ctx, int32(pollingUnitID))
	if err != nil {
		return fmt.Errorf("invalid polling unit: %w", err)
	}

	// Fetch LGA to get senatorial_district and federal_constituency
	lga, err := qtx.GetLGAByID(ctx, pu.LgaID)
	if err != nil {
		return fmt.Errorf("invalid LGA: %w", err)
	}

	// Delete existing votes and reasons for this user and election group to allow scope changes and editing
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

	// Insert votes
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

	// Update user's PVC details
	err = qtx.UpdateUserVotersCard(ctx, queries.UpdateUserVotersCardParams{
		ID:              userID,
		VotersCardImage: pgtype.Text{String: votersCardImage, Valid: votersCardImage != ""},
	})
	if err != nil {
		return fmt.Errorf("failed to update PVC details: %w", err)
	}

	// Fetch ward for state_constituency_id
	ward, err := qtx.GetWardByID(ctx, pu.WardID)
	if err != nil {
		return fmt.Errorf("invalid ward: %w", err)
	}

	// Enqueue background debounced task to refresh live vote counts
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

	// Check for live voter referral bonus
	// Conditions:
	// 1. Voter was referred by an agent (referral record exists)
	// 2. Voter created account within the last 6 months
	// 3. Referrer has a polling_unit_assignments record for the exact same election_group_id
	voterUser, uErr := qtx.GetUserByID(ctx, userID)
	if uErr == nil {
		sixMonthsAgo := time.Now().AddDate(0, -6, 0)
		if voterUser.CreatedAt.Valid && voterUser.CreatedAt.Time.After(sixMonthsAgo) {
			referrerID, refErr := qtx.GetUserReferredByID(ctx, userID)
			if refErr == nil && referrerID > 0 {
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

					// Only increment and credit if target hasn't been reached yet
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
	}

	return tx.Commit(ctx)
}

type UserVoteStatus struct {
	Status                string                                   `json:"status"` // "voted", "did_not_vote", "none"
	Votes                 []queries.GetUserVotesByElectionGroupRow `json:"votes,omitempty"`
	DidNotVoteReason      *string                                  `json:"did_not_vote_reason,omitempty"`
	DidNotVoteExplanation *string                                  `json:"did_not_vote_explanation,omitempty"`
}

func (s *ElectionsService) GetUserElectionGroupVoteStatus(ctx context.Context, userID, electionGroupID int64) (UserVoteStatus, error) {
	// Check if user voted
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

	// Check if user provided a did not vote reason
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

	return UserVoteStatus{
		Status: "none",
	}, nil
}

func (s *ElectionsService) resolveGeographicHierarchy(
	ctx context.Context,
	txQueries *queries.Queries,
	stateID *int16,
	senatorialDistrictID, federalConstituencyID, stateConstituencyID, lgaID, wardID *int32,
) (pgtype.Int2, pgtype.Int4, pgtype.Int4, pgtype.Int4, pgtype.Int4, pgtype.Int4) {
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

	// 1. If Ward ID is supplied, fill missing parent IDs from Ward
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

	// 2. If State Constituency ID is supplied, fill missing parent IDs
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

	// 3. If LGA ID is supplied, fill missing parent IDs
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

	// 4. If Federal Constituency ID is supplied, fill missing parent IDs
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

	// 5. If Senatorial District ID is supplied, fill missing parent IDs
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

	return pgtype.Int2{Int16: sID, Valid: sID > 0},
		pgtype.Int4{Int32: sdID, Valid: sdID > 0},
		pgtype.Int4{Int32: fcID, Valid: fcID > 0},
		pgtype.Int4{Int32: scID, Valid: scID > 0},
		pgtype.Int4{Int32: lID, Valid: lID > 0},
		pgtype.Int4{Int32: wID, Valid: wID > 0}
}

func getSafeNationalMetrics(ctx context.Context, q *queries.Queries) queries.NationalMetric {
	metrics, err := q.GetNationalMetrics(ctx)
	if err == nil {
		return metrics
	}
	return queries.NationalMetric{
		SenatorialDistrictsCount:   109,
		FederalConstituenciesCount: 360,
		LgasCount:                  774,
		StateConstituenciesCount:   993,
		WardsCount:                 8809,
		PollingUnitsCount:          176846,
	}
}



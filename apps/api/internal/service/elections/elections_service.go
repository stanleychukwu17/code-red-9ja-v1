package electionsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type ElectionsService struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
	rdb     *redis.Client
}

func NewElectionsService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *ElectionsService {
	return &ElectionsService{
		queries: q,
		pool:    pool,
		rdb:     rdb,
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
		constituencies, err := txQueries.GetStateAssemblyConstituencies(ctx, queries.GetStateAssemblyConstituenciesParams{
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

	var stateID2 pgtype.Int2
	if stateID != nil {
		stateID2 = pgtype.Int2{Int16: *stateID, Valid: true}
	}
	var senatorialDistrictID4 pgtype.Int4
	if senatorialDistrictID != nil {
		senatorialDistrictID4 = pgtype.Int4{Int32: *senatorialDistrictID, Valid: true}
	}
	var federalConstituencyID4 pgtype.Int4
	if federalConstituencyID != nil {
		federalConstituencyID4 = pgtype.Int4{Int32: *federalConstituencyID, Valid: true}
	}
	var stateConstituencyID4 pgtype.Int4
	if stateConstituencyID != nil {
		stateConstituencyID4 = pgtype.Int4{Int32: *stateConstituencyID, Valid: true}
	}
	var lgaID4 pgtype.Int4
	if lgaID != nil {
		lgaID4 = pgtype.Int4{Int32: *lgaID, Valid: true}
	}
	var wardID4 pgtype.Int4
	if wardID != nil {
		wardID4 = pgtype.Int4{Int32: *wardID, Valid: true}
	}

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
	PartyID        int64
	PartyShortName string
}

func (s *ElectionsService) CreateNationwideElection(ctx context.Context, officeID int64, electionDate time.Time, electionGroupID *int64, candidates []CandidateInput) (queries.Election, error) {
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + 1,
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return queries.Election{}, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: 1,
				StatesCount:    37, // Fixed 37 states for nationwide election
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return queries.Election{}, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
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
			PartyID:        cand.PartyID,
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(stateIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(stateIDs)),
				StatesCount:    int32(len(stateIDs)),
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(senatorialDistrictIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(senatorialDistrictIDs)),
				StatesCount:    37,
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
	}

	createdElections := make([]queries.Election, 0, len(senatorialDistrictIDs))

	// Fetch all senatorial districts once to find state IDs and names in memory
	districts, err := txQueries.GetSenatorialDistricts(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch senatorial districts: %w", err)
	}

	// 3. Create election records for each senatorial district
	for _, districtID := range senatorialDistrictIDs {
		var districtRow *queries.SenatorialDistrict
		for _, d := range districts {
			if d.ID == districtID {
				districtRow = &d
				break
			}
		}

		districtName := fmt.Sprintf("District %d", districtID)
		if districtRow != nil {
			districtName = districtRow.Name
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
			StateID:              pgtype.Int2{Valid: false},
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(federalConstituencyIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(federalConstituencyIDs)),
				StatesCount:    37,
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
	}

	createdElections := make([]queries.Election, 0, len(federalConstituencyIDs))

	// Fetch all federal constituencies once to find names in memory
	constituencies, err := txQueries.GetFederalConstituencies(ctx, queries.GetFederalConstituenciesParams{
		StateID:              0,
		SenatorialDistrictID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch federal constituencies: %w", err)
	}

	// 3. Create election records for each federal constituency
	for _, constituencyID := range federalConstituencyIDs {
		var constituencyRow *queries.FederalConstituency
		for _, c := range constituencies {
			if c.ID == constituencyID {
				constituencyRow = &c
				break
			}
		}

		constituencyName := fmt.Sprintf("Federal Constituency %d", constituencyID)
		if constituencyRow != nil {
			constituencyName = constituencyRow.Name
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
			StateID:               pgtype.Int2{Valid: false},
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(stateConstituencyIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(stateConstituencyIDs)),
				StatesCount:    37,
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
	}

	createdElections := make([]queries.Election, 0, len(stateConstituencyIDs))

	// Fetch all state constituencies once to find names in memory
	constituencies, err := txQueries.GetStateAssemblyConstituencies(ctx, queries.GetStateAssemblyConstituenciesParams{
		StateID:               0,
		FederalConstituencyID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch state constituencies: %w", err)
	}

	// 3. Create election records for each state constituency
	for _, constituencyID := range stateConstituencyIDs {
		var constituencyRow *queries.StateAssemblyConstituency
		for _, c := range constituencies {
			if c.ID == constituencyID {
				constituencyRow = &c
				break
			}
		}

		constituencyName := fmt.Sprintf("State Constituency %d", constituencyID)
		if constituencyRow != nil {
			constituencyName = constituencyRow.Name
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, constituencyName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:                name,
			Rank:                et.Rank,
			CandidatesCount:     0,
			ElectionDate:        pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:     groupID,
			ElectionGroupName:   groupName,
			OfficeID:            officeID,
			OfficeName:          et.Name,
			Scope:               "state-constituency",
			StateID:             pgtype.Int2{Valid: false},
			StateConstituencyID: pgtype.Int4{Int32: constituencyID, Valid: true},
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(lgaIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(lgaIDs)),
				StatesCount:    37,
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
	}

	createdElections := make([]queries.Election, 0, len(lgaIDs))

	// Fetch all LGAs once to find names in memory
	lgas, err := txQueries.GetLGAs(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LGAs: %w", err)
	}

	// 3. Create election records for each LGA
	for _, lgaID := range lgaIDs {
		var lgaRow *queries.Lga
		for _, l := range lgas {
			if l.ID == lgaID {
				lgaRow = &l
				break
			}
		}

		lgaName := fmt.Sprintf("LGA %d", lgaID)
		if lgaRow != nil {
			lgaName = lgaRow.Name
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, lgaName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:              name,
			Rank:              et.Rank,
			CandidatesCount:   0,
			ElectionDate:      pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:   groupID,
			ElectionGroupName: groupName,
			OfficeID:          officeID,
			OfficeName:        et.Name,
			Scope:             "lga",
			StateID:           pgtype.Int2{Valid: false},
			LgaID:             pgtype.Int4{Int32: lgaID, Valid: true},
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
		computedGroupName := fmt.Sprintf("%d %s Election", electionDate.Year(), et.Election)
		// Check if group already exists with this computed name
		eg, err := txQueries.GetElectionGroupByName(ctx, computedGroupName)
		if err == nil {
			// Reuse existing group and increment count
			groupID = eg.ID
			groupName = eg.Name
			_, err = txQueries.UpdateElectionGroup(ctx, queries.UpdateElectionGroupParams{
				ID:             eg.ID,
				Name:           eg.Name,
				Rank:           eg.Rank,
				ElectionsCount: eg.ElectionsCount + int32(len(wardIDs)),
				StatesCount:    eg.StatesCount,
				ElectionDate:   eg.ElectionDate,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update existing election group: %w", err)
			}
		} else {
			// Create new group
			newGroup, err := txQueries.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{
				Name:           computedGroupName,
				Rank:           et.Rank,
				ElectionsCount: int32(len(wardIDs)),
				StatesCount:    37,
				ElectionDate:   pgtype.Date{Time: electionDate, Valid: true},
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create election group: %w", err)
			}
			groupID = newGroup.ID
			groupName = newGroup.Name
		}
	}

	createdElections := make([]queries.Election, 0, len(wardIDs))

	// Fetch all wards once to find names in memory
	wards, err := txQueries.GetWards(ctx, queries.GetWardsParams{
		LgaID:   0,
		StateID: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch wards: %w", err)
	}

	// 3. Create election records for each Ward
	for _, wardID := range wardIDs {
		var wardRow *queries.Ward
		for _, w := range wards {
			if w.ID == wardID {
				wardRow = &w
				break
			}
		}

		wardName := fmt.Sprintf("Ward %d", wardID)
		if wardRow != nil {
			wardName = wardRow.Name
		}

		name := fmt.Sprintf("%s Election (%s)", et.Election, wardName)
		election, err := txQueries.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name:              name,
			Rank:              et.Rank,
			CandidatesCount:   0,
			ElectionDate:      pgtype.Date{Time: electionDate, Valid: true},
			ElectionGroupID:   groupID,
			ElectionGroupName: groupName,
			OfficeID:          officeID,
			OfficeName:        et.Name,
			Scope:             "ward",
			StateID:           pgtype.Int2{Valid: false},
			WardID:            pgtype.Int4{Int32: wardID, Valid: true},
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
	return s.queries.GetElectionInstanceByID(ctx, id)
}

func (s *ElectionsService) ListElections(ctx context.Context) ([]queries.Election, error) {
	return s.queries.ListElectionInstances(ctx)
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

	var stateID2 pgtype.Int2
	if stateID != nil {
		stateID2 = pgtype.Int2{Int16: *stateID, Valid: true}
	}
	var senatorialDistrictID4 pgtype.Int4
	if senatorialDistrictID != nil {
		senatorialDistrictID4 = pgtype.Int4{Int32: *senatorialDistrictID, Valid: true}
	}
	var federalConstituencyID4 pgtype.Int4
	if federalConstituencyID != nil {
		federalConstituencyID4 = pgtype.Int4{Int32: *federalConstituencyID, Valid: true}
	}
	var stateConstituencyID4 pgtype.Int4
	if stateConstituencyID != nil {
		stateConstituencyID4 = pgtype.Int4{Int32: *stateConstituencyID, Valid: true}
	}
	var lgaID4 pgtype.Int4
	if lgaID != nil {
		lgaID4 = pgtype.Int4{Int32: *lgaID, Valid: true}
	}
	var wardID4 pgtype.Int4
	if wardID != nil {
		wardID4 = pgtype.Int4{Int32: *wardID, Valid: true}
	}

	return s.queries.UpdateElectionInstance(ctx, queries.UpdateElectionInstanceParams{
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
}

func (s *ElectionsService) DeleteElection(ctx context.Context, id int64) error {
	return s.queries.DeleteElectionInstance(ctx, id)
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
			PartyID:        cand.PartyID,
			PartyShortName: cand.PartyShortName,
		})
		if err != nil {
			return err
		}

		err = txQueries.UpdateUserParty(ctx, queries.UpdateUserPartyParams{
			ID:      cand.CandidateID,
			PartyID: pgtype.Int8{Int64: cand.PartyID, Valid: cand.PartyID != 0},
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
	var newGroupName string
	if len(elections) == 1 {
		// Single election: Year + Election Name (which contains the entity name in parentheses if sub-national)
		newGroupName = fmt.Sprintf("%d %s", year, highestRanked.Name)
	} else {
		// 2 or more elections: Year + Highest Ranked Office Election + " Election"
		newGroupName = fmt.Sprintf("%d %s Election", year, highestRanked.OfficeElection)
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

func (s *ElectionsService) FieldPartyCandidate(ctx context.Context, electionID int64, fakeID int64, candidateID int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Look up the user's party_id using their fakeID
	user, err := txQueries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if !user.PartyID.Valid {
		return fmt.Errorf("user is not associated with a party")
	}
	partyID := user.PartyID.Int64

	// 1. Delete any existing candidate of this party on the election
	err = txQueries.DeleteElectionCandidateForParty(ctx, queries.DeleteElectionCandidateForPartyParams{
		ElectionID: electionID,
		PartyID:    pgtype.Int8{Int64: partyID, Valid: true},
	})
	if err != nil {
		return err
	}

	// 2. If a new candidateID is provided (candidateID > 0), insert it
	if candidateID > 0 {
		_, err = txQueries.CreateElectionCandidate(ctx, queries.CreateElectionCandidateParams{
			ElectionID:  electionID,
			CandidateID: candidateID,
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

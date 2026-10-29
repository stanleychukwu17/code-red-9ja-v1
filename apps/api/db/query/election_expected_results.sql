-- name: UpsertElectionGroupPollingUnitsForNationwideElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForStateElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.state_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForSenatorialDistrictElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.senatorial_district_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForFederalConstituencyElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.federal_constituency_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForStateConstituencyElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.state_constituency_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForLgaElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.lga_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: UpsertElectionGroupPollingUnitsForWardElection :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected
)
SELECT
  $1 AS election_group_id,
  pu.id,
  pu.state_id,
  pu.lga_id,
  pu.ward_id,
  pu.state_constituency_id,
  pu.federal_constituency_id,
  pu.senatorial_district_id,
  1
FROM polling_units pu
WHERE pu.ward_id = $2
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE
SET unique_final_results_expected = election_group_polling_units.unique_final_results_expected + 1,
    updated_at = NOW();

-- name: DecrementElectionGroupPollingUnitsForNationwideElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1;

-- name: DecrementElectionGroupPollingUnitsForStateElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND state_id = $2;

-- name: DecrementElectionGroupPollingUnitsForSenatorialDistrictElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND senatorial_district_id = $2;

-- name: DecrementElectionGroupPollingUnitsForFederalConstituencyElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND federal_constituency_id = $2;

-- name: DecrementElectionGroupPollingUnitsForStateConstituencyElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND state_constituency_id = $2;

-- name: DecrementElectionGroupPollingUnitsForLgaElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND lga_id = $2;

-- name: DecrementElectionGroupPollingUnitsForWardElection :exec
UPDATE election_group_polling_units
SET unique_final_results_expected = GREATEST(0, unique_final_results_expected - 1),
    updated_at = NOW()
WHERE election_group_id = $1 AND ward_id = $2;

-- name: EnsureElectionGroupParentSkeletons :exec
-- No-op: parent rollup tables dropped in favor of dynamic queries on election_group_polling_units
SELECT 1;

-- name: RollupElectionGroupExpectedResults :exec
-- No-op: dynamic aggregation replaces pre-calculated expected results rollups
SELECT 1;

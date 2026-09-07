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
WITH eg_pus AS (
  SELECT DISTINCT ep.election_group_id, ep.state_id, ep.lga_id, ep.ward_id, ep.state_constituency_id, ep.federal_constituency_id, ep.senatorial_district_id
  FROM election_group_polling_units ep
  WHERE ep.election_group_id = $1
),
ins_wards AS (
  INSERT INTO election_group_wards (election_group_id, ward_id, lga_id, state_id, polling_units_count)
  SELECT DISTINCT p.election_group_id, p.ward_id, p.lga_id, p.state_id, w.polling_units_count
  FROM eg_pus p JOIN wards w ON w.id = p.ward_id
  ON CONFLICT (election_group_id, ward_id) DO NOTHING
),
ins_lgas AS (
  INSERT INTO election_group_lgas (election_group_id, lga_id, state_id, senatorial_district_id, federal_constituency_id, state_constituencies_count, wards_count, polling_units_count)
  SELECT DISTINCT p.election_group_id, p.lga_id, p.state_id, l.senatorial_district_id, l.federal_constituency_id, l.state_constituencies_count, l.wards_count, l.polling_units_count
  FROM eg_pus p JOIN lgas l ON l.id = p.lga_id
  ON CONFLICT (election_group_id, lga_id) DO NOTHING
),
ins_sc AS (
  INSERT INTO election_group_state_constituencies (election_group_id, state_constituency_id, state_id, wards_count, polling_units_count)
  SELECT DISTINCT p.election_group_id, p.state_constituency_id, p.state_id, sc.wards_count, sc.polling_units_count
  FROM eg_pus p JOIN state_constituencies sc ON sc.id = p.state_constituency_id
  WHERE p.state_constituency_id IS NOT NULL
  ON CONFLICT (election_group_id, state_constituency_id) DO NOTHING
),
ins_fc AS (
  INSERT INTO election_group_federal_constituencies (election_group_id, federal_constituency_id, state_id, senatorial_district_id, lgas_count, state_constituencies_count, wards_count, polling_units_count)
  SELECT DISTINCT p.election_group_id, p.federal_constituency_id, p.state_id, fc.senatorial_district_id, fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
  FROM eg_pus p JOIN federal_constituencies fc ON fc.id = p.federal_constituency_id
  WHERE p.federal_constituency_id IS NOT NULL
  ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING
),
ins_sd AS (
  INSERT INTO election_group_senatorial_districts (election_group_id, senatorial_district_id, state_id, federal_constituencies_count, lgas_count, state_constituencies_count, wards_count, polling_units_count)
  SELECT DISTINCT p.election_group_id, p.senatorial_district_id, p.state_id, sd.federal_constituencies_count, sd.lgas_count, sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
  FROM eg_pus p JOIN senatorial_districts sd ON sd.id = p.senatorial_district_id
  WHERE p.senatorial_district_id IS NOT NULL
  ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING
)
INSERT INTO election_group_states (election_group_id, state_id, senatorial_districts_count, federal_constituencies_count, lgas_count, state_constituencies_count, wards_count, polling_units_count)
SELECT DISTINCT p.election_group_id, p.state_id, cs.senatorial_districts_count, cs.federal_constituencies_count, cs.lgas_count, cs.state_constituencies_count, cs.wards_count, cs.polling_units_count
FROM eg_pus p JOIN c_states cs ON cs.id = p.state_id
ON CONFLICT (election_group_id, state_id) DO NOTHING;

-- name: RollupElectionGroupExpectedResults :exec
WITH
w_sum AS (
  SELECT ep.election_group_id, ep.ward_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 GROUP BY ep.election_group_id, ep.ward_id
),
upd_w AS (
  UPDATE election_group_wards w SET unique_final_results_expected = ws.total, updated_at = NOW()
  FROM w_sum ws WHERE w.election_group_id = ws.election_group_id AND w.ward_id = ws.ward_id
),
sc_sum AS (
  SELECT ep.election_group_id, ep.state_constituency_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 AND ep.state_constituency_id IS NOT NULL GROUP BY ep.election_group_id, ep.state_constituency_id
),
upd_sc AS (
  UPDATE election_group_state_constituencies sc SET unique_final_results_expected = scs.total, updated_at = NOW()
  FROM sc_sum scs WHERE sc.election_group_id = scs.election_group_id AND sc.state_constituency_id = scs.state_constituency_id
),
lga_sum AS (
  SELECT ep.election_group_id, ep.lga_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 GROUP BY ep.election_group_id, ep.lga_id
),
upd_lga AS (
  UPDATE election_group_lgas l SET unique_final_results_expected = ls.total, updated_at = NOW()
  FROM lga_sum ls WHERE l.election_group_id = ls.election_group_id AND l.lga_id = ls.lga_id
),
fc_sum AS (
  SELECT ep.election_group_id, ep.federal_constituency_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 AND ep.federal_constituency_id IS NOT NULL GROUP BY ep.election_group_id, ep.federal_constituency_id
),
upd_fc AS (
  UPDATE election_group_federal_constituencies fc SET unique_final_results_expected = fcs.total, updated_at = NOW()
  FROM fc_sum fcs WHERE fc.election_group_id = fcs.election_group_id AND fc.federal_constituency_id = fcs.federal_constituency_id
),
sd_sum AS (
  SELECT ep.election_group_id, ep.senatorial_district_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 AND ep.senatorial_district_id IS NOT NULL GROUP BY ep.election_group_id, ep.senatorial_district_id
),
upd_sd AS (
  UPDATE election_group_senatorial_districts sd SET unique_final_results_expected = sds.total, updated_at = NOW()
  FROM sd_sum sds WHERE sd.election_group_id = sds.election_group_id AND sd.senatorial_district_id = sds.senatorial_district_id
),
state_sum AS (
  SELECT ep.election_group_id, ep.state_id, SUM(ep.unique_final_results_expected)::int AS total
  FROM election_group_polling_units ep WHERE ep.election_group_id = $1 GROUP BY ep.election_group_id, ep.state_id
)
UPDATE election_group_states st SET unique_final_results_expected = ss.total, updated_at = NOW()
FROM state_sum ss WHERE st.election_group_id = ss.election_group_id AND st.state_id = ss.state_id;

-- =====================================================
-- READ QUERIES: Base Tables
-- =====================================================

-- name: GetElectionGroupPollingUnitStats :one
SELECT * FROM election_group_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2;

-- name: ListElectionGroupPollingUnitStatsByGroup :many
SELECT * FROM election_group_polling_units
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY polling_unit_id;

-- name: GetElectionGroupWardStats :one
SELECT * FROM election_group_wards
WHERE election_group_id = $1 AND ward_id = $2;

-- name: ListElectionGroupWardStatsByGroup :many
SELECT * FROM election_group_wards
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY ward_id;

-- name: GetElectionGroupLGAStats :one
SELECT * FROM election_group_lgas
WHERE election_group_id = $1 AND lga_id = $2;

-- name: ListElectionGroupLGAStatsByGroup :many
SELECT * FROM election_group_lgas
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY lga_id;

-- name: GetElectionGroupStateConstituencyStats :one
SELECT * FROM election_group_state_constituencies
WHERE election_group_id = $1 AND state_constituency_id = $2;

-- name: ListElectionGroupStateConstituencyStatsByGroup :many
SELECT * FROM election_group_state_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY state_constituency_id;

-- name: GetElectionGroupFederalConstituencyStats :one
SELECT * FROM election_group_federal_constituencies
WHERE election_group_id = $1 AND federal_constituency_id = $2;

-- name: ListElectionGroupFederalConstituencyStatsByGroup :many
SELECT * FROM election_group_federal_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY federal_constituency_id;

-- name: GetElectionGroupSenatorialDistrictStats :one
SELECT * FROM election_group_senatorial_districts
WHERE election_group_id = $1 AND senatorial_district_id = $2;

-- name: ListElectionGroupSenatorialDistrictStatsByGroup :many
SELECT * FROM election_group_senatorial_districts
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY senatorial_district_id;

-- name: GetElectionGroupStateStats :one
SELECT * FROM election_group_states
WHERE election_group_id = $1 AND state_id = $2;

-- name: ListElectionGroupStateStatsByGroup :many
SELECT * FROM election_group_states
WHERE election_group_id = $1
ORDER BY state_id;

-- =====================================================
-- READ QUERIES: Normalized Party Stats Tables
-- =====================================================

-- name: GetElectionGroupPartyPollingUnitStats :one
SELECT * FROM election_group_parties_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesPollingUnitsByGroup :many
SELECT * FROM election_group_parties_polling_units
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY polling_unit_id, party_id;

-- name: GetElectionGroupPartyWardStats :one
SELECT * FROM election_group_parties_wards
WHERE election_group_id = $1 AND ward_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesWardsByGroup :many
SELECT * FROM election_group_parties_wards
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY ward_id, party_id;

-- name: GetElectionGroupPartyLGAStats :one
SELECT * FROM election_group_parties_lgas
WHERE election_group_id = $1 AND lga_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesLGAsByGroup :many
SELECT * FROM election_group_parties_lgas
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY lga_id, party_id;

-- name: GetElectionGroupPartyStateConstituencyStats :one
SELECT * FROM election_group_parties_state_constituencies
WHERE election_group_id = $1 AND state_constituency_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesStateConstituenciesByGroup :many
SELECT * FROM election_group_parties_state_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY state_constituency_id, party_id;

-- name: GetElectionGroupPartyFederalConstituencyStats :one
SELECT * FROM election_group_parties_federal_constituencies
WHERE election_group_id = $1 AND federal_constituency_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesFederalConstituenciesByGroup :many
SELECT * FROM election_group_parties_federal_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY federal_constituency_id, party_id;

-- name: GetElectionGroupPartySenatorialDistrictStats :one
SELECT * FROM election_group_parties_senatorial_districts
WHERE election_group_id = $1 AND senatorial_district_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesSenatorialDistrictsByGroup :many
SELECT * FROM election_group_parties_senatorial_districts
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY senatorial_district_id, party_id;

-- name: GetElectionGroupPartyStateStats :one
SELECT * FROM election_group_parties_states
WHERE election_group_id = $1 AND state_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesStatesByGroup :many
SELECT * FROM election_group_parties_states
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
ORDER BY state_id, party_id;

-- name: GetElectionGroupPartyNationalStats :one
SELECT * FROM election_group_parties_national
WHERE election_group_id = $1 AND party_id = $2;

-- name: ListElectionGroupPartiesNationalByGroup :many
SELECT * FROM election_group_parties_national
WHERE election_group_id = $1
ORDER BY party_id;

-- ============================================================
-- SEED QUERIES
-- ============================================================

-- name: SeedElectionGroupStateStats :exec
INSERT INTO election_group_states (
  election_group_id, state_id,
  senatorial_districts_count, federal_constituencies_count, lgas_count,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::integer, s.id,
  s.senatorial_districts_count, s.federal_constituencies_count, s.lgas_count,
  s.state_constituencies_count, s.wards_count, s.polling_units_count
FROM c_states s
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'                AND e.state_id = s.id)
    OR (e.scope = 'senatorial-district'  AND e.state_id = s.id)
    OR (e.scope = 'federal-constituency' AND e.state_id = s.id)
    OR (e.scope = 'lga'                  AND e.state_id = s.id)
    OR (e.scope = 'state-constituency'   AND e.state_id = s.id)
    OR (e.scope = 'ward'                 AND e.state_id = s.id)
  )
ON CONFLICT (election_group_id, state_id) DO NOTHING;

-- name: SeedElectionGroupSenatorialDistrictStats :exec
INSERT INTO election_group_senatorial_districts (
  election_group_id, senatorial_district_id, state_id,
  federal_constituencies_count, lgas_count,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::integer, sd.id, sd.state_id,
  sd.federal_constituencies_count, sd.lgas_count,
  sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
FROM senatorial_districts sd
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = sd.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = sd.id)
    OR (e.scope = 'federal-constituency' AND EXISTS (
          SELECT 1 FROM federal_constituencies fc
          WHERE fc.id = e.federal_constituency_id AND fc.senatorial_district_id = sd.id))
    OR (e.scope = 'lga'                 AND EXISTS (
          SELECT 1 FROM lgas l
          WHERE l.id = e.lga_id AND l.senatorial_district_id = sd.id))
    OR (e.scope = 'state-constituency' AND e.state_id = sd.state_id)
    OR (e.scope = 'ward'               AND e.state_id = sd.state_id)
  )
ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING;

-- name: SeedElectionGroupFederalConstituencyStats :exec
INSERT INTO election_group_federal_constituencies (
  election_group_id, federal_constituency_id, state_id, senatorial_district_id,
  lgas_count, state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::integer, fc.id, fc.state_id, fc.senatorial_district_id,
  fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
FROM federal_constituencies fc
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = fc.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = fc.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = fc.id)
    OR (e.scope = 'lga'                 AND EXISTS (
          SELECT 1 FROM lgas l
          WHERE l.id = e.lga_id AND l.federal_constituency_id = fc.id))
    OR (e.scope = 'state-constituency' AND e.state_id = fc.state_id)
    OR (e.scope = 'ward'               AND e.state_id = fc.state_id)
  )
ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING;

-- name: SeedElectionGroupLGAStats :exec
INSERT INTO election_group_lgas (
  election_group_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::integer, l.id, l.state_id, l.senatorial_district_id, l.federal_constituency_id,
  l.state_constituencies_count, l.wards_count, l.polling_units_count
FROM lgas l
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = l.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = l.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id)
    OR (e.scope = 'lga'                 AND e.lga_id = l.id)
    OR (e.scope = 'state-constituency'  AND e.state_id = l.state_id)
    OR (e.scope = 'ward'                AND e.state_id = l.state_id)
  )
ON CONFLICT (election_group_id, lga_id) DO NOTHING;

-- name: SeedElectionGroupStateConstituencyStats :exec
INSERT INTO election_group_state_constituencies (
  election_group_id, state_constituency_id, state_id,
  wards_count, polling_units_count
)
SELECT DISTINCT $1::integer, sc.id, sc.state_id,
  sc.wards_count, sc.polling_units_count
FROM state_constituencies sc
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'              AND e.state_id = sc.state_id)
    OR (e.scope = 'senatorial-district' AND e.state_id = sc.state_id)
    OR (e.scope = 'federal-constituency' AND e.state_id = sc.state_id)
    OR (e.scope = 'lga'                AND e.state_id = sc.state_id)
    OR (e.scope = 'state-constituency' AND e.state_constituency_id = sc.id)
    OR (e.scope = 'ward'               AND e.state_id = sc.state_id)
  )
ON CONFLICT (election_group_id, state_constituency_id) DO NOTHING;

-- name: SeedElectionGroupWardStats :exec
INSERT INTO election_group_wards (
  election_group_id, ward_id, lga_id, state_id,
  polling_units_count
)
SELECT DISTINCT $1::integer, w.id, w.lga_id, l.state_id,
  w.polling_units_count
FROM wards w
JOIN lgas l ON l.id = w.lga_id
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = l.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = l.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id)
    OR (e.scope = 'lga'                 AND e.lga_id = w.lga_id)
    OR (e.scope = 'state-constituency'  AND e.state_constituency_id = w.state_assembly_constituency_id)
    OR (e.scope = 'ward'                AND e.ward_id = w.id)
  )
ON CONFLICT (election_group_id, ward_id) DO NOTHING;

-- ============================================================
-- INCREMENTAL PARTY ENTRY UPSERTS
-- ============================================================

-- name: UpsertElectionGroupPUPartyEntry :exec
WITH pu_update AS (
  UPDATE election_group_polling_units
  SET
    pu_agents_count = GREATEST(0, pu_agents_count + sqlc.arg(delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
  RETURNING state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id
)
INSERT INTO election_group_parties_polling_units (
  election_group_id, polling_unit_id, party_id,
  state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id,
  pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(polling_unit_id)::int,
  sqlc.arg(party_id)::smallint,
  pu.state_id, pu.lga_id, pu.ward_id, pu.state_constituency_id, pu.federal_constituency_id, pu.senatorial_district_id,
  GREATEST(0, sqlc.arg(delta)::int),
  NOW()
FROM pu_update pu
ON CONFLICT (election_group_id, polling_unit_id, party_id) DO UPDATE SET
  pu_agents_count = GREATEST(0, election_group_parties_polling_units.pu_agents_count + sqlc.arg(delta)::int),
  updated_at = NOW();

-- name: IncrementElectionGroupPUPartyMetrics :exec
WITH pu_update AS (
  UPDATE election_group_polling_units
  SET
    pu_reports_count = pu_reports_count + sqlc.arg(reports_delta)::int,
    pu_updates_count = pu_updates_count + sqlc.arg(updates_delta)::int,
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
  RETURNING 1
)
UPDATE election_group_parties_polling_units
SET
  pu_reports_count = pu_reports_count + sqlc.arg(reports_delta)::int,
  pu_updates_count = pu_updates_count + sqlc.arg(updates_delta)::int,
  last_update_given_at = NOW(),
  pu_average_update_time_interval_in_seconds = CASE
    WHEN last_update_given_at IS NULL THEN 0.0
    ELSE (
      (COALESCE(pu_average_update_time_interval_in_seconds::numeric, 0.0) * (COALESCE(pu_updates_count::numeric, 0) + COALESCE(pu_reports_count::numeric, 0)))
      + EXTRACT(EPOCH FROM (NOW() - last_update_given_at))
    ) / (COALESCE(pu_updates_count::numeric, 0) + COALESCE(pu_reports_count::numeric, 0) + 1.0)
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: UpsertElectionGroupWardPartyEntry :exec
WITH ward_update AS (
  UPDATE election_group_wards
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND ward_id           = sqlc.arg(ward_id)::int
  RETURNING lga_id, state_id
)
INSERT INTO election_group_parties_wards (
  election_group_id, ward_id, party_id,
  lga_id, state_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(ward_id)::int,
  sqlc.arg(party_id)::smallint,
  w.lga_id, w.state_id,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
FROM ward_update w
ON CONFLICT (election_group_id, ward_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_wards.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_wards.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupLGAPartyEntry :exec
WITH lga_update AS (
  UPDATE election_group_lgas
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND lga_id            = sqlc.arg(lga_id)::int
  RETURNING state_id, senatorial_district_id, federal_constituency_id
)
INSERT INTO election_group_parties_lgas (
  election_group_id, lga_id, party_id,
  state_id, senatorial_district_id, federal_constituency_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(lga_id)::int,
  sqlc.arg(party_id)::smallint,
  l.state_id, l.senatorial_district_id, l.federal_constituency_id,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
FROM lga_update l
ON CONFLICT (election_group_id, lga_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_lgas.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_lgas.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupStateConstituencyPartyEntry :exec
WITH sc_update AS (
  UPDATE election_group_state_constituencies
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id       = sqlc.arg(election_group_id)::integer
    AND state_constituency_id   = sqlc.arg(state_constituency_id)::int
  RETURNING state_id
)
INSERT INTO election_group_parties_state_constituencies (
  election_group_id, state_constituency_id, party_id,
  state_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_constituency_id)::int,
  sqlc.arg(party_id)::smallint,
  sc.state_id,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
FROM sc_update sc
ON CONFLICT (election_group_id, state_constituency_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_state_constituencies.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_state_constituencies.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupFederalConstituencyPartyEntry :exec
WITH fc_update AS (
  UPDATE election_group_federal_constituencies
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id       = sqlc.arg(election_group_id)::integer
    AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int
  RETURNING state_id, senatorial_district_id
)
INSERT INTO election_group_parties_federal_constituencies (
  election_group_id, federal_constituency_id, party_id,
  state_id, senatorial_district_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(federal_constituency_id)::int,
  sqlc.arg(party_id)::smallint,
  fc.state_id, fc.senatorial_district_id,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
FROM fc_update fc
ON CONFLICT (election_group_id, federal_constituency_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_federal_constituencies.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_federal_constituencies.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupSenatorialDistrictPartyEntry :exec
WITH sd_update AS (
  UPDATE election_group_senatorial_districts
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id      = sqlc.arg(election_group_id)::integer
    AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int
  RETURNING state_id
)
INSERT INTO election_group_parties_senatorial_districts (
  election_group_id, senatorial_district_id, party_id,
  state_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(senatorial_district_id)::int,
  sqlc.arg(party_id)::smallint,
  sd.state_id,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
FROM sd_update sd
ON CONFLICT (election_group_id, senatorial_district_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_senatorial_districts.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_senatorial_districts.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupStatePartyEntry :exec
WITH state_update AS (
  UPDATE election_group_states
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_id          = sqlc.arg(state_id)::smallint
  RETURNING 1
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_id)::smallint,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_states.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_states.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: UpsertElectionGroupNationalPartyEntry :exec
WITH eg_update AS (
  UPDATE election_groups
  SET
    pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
    updated_at = NOW()
  WHERE id = sqlc.arg(election_group_id)::integer
  RETURNING 1
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  pu_agents_count, unique_pu_agents_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(agents_delta)::int),
  GREATEST(0, sqlc.arg(unique_pu_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  pu_agents_count        = GREATEST(0, election_group_parties_national.pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, election_group_parties_national.unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  updated_at = NOW();

-- name: GetPUPartyAgentsCount :one
SELECT COALESCE(pu_agents_count, 0)::int AS agents_count
FROM election_group_parties_polling_units
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- ============================================================
-- SUPERVISOR COUNT INCREMENTS / DECREMENTS
-- ============================================================

-- name: AdjustElectionGroupLGAWardSupervisorCounts :exec
WITH lga_update AS (
  UPDATE election_group_lgas
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND lga_id            = sqlc.arg(lga_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_lgas (
  election_group_id, lga_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(lga_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, lga_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_lgas.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_lgas.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupStateConstituencyWardSupervisorCounts :exec
WITH sc_update AS (
  UPDATE election_group_state_constituencies
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id     = sqlc.arg(election_group_id)::integer
    AND state_constituency_id = sqlc.arg(state_constituency_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_state_constituencies (
  election_group_id, state_constituency_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_constituency_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_constituency_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_state_constituencies.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_state_constituencies.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupFederalConstituencyWardSupervisorCounts :exec
WITH fc_update AS (
  UPDATE election_group_federal_constituencies
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id       = sqlc.arg(election_group_id)::integer
    AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_federal_constituencies (
  election_group_id, federal_constituency_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(federal_constituency_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, federal_constituency_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_federal_constituencies.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_federal_constituencies.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupSenatorialDistrictWardSupervisorCounts :exec
WITH sd_update AS (
  UPDATE election_group_senatorial_districts
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id      = sqlc.arg(election_group_id)::integer
    AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_senatorial_districts (
  election_group_id, senatorial_district_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(senatorial_district_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, senatorial_district_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_senatorial_districts.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_senatorial_districts.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupStateWardSupervisorCounts :exec
WITH state_update AS (
  UPDATE election_group_states
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_id          = sqlc.arg(state_id)::smallint
  RETURNING 1
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_id)::smallint,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_states.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_states.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupFederalConstituencyLGASupervisorCounts :exec
WITH fc_update AS (
  UPDATE election_group_federal_constituencies
  SET
    lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
    unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id       = sqlc.arg(election_group_id)::integer
    AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_federal_constituencies (
  election_group_id, federal_constituency_id, party_id,
  lga_supervisors_count, unique_lga_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(federal_constituency_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, federal_constituency_id, party_id) DO UPDATE SET
  lga_supervisors_count        = GREATEST(0, election_group_parties_federal_constituencies.lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, election_group_parties_federal_constituencies.unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupSenatorialDistrictLGASupervisorCounts :exec
WITH sd_update AS (
  UPDATE election_group_senatorial_districts
  SET
    lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
    unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id      = sqlc.arg(election_group_id)::integer
    AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_senatorial_districts (
  election_group_id, senatorial_district_id, party_id,
  lga_supervisors_count, unique_lga_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(senatorial_district_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, senatorial_district_id, party_id) DO UPDATE SET
  lga_supervisors_count        = GREATEST(0, election_group_parties_senatorial_districts.lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, election_group_parties_senatorial_districts.unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupStateLGASupervisorCounts :exec
WITH state_update AS (
  UPDATE election_group_states
  SET
    lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
    unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_id          = sqlc.arg(state_id)::smallint
  RETURNING 1
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  lga_supervisors_count, unique_lga_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_id)::smallint,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  lga_supervisors_count        = GREATEST(0, election_group_parties_states.lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, election_group_parties_states.unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: GetWardSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM ward_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND ward_id           = sqlc.arg(ward_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: GetLGASupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM lga_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND lga_id            = sqlc.arg(lga_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: GetStateSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM state_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND state_id          = sqlc.arg(state_id)::smallint
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: AdjustElectionGroupWardWardSupervisorCounts :exec
WITH ward_update AS (
  UPDATE election_group_wards
  SET
    ward_supervisors_count = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND ward_id           = sqlc.arg(ward_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_wards (
  election_group_id, ward_id, party_id,
  ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(ward_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, ward_id, party_id) DO UPDATE SET
  ward_supervisors_count = GREATEST(0, election_group_parties_wards.ward_supervisors_count + sqlc.arg(delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupNationalWardSupervisorCounts :exec
WITH eg_update AS (
  UPDATE election_groups
  SET
    ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
    unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE id = sqlc.arg(election_group_id)::integer
  RETURNING 1
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  ward_supervisors_count, unique_ward_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  ward_supervisors_count        = GREATEST(0, election_group_parties_national.ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, election_group_parties_national.unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupNationalLGASupervisorCounts :exec
WITH eg_update AS (
  UPDATE election_groups
  SET
    lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
    unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE id = sqlc.arg(election_group_id)::integer
  RETURNING 1
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  lga_supervisors_count, unique_lga_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  lga_supervisors_count        = GREATEST(0, election_group_parties_national.lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, election_group_parties_national.unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupNationalStateSupervisorCounts :exec
WITH eg_update AS (
  UPDATE election_groups
  SET
    state_supervisors_count        = GREATEST(0, state_supervisors_count + sqlc.arg(delta)::int),
    unique_state_supervisors_count = GREATEST(0, unique_state_supervisors_count + sqlc.arg(unique_delta)::int),
    updated_at = NOW()
  WHERE id = sqlc.arg(election_group_id)::integer
  RETURNING 1
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  state_supervisors_count, unique_state_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  GREATEST(0, sqlc.arg(unique_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  state_supervisors_count        = GREATEST(0, election_group_parties_national.state_supervisors_count + sqlc.arg(delta)::int),
  unique_state_supervisors_count = GREATEST(0, election_group_parties_national.unique_state_supervisors_count + sqlc.arg(unique_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupStateStateSupervisorCounts :exec
WITH state_update AS (
  UPDATE election_group_states
  SET
    state_supervisors_count = GREATEST(0, state_supervisors_count + sqlc.arg(delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_id          = sqlc.arg(state_id)::smallint
  RETURNING 1
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  state_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_id)::smallint,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  state_supervisors_count = GREATEST(0, election_group_parties_states.state_supervisors_count + sqlc.arg(delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupLGALGASupervisorCounts :exec
WITH lga_update AS (
  UPDATE election_group_lgas
  SET
    lga_supervisors_count = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND lga_id            = sqlc.arg(lga_id)::int
  RETURNING 1
)
INSERT INTO election_group_parties_lgas (
  election_group_id, lga_id, party_id,
  lga_supervisors_count, updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(lga_id)::int,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, lga_id, party_id) DO UPDATE SET
  lga_supervisors_count = GREATEST(0, election_group_parties_lgas.lga_supervisors_count + sqlc.arg(delta)::int),
  updated_at = NOW();

-- ============================================================
-- CASCADE REFRESH QUERIES
-- ============================================================

-- name: RefreshSingleElectionGroupPollingUnitStats :exec
WITH assignments AS (
  SELECT
    election_group_id,
    polling_unit_id,
    arrived_at,
    election_started_at,
    election_ended_at,
    election_practice_test_readiness_percentage,
    reports_count,
    updates_count,
    results_submitted_count,
    live_voters_referred_count,
    party_id
  FROM polling_unit_assignments
  WHERE polling_unit_assignments.election_group_id = $1 AND polling_unit_assignments.polling_unit_id = $2
),

assignment_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                                              AS pu_agents_count,
    COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)        AS pu_agents_in_attendance_count,
    SUM(reports_count)                                    AS pu_reports_count,
    SUM(updates_count)                                    AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM election_started_at)))                              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM election_ended_at)))                                AS pu_average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),

result_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                   AS pu_final_results_uploaded_count,
    COUNT(DISTINCT election_id) AS unique_pu_final_results_uploaded_count
  FROM polling_unit_results
  WHERE polling_unit_results.election_group_id = $1 AND polling_unit_results.polling_unit_id = $2
  GROUP BY election_group_id, polling_unit_id
),

referral_codes AS (
  SELECT
    election_group_id,
    polling_unit_id,
    SUM(live_voters_referred_count) AS pu_live_voters_referred_by_agent_count
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),

update_base AS (
  UPDATE election_group_polling_units
  SET
    pu_agents_count = COALESCE(aa.pu_agents_count, 0),
    pu_agents_in_attendance_count = COALESCE(aa.pu_agents_in_attendance_count, 0),
    pu_reports_count = COALESCE(aa.pu_reports_count, 0),
    pu_updates_count = COALESCE(aa.pu_updates_count, 0),
    pu_average_election_started_at = aa.pu_average_election_started_at,
    pu_average_election_ended_at = aa.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = COALESCE(aa.pu_election_practice_test_readiness_percentage, 0),
    pu_final_results_uploaded_count = COALESCE(ra.pu_final_results_uploaded_count, 0),
    unique_pu_final_results_uploaded_count = COALESCE(ra.unique_pu_final_results_uploaded_count, 0),
    pu_live_voters_referred_by_agent_count = COALESCE(rc.pu_live_voters_referred_by_agent_count, 0),
    updated_at = NOW()
  FROM assignment_agg aa
  LEFT JOIN result_agg ra ON aa.election_group_id = ra.election_group_id AND aa.polling_unit_id = ra.polling_unit_id
  LEFT JOIN referral_codes rc ON aa.election_group_id = rc.election_group_id AND aa.polling_unit_id = rc.polling_unit_id
  WHERE election_group_polling_units.election_group_id = aa.election_group_id
    AND election_group_polling_units.polling_unit_id = aa.polling_unit_id
  RETURNING election_group_polling_units.state_id, election_group_polling_units.lga_id, election_group_polling_units.ward_id,
            election_group_polling_units.state_constituency_id, election_group_polling_units.federal_constituency_id,
            election_group_polling_units.senatorial_district_id
),

party_expanded AS (
  SELECT
    a.election_group_id,
    a.polling_unit_id,
    a.party_id,
    COUNT(*) AS agents_count,
    COUNT(*) FILTER (WHERE a.arrived_at IS NOT NULL) AS agents_in_attendance_count,
    SUM(a.updates_count) AS updates_count,
    SUM(a.reports_count) AS reports_count,
    to_timestamp(AVG(EXTRACT(epoch FROM a.arrived_at))) AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM a.election_started_at))) AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM a.election_ended_at))) AS pu_average_election_ended_at,
    COALESCE(AVG(a.election_practice_test_readiness_percentage), 0) AS readiness_pct,
    SUM(a.live_voters_referred_count) AS referrals
  FROM assignments a
  GROUP BY a.election_group_id, a.polling_unit_id, a.party_id
),

party_results AS (
  SELECT
    r.election_group_id,
    r.polling_unit_id,
    r.party_id,
    COUNT(*) AS final_results_uploaded_count,
    COUNT(DISTINCT r.election_id) AS unique_final_results_uploaded_count
  FROM polling_unit_results r
  WHERE r.election_group_id = $1 AND r.polling_unit_id = $2
  GROUP BY r.election_group_id, r.polling_unit_id, r.party_id
),

party_intervals AS (
  SELECT
    sub.election_group_id,
    sub.polling_unit_id,
    sub.party_id,
    AVG(gap_seconds) AS avg_interval_seconds
  FROM (
    SELECT
      pu.election_group_id,
      pu.polling_unit_id,
      a2.party_id,
      EXTRACT(EPOCH FROM (pu.created_at - LAG(pu.created_at) OVER (PARTITION BY pu.election_group_id, pu.polling_unit_id, pu.user_id ORDER BY pu.created_at))) AS gap_seconds
    FROM polling_unit_updates pu
    JOIN polling_unit_assignments a2 ON pu.election_group_id = a2.election_group_id
                                    AND pu.polling_unit_id = a2.polling_unit_id
                                    AND pu.user_id = a2.user_id
    WHERE pu.election_group_id = $1 AND pu.polling_unit_id = $2
  ) sub
  WHERE gap_seconds > 0
  GROUP BY sub.election_group_id, sub.polling_unit_id, sub.party_id
)

INSERT INTO election_group_parties_polling_units (
  election_group_id, polling_unit_id, party_id,
  state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id,
  pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  updated_at
)
SELECT
  pe.election_group_id, pe.polling_unit_id, pe.party_id,
  egpu.state_id, egpu.lga_id, egpu.ward_id, egpu.state_constituency_id, egpu.federal_constituency_id, egpu.senatorial_district_id,
  pe.agents_count, pe.agents_in_attendance_count,
  COALESCE(pe.reports_count, 0), COALESCE(pe.updates_count, 0),
  pe.pu_average_arrival_time, pe.pu_average_election_started_at, pe.pu_average_election_ended_at,
  COALESCE(pr.final_results_uploaded_count, 0), COALESCE(pr.unique_final_results_uploaded_count, 0),
  COALESCE(pi.avg_interval_seconds, 0),
  pe.readiness_pct,
  COALESCE(pe.referrals, 0),
  NOW()
FROM party_expanded pe
JOIN election_group_polling_units egpu ON egpu.election_group_id = pe.election_group_id AND egpu.polling_unit_id = pe.polling_unit_id
LEFT JOIN party_results pr ON pe.election_group_id = pr.election_group_id AND pe.polling_unit_id = pr.polling_unit_id AND pe.party_id = pr.party_id
LEFT JOIN party_intervals pi ON pe.election_group_id = pi.election_group_id AND pe.polling_unit_id = pi.polling_unit_id AND pe.party_id = pi.party_id
ON CONFLICT (election_group_id, polling_unit_id, party_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  lga_id = EXCLUDED.lga_id,
  ward_id = EXCLUDED.ward_id,
  state_constituency_id = EXCLUDED.state_constituency_id,
  federal_constituency_id = EXCLUDED.federal_constituency_id,
  senatorial_district_id = EXCLUDED.senatorial_district_id,
  pu_agents_count = EXCLUDED.pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  updated_at = NOW();

-- name: GetElectionGroupPollingUnitGeoIDs :one
SELECT
  ward_id,
  lga_id,
  state_id,
  state_constituency_id,
  federal_constituency_id,
  senatorial_district_id
FROM election_group_polling_units
WHERE election_group_id = sqlc.arg(election_group_id)::integer
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int;

-- name: RefreshSingleElectionGroupWardStats :exec
WITH epu_agg AS (
  SELECT
    election_group_id, ward_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                             AS pu_agents_count,
    COUNT(*) FILTER (WHERE pu_agents_count > 0)      AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)               AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                            AS pu_reports_count,
    SUM(pu_updates_count)                            AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE pu_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE pu_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE pu_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_polling_units
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND ward_id = sqlc.arg(ward_id)::int
  GROUP BY election_group_id, ward_id, lga_id, state_id
),
insert_ward AS (
  INSERT INTO election_group_wards (
    election_group_id, ward_id, lga_id, state_id,
    unique_final_results_expected,
    pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
    pu_reports_count, pu_updates_count,
    pu_average_election_started_at, pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count,
    total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started, total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters
  )
  SELECT
    a.election_group_id, a.ward_id, a.lga_id, a.state_id,
    a.unique_final_results_expected,
    a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
    a.pu_reports_count, a.pu_updates_count,
    a.pu_average_election_started_at, a.pu_average_election_ended_at,
    a.pu_election_practice_test_readiness_percentage,
    a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
    a.pu_live_voters_referred_by_agent_count,
    a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
    a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
    a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters
  FROM epu_agg a
  ON CONFLICT (election_group_id, ward_id) DO UPDATE SET
    lga_id = EXCLUDED.lga_id,
    state_id = EXCLUDED.state_id,
    unique_final_results_expected = EXCLUDED.unique_final_results_expected,
    pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
    pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
    pu_reports_count = EXCLUDED.pu_reports_count,
    pu_updates_count = EXCLUDED.pu_updates_count,
    pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
    pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
    unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
    total_pu_with_reports = EXCLUDED.total_pu_with_reports,
    total_pu_with_updates = EXCLUDED.total_pu_with_updates,
    total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
    total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
    total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
    updated_at = NOW()
  RETURNING 1
),
party_agg AS (
  SELECT
    ppu.election_group_id, ppu.ward_id, ppu.party_id,
    ppu.lga_id, ppu.state_id,
    SUM(ppu.pu_agents_count)                      AS pu_agents_count,
    COUNT(*) FILTER (WHERE ppu.pu_agents_count > 0) AS unique_pu_agents_count,
    SUM(ppu.pu_agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(ppu.pu_updates_count)                     AS pu_updates_count,
    SUM(ppu.pu_reports_count)                     AS pu_reports_count,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(ppu.pu_final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(ppu.unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(ppu.pu_average_update_time_interval_in_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(ppu.pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(ppu.pu_live_voters_referred_by_agent_count) AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE ppu.pu_reports_count > 0)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE ppu.pu_updates_count > 0)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE ppu.pu_agents_in_attendance_count > 0) AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE ppu.pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE ppu.pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE ppu.unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE ppu.pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_parties_polling_units ppu
  WHERE ppu.election_group_id = sqlc.arg(election_group_id)::integer
    AND ppu.ward_id           = sqlc.arg(ward_id)::int
  GROUP BY ppu.election_group_id, ppu.ward_id, ppu.party_id, ppu.lga_id, ppu.state_id
)
INSERT INTO election_group_parties_wards (
  election_group_id, ward_id, party_id,
  lga_id, state_id,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_updates_count, pu_reports_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  updated_at
)
SELECT
  p.election_group_id, p.ward_id, p.party_id,
  p.lga_id, p.state_id,
  p.pu_agents_count, p.unique_pu_agents_count, p.pu_agents_in_attendance_count,
  p.pu_updates_count, p.pu_reports_count,
  p.pu_average_arrival_time, p.pu_average_election_started_at, p.pu_average_election_ended_at,
  p.pu_final_results_uploaded_count, p.unique_pu_final_results_uploaded_count,
  p.pu_average_update_time_interval_in_seconds,
  p.pu_election_practice_test_readiness_percentage,
  p.pu_live_voters_referred_by_agent_count,
  p.total_pu_with_reports, p.total_pu_with_updates, p.total_pu_with_agents_in_attendance,
  p.total_pu_where_election_has_started, p.total_pu_where_election_has_ended,
  p.total_pu_unique_final_results_uploaded, p.total_pu_where_agents_referred_live_voters,
  NOW()
FROM party_agg p
ON CONFLICT (election_group_id, ward_id, party_id) DO UPDATE SET
  lga_id = EXCLUDED.lga_id,
  state_id = EXCLUDED.state_id,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupLGAStats :exec
WITH src_agg AS (
  SELECT
    election_group_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters,
    COALESCE(SUM(ward_supervisors_count), 0)::int    AS ward_supervisors_count,
    COUNT(*) FILTER (WHERE ward_supervisors_count > 0)::int AS unique_ward_supervisors_count
  FROM election_group_wards
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND lga_id = sqlc.arg(lga_id)::int
  GROUP BY election_group_id, lga_id, state_id
),
insert_lga AS (
  INSERT INTO election_group_lgas (
    election_group_id, lga_id, state_id,
    unique_final_results_expected,
    pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
    pu_reports_count, pu_updates_count,
    pu_average_election_started_at, pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count,
    total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started, total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
    ward_supervisors_count, unique_ward_supervisors_count
  )
  SELECT
    a.election_group_id, a.lga_id, a.state_id,
    a.unique_final_results_expected,
    a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
    a.pu_reports_count, a.pu_updates_count,
    a.pu_average_election_started_at, a.pu_average_election_ended_at,
    a.pu_election_practice_test_readiness_percentage,
    a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
    a.pu_live_voters_referred_by_agent_count,
    a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
    a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
    a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
    a.ward_supervisors_count, a.unique_ward_supervisors_count
  FROM src_agg a
  ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
    state_id = EXCLUDED.state_id,
    unique_final_results_expected = EXCLUDED.unique_final_results_expected,
    pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
    pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
    pu_reports_count = EXCLUDED.pu_reports_count,
    pu_updates_count = EXCLUDED.pu_updates_count,
    pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
    pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
    unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
    total_pu_with_reports = EXCLUDED.total_pu_with_reports,
    total_pu_with_updates = EXCLUDED.total_pu_with_updates,
    total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
    total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
    total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
    ward_supervisors_count = EXCLUDED.ward_supervisors_count,
    unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
    updated_at = NOW()
  RETURNING 1
),
party_agg AS (
  SELECT
    pw.election_group_id, pw.lga_id, pw.party_id,
    pw.state_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pw.pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pw.pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pw.pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(pw.pu_agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(pw.pu_agents_count)                      AS pu_agents_count,
    SUM(pw.unique_pu_agents_count)               AS unique_pu_agents_count,
    SUM(pw.pu_updates_count)                     AS pu_updates_count,
    SUM(pw.pu_reports_count)                     AS pu_reports_count,
    SUM(pw.pu_final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(pw.unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(pw.pu_average_update_time_interval_in_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(pw.pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pw.pu_live_voters_referred_by_agent_count) AS pu_live_voters_referred_by_agent_count,
    SUM(pw.total_pu_with_reports)             AS total_pu_with_reports,
    SUM(pw.total_pu_with_updates)             AS total_pu_with_updates,
    SUM(pw.total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(pw.total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(pw.total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(pw.total_pu_unique_final_results_uploaded) AS total_pu_unique_final_results_uploaded,
    SUM(pw.total_pu_where_agents_referred_live_voters) AS total_pu_where_agents_referred_live_voters,
    SUM(pw.ward_supervisors_count)::int         AS ward_supervisors_count,
    COUNT(*) FILTER (WHERE pw.ward_supervisors_count > 0)::int AS unique_ward_supervisors_count
  FROM election_group_parties_wards pw
  WHERE pw.election_group_id = sqlc.arg(election_group_id)::integer
    AND pw.lga_id = sqlc.arg(lga_id)::int
  GROUP BY pw.election_group_id, pw.lga_id, pw.party_id, pw.state_id
)
INSERT INTO election_group_parties_lgas (
  election_group_id, lga_id, party_id,
  state_id,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  ward_supervisors_count, unique_ward_supervisors_count,
  updated_at
)
SELECT
  p.election_group_id, p.lga_id, p.party_id,
  p.state_id,
  p.pu_agents_count, p.unique_pu_agents_count, p.pu_agents_in_attendance_count,
  p.pu_reports_count, p.pu_updates_count,
  p.pu_average_arrival_time, p.pu_average_election_started_at, p.pu_average_election_ended_at,
  p.pu_final_results_uploaded_count, p.unique_pu_final_results_uploaded_count,
  p.pu_average_update_time_interval_in_seconds,
  p.pu_election_practice_test_readiness_percentage,
  p.pu_live_voters_referred_by_agent_count,
  p.total_pu_with_reports, p.total_pu_with_updates, p.total_pu_with_agents_in_attendance,
  p.total_pu_where_election_has_started, p.total_pu_where_election_has_ended,
  p.total_pu_unique_final_results_uploaded, p.total_pu_where_agents_referred_live_voters,
  p.ward_supervisors_count, p.unique_ward_supervisors_count,
  NOW()
FROM party_agg p
ON CONFLICT (election_group_id, lga_id, party_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  ward_supervisors_count = EXCLUDED.ward_supervisors_count,
  unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupStateConstituencyStats :exec
WITH src_agg AS (
  SELECT
    election_group_id, state_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters,
    COALESCE(SUM(ward_supervisors_count), 0)::int    AS ward_supervisors_count,
    COUNT(*) FILTER (WHERE ward_supervisors_count > 0)::int AS unique_ward_supervisors_count
  FROM election_group_polling_units
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_constituency_id = sqlc.arg(state_constituency_id)::int
  GROUP BY election_group_id, state_constituency_id, state_id
),
insert_sc AS (
  INSERT INTO election_group_state_constituencies (
    election_group_id, state_constituency_id, state_id,
    unique_final_results_expected,
    pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
    pu_reports_count, pu_updates_count,
    pu_average_election_started_at, pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count,
    total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started, total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
    ward_supervisors_count, unique_ward_supervisors_count
  )
  SELECT
    a.election_group_id, a.state_constituency_id, a.state_id,
    a.unique_final_results_expected,
    a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
    a.pu_reports_count, a.pu_updates_count,
    a.pu_average_election_started_at, a.pu_average_election_ended_at,
    a.pu_election_practice_test_readiness_percentage,
    a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
    a.pu_live_voters_referred_by_agent_count,
    a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
    a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
    a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
    a.ward_supervisors_count, a.unique_ward_supervisors_count
  FROM src_agg a
  ON CONFLICT (election_group_id, state_constituency_id) DO UPDATE SET
    state_id = EXCLUDED.state_id,
    unique_final_results_expected = EXCLUDED.unique_final_results_expected,
    pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
    pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
    pu_reports_count = EXCLUDED.pu_reports_count,
    pu_updates_count = EXCLUDED.pu_updates_count,
    pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
    pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
    unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
    total_pu_with_reports = EXCLUDED.total_pu_with_reports,
    total_pu_with_updates = EXCLUDED.total_pu_with_updates,
    total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
    total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
    total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
    ward_supervisors_count = EXCLUDED.ward_supervisors_count,
    unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
    updated_at = NOW()
  RETURNING 1
),
party_agg AS (
  SELECT
    ppu.election_group_id, ppu.state_constituency_id, ppu.party_id,
    ppu.state_id,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM ppu.pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(ppu.pu_agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(ppu.pu_agents_count)                      AS pu_agents_count,
    SUM(ppu.unique_pu_agents_count)               AS unique_pu_agents_count,
    SUM(ppu.pu_updates_count)                     AS pu_updates_count,
    SUM(ppu.pu_reports_count)                     AS pu_reports_count,
    SUM(ppu.pu_final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(ppu.unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(ppu.pu_average_update_time_interval_in_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(ppu.pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(ppu.pu_live_voters_referred_by_agent_count) AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE ppu.pu_reports_count > 0)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE ppu.pu_updates_count > 0)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE ppu.pu_agents_in_attendance_count > 0) AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE ppu.pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE ppu.pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE ppu.unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE ppu.pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_parties_polling_units ppu
  WHERE ppu.election_group_id = sqlc.arg(election_group_id)::integer
    AND ppu.state_constituency_id = sqlc.arg(state_constituency_id)::int
  GROUP BY ppu.election_group_id, ppu.state_constituency_id, ppu.party_id, ppu.state_id
)
INSERT INTO election_group_parties_state_constituencies (
  election_group_id, state_constituency_id, party_id,
  state_id,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  updated_at
)
SELECT
  p.election_group_id, p.state_constituency_id, p.party_id,
  p.state_id,
  p.pu_agents_count, p.unique_pu_agents_count, p.pu_agents_in_attendance_count,
  p.pu_reports_count, p.pu_updates_count,
  p.pu_average_arrival_time, p.pu_average_election_started_at, p.pu_average_election_ended_at,
  p.pu_final_results_uploaded_count, p.unique_pu_final_results_uploaded_count,
  p.pu_average_update_time_interval_in_seconds,
  p.pu_election_practice_test_readiness_percentage,
  p.pu_live_voters_referred_by_agent_count,
  p.total_pu_with_reports, p.total_pu_with_updates, p.total_pu_with_agents_in_attendance,
  p.total_pu_where_election_has_started, p.total_pu_where_election_has_ended,
  p.total_pu_unique_final_results_uploaded, p.total_pu_where_agents_referred_live_voters,
  NOW()
FROM party_agg p
ON CONFLICT (election_group_id, state_constituency_id, party_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupStateStats :exec
WITH src_agg AS (
  SELECT
    election_group_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters,
    COALESCE(SUM(lga_supervisors_count), 0)::int     AS lga_supervisors_count,
    COUNT(*) FILTER (WHERE lga_supervisors_count > 0)::int AS unique_lga_supervisors_count,
    COALESCE(SUM(ward_supervisors_count), 0)::int    AS ward_supervisors_count,
    COALESCE(SUM(unique_ward_supervisors_count), 0)::int AS unique_ward_supervisors_count
  FROM election_group_lgas
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND state_id = sqlc.arg(state_id)::smallint
  GROUP BY election_group_id, state_id
),
insert_state AS (
  INSERT INTO election_group_states (
    election_group_id, state_id,
    unique_final_results_expected,
    pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
    pu_reports_count, pu_updates_count,
    pu_average_election_started_at, pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count,
    total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started, total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
    lga_supervisors_count, unique_lga_supervisors_count,
    ward_supervisors_count, unique_ward_supervisors_count
  )
  SELECT
    a.election_group_id, a.state_id,
    a.unique_final_results_expected,
    a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
    a.pu_reports_count, a.pu_updates_count,
    a.pu_average_election_started_at, a.pu_average_election_ended_at,
    a.pu_election_practice_test_readiness_percentage,
    a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
    a.pu_live_voters_referred_by_agent_count,
    a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
    a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
    a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
    a.lga_supervisors_count, a.unique_lga_supervisors_count,
    a.ward_supervisors_count, a.unique_ward_supervisors_count
  FROM src_agg a
  ON CONFLICT (election_group_id, state_id) DO UPDATE SET
    unique_final_results_expected = EXCLUDED.unique_final_results_expected,
    pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
    pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
    pu_reports_count = EXCLUDED.pu_reports_count,
    pu_updates_count = EXCLUDED.pu_updates_count,
    pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
    pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
    pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
    unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
    pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
    total_pu_with_reports = EXCLUDED.total_pu_with_reports,
    total_pu_with_updates = EXCLUDED.total_pu_with_updates,
    total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
    total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
    total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
    total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
    total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
    lga_supervisors_count = EXCLUDED.lga_supervisors_count,
    unique_lga_supervisors_count = EXCLUDED.unique_lga_supervisors_count,
    ward_supervisors_count = EXCLUDED.ward_supervisors_count,
    unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
    updated_at = NOW()
  RETURNING 1
),
party_agg AS (
  SELECT
    pl.election_group_id, pl.state_id, pl.party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pl.pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pl.pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pl.pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(pl.pu_agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(pl.pu_agents_count)                      AS pu_agents_count,
    SUM(pl.unique_pu_agents_count)               AS unique_pu_agents_count,
    SUM(pl.pu_updates_count)                     AS pu_updates_count,
    SUM(pl.pu_reports_count)                     AS pu_reports_count,
    SUM(pl.pu_final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(pl.unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(pl.pu_average_update_time_interval_in_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(pl.pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pl.pu_live_voters_referred_by_agent_count) AS pu_live_voters_referred_by_agent_count,
    SUM(pl.total_pu_with_reports)             AS total_pu_with_reports,
    SUM(pl.total_pu_with_updates)             AS total_pu_with_updates,
    SUM(pl.total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(pl.total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(pl.total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(pl.total_pu_unique_final_results_uploaded) AS total_pu_unique_final_results_uploaded,
    SUM(pl.total_pu_where_agents_referred_live_voters) AS total_pu_where_agents_referred_live_voters,
    SUM(pl.lga_supervisors_count)::int          AS lga_supervisors_count,
    COUNT(*) FILTER (WHERE pl.lga_supervisors_count > 0)::int AS unique_lga_supervisors_count,
    SUM(pl.ward_supervisors_count)::int         AS ward_supervisors_count,
    SUM(pl.unique_ward_supervisors_count)::int  AS unique_ward_supervisors_count
  FROM election_group_parties_lgas pl
  WHERE pl.election_group_id = sqlc.arg(election_group_id)::integer
    AND pl.state_id = sqlc.arg(state_id)::smallint
  GROUP BY pl.election_group_id, pl.state_id, pl.party_id
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  lga_supervisors_count, unique_lga_supervisors_count,
  ward_supervisors_count, unique_ward_supervisors_count,
  updated_at
)
SELECT
  p.election_group_id, p.state_id, p.party_id,
  p.pu_agents_count, p.unique_pu_agents_count, p.pu_agents_in_attendance_count,
  p.pu_reports_count, p.pu_updates_count,
  p.pu_average_arrival_time, p.pu_average_election_started_at, p.pu_average_election_ended_at,
  p.pu_final_results_uploaded_count, p.unique_pu_final_results_uploaded_count,
  p.pu_average_update_time_interval_in_seconds,
  p.pu_election_practice_test_readiness_percentage,
  p.pu_live_voters_referred_by_agent_count,
  p.total_pu_with_reports, p.total_pu_with_updates, p.total_pu_with_agents_in_attendance,
  p.total_pu_where_election_has_started, p.total_pu_where_election_has_ended,
  p.total_pu_unique_final_results_uploaded, p.total_pu_where_agents_referred_live_voters,
  p.lga_supervisors_count, p.unique_lga_supervisors_count,
  p.ward_supervisors_count, p.unique_ward_supervisors_count,
  NOW()
FROM party_agg p
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  lga_supervisors_count = EXCLUDED.lga_supervisors_count,
  unique_lga_supervisors_count = EXCLUDED.unique_lga_supervisors_count,
  ward_supervisors_count = EXCLUDED.ward_supervisors_count,
  unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupGlobalStats :exec
WITH src_agg AS (
  SELECT
    election_group_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters,
    COALESCE(SUM(state_supervisors_count), 0)::int   AS state_supervisors_count,
    COUNT(*) FILTER (WHERE state_supervisors_count > 0)::int AS unique_state_supervisors_count,
    COALESCE(SUM(lga_supervisors_count), 0)::int     AS lga_supervisors_count,
    COALESCE(SUM(unique_lga_supervisors_count), 0)::int AS unique_lga_supervisors_count,
    COALESCE(SUM(ward_supervisors_count), 0)::int    AS ward_supervisors_count,
    COALESCE(SUM(unique_ward_supervisors_count), 0)::int AS unique_ward_supervisors_count
  FROM election_group_states
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
  GROUP BY election_group_id
),
update_eg AS (
  UPDATE election_groups
  SET
    unique_final_results_expected = COALESCE(s.unique_final_results_expected, 0),
    pu_agents_count = COALESCE(s.pu_agents_count, 0),
    unique_pu_agents_count = COALESCE(s.unique_pu_agents_count, 0),
    pu_agents_in_attendance_count = COALESCE(s.pu_agents_in_attendance_count, 0),
    pu_reports_count = COALESCE(s.pu_reports_count, 0),
    pu_updates_count = COALESCE(s.pu_updates_count, 0),
    pu_average_election_started_at = s.pu_average_election_started_at,
    pu_average_election_ended_at = s.pu_average_election_ended_at,
    pu_election_practice_test_readiness_percentage = COALESCE(s.pu_election_practice_test_readiness_percentage, 0),
    pu_final_results_uploaded_count = COALESCE(s.pu_final_results_uploaded_count, 0),
    unique_pu_final_results_uploaded_count = COALESCE(s.unique_pu_final_results_uploaded_count, 0),
    pu_live_voters_referred_by_agent_count = COALESCE(s.pu_live_voters_referred_by_agent_count, 0),
    total_pu_with_reports = COALESCE(s.total_pu_with_reports, 0),
    total_pu_with_updates = COALESCE(s.total_pu_with_updates, 0),
    total_pu_with_agents_in_attendance = COALESCE(s.total_pu_with_agents_in_attendance, 0),
    total_pu_where_election_has_started = COALESCE(s.total_pu_where_election_has_started, 0),
    total_pu_where_election_has_ended = COALESCE(s.total_pu_where_election_has_ended, 0),
    total_pu_unique_final_results_uploaded = COALESCE(s.total_pu_unique_final_results_uploaded, 0),
    total_pu_where_agents_referred_live_voters = COALESCE(s.total_pu_where_agents_referred_live_voters, 0),
    state_supervisors_count = COALESCE(s.state_supervisors_count, 0),
    unique_state_supervisors_count = COALESCE(s.unique_state_supervisors_count, 0),
    lga_supervisors_count = COALESCE(s.lga_supervisors_count, 0),
    unique_lga_supervisors_count = COALESCE(s.unique_lga_supervisors_count, 0),
    ward_supervisors_count = COALESCE(s.ward_supervisors_count, 0),
    unique_ward_supervisors_count = COALESCE(s.unique_ward_supervisors_count, 0),
    updated_at = NOW()
  FROM src_agg s
  WHERE election_groups.id = s.election_group_id
  RETURNING 1
),
party_agg AS (
  SELECT
    ps.election_group_id, ps.party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM ps.pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM ps.pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM ps.pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(ps.pu_agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(ps.pu_agents_count)                      AS pu_agents_count,
    SUM(ps.unique_pu_agents_count)               AS unique_pu_agents_count,
    SUM(ps.pu_updates_count)                     AS pu_updates_count,
    SUM(ps.pu_reports_count)                     AS pu_reports_count,
    SUM(ps.pu_final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(ps.unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(ps.pu_average_update_time_interval_in_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(ps.pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(ps.pu_live_voters_referred_by_agent_count) AS pu_live_voters_referred_by_agent_count,
    SUM(ps.total_pu_with_reports)             AS total_pu_with_reports,
    SUM(ps.total_pu_with_updates)             AS total_pu_with_updates,
    SUM(ps.total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(ps.total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(ps.total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(ps.total_pu_unique_final_results_uploaded) AS total_pu_unique_final_results_uploaded,
    SUM(ps.total_pu_where_agents_referred_live_voters) AS total_pu_where_agents_referred_live_voters,
    SUM(ps.state_supervisors_count)::int        AS state_supervisors_count,
    COUNT(*) FILTER (WHERE ps.state_supervisors_count > 0)::int AS unique_state_supervisors_count,
    SUM(ps.lga_supervisors_count)::int          AS lga_supervisors_count,
    SUM(ps.unique_lga_supervisors_count)::int   AS unique_lga_supervisors_count,
    SUM(ps.ward_supervisors_count)::int         AS ward_supervisors_count,
    SUM(ps.unique_ward_supervisors_count)::int  AS unique_ward_supervisors_count
  FROM election_group_parties_states ps
  WHERE ps.election_group_id = sqlc.arg(election_group_id)::integer
  GROUP BY ps.election_group_id, ps.party_id
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  state_supervisors_count, unique_state_supervisors_count,
  lga_supervisors_count, unique_lga_supervisors_count,
  ward_supervisors_count, unique_ward_supervisors_count,
  updated_at
)
SELECT
  p.election_group_id, p.party_id,
  p.pu_agents_count, p.unique_pu_agents_count, p.pu_agents_in_attendance_count,
  p.pu_reports_count, p.pu_updates_count,
  p.pu_average_arrival_time, p.pu_average_election_started_at, p.pu_average_election_ended_at,
  p.pu_final_results_uploaded_count, p.unique_pu_final_results_uploaded_count,
  p.pu_average_update_time_interval_in_seconds,
  p.pu_election_practice_test_readiness_percentage,
  p.pu_live_voters_referred_by_agent_count,
  p.total_pu_with_reports, p.total_pu_with_updates, p.total_pu_with_agents_in_attendance,
  p.total_pu_where_election_has_started, p.total_pu_where_election_has_ended,
  p.total_pu_unique_final_results_uploaded, p.total_pu_where_agents_referred_live_voters,
  p.state_supervisors_count, p.unique_state_supervisors_count,
  p.lga_supervisors_count, p.unique_lga_supervisors_count,
  p.ward_supervisors_count, p.unique_ward_supervisors_count,
  NOW()
FROM party_agg p
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_average_update_time_interval_in_seconds = EXCLUDED.pu_average_update_time_interval_in_seconds,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  state_supervisors_count = EXCLUDED.state_supervisors_count,
  unique_state_supervisors_count = EXCLUDED.unique_state_supervisors_count,
  lga_supervisors_count = EXCLUDED.lga_supervisors_count,
  unique_lga_supervisors_count = EXCLUDED.unique_lga_supervisors_count,
  ward_supervisors_count = EXCLUDED.ward_supervisors_count,
  unique_ward_supervisors_count = EXCLUDED.unique_ward_supervisors_count,
  updated_at = NOW();

-- ============================================================
-- APPLICATION COUNT INCREMENT QUERIES
-- ============================================================

-- name: AdjustElectionGroupPollingUnitApplicationCounts :exec
WITH pu_update AS (
  INSERT INTO election_group_polling_units (
    election_group_id, polling_unit_id, state_id, lga_id, ward_id,
    state_constituency_id, federal_constituency_id, senatorial_district_id,
    applications_count, accepted_applications_count, rejected_applications_count
  )
  SELECT
    sqlc.arg(election_group_id)::integer,
    sqlc.arg(polling_unit_id)::int,
    pu.state_id, pu.lga_id, pu.ward_id,
    w.state_constituency_id, l.federal_constituency_id, l.senatorial_district_id,
    GREATEST(0, sqlc.arg(app_delta)::int),
    GREATEST(0, sqlc.arg(accepted_delta)::int),
    GREATEST(0, sqlc.arg(rejected_delta)::int)
  FROM polling_units pu
  JOIN wards w ON w.id = pu.ward_id
  JOIN lgas l ON l.id = pu.lga_id
  WHERE pu.id = sqlc.arg(polling_unit_id)::int
  ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE SET
    applications_count          = GREATEST(0, election_group_polling_units.applications_count + sqlc.arg(app_delta)::int),
    accepted_applications_count = GREATEST(0, election_group_polling_units.accepted_applications_count + sqlc.arg(accepted_delta)::int),
    rejected_applications_count = GREATEST(0, election_group_polling_units.rejected_applications_count + sqlc.arg(rejected_delta)::int),
    updated_at = NOW()
  RETURNING state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id
)
INSERT INTO election_group_parties_polling_units (
  election_group_id, polling_unit_id, party_id,
  state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(polling_unit_id)::int,
  sqlc.arg(party_id)::smallint,
  pu.state_id, pu.lga_id, pu.ward_id, pu.state_constituency_id, pu.federal_constituency_id, pu.senatorial_district_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  NOW()
FROM pu_update pu
ON CONFLICT (election_group_id, polling_unit_id, party_id) DO UPDATE SET
  applications_count          = GREATEST(0, election_group_parties_polling_units.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count = GREATEST(0, election_group_parties_polling_units.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count = GREATEST(0, election_group_parties_polling_units.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupWardApplicationCounts :exec
WITH ward_update AS (
  INSERT INTO election_group_wards (
    election_group_id, ward_id, lga_id, state_id,
    applications_count, accepted_applications_count, rejected_applications_count,
    ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count
  )
  SELECT
    sqlc.arg(election_group_id)::integer,
    sqlc.arg(ward_id)::int,
    w.lga_id, l.state_id,
    GREATEST(0, sqlc.arg(app_delta)::int),
    GREATEST(0, sqlc.arg(accepted_delta)::int),
    GREATEST(0, sqlc.arg(rejected_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int)
  FROM wards w
  JOIN lgas l ON l.id = w.lga_id
  WHERE w.id = sqlc.arg(ward_id)::int
  ON CONFLICT (election_group_id, ward_id) DO UPDATE SET
    applications_count                          = GREATEST(0, election_group_wards.applications_count + sqlc.arg(app_delta)::int),
    accepted_applications_count                 = GREATEST(0, election_group_wards.accepted_applications_count + sqlc.arg(accepted_delta)::int),
    rejected_applications_count                 = GREATEST(0, election_group_wards.rejected_applications_count + sqlc.arg(rejected_delta)::int),
    ward_supervisor_applications_count          = GREATEST(0, election_group_wards.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
    ward_supervisor_accepted_applications_count = GREATEST(0, election_group_wards.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
    ward_supervisor_rejected_applications_count = GREATEST(0, election_group_wards.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
    updated_at = NOW()
  RETURNING lga_id, state_id
)
INSERT INTO election_group_parties_wards (
  election_group_id, ward_id, party_id,
  lga_id, state_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(ward_id)::int,
  sqlc.arg(party_id)::smallint,
  w.lga_id, w.state_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  NOW()
FROM ward_update w
ON CONFLICT (election_group_id, ward_id, party_id) DO UPDATE SET
  applications_count                          = GREATEST(0, election_group_parties_wards.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                 = GREATEST(0, election_group_parties_wards.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                 = GREATEST(0, election_group_parties_wards.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count          = GREATEST(0, election_group_parties_wards.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count = GREATEST(0, election_group_parties_wards.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count = GREATEST(0, election_group_parties_wards.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupLGAApplicationCounts :exec
WITH lga_update AS (
  INSERT INTO election_group_lgas (
    election_group_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
    applications_count, accepted_applications_count, rejected_applications_count,
    ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
    lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count
  )
  SELECT
    sqlc.arg(election_group_id)::integer,
    sqlc.arg(lga_id)::int,
    l.state_id, l.senatorial_district_id, l.federal_constituency_id,
    GREATEST(0, sqlc.arg(app_delta)::int),
    GREATEST(0, sqlc.arg(accepted_delta)::int),
    GREATEST(0, sqlc.arg(rejected_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int)
  FROM lgas l
  WHERE l.id = sqlc.arg(lga_id)::int
  ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
    applications_count                          = GREATEST(0, election_group_lgas.applications_count + sqlc.arg(app_delta)::int),
    accepted_applications_count                 = GREATEST(0, election_group_lgas.accepted_applications_count + sqlc.arg(accepted_delta)::int),
    rejected_applications_count                 = GREATEST(0, election_group_lgas.rejected_applications_count + sqlc.arg(rejected_delta)::int),
    ward_supervisor_applications_count          = GREATEST(0, election_group_lgas.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
    ward_supervisor_accepted_applications_count = GREATEST(0, election_group_lgas.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
    ward_supervisor_rejected_applications_count = GREATEST(0, election_group_lgas.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
    lga_supervisor_applications_count           = GREATEST(0, election_group_lgas.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
    lga_supervisor_accepted_applications_count  = GREATEST(0, election_group_lgas.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
    lga_supervisor_rejected_applications_count  = GREATEST(0, election_group_lgas.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
    updated_at = NOW()
  RETURNING state_id, senatorial_district_id, federal_constituency_id
)
INSERT INTO election_group_parties_lgas (
  election_group_id, lga_id, party_id,
  state_id, senatorial_district_id, federal_constituency_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
  updated_at
)
SELECT
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(lga_id)::int,
  sqlc.arg(party_id)::smallint,
  l.state_id, l.senatorial_district_id, l.federal_constituency_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
  NOW()
FROM lga_update l
ON CONFLICT (election_group_id, lga_id, party_id) DO UPDATE SET
  applications_count                          = GREATEST(0, election_group_parties_lgas.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                 = GREATEST(0, election_group_parties_lgas.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                 = GREATEST(0, election_group_parties_lgas.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count          = GREATEST(0, election_group_parties_lgas.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count = GREATEST(0, election_group_parties_lgas.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count = GREATEST(0, election_group_parties_lgas.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  lga_supervisor_applications_count           = GREATEST(0, election_group_parties_lgas.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
  lga_supervisor_accepted_applications_count  = GREATEST(0, election_group_parties_lgas.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
  lga_supervisor_rejected_applications_count  = GREATEST(0, election_group_parties_lgas.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupStateApplicationCounts :exec
WITH state_update AS (
  INSERT INTO election_group_states (
    election_group_id, state_id,
    applications_count, accepted_applications_count, rejected_applications_count,
    ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
    lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
    state_supervisor_applications_count, state_supervisor_accepted_applications_count, state_supervisor_rejected_applications_count
  )
  VALUES (
    sqlc.arg(election_group_id)::integer,
    sqlc.arg(state_id)::smallint,
    GREATEST(0, sqlc.arg(app_delta)::int),
    GREATEST(0, sqlc.arg(accepted_delta)::int),
    GREATEST(0, sqlc.arg(rejected_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
    GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
    GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
    GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int)
  )
  ON CONFLICT (election_group_id, state_id) DO UPDATE SET
    applications_count                            = GREATEST(0, election_group_states.applications_count + sqlc.arg(app_delta)::int),
    accepted_applications_count                   = GREATEST(0, election_group_states.accepted_applications_count + sqlc.arg(accepted_delta)::int),
    rejected_applications_count                   = GREATEST(0, election_group_states.rejected_applications_count + sqlc.arg(rejected_delta)::int),
    ward_supervisor_applications_count            = GREATEST(0, election_group_states.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
    ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_states.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
    ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_states.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
    lga_supervisor_applications_count             = GREATEST(0, election_group_states.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
    lga_supervisor_accepted_applications_count    = GREATEST(0, election_group_states.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
    lga_supervisor_rejected_applications_count    = GREATEST(0, election_group_states.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
    state_supervisor_applications_count           = GREATEST(0, election_group_states.state_supervisor_applications_count + sqlc.arg(state_sup_app_delta)::int),
    state_supervisor_accepted_applications_count  = GREATEST(0, election_group_states.state_supervisor_accepted_applications_count + sqlc.arg(state_sup_accepted_delta)::int),
    state_supervisor_rejected_applications_count  = GREATEST(0, election_group_states.state_supervisor_rejected_applications_count + sqlc.arg(state_sup_rejected_delta)::int),
    updated_at = NOW()
  RETURNING 1
)
INSERT INTO election_group_parties_states (
  election_group_id, state_id, party_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
  state_supervisor_applications_count, state_supervisor_accepted_applications_count, state_supervisor_rejected_applications_count,
  updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(state_id)::smallint,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, state_id, party_id) DO UPDATE SET
  applications_count                            = GREATEST(0, election_group_parties_states.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                   = GREATEST(0, election_group_parties_states.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                   = GREATEST(0, election_group_parties_states.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count            = GREATEST(0, election_group_parties_states.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_parties_states.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_parties_states.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  lga_supervisor_applications_count             = GREATEST(0, election_group_parties_states.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
  lga_supervisor_accepted_applications_count    = GREATEST(0, election_group_parties_states.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
  lga_supervisor_rejected_applications_count    = GREATEST(0, election_group_parties_states.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
  state_supervisor_applications_count           = GREATEST(0, election_group_parties_states.state_supervisor_applications_count + sqlc.arg(state_sup_app_delta)::int),
  state_supervisor_accepted_applications_count  = GREATEST(0, election_group_parties_states.state_supervisor_accepted_applications_count + sqlc.arg(state_sup_accepted_delta)::int),
  state_supervisor_rejected_applications_count  = GREATEST(0, election_group_parties_states.state_supervisor_rejected_applications_count + sqlc.arg(state_sup_rejected_delta)::int),
  updated_at = NOW();

-- name: AdjustElectionGroupNationalApplicationCounts :exec
WITH eg_update AS (
  UPDATE election_groups
  SET
    applications_count                            = GREATEST(0, election_groups.applications_count + sqlc.arg(app_delta)::int),
    accepted_applications_count                   = GREATEST(0, election_groups.accepted_applications_count + sqlc.arg(accepted_delta)::int),
    rejected_applications_count                   = GREATEST(0, election_groups.rejected_applications_count + sqlc.arg(rejected_delta)::int),
    ward_supervisor_applications_count            = GREATEST(0, election_groups.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
    ward_supervisor_accepted_applications_count   = GREATEST(0, election_groups.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
    ward_supervisor_rejected_applications_count   = GREATEST(0, election_groups.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
    lga_supervisor_applications_count             = GREATEST(0, election_groups.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
    lga_supervisor_accepted_applications_count    = GREATEST(0, election_groups.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
    lga_supervisor_rejected_applications_count    = GREATEST(0, election_groups.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
    state_supervisor_applications_count           = GREATEST(0, election_groups.state_supervisor_applications_count + sqlc.arg(state_sup_app_delta)::int),
    state_supervisor_accepted_applications_count  = GREATEST(0, election_groups.state_supervisor_accepted_applications_count + sqlc.arg(state_sup_accepted_delta)::int),
    state_supervisor_rejected_applications_count  = GREATEST(0, election_groups.state_supervisor_rejected_applications_count + sqlc.arg(state_sup_rejected_delta)::int),
    updated_at = NOW()
  WHERE id = sqlc.arg(election_group_id)::integer
  RETURNING 1
)
INSERT INTO election_group_parties_national (
  election_group_id, party_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
  state_supervisor_applications_count, state_supervisor_accepted_applications_count, state_supervisor_rejected_applications_count,
  updated_at
)
VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int),
  NOW()
)
ON CONFLICT (election_group_id, party_id) DO UPDATE SET
  applications_count                            = GREATEST(0, election_group_parties_national.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                   = GREATEST(0, election_group_parties_national.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                   = GREATEST(0, election_group_parties_national.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count            = GREATEST(0, election_group_parties_national.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_parties_national.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_parties_national.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  lga_supervisor_applications_count             = GREATEST(0, election_group_parties_national.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
  lga_supervisor_accepted_applications_count    = GREATEST(0, election_group_parties_national.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
  lga_supervisor_rejected_applications_count    = GREATEST(0, election_group_parties_national.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
  state_supervisor_applications_count           = GREATEST(0, election_group_parties_national.state_supervisor_applications_count + sqlc.arg(state_sup_app_delta)::int),
  state_supervisor_accepted_applications_count  = GREATEST(0, election_group_parties_national.state_supervisor_accepted_applications_count + sqlc.arg(state_sup_accepted_delta)::int),
  state_supervisor_rejected_applications_count  = GREATEST(0, election_group_parties_national.state_supervisor_rejected_applications_count + sqlc.arg(state_sup_rejected_delta)::int),
  updated_at = NOW();

-- name: GetCountryByID :one
SELECT id, name, iso2, phonecode FROM c_countries
WHERE id = $1 LIMIT 1;

-- name: GetStateByID :one
SELECT id, name FROM c_states
WHERE id = $1 and country_id = $2 LIMIT 1;

-- name: GetCityByID :one
SELECT id, name FROM c_cities
WHERE id = $1 and state_id = $2 LIMIT 1;

-- name: ListCountries :many
SELECT id, name, iso2, phonecode FROM c_countries
ORDER BY name ASC;

-- name: ListAllStates :many
SELECT * FROM c_states
ORDER BY name ASC;

-- name: GetStatesByCountryID :many
SELECT * FROM c_states
WHERE country_id = $1
ORDER BY name ASC;

-- name: GetCitiesByStateID :many
SELECT id, name FROM c_cities
WHERE state_id = $1
ORDER BY city_rank DESC, name ASC;

-- name: GetSenatorialDistricts :many
SELECT * FROM senatorial_districts
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetFederalConstituencies :many
SELECT * FROM federal_constituencies
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id)) AND (sqlc.arg(senatorial_district_id)::int = 0 OR senatorial_district_id = sqlc.arg(senatorial_district_id))
ORDER BY name ASC;

-- name: GetStateAssemblyConstituencies :many
SELECT * FROM state_assembly_constituencies
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id)) AND (sqlc.arg(federal_constituency_id)::int = 0 OR federal_constituency_id = sqlc.arg(federal_constituency_id))
ORDER BY name ASC;

-- name: GetLGAs :many
SELECT * FROM lgas
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetWards :many
SELECT * FROM wards
WHERE (sqlc.arg(lga_id)::int = 0 OR lga_id = sqlc.arg(lga_id)) AND (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetPollingUnits :many
SELECT * FROM polling_units
WHERE (sqlc.arg(ward_id)::int = 0 OR ward_id = sqlc.arg(ward_id)) AND (sqlc.arg(lga_id)::int = 0 OR lga_id = sqlc.arg(lga_id)) AND (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetPollingUnitsWithPartyCount :many
SELECT
  pu.*,
  COALESCE(
    (
      SELECT COUNT(*)::integer
      FROM polling_unit_assignments pua
      WHERE pua.polling_unit_id = pu.id
        AND pua.party_id = sqlc.arg(party_id)::smallint
        AND pua.election_group_id = sqlc.arg(election_group_id)::bigint
        AND pua.role_type = 'polling_agent'
    ),
    0
  )::integer AS agents_count
FROM polling_units pu
WHERE (sqlc.arg(ward_id)::int = 0 OR pu.ward_id = sqlc.arg(ward_id)) 
  AND (sqlc.arg(lga_id)::int = 0 OR pu.lga_id = sqlc.arg(lga_id)) 
  AND (sqlc.arg(state_id)::int = 0 OR pu.state_id = sqlc.arg(state_id))
ORDER BY pu.name ASC;


-- name: GetStateDetailsByID :one
SELECT * FROM c_states
WHERE id = $1 LIMIT 1;

-- name: CreateState :one
INSERT INTO c_states (name, country_id, country_code, latitude, longitude)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateState :one
UPDATE c_states
SET name = $2, country_id = $3, country_code = $4, latitude = $5, longitude = $6
WHERE id = $1
RETURNING *;

-- name: DeleteState :exec
DELETE FROM c_states
WHERE id = $1;

-- name: GetFederalConstituencyByID :one
SELECT * FROM federal_constituencies
WHERE id = $1 LIMIT 1;

-- name: CreateFederalConstituency :one
INSERT INTO federal_constituencies (name, state_id, state_name, senatorial_district_id, senatorial_district_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateFederalConstituency :one
UPDATE federal_constituencies
SET name = $2, state_id = $3, state_name = $4, senatorial_district_id = $5, senatorial_district_name = $6
WHERE id = $1
RETURNING *;

-- name: DeleteFederalConstituency :exec
DELETE FROM federal_constituencies
WHERE id = $1;

-- name: GetSenatorialDistrictByID :one
SELECT * FROM senatorial_districts
WHERE id = $1 LIMIT 1;

-- name: CreateSenatorialDistrict :one
INSERT INTO senatorial_districts (name, description, coalition_center, state_id, state_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateSenatorialDistrict :one
UPDATE senatorial_districts
SET name = $2, description = $3, coalition_center = $4, state_id = $5, state_name = $6
WHERE id = $1
RETURNING *;

-- name: DeleteSenatorialDistrict :exec
DELETE FROM senatorial_districts
WHERE id = $1;

-- name: GetLGAByID :one
SELECT * FROM lgas
WHERE id = $1 LIMIT 1;

-- name: GetStateAssemblyConstituencyByID :one
SELECT * FROM state_assembly_constituencies
WHERE id = $1 LIMIT 1;

-- name: CreateStateAssemblyConstituency :one
INSERT INTO state_assembly_constituencies (name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateStateAssemblyConstituency :one
UPDATE state_assembly_constituencies
SET name = $2, lga_id = $3, lga_name = $4, state_id = $5, state_name = $6, senatorial_district_id = $7, senatorial_district_name = $8, federal_constituency_id = $9, federal_constituency_name = $10
WHERE id = $1
RETURNING *;

-- name: DeleteStateAssemblyConstituency :exec
DELETE FROM state_assembly_constituencies
WHERE id = $1;

-- name: GetWardByID :one
SELECT * FROM wards
WHERE id = $1 LIMIT 1;

-- name: CreateWard :one
INSERT INTO wards (name, abbreviation, lga_id, lga_name, state_id, state_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateWard :one
UPDATE wards
SET name = $2, abbreviation = $3, lga_id = $4, lga_name = $5, state_id = $6, state_name = $7
WHERE id = $1
RETURNING *;

-- name: DeleteWard :exec
DELETE FROM wards
WHERE id = $1;

-- name: GetPollingUnitByID :one
SELECT * FROM polling_units
WHERE id = $1 LIMIT 1;

-- name: GetPollingUnitByDelimitation :one
SELECT * FROM polling_units
WHERE delimitation = $1 LIMIT 1;

-- name: CreatePollingUnit :one
INSERT INTO polling_units (name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING *;

-- name: UpdatePollingUnit :one
UPDATE polling_units
SET name = $2, abbreviation = $3, units = $4, delimitation = $5, remark = $6, registration_area_id = $7, ward_id = $8, ward_name = $9, lga_id = $10, lga_name = $11, state_id = $12, state_name = $13, latitude = $14, longitude = $15, precise_location = $16, formatted_address = $17, google_place_id = $18
WHERE id = $1
RETURNING *;

-- name: DeletePollingUnit :exec
DELETE FROM polling_units
WHERE id = $1;

-- name: CreateLGA :one
INSERT INTO lgas (name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateLGA :one
UPDATE lgas
SET name = $2, abbreviation = $3, state_id = $4, state_name = $5, senatorial_district_id = $6, senatorial_district_name = $7, federal_constituency_id = $8, federal_constituency_name = $9
WHERE id = $1
RETURNING *;

-- name: DeleteLGA :exec
DELETE FROM lgas
WHERE id = $1;




-- name: RecalculateWardMetrics :exec
UPDATE wards w
SET polling_units_count = COALESCE((SELECT COUNT(*) FROM polling_units pu WHERE pu.ward_id = w.id), 0);

-- name: RecalculateStateAssemblyConstituencyMetrics :exec
UPDATE state_assembly_constituencies sac
SET wards_count = COALESCE((SELECT COUNT(*) FROM wards w WHERE w.state_assembly_constituency_id = sac.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM wards w WHERE w.state_assembly_constituency_id = sac.id), 0);

-- name: RecalculateLGAMetrics :exec
UPDATE lgas l
SET state_constituencies_count = COALESCE((SELECT COUNT(*) FROM state_assembly_constituencies sac WHERE sac.lga_id = l.id), 0),
    wards_count = COALESCE((SELECT COUNT(*) FROM wards w WHERE w.lga_id = l.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM wards w WHERE w.lga_id = l.id), 0);

-- name: RecalculateFederalConstituencyMetrics :exec
UPDATE federal_constituencies fc
SET lgas_count = COALESCE((SELECT COUNT(*) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM lgas l WHERE l.federal_constituency_id = fc.id), 0);

-- name: RecalculateSenatorialDistrictMetrics :exec
UPDATE senatorial_districts sd
SET federal_constituencies_count = COALESCE((SELECT COUNT(*) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    lgas_count = COALESCE((SELECT SUM(lgas_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM federal_constituencies fc WHERE fc.senatorial_district_id = sd.id), 0);

-- name: RecalculateStateMetrics :exec
UPDATE c_states s
SET senatorial_districts_count = COALESCE((SELECT COUNT(*) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    federal_constituencies_count = COALESCE((SELECT SUM(federal_constituencies_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    lgas_count = COALESCE((SELECT SUM(lgas_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    state_constituencies_count = COALESCE((SELECT SUM(state_constituencies_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    wards_count = COALESCE((SELECT SUM(wards_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0),
    polling_units_count = COALESCE((SELECT SUM(polling_units_count) FROM senatorial_districts sd WHERE sd.state_id = s.id), 0);

-- name: RecalculateNationalMetrics :exec
UPDATE national_metrics
SET states_count = (SELECT COUNT(*) FROM c_states),
    senatorial_districts_count = (SELECT COUNT(*) FROM senatorial_districts),
    federal_constituencies_count = (SELECT COUNT(*) FROM federal_constituencies),
    state_constituencies_count = (SELECT COUNT(*) FROM state_assembly_constituencies),
    lgas_count = (SELECT COUNT(*) FROM lgas),
    wards_count = (SELECT COUNT(*) FROM wards),
    polling_units_count = (SELECT COUNT(*) FROM polling_units),
    updated_at = NOW()
WHERE id = 1;

-- name: GetNationalMetrics :one
SELECT * FROM national_metrics WHERE id = 1 LIMIT 1;

-- name: GetOccupations :many
SELECT id, category, name FROM occupations
ORDER BY category ASC, name ASC;

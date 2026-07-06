-- name: GetCountryByID :one
SELECT id, name, iso2 FROM c_countries
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

-- name: GetStatesByCountryID :many
SELECT id, name FROM c_states
WHERE country_id = $1
ORDER BY name ASC;

-- name: GetCitiesByStateID :many
SELECT id, name FROM c_cities
WHERE state_id = $1
ORDER BY city_rank DESC, name ASC;

-- name: GetSenatorialDistricts :many
SELECT id, name, description, coalition_center, state_id, state_name FROM senatorial_districts
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetFederalConstituencies :many
SELECT id, name, state_id, state_name, senatorial_district_id, senatorial_district_name FROM federal_constituencies
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id)) AND (sqlc.arg(senatorial_district_id)::int = 0 OR senatorial_district_id = sqlc.arg(senatorial_district_id))
ORDER BY name ASC;

-- name: GetStateAssemblyConstituencies :many
SELECT id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM state_assembly_constituencies
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id)) AND (sqlc.arg(federal_constituency_id)::int = 0 OR federal_constituency_id = sqlc.arg(federal_constituency_id))
ORDER BY name ASC;

-- name: GetLGAs :many
SELECT id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM lgas
WHERE (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetWards :many
SELECT id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name FROM wards
WHERE (sqlc.arg(lga_id)::int = 0 OR lga_id = sqlc.arg(lga_id)) AND (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetPollingUnits :many
SELECT id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id FROM polling_units
WHERE (sqlc.arg(ward_id)::int = 0 OR ward_id = sqlc.arg(ward_id)) AND (sqlc.arg(lga_id)::int = 0 OR lga_id = sqlc.arg(lga_id)) AND (sqlc.arg(state_id)::int = 0 OR state_id = sqlc.arg(state_id))
ORDER BY name ASC;

-- name: GetStateDetailsByID :one
SELECT id, name, country_id, country_code, latitude, longitude FROM c_states
WHERE id = $1 LIMIT 1;

-- name: CreateState :one
INSERT INTO c_states (name, country_id, country_code, latitude, longitude)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, country_id, country_code, latitude, longitude;

-- name: UpdateState :one
UPDATE c_states
SET name = $2, country_id = $3, country_code = $4, latitude = $5, longitude = $6
WHERE id = $1
RETURNING id, name, country_id, country_code, latitude, longitude;

-- name: DeleteState :exec
DELETE FROM c_states
WHERE id = $1;

-- name: GetFederalConstituencyByID :one
SELECT id, name, state_id, state_name, senatorial_district_id, senatorial_district_name FROM federal_constituencies
WHERE id = $1 LIMIT 1;

-- name: CreateFederalConstituency :one
INSERT INTO federal_constituencies (name, state_id, state_name, senatorial_district_id, senatorial_district_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, state_id, state_name, senatorial_district_id, senatorial_district_name;

-- name: UpdateFederalConstituency :one
UPDATE federal_constituencies
SET name = $2, state_id = $3, state_name = $4, senatorial_district_id = $5, senatorial_district_name = $6
WHERE id = $1
RETURNING id, name, state_id, state_name, senatorial_district_id, senatorial_district_name;

-- name: DeleteFederalConstituency :exec
DELETE FROM federal_constituencies
WHERE id = $1;

-- name: GetSenatorialDistrictByID :one
SELECT id, name, description, coalition_center, state_id, state_name FROM senatorial_districts
WHERE id = $1 LIMIT 1;

-- name: CreateSenatorialDistrict :one
INSERT INTO senatorial_districts (name, description, coalition_center, state_id, state_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, description, coalition_center, state_id, state_name;

-- name: UpdateSenatorialDistrict :one
UPDATE senatorial_districts
SET name = $2, description = $3, coalition_center = $4, state_id = $5, state_name = $6
WHERE id = $1
RETURNING id, name, description, coalition_center, state_id, state_name;

-- name: DeleteSenatorialDistrict :exec
DELETE FROM senatorial_districts
WHERE id = $1;

-- name: GetLGAByID :one
SELECT id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM lgas
WHERE id = $1 LIMIT 1;

-- name: GetStateAssemblyConstituencyByID :one
SELECT id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name FROM state_assembly_constituencies
WHERE id = $1 LIMIT 1;

-- name: CreateStateAssemblyConstituency :one
INSERT INTO state_assembly_constituencies (name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;

-- name: UpdateStateAssemblyConstituency :one
UPDATE state_assembly_constituencies
SET name = $2, lga_id = $3, lga_name = $4, state_id = $5, state_name = $6, senatorial_district_id = $7, senatorial_district_name = $8, federal_constituency_id = $9, federal_constituency_name = $10
WHERE id = $1
RETURNING id, name, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;

-- name: DeleteStateAssemblyConstituency :exec
DELETE FROM state_assembly_constituencies
WHERE id = $1;

-- name: GetWardByID :one
SELECT id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name FROM wards
WHERE id = $1 LIMIT 1;

-- name: CreateWard :one
INSERT INTO wards (name, abbreviation, lga_id, lga_name, state_id, state_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name;

-- name: UpdateWard :one
UPDATE wards
SET name = $2, abbreviation = $3, lga_id = $4, lga_name = $5, state_id = $6, state_name = $7
WHERE id = $1
RETURNING id, name, abbreviation, lga_id, lga_name, state_id, state_name, state_assembly_constituency_id, state_assembly_constituency_name;

-- name: DeleteWard :exec
DELETE FROM wards
WHERE id = $1;

-- name: GetPollingUnitByID :one
SELECT id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id FROM polling_units
WHERE id = $1 LIMIT 1;

-- name: CreatePollingUnit :one
INSERT INTO polling_units (name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id;

-- name: UpdatePollingUnit :one
UPDATE polling_units
SET name = $2, abbreviation = $3, units = $4, delimitation = $5, remark = $6, registration_area_id = $7, ward_id = $8, ward_name = $9, lga_id = $10, lga_name = $11, state_id = $12, state_name = $13, latitude = $14, longitude = $15, precise_location = $16, formatted_address = $17, google_place_id = $18
WHERE id = $1
RETURNING id, name, abbreviation, units, delimitation, remark, registration_area_id, ward_id, ward_name, lga_id, lga_name, state_id, state_name, latitude, longitude, precise_location, formatted_address, google_place_id;

-- name: DeletePollingUnit :exec
DELETE FROM polling_units
WHERE id = $1;

-- name: CreateLGA :one
INSERT INTO lgas (name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;

-- name: UpdateLGA :one
UPDATE lgas
SET name = $2, abbreviation = $3, state_id = $4, state_name = $5, senatorial_district_id = $6, senatorial_district_name = $7, federal_constituency_id = $8, federal_constituency_name = $9
WHERE id = $1
RETURNING id, name, abbreviation, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name;

-- name: DeleteLGA :exec
DELETE FROM lgas
WHERE id = $1;



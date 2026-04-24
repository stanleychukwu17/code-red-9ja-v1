-- name: GetCountryByID :one
SELECT id, name, iso2  FROM c_countries
WHERE id = $1 LIMIT 1;

-- name: GetStateByID :one
SELECT id, name FROM c_states
WHERE id = $1 and country_id = $2 LIMIT 1;

-- name: GetCityByID :one
SELECT id, name FROM c_cities
WHERE id = $1 and state_id = $2 LIMIT 1;
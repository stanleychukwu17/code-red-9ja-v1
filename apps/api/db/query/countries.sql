-- name: GetCountryByID :one
SELECT id, name, iso2  FROM c_countries
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



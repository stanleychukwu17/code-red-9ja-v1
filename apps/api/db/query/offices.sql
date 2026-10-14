-- name: CreateOffice :one
INSERT INTO offices (name, category, election, scope, rank, inec_election_type_id, is_contested, parent_office_id, appointing_office_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetOfficeByID :one
SELECT * FROM offices WHERE id = $1;

-- name: GetOfficeByName :one
SELECT * FROM offices WHERE name = $1;

-- name: ListOffices :many
SELECT * FROM offices
ORDER BY rank ASC;

-- name: ListContestedOffices :many
SELECT * FROM offices
WHERE is_contested = true
ORDER BY rank ASC;

-- name: ListOfficesByCategory :many
SELECT * FROM offices
WHERE category = $1
ORDER BY rank ASC;

-- name: UpdateOffice :one
UPDATE offices
SET name = $1, category = $2, election = $3, scope = $4, rank = $5, inec_election_type_id = $6, is_contested = $7, parent_office_id = $8, appointing_office_id = $9, updated_at = NOW()
WHERE id = $10
RETURNING *;

-- name: DeleteOffice :exec
DELETE FROM offices WHERE id = $1;

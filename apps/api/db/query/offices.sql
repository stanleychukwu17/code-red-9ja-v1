-- name: CreateOffice :one
INSERT INTO offices (name, election, scope, rank)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetOfficeByID :one
SELECT * FROM offices WHERE id = $1;

-- name: GetOfficeByName :one
SELECT * FROM offices WHERE name = $1;

-- name: ListOffices :many
SELECT * FROM offices
ORDER BY id ASC;

-- name: UpdateOffice :one
UPDATE offices
SET name = $1, election = $2, scope = $3, rank = $4, updated_at = NOW()
WHERE id = $5
RETURNING *;

-- name: DeleteOffice :exec
DELETE FROM offices WHERE id = $1;

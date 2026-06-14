-- name: CreateParty :one
INSERT INTO parties (short_name, name, logo)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPartyByID :one
SELECT * FROM parties WHERE id = $1;

-- name: GetPartyByShortName :one
SELECT * FROM parties WHERE short_name = $1;

-- name: ListParties :many
SELECT * FROM parties
ORDER BY id ASC;

-- name: UpdateParty :one
UPDATE parties
SET short_name = $1, name = $2, logo = $3, updated_at = NOW()
WHERE id = $4
RETURNING *;

-- name: DeleteParty :exec
DELETE FROM parties WHERE id = $1;

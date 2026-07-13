-- name: CreateParty :one
INSERT INTO parties (short_name, name, logo, display_order)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPartyByID :one
SELECT * FROM parties WHERE id = $1;

-- name: GetPartyByShortName :one
SELECT * FROM parties WHERE short_name = $1;

-- name: GetPartyBasicInfo :one
SELECT id, short_name, name, logo FROM parties WHERE id = $1 LIMIT 1;

-- name: ListParties :many
SELECT * FROM parties
ORDER BY display_order ASC, name ASC;

-- name: UpdateParty :one
UPDATE parties
SET short_name = $1, name = $2, logo = $3, display_order = $4, updated_at = NOW()
WHERE id = $5
RETURNING *;

-- name: DeleteParty :exec
DELETE FROM parties WHERE id = $1;

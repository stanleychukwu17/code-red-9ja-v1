-- name: CreateElectionGroup :one
INSERT INTO election_groups (name, rank, elections_count, states_count, election_date)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetElectionGroupByID :one
SELECT * FROM election_groups WHERE id = $1;

-- name: GetElectionGroupByName :one
SELECT * FROM election_groups WHERE name = $1;

-- name: ListElectionGroups :many
SELECT * FROM election_groups
ORDER BY election_date DESC, id DESC;

-- name: UpdateElectionGroup :one
UPDATE election_groups
SET name = $1, rank = $2, elections_count = $3, states_count = $4, election_date = $5, updated_at = NOW()
WHERE id = $6
RETURNING *;

-- name: DeleteElectionGroup :exec
DELETE FROM election_groups WHERE id = $1;

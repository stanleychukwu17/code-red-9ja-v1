-- name: CreateElectionGroup :one
INSERT INTO election_groups (name, election_date)
VALUES ($1, $2)
RETURNING *;

-- name: GetElectionGroupByID :one
SELECT * FROM election_groups WHERE id = $1;

-- name: GetElectionGroupByFakeID :one
SELECT * FROM election_groups WHERE fake_id = $1;

-- name: ListElectionGroups :many
SELECT * FROM election_groups
WHERE (sqlc.narg('active')::boolean IS NULL OR active = sqlc.narg('active')::boolean)
ORDER BY election_date ASC;

-- name: UpdateElectionGroup :one
UPDATE election_groups
SET name = $1, election_date = $2, active = $3, updated_at = NOW()
WHERE id = $4
RETURNING *;

-- name: CountCandidatesInElectionGroup :one
SELECT COUNT(*)::bigint
FROM election_candidates ec
WHERE ec.election_group_id = $1;

-- name: CountParticipantsInElectionGroup :one
SELECT (
  (SELECT COUNT(*) FROM election_candidates ec WHERE ec.election_group_id = $1)
  +
  (SELECT COUNT(*) FROM election_votes ev WHERE ev.election_group_id = $1)
)::bigint AS participants_count;

-- name: CountElectionsInElectionGroup :one
SELECT COUNT(*)::bigint
FROM elections e
WHERE e.election_group_id = $1;

-- name: DeleteElectionGroup :exec
DELETE FROM election_groups WHERE id = $1;


-- name: ListElectionGroupsWithPartyStats :many
SELECT 
    eg.id, 
    eg.name, 
    eg.election_date, 
    eg.active, 
    eg.created_at, 
    eg.updated_at,
    '{}'::jsonb AS polling_agents_coverage,
    COALESCE(
        (SELECT COUNT(DISTINCT ec.election_id)::integer 
         FROM election_candidates ec 
         WHERE ec.election_group_id = eg.id AND ec.party_id = $1),
        0
    )::integer AS elections_contesting
FROM election_groups eg
WHERE (sqlc.narg('active')::boolean IS NULL OR eg.active = sqlc.narg('active')::boolean)
ORDER BY eg.election_date ASC;

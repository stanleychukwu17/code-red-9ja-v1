-- name: CreateElectionGroup :one
INSERT INTO election_groups (name, year)
VALUES ($1, $2)
RETURNING *;

-- name: GetElectionGroupByID :one
SELECT * FROM election_groups WHERE id = $1;

-- name: ListElectionGroups :many
SELECT * FROM election_groups
WHERE (sqlc.narg('active')::boolean IS NULL OR active = sqlc.narg('active')::boolean)
ORDER BY year DESC, id DESC;

-- name: UpdateElectionGroup :one
UPDATE election_groups
SET name = $1, year = $2, active = $3, updated_at = NOW()
WHERE id = $4
RETURNING *;

-- name: CountCandidatesInElectionGroup :one
SELECT COUNT(*)::bigint
FROM election_candidates ec
JOIN elections e ON ec.election_id = e.id
WHERE e.election_group_id = $1;

-- name: CountParticipantsInElectionGroup :one
SELECT (
  (SELECT COUNT(*) FROM election_candidates ec JOIN elections e ON ec.election_id = e.id WHERE e.election_group_id = $1)
  +
  (SELECT COUNT(*) FROM election_votes ev WHERE ev.election_group_id = $1)
)::bigint AS participants_count;

-- name: DeleteElectionGroup :exec
DELETE FROM election_groups WHERE id = $1;

-- name: ListElectionGroupsWithPartyStats :many
SELECT 
    eg.id, 
    eg.name, 
    eg.year, 
    eg.active, 
    eg.created_at, 
    eg.updated_at,
    COALESCE(peg.polling_agents_coverage, '{}'::jsonb)::jsonb AS polling_agents_coverage,
    COALESCE(peg.elections_contesting, 0)::integer AS elections_contesting
FROM election_groups eg
LEFT JOIN party_election_groups peg 
    ON eg.id = peg.election_group_id AND peg.party_id = $1
WHERE (sqlc.narg('active')::boolean IS NULL OR eg.active = sqlc.narg('active')::boolean)
ORDER BY eg.year DESC, eg.id DESC;

-- name: UpsertPartyElectionGroupStats :one
INSERT INTO party_election_groups (party_id, election_group_id, polling_agents_coverage, elections_contesting)
VALUES ($1, $2, $3::jsonb, $4)
ON CONFLICT (party_id, election_group_id) 
DO UPDATE SET 
    polling_agents_coverage = EXCLUDED.polling_agents_coverage,
    elections_contesting = EXCLUDED.elections_contesting,
    updated_at = NOW()
RETURNING *;

-- name: UpsertPartyElectionGroupCoverage :one
INSERT INTO party_election_groups (party_id, election_group_id, polling_agents_coverage, elections_contesting)
VALUES ($1, $2, $3::jsonb, 0)
ON CONFLICT (party_id, election_group_id) 
DO UPDATE SET 
    polling_agents_coverage = EXCLUDED.polling_agents_coverage,
    updated_at = NOW()
RETURNING *;

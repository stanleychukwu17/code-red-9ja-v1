-- name: CreateElectionGroup :one
INSERT INTO election_groups (name, rank, elections_count, states_count, election_date, senatorial_districts_count, federal_constituencies_count, lgas_count, state_constituencies_count, wards_count, polling_units_count)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

-- name: ListElectionGroupsWithPartyStats :many
SELECT 
    eg.id, 
    eg.name, 
    eg.rank, 
    eg.elections_count, 
    eg.states_count, 
    eg.election_date, 
    eg.created_at, 
    eg.updated_at,
    COALESCE(peg.polling_agents_coverage, '{}'::jsonb)::jsonb AS polling_agents_coverage,
    COALESCE(peg.elections_contesting, 0)::integer AS elections_contesting
FROM election_groups eg
LEFT JOIN party_election_groups peg 
    ON eg.id = peg.election_group_id AND peg.party_id = $1
ORDER BY eg.election_date DESC, eg.id DESC;

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

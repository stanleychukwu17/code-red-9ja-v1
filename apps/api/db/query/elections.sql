-- name: CreateElectionInstance :one
INSERT INTO elections (
  name, election_date, election_group_id,
  office_id, scope,
  state_id, senatorial_district_id, federal_constituency_id,
  state_constituency_id, lga_id, ward_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetElectionInstanceByID :one
SELECT * FROM elections WHERE id = $1;

-- name: ListElectionInstances :many
SELECT 
  e.*,
  o.name AS office_name,
  o.rank AS office_rank,
  eg.name AS election_group_name
FROM elections e
JOIN offices o ON e.office_id = o.id
JOIN election_groups eg ON e.election_group_id = eg.id
WHERE (
  sqlc.narg('cursor_election_date')::date IS NULL 
  OR (e.election_date < sqlc.narg('cursor_election_date')::date)
  OR (e.election_date = sqlc.narg('cursor_election_date')::date AND e.id < sqlc.arg('cursor_id')::int)
)
ORDER BY e.election_date DESC, e.id DESC
LIMIT sqlc.arg('limit_count')::int;

-- name: UpdateElectionInstance :one
UPDATE elections
SET name = $1, election_date = $2, election_group_id = $3,
    office_id = $4, scope = $5,
    state_id = $6, senatorial_district_id = $7, federal_constituency_id = $8,
    state_constituency_id = $9, lga_id = $10, ward_id = $11, updated_at = NOW()
WHERE id = $12
RETURNING *;

-- name: UpdateElectionContestingParties :one
UPDATE elections
SET contesting_parties = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteElectionInstance :exec
DELETE FROM elections WHERE id = $1;

-- name: CreateElectionCandidate :one
INSERT INTO election_candidates (election_id, candidate_id, party_id, party_short_name)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListElectionCandidatesByElectionID :many
SELECT * FROM election_candidates WHERE election_id = $1;

-- name: ListElectionCandidatesDetailedByElectionID :many
SELECT 
    ec.id,
    ec.election_id,
    ec.candidate_id,
    u.first_name,
    u.last_name,
    u.avatar,
    u.party_id,
    p.short_name AS party_short_name,
    p.logo AS party_logo,
    p.color_hex AS party_color_hex,
    p.dark_color_hex AS party_dark_color_hex
FROM election_candidates ec
JOIN users u ON ec.candidate_id = u.id
LEFT JOIN parties p ON u.party_id = p.id
WHERE ec.election_id = $1
ORDER BY ec.id ASC;

-- name: DeleteElectionCandidatesForElection :exec
DELETE FROM election_candidates WHERE election_id = $1;

-- name: DeleteElectionCandidateForParty :exec
DELETE FROM election_candidates 
WHERE election_id = $1 
AND candidate_id IN (SELECT users.id FROM users WHERE users.party_id = $2);

-- name: GetElectionCandidatesCount :one
SELECT COUNT(*) FROM election_candidates WHERE election_id = $1;

-- name: ListElectionsDetailedByGroupID :many
SELECT 
  e.*,
  o.election AS office_election,
  o.name AS office_name,
  o.rank AS office_rank
FROM elections e
JOIN offices o ON e.office_id = o.id
WHERE e.election_group_id = $1;

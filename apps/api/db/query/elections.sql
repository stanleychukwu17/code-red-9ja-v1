-- name: CreateElectionInstance :one
INSERT INTO elections (
  name, rank, candidates_count, election_date, election_group_id,
  election_group_name, office_id, office_name, scope,
  state_id, senatorial_district_id, federal_constituency_id,
  state_constituency_id, lga_id, ward_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING *;

-- name: GetElectionInstanceByID :one
SELECT * FROM elections WHERE id = $1;

-- name: ListElectionInstances :many
SELECT * FROM elections
ORDER BY election_date DESC, id DESC;

-- name: UpdateElectionInstance :one
UPDATE elections
SET name = $1, rank = $2, candidates_count = $3, election_date = $4, election_group_id = $5,
    election_group_name = $6, office_id = $7, office_name = $8, scope = $9,
    state_id = $10, senatorial_district_id = $11, federal_constituency_id = $12,
    state_constituency_id = $13, lga_id = $14, ward_id = $15, updated_at = NOW()
WHERE id = $16
RETURNING *;

-- name: UpdateElectionDatesByGroup :exec
UPDATE elections
SET election_date = $1, updated_at = NOW()
WHERE election_group_id = $2;

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
    ec.votes_count,
    u.first_name,
    u.last_name,
    u.avatar,
    u.party_id,
    p.short_name AS party_short_name,
    p.logo AS party_logo
FROM election_candidates ec
JOIN users u ON ec.candidate_id = u.id
LEFT JOIN parties p ON u.party_id = p.id
WHERE ec.election_id = $1
ORDER BY ec.votes_count DESC, ec.id DESC;

-- name: DeleteElectionCandidatesForElection :exec
DELETE FROM election_candidates WHERE election_id = $1;

-- name: DeleteElectionCandidateForParty :exec
DELETE FROM election_candidates 
WHERE election_id = $1 
AND candidate_id IN (SELECT users.id FROM users WHERE users.party_id = $2);

-- name: GetElectionCandidatesCount :one
SELECT COUNT(*) FROM election_candidates WHERE election_id = $1;

-- name: UpdateElectionCandidatesCount :exec
UPDATE elections SET candidates_count = $2 WHERE id = $1;
-- name: ListElectionsDetailedByGroupID :many
SELECT 
  e.*,
  o.election AS office_election,
  o.name AS office_name_full
FROM elections e
JOIN offices o ON e.office_id = o.id
WHERE e.election_group_id = $1;

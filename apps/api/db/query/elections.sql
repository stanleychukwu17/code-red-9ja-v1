-- name: CreateElectionInstance :one
INSERT INTO elections (
  name, candidates_count, election_date, election_group_id,
  office_id, office_name, scope,
  state_id, senatorial_district_id, federal_constituency_id,
  state_constituency_id, lga_id, ward_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetElectionInstanceByID :one
SELECT * FROM elections WHERE id = $1;

-- name: ListElectionInstances :many
SELECT * FROM elections
ORDER BY election_date DESC, id DESC;

-- name: UpdateElectionInstance :one
UPDATE elections
SET name = $1, candidates_count = $2, election_date = $3, election_group_id = $4,
    office_id = $5, office_name = $6, scope = $7,
    state_id = $8, senatorial_district_id = $9, federal_constituency_id = $10,
    state_constituency_id = $11, lga_id = $12, ward_id = $13, updated_at = NOW()
WHERE id = $14
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

-- name: UpdateElectionCandidatesCount :exec
UPDATE elections SET candidates_count = $2 WHERE id = $1;
-- name: ListElectionsDetailedByGroupID :many
SELECT 
  e.*,
  o.election AS office_election,
  o.name AS office_name_full,
  o.rank AS office_rank
FROM elections e
JOIN offices o ON e.office_id = o.id
WHERE e.election_group_id = $1;

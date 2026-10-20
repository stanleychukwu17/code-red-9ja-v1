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
  o.name AS office_name
FROM elections e
JOIN offices o ON e.office_id = o.id
WHERE (
  sqlc.narg('cursor_election_date')::date IS NULL
  OR (e.election_date < sqlc.narg('cursor_election_date')::date)
  OR (e.election_date = sqlc.narg('cursor_election_date')::date AND e.id < sqlc.arg('cursor_id')::int)
)
AND (sqlc.narg('search')::text IS NULL OR (
  e.name ILIKE '%' || sqlc.narg('search')::text || '%' OR
  o.name ILIKE '%' || sqlc.narg('search')::text || '%'
))
AND (sqlc.narg('election_group_ids')::int[] IS NULL OR e.election_group_id = ANY(sqlc.narg('election_group_ids')::int[]))
AND (sqlc.narg('scopes')::text[] IS NULL OR e.scope = ANY(sqlc.narg('scopes')::text[]))
AND (
  sqlc.narg('statuses')::text[] IS NULL
  OR ('upcoming' = ANY(sqlc.narg('statuses')::text[]) AND e.election_date > sqlc.arg('today')::date + 1)
  OR ('ongoing' = ANY(sqlc.narg('statuses')::text[]) AND e.election_date BETWEEN sqlc.arg('today')::date AND sqlc.arg('today')::date + 1)
  OR ('ended' = ANY(sqlc.narg('statuses')::text[]) AND e.election_date < sqlc.arg('today')::date)
)
AND (sqlc.narg('state_ids')::smallint[] IS NULL OR e.state_id = ANY(sqlc.narg('state_ids')::smallint[]))
AND (sqlc.narg('office_ids')::smallint[] IS NULL OR e.office_id = ANY(sqlc.narg('office_ids')::smallint[]))
AND (sqlc.narg('date_from')::date IS NULL OR e.election_date >= sqlc.narg('date_from')::date)
AND (sqlc.narg('date_to')::date IS NULL OR e.election_date <= sqlc.narg('date_to')::date)
ORDER BY e.election_date DESC, e.id DESC
LIMIT sqlc.arg('limit_count')::int;

-- name: UpdateElectionInstance :one
UPDATE elections
SET name = $1, election_date = $2, election_group_id = $3, updated_at = NOW()
WHERE id = $4
RETURNING *;

-- name: DeleteElectionInstance :exec
DELETE FROM elections WHERE id = $1;

-- name: CreateElectionCandidate :one
INSERT INTO election_candidates (election_id, election_group_id, candidate_id, party_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListElectionCandidatesByElectionID :many
SELECT * FROM election_candidates WHERE election_id = $1;

-- name: ListElectionCandidatesDetailedByElectionID :many
SELECT
    ec.id,
    ec.election_id,
    ec.election_group_id,
    ec.candidate_id,
    u.first_name,
    u.last_name,
    u.avatar,
    ec.party_id,
    p.short_name AS party_short_name,
    p.logo AS party_logo,
    p.color_hex AS party_color_hex,
    p.dark_color_hex AS party_dark_color_hex
FROM election_candidates ec
JOIN users u ON ec.candidate_id = u.id
LEFT JOIN parties p ON ec.party_id = p.id
WHERE ec.election_id = $1
ORDER BY ec.id ASC;

-- name: DeleteElectionCandidatesForElection :exec
DELETE FROM election_candidates WHERE election_id = $1;

-- name: DeleteElectionCandidateForParty :exec
DELETE FROM election_candidates
WHERE election_id = $1
AND party_id = $2;

-- name: GetElectionCandidatesCount :one
SELECT COUNT(*) FROM election_candidates WHERE election_id = $1;

-- name: ListElectionsDetailedByGroupID :many
SELECT
  e.*,
  o.election AS office_election,
  o.name AS office_name
FROM elections e
JOIN offices o ON e.office_id = o.id
WHERE e.election_group_id = $1;

-- name: BulkUpdateElectionGroup :exec
UPDATE elections
SET election_group_id = sqlc.arg('election_group_id')::int, updated_at = NOW()
WHERE id = ANY(sqlc.arg('election_ids')::int[]);

-- name: BulkUpdateElectionCandidatesGroup :exec
UPDATE election_candidates
SET election_group_id = sqlc.arg('election_group_id')::int, updated_at = NOW()
WHERE election_id = ANY(sqlc.arg('election_ids')::int[]);

-- name: GetCandidateCountsForElections :many
SELECT election_id, COUNT(*)::bigint AS candidate_count
FROM election_candidates
WHERE election_id = ANY(sqlc.arg('election_ids')::int[])
GROUP BY election_id;

-- name: BulkDeleteElectionInstances :exec
DELETE FROM elections
WHERE id = ANY(sqlc.arg('election_ids')::int[]);

-- name: GetElectionsByIDs :many
SELECT id, name, election_group_id, election_date
FROM elections
WHERE id = ANY(sqlc.arg('election_ids')::int[]);

-- name: GetUserActiveCandidacies :many
WITH user_candidacies AS (
    SELECT
        ec.id,
        ec.election_id,
        ec.election_group_id,
        ec.party_id,
        'principal'::text AS candidacy_type
    FROM election_candidates ec
    WHERE ec.candidate_id = sqlc.arg('candidate_id')

    UNION ALL

    SELECT
        ec.id,
        ec.election_id,
        ec.election_group_id,
        ec.party_id,
        'running_mate'::text AS candidacy_type
    FROM election_candidates ec
    WHERE ec.running_mate_id = sqlc.arg('candidate_id')
)
SELECT
    uc.id,
    uc.election_id,
    uc.election_group_id,
    uc.party_id,
    coalesce(p.logo, '') AS party_logo,
    e.name AS election_name,
    e.election_date,
    e.scope,
    coalesce(o.name, '') AS office_name,
    uc.candidacy_type
FROM user_candidacies uc
JOIN elections e ON uc.election_id = e.id
LEFT JOIN parties p ON uc.party_id = p.id
LEFT JOIN offices o ON e.office_id = o.id
WHERE e.election_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::date
ORDER BY e.election_date ASC;

-- name: ListElectionCandidacyUsers :many
SELECT DISTINCT u.id, u.fake_id
FROM election_candidates ec
JOIN users u ON u.id = ec.candidate_id OR u.id = ec.running_mate_id
WHERE ec.election_id = ANY(sqlc.arg('election_ids')::int[]);

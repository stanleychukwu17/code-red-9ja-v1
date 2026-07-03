-- name: CreatePollingUnitUpdate :one
INSERT INTO polling_unit_updates (
  assignment_id,
  user_id,
  polling_unit_id,
  election_group_id,
  party_id,
  state_id,
  lga_id,
  ward_id,
  message,
  media_urls,
  is_report,
  report_types
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
) RETURNING *;

-- name: IncrementPollingUnitAssignmentMetrics :exec
UPDATE polling_unit_assignments
SET 
  reports_count = reports_count + $2,
  updates_count = updates_count + $3,
  last_update_at = NOW()
WHERE id = $1;

-- name: IncrementPartyElectionGroupMetrics :exec
UPDATE party_election_groups
SET 
  reports_count = reports_count + $3,
  updates_count = updates_count + $4
WHERE party_id = $1 AND election_group_id = $2;

-- name: IncrementElectionGroupMetrics :exec
UPDATE election_groups
SET 
  reports_count = reports_count + $2,
  updates_count = updates_count + $3
WHERE id = $1;

-- name: IncrementElectionMetricsByGroup :exec
UPDATE elections
SET 
  reports_count = reports_count + $2,
  updates_count = updates_count + $3
WHERE election_group_id = $1;

-- name: ListPollingUnitUpdates :many
SELECT id, assignment_id, user_id, polling_unit_id, election_group_id, party_id, state_id, lga_id, ward_id, message, media_urls, is_report, report_types, created_at, updated_at
FROM polling_unit_updates
WHERE 
  (sqlc.narg('election_group_id')::bigint IS NULL OR election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('party_id')::bigint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('polling_unit_id')::int IS NULL OR polling_unit_id = sqlc.narg('polling_unit_id'))
  AND (sqlc.narg('user_id')::bigint IS NULL OR user_id = sqlc.narg('user_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('is_report')::boolean IS NULL OR is_report = sqlc.narg('is_report'))
  AND id < sqlc.arg('cursor')
ORDER BY id DESC
LIMIT sqlc.arg('limit');

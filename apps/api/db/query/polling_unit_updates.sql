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
  senatorial_district_id,
  federal_constituency_id,
  state_assembly_constituency_id,
  message,
  media_urls,
  is_report,
  report_types
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
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
SELECT 
  pu.id, pu.assignment_id, pu.user_id, pu.polling_unit_id, pu.election_group_id, pu.party_id, 
  pu.state_id, pu.lga_id, pu.ward_id, pu.senatorial_district_id, pu.federal_constituency_id, 
  pu.state_assembly_constituency_id, pu.message, pu.media_urls, pu.is_report, pu.report_types, 
  pu.created_at, pu.updated_at,
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.avatar as user_avatar,
  punits.name as polling_unit_name,
  s.name as state_name,
  l.name as lga_name
FROM polling_unit_updates pu
JOIN users u ON pu.user_id = u.id
LEFT JOIN polling_units punits ON pu.polling_unit_id = punits.id
LEFT JOIN c_states s ON pu.state_id = s.id
LEFT JOIN lgas l ON pu.lga_id = l.id
WHERE 
  (sqlc.narg('election_group_id')::bigint IS NULL OR pu.election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('party_id')::smallint IS NULL OR pu.party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('polling_unit_id')::int IS NULL OR pu.polling_unit_id = sqlc.narg('polling_unit_id'))
  AND (sqlc.narg('user_id')::bigint IS NULL OR pu.user_id = sqlc.narg('user_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR pu.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR pu.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR pu.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR pu.senatorial_district_id = sqlc.narg('senatorial_district_id'))
  AND (sqlc.narg('federal_constituency_id')::int IS NULL OR pu.federal_constituency_id = sqlc.narg('federal_constituency_id'))
  AND (sqlc.narg('state_assembly_constituency_id')::int IS NULL OR pu.state_assembly_constituency_id = sqlc.narg('state_assembly_constituency_id'))
  AND (sqlc.narg('is_report')::boolean IS NULL OR pu.is_report = sqlc.narg('is_report'))
  AND (sqlc.narg('has_media')::boolean IS NULL OR (sqlc.narg('has_media')::boolean = true AND array_length(pu.media_urls, 1) > 0) OR (sqlc.narg('has_media')::boolean = false AND array_length(pu.media_urls, 1) IS NULL))
  AND pu.id < sqlc.arg('cursor')
ORDER BY pu.id DESC
LIMIT sqlc.arg('limit');

-- name: CreatePollingUnitUpdate :one
INSERT INTO polling_unit_updates (
  role_type,
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
  status_category_id,
  status_option_id,
  has_issues,
  title,
  message,
  has_media,
  latitude,
  longitude,
  accuracy_meters,
  created_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
  COALESCE(sqlc.narg(created_at), NOW())
) RETURNING *;

-- name: CreatePollingUnitUpdateMedia :one
INSERT INTO polling_unit_update_media (
  update_id,
  file_id,
  media_type,
  url,
  thumbnail_url,
  duration_seconds,
  file_size_bytes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: ListMediaByUpdateIDs :many
SELECT id, update_id, file_id, media_type, url, thumbnail_url, duration_seconds, file_size_bytes, created_at
FROM polling_unit_update_media
WHERE update_id = ANY(sqlc.arg('update_ids')::bigint[])
ORDER BY id ASC;

-- name: GetIssueOptionByID :one
SELECT id, issue_category_id, name, severity, sort_order
FROM polling_unit_issue_options
WHERE id = $1;

-- name: CreatePollingUnitIssue :one
INSERT INTO polling_unit_with_issues (
  update_id,
  role_type,
  election_group_id,
  party_id,
  user_id,
  state_id,
  lga_id,
  ward_id,
  senatorial_district_id,
  federal_constituency_id,
  state_assembly_constituency_id,
  polling_unit_id,
  issue_category_id,
  issue_option_id,
  is_active,
  time_issue_started
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true,
  COALESCE(sqlc.narg(time_issue_started), NOW())
) RETURNING *;

-- name: ResolvePollingUnitIssues :exec
UPDATE polling_unit_with_issues
SET 
  is_active = false,
  time_issue_ended = COALESCE(sqlc.narg(time_issue_ended), NOW()),
  resolution_notes = COALESCE(sqlc.narg(resolution_notes), resolution_notes)
WHERE id = ANY(sqlc.arg('issue_ids')::bigint[]);

-- name: ListActivePollingUnitIssues :many
SELECT 
  pui.id,
  pui.update_id,
  pui.polling_unit_id,
  pui.issue_category_id,
  pui.issue_option_id,
  pui.is_active,
  pui.time_issue_started,
  pic.name as category_name,
  pio.name as issue_name
FROM polling_unit_with_issues pui
JOIN polling_unit_issue_categories pic ON pui.issue_category_id = pic.id
JOIN polling_unit_issue_options pio ON pui.issue_option_id = pio.id
WHERE pui.polling_unit_id = $1 AND pui.is_active = true
ORDER BY pui.id DESC;

-- name: ListPollingUnitUpdates :many
SELECT 
  pu.id, pu.role_type, pu.assignment_id, pu.user_id, pu.polling_unit_id, pu.election_group_id, pu.party_id, 
  pu.state_id, pu.lga_id, pu.ward_id, pu.senatorial_district_id, pu.federal_constituency_id, 
  pu.state_assembly_constituency_id, pu.status_category_id, pu.status_option_id,
  pu.has_issues, pu.title, pu.message, pu.has_media,
  pu.latitude, pu.longitude, pu.accuracy_meters,
  pu.created_at, pu.updated_at,
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.avatar as user_avatar,
  punits.name as polling_unit_name,
  s.name as state_name,
  l.name as lga_name,
  sc.name as status_category_name,
  sc.color as status_category_color,
  so.name as status_option_name
FROM polling_unit_updates pu
JOIN users u ON pu.user_id = u.id
LEFT JOIN polling_units punits ON pu.polling_unit_id = punits.id
LEFT JOIN c_states s ON pu.state_id = s.id
LEFT JOIN lgas l ON pu.lga_id = l.id
LEFT JOIN polling_unit_status_categories sc ON pu.status_category_id = sc.id
LEFT JOIN polling_unit_status_options so ON pu.status_option_id = so.id
WHERE 
  (sqlc.narg('role_type')::varchar IS NULL OR pu.role_type = sqlc.narg('role_type'))
  AND (sqlc.narg('election_group_id')::integer IS NULL OR pu.election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('party_id')::smallint IS NULL OR pu.party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('polling_unit_id')::int IS NULL OR pu.polling_unit_id = sqlc.narg('polling_unit_id'))
  AND (sqlc.narg('user_id')::bigint IS NULL OR pu.user_id = sqlc.narg('user_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR pu.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR pu.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR pu.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR pu.senatorial_district_id = sqlc.narg('senatorial_district_id'))
  AND (sqlc.narg('federal_constituency_id')::int IS NULL OR pu.federal_constituency_id = sqlc.narg('federal_constituency_id'))
  AND (sqlc.narg('state_assembly_constituency_id')::int IS NULL OR pu.state_assembly_constituency_id = sqlc.narg('state_assembly_constituency_id'))
  AND (sqlc.narg('status_category_id')::smallint IS NULL OR pu.status_category_id = sqlc.narg('status_category_id'))
  AND (sqlc.narg('has_issues')::boolean IS NULL OR pu.has_issues = sqlc.narg('has_issues'))
  AND (sqlc.narg('has_media')::boolean IS NULL OR pu.has_media = sqlc.narg('has_media'))
  AND pu.id < sqlc.arg('cursor')
ORDER BY pu.id DESC
LIMIT sqlc.arg('limit');

-- name: ListAssignmentUpdatesCoordinates :many
SELECT id, latitude, longitude, accuracy_meters, created_at
FROM polling_unit_updates
WHERE assignment_id = $1
ORDER BY id ASC;

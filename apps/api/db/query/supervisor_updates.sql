-- name: CreateSupervisorUpdate :one
INSERT INTO supervisor_updates (
  election_group_id,
  party_id,
  user_id,
  role_type,
  state_id,
  lga_id,
  ward_id,
  polling_unit_id,
  category_type,
  stage,
  title,
  message,
  has_media,
  latitude,
  longitude,
  accuracy_meters
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
)
RETURNING *;

-- name: CreateSupervisorUpdateMedia :one
INSERT INTO supervisor_update_media (
  update_id,
  file_id,
  media_type,
  url,
  thumbnail_url,
  duration_seconds,
  file_size_bytes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetSupervisorUpdateByID :one
SELECT * FROM supervisor_updates
WHERE id = $1;

-- name: ListSupervisorUpdates :many
SELECT
  su.*,
  u.full_name AS user_full_name,
  u.avatar AS user_avatar,
  s.name AS state_name,
  l.name AS lga_name,
  w.name AS ward_name,
  pu.name AS polling_unit_name,
  pu.pu_code AS polling_unit_code
FROM supervisor_updates su
JOIN users u ON u.id = su.user_id
LEFT JOIN c_states s ON s.id = su.state_id
LEFT JOIN lgas l ON l.id = su.lga_id
LEFT JOIN wards w ON w.id = su.ward_id
LEFT JOIN polling_units pu ON pu.id = su.polling_unit_id
WHERE
  (sqlc.narg(election_group_id)::integer IS NULL OR su.election_group_id = sqlc.narg(election_group_id))
  AND (sqlc.narg(party_id)::smallint IS NULL OR su.party_id = sqlc.narg(party_id))
  AND (sqlc.narg(role_type)::varchar IS NULL OR su.role_type = sqlc.narg(role_type))
  AND (sqlc.narg(state_id)::smallint IS NULL OR su.state_id = sqlc.narg(state_id))
  AND (sqlc.narg(lga_id)::integer IS NULL OR su.lga_id = sqlc.narg(lga_id))
  AND (sqlc.narg(ward_id)::integer IS NULL OR su.ward_id = sqlc.narg(ward_id))
  AND (sqlc.narg(user_id)::bigint IS NULL OR su.user_id = sqlc.narg(user_id))
  AND (sqlc.narg(category_type)::varchar IS NULL OR su.category_type = sqlc.narg(category_type))
  AND (sqlc.narg(cursor_id)::bigint IS NULL OR su.id < sqlc.narg(cursor_id))
ORDER BY su.id DESC
LIMIT sqlc.arg(page_limit)::integer;

-- name: ListSupervisorUpdateMedia :many
SELECT * FROM supervisor_update_media
WHERE update_id = $1
ORDER BY id ASC;

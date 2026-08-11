-- name: CreateApplication :one
INSERT INTO party_applications (
  user_id,
  party_id,
  election_group_id,
  polling_unit_id,
  state_id,
  lga_id,
  ward_id,
  status
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, 'pending'
) RETURNING *;

-- name: UpdateUserAgentDetails :one
UPDATE users
SET
  party_id = $2,
  avatar = COALESCE($3, avatar),
  voters_card_image = $4,
  current_country = $5,
  current_state = $6,
  current_lga = $7,
  current_city = $8,
  current_ward = $9,
  phone = COALESCE(NULLIF(sqlc.arg(phone)::varchar, ''), phone),
  polling_unit_id = sqlc.arg(polling_unit_id),
  address = COALESCE(NULLIF(sqlc.arg(address)::varchar, ''), address),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetApplicationByID :one
SELECT * FROM party_applications
WHERE id = $1 LIMIT 1;

-- name: ListApplications :many
SELECT 
  pa.id,
  pa.user_id,
  pa.party_id,
  pa.election_group_id,
  pa.polling_unit_id,
  pa.status,
  pa.rejected_reason,
  pa.created_at,
  pa.updated_at,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.username,
  u.avatar,
  u.voters_card_image,
  u.current_country,
  u.current_state,
  u.current_lga,
  u.current_city,
  uba.account_number AS bank_account_number,
  uba.bank_code AS bank_code,
  up.educational_status,
  up.highest_degree,
  up.graduation_year,
  up.school_name,
  up.religion,
  up.marital_status,
  u.current_ward,
  eg.name AS election_group_name,
  eg.election_date,
  p.name AS party_name,
  p.short_name AS party_short_name,
  p.logo AS party_logo,
  st.name AS state_name,
  lg.name AS lga_name,
  ct.name AS city_name,
  pu.name AS polling_unit_name,
  pu.delimitation AS polling_unit_code,
  COALESCE(
    (
      SELECT COUNT(*)::integer 
      FROM polling_unit_assignments pua
      WHERE pua.polling_unit_id = pa.polling_unit_id 
        AND pua.party_id = pa.party_id 
        AND pua.election_group_id = pa.election_group_id
    ),
    0
  )::integer AS agents_count
FROM party_applications pa
JOIN users u ON pa.user_id = u.id
LEFT JOIN user_more_infos up ON u.id = up.user_id
JOIN election_groups eg ON pa.election_group_id = eg.id
JOIN parties p ON pa.party_id = p.id
LEFT JOIN c_states st ON u.current_state = st.id
LEFT JOIN lgas lg ON u.current_lga = lg.id
LEFT JOIN c_cities ct ON u.current_city = ct.id
LEFT JOIN polling_units pu ON pa.polling_unit_id = pu.id
LEFT JOIN user_bank_accounts uba ON uba.user_id = u.id AND uba.is_primary = true
WHERE 
  (sqlc.arg(user_id)::bigint = 0 OR pa.user_id = sqlc.arg(user_id)) AND
  (sqlc.arg(party_id)::smallint = 0 OR pa.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR pa.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(status)::varchar = '' OR pa.status = sqlc.arg(status)) AND
  (sqlc.arg(cursor)::bigint = 0 OR pa.id < sqlc.arg(cursor))
ORDER BY pa.id DESC
LIMIT sqlc.arg(limit_val);

-- name: UpdateApplicationStatus :one
UPDATE party_applications
SET
  status = $2,
  rejected_reason = $3,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateApplicationApproval :one
UPDATE party_applications
SET
  status = 'accepted',
  role = sqlc.arg(role),
  polling_unit_id = sqlc.arg(polling_unit_id),
  state_id = sqlc.arg(state_id),
  lga_id = sqlc.arg(lga_id),
  ward_id = sqlc.arg(ward_id),
  updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: UpdateUserRoleForPartyApp :one
WITH inserted AS (
  INSERT INTO user_roles (user_id, role_id, role_code, who_assigned_user_id, date_assigned)
  SELECT $1, r.id, r.code, 0, CURRENT_TIMESTAMP FROM roles r WHERE r.code = 'party_admin'
  ON CONFLICT (user_id, role_id) DO NOTHING
)
UPDATE users SET updated_at = NOW() WHERE users.id = $1
RETURNING *;

-- name: GetPollingUnitsWithAgentCounts :many
SELECT
  pu.id,
  pu.name,
  pu.ward_id,
  pu.ward_name,
  pu.lga_id,
  pu.lga_name,
  pu.state_id,
  pu.state_name,
  COALESCE(
    (
      SELECT COUNT(*)::integer
      FROM polling_unit_assignments pua
      WHERE pua.polling_unit_id = pu.id
        AND pua.party_id = sqlc.arg(party_id)::smallint
        AND pua.election_group_id = sqlc.arg(election_group_id)::bigint
    ),
    0
  )::integer AS agents_count
FROM polling_units pu
WHERE
  (sqlc.arg(lga_id)::integer = 0 OR pu.lga_id = sqlc.arg(lga_id)::integer) AND
  (sqlc.arg(ward_id)::integer = 0 OR pu.ward_id = sqlc.arg(ward_id)::integer)
ORDER BY agents_count ASC, pu.id ASC
LIMIT sqlc.arg(limit_val)::integer;

-- name: GetPendingApplicationForAutoAccept :one
SELECT 
  pa.id,
  pa.party_id,
  pa.polling_unit_id,
  pa.role,
  pa.state_id,
  pa.lga_id,
  pa.ward_id,
  p.auto_accept_applications
FROM party_applications pa
JOIN parties p ON pa.party_id = p.id
WHERE pa.user_id = $1 
  AND pa.election_group_id = $2 
  AND pa.status = 'pending'
LIMIT 1;

-- name: GetAcceptedApplicationForUser :one
SELECT 
  pa.id,
  pa.user_id,
  pa.party_id,
  pa.election_group_id,
  pa.polling_unit_id,
  pa.state_id,
  pa.lga_id,
  pa.ward_id,
  pa.role,
  pa.status
FROM party_applications pa
WHERE pa.user_id = $1 
  AND pa.election_group_id = $2 
  AND pa.status = 'accepted'
LIMIT 1;


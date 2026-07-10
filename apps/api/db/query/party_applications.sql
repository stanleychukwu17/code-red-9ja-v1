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
  vin = $4,
  voters_card_image = $5,
  current_country = $6,
  current_state = $7,
  current_lga = $8,
  current_city = $9,
  bank_account_number = $10,
  bank_code = $11,
  role = $12,
  role_level = $13,
  whatsapp_phone = $14,
  data_phone = $15,
  educational_status = $16,
  highest_degree = $17,
  graduation_year = $18,
  school_name = $19,
  current_ward = $20,
  phone = COALESCE(NULLIF(sqlc.arg(phone)::varchar, ''), phone),
  phone_verified = CASE WHEN NULLIF(sqlc.arg(phone)::varchar, '') IS NOT NULL AND NULLIF(sqlc.arg(phone)::varchar, '') != COALESCE(phone, '') THEN 'false' ELSE phone_verified END,
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
  u.vin,
  u.voters_card_image,
  u.current_country,
  u.current_state,
  u.current_lga,
  u.current_city,
  u.bank_account_number,
  u.bank_code,
  u.whatsapp_phone,
  u.data_phone,
  u.educational_status,
  u.highest_degree,
  u.graduation_year,
  u.school_name,
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
JOIN election_groups eg ON pa.election_group_id = eg.id
JOIN parties p ON pa.party_id = p.id
LEFT JOIN c_states st ON u.current_state = st.id
LEFT JOIN lgas lg ON u.current_lga = lg.id
LEFT JOIN c_cities ct ON u.current_city = ct.id
LEFT JOIN polling_units pu ON pa.polling_unit_id = pu.id
WHERE 
  (sqlc.arg(user_id)::bigint = 0 OR pa.user_id = sqlc.arg(user_id)) AND
  (sqlc.arg(party_id)::bigint = 0 OR pa.party_id = sqlc.arg(party_id)) AND
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
UPDATE users
SET
  role_level = $2,
  role = 'partymember',
  updated_at = NOW()
WHERE id = $1
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
        AND pua.party_id = sqlc.arg(party_id)::bigint
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

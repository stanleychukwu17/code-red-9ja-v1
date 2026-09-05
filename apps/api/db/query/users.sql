-- name: CreateUser :one
INSERT INTO users (
  email, phone, username, password_hash, last_name,
  first_name, middle_name, gender, date_of_birth, current_country,
  current_state, current_city
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;


-- name: CreateCandidatePlaceholder :one
INSERT INTO users (
  email, password_hash, username, last_name, first_name, middle_name,
  gender, date_of_birth, current_country, current_state, current_city, state_of_origin,
  party_id, avatar, avatar_file_id, account_status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'placeholder')
RETURNING id;


-- name: CreateUserNIN :one
INSERT INTO users_nin (user_id, nin)
VALUES ($1, $2)
RETURNING id;

-- name: CreatePhoneNumber :one
INSERT INTO users_phone_numbers (user_id, phone, phonecode, raw_input, on_whatsapp, is_default)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: UpsertUserPhoneNumber :one
INSERT INTO users_phone_numbers (user_id, phone, phonecode, raw_input, on_whatsapp, is_default)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (phone) DO UPDATE
SET on_whatsapp = EXCLUDED.on_whatsapp,
    is_active = true
RETURNING id;

-- name: UpdateUserFakeID :exec
UPDATE users
SET fake_id = $2
WHERE id = $1;

-- name: UpdateUserPasswordByFid :exec
UPDATE users
SET password_hash = $2
WHERE fake_id = $1;

-- name: GetUserByID :one
SELECT u.id, u.fake_id, u.email, u.avatar, u.avatar_file_id, u.phone, u.username, u.password_hash, u.last_name, u.first_name, u.middle_name, u.gender, u.date_of_birth, u.voters_card_image, u.current_country, u.current_state, u.current_city, u.current_lga, u.current_ward, u.country_of_origin, u.state_of_origin, u.is_politician, u.is_verified, u.has_role, u.party_id, u.polling_unit_id, u.account_status, u.created_at, u.updated_at,
       u.referral_code
FROM users u
WHERE u.id = $1 LIMIT 1;

-- name: GetUserByFakeID :one
SELECT u.id, u.fake_id, u.email, u.avatar, u.avatar_file_id, u.phone, u.username, u.password_hash, u.last_name, u.first_name, u.middle_name, u.gender, u.date_of_birth, u.voters_card_image, u.current_country, u.current_state, u.current_city, u.current_lga, u.current_ward, u.country_of_origin, u.state_of_origin, u.is_politician, u.is_verified, u.has_role, u.party_id, u.polling_unit_id, u.account_status, u.created_at, u.updated_at,
       u.referral_code
FROM users u
WHERE u.fake_id = $1 LIMIT 1;

-- name: UpdateUserStatus :exec
UPDATE users
SET account_status = $2
WHERE id = $1;

-- name: UpdateUserAvatar :exec
UPDATE users
SET avatar = $2,
    avatar_file_id = $3,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserProfile :exec
UPDATE users
SET first_name = $2,
    last_name = $3,
    middle_name = $4,
    gender = $5,
    avatar = $6,
    avatar_file_id = $7,
    current_country = $8,
    current_state = $9,
    current_city = $10,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateOnboardingProfile :one
UPDATE users
SET username = $2,
    first_name = $3,
    last_name = $4,
    middle_name = $5,
    gender = $6,
    date_of_birth = $7,
    current_country = $8,
    current_state = $9,
    current_city = $10,
    state_of_origin = $11,
    country_of_origin = $12,
    referral_code = $13,
    account_status = 'active',
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListUsers :many
-- ListUsers fetches a paginated list of users with optional filtering.
-- We use sqlc.narg() (nullable argument) to make filters optional:
-- If a parameter like 'cursor' is not provided (null), the 'sqlc.narg('cursor')::bigint IS NULL' 
-- condition becomes true, effectively skipping that filter.
-- This allows us to use a single dynamic query instead of writing multiple separate queries.
SELECT u.id, u.fake_id FROM users u
WHERE 
  (sqlc.narg('cursor')::bigint IS NULL OR u.id < sqlc.narg('cursor')::bigint)
  AND (sqlc.narg('party_id')::smallint IS NULL OR u.party_id = sqlc.narg('party_id')::smallint)
  AND (sqlc.narg('party_ids')::smallint[] IS NULL OR u.party_id = ANY(sqlc.narg('party_ids')::smallint[]))
  AND (sqlc.narg('verification_type_ids')::smallint[] IS NULL OR (
      u.is_verified = true AND EXISTS (
          SELECT 1 FROM pages_verified pv 
          WHERE pv.page_type = 'user' 
            AND pv.page_id = u.id 
            AND pv.verification_type_id = ANY(sqlc.narg('verification_type_ids')::smallint[])
      )
  ))
  AND (sqlc.narg('role_codes')::text[] IS NULL OR EXISTS (
      -- Use EXISTS instead of LEFT JOIN to avoid returning duplicate user rows 
      -- if a user somehow has multiple roles (or just to keep the base query simple).
      SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_code = ANY(sqlc.narg('role_codes')::text[])
  ))
  AND (sqlc.narg('search')::text IS NULL OR (
      u.first_name ILIKE '%' || sqlc.narg('search')::text || '%' OR
      u.last_name ILIKE '%' || sqlc.narg('search')::text || '%' OR
      u.username ILIKE '%' || sqlc.narg('search')::text || '%'
  ))
  AND (sqlc.narg('account_status')::text[] IS NULL OR u.account_status = ANY(sqlc.narg('account_status')::text[]))
  AND (sqlc.narg('country_ids')::smallint[] IS NULL OR u.current_country = ANY(sqlc.narg('country_ids')::smallint[]))
  AND (sqlc.narg('state_ids')::smallint[] IS NULL OR u.current_state = ANY(sqlc.narg('state_ids')::smallint[]))
ORDER BY u.id DESC
LIMIT sqlc.arg('limit_num')::int;

-- name: DeleteUser :exec
UPDATE users
SET account_status = 'deleted'
WHERE id = $1;

-- name: SeedUser :one
INSERT INTO users (
  email, avatar, phone, username, password_hash, last_name, first_name, middle_name,
  gender, date_of_birth, current_country, current_state, current_lga, current_city,
  state_of_origin, voters_card_image,
  account_status, party_id, is_politician, is_verified
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
RETURNING id;

-- name: AdminUpdateUser :exec
UPDATE users
SET first_name = $2,
    last_name = $3,
    middle_name = $4,
    username = $5,
    gender = $6,
    avatar = $7,
    avatar_file_id = $8,
    current_country = $9,
    current_state = $10,
    current_city = $11,
    state_of_origin = $12,
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteUserRoles :exec
DELETE FROM user_roles WHERE user_id = $1;

-- name: GetUserNINByUserID :one
SELECT * FROM users_nin
WHERE user_id = $1 LIMIT 1;

-- name: UpdateUserVotersCard :exec
UPDATE users
SET voters_card_image = $2, updated_at = NOW()
WHERE id = $1;

-- name: GetMoreInfoAboutThisUser :one
SELECT * FROM user_more_infos
WHERE user_id = $1 LIMIT 1;

-- name: CreateMoreInfoAboutThisUser :one
INSERT INTO user_more_infos (
  user_id, occupation_id, educational_status, highest_degree, graduation_year, school_name, religion, marital_status, address
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING user_id;

-- name: UpdateMoreInfoAboutThisUser :exec
INSERT INTO user_more_infos (
  user_id, occupation_id, educational_status, highest_degree, graduation_year, school_name, religion, marital_status, address
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (user_id) DO UPDATE
SET occupation_id = EXCLUDED.occupation_id,
    educational_status = EXCLUDED.educational_status,
    highest_degree = EXCLUDED.highest_degree,
    graduation_year = EXCLUDED.graduation_year,
    school_name = EXCLUDED.school_name,
    religion = EXCLUDED.religion,
    marital_status = EXCLUDED.marital_status,
    address = EXCLUDED.address,
    updated_at = NOW();

-- name: GetUserIdByReferralCode :one
SELECT id FROM users
WHERE referral_code = $1 LIMIT 1;

-- name: CreateUserVerification :one
INSERT INTO user_verifications (user_id, nin_verified, phone_verified, email_verified, voters_card_verified)
VALUES ($1, $2, $3, $4, $5)
RETURNING user_id;

-- name: GetReferrerNameByCode :one
SELECT id, first_name, last_name 
FROM users
WHERE referral_code = $1 LIMIT 1;

-- name: GetFakeIDByEmail :one
SELECT fake_id FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserPasswordHashByFakeID :one
SELECT password_hash FROM users
WHERE fake_id = $1 LIMIT 1;

-- name: GetFakeIDByPhone :one
SELECT fake_id FROM users
WHERE phone = $1 LIMIT 1;

-- name: GetFakeIDByUsername :one
SELECT fake_id FROM users
WHERE username = $1 LIMIT 1;

-- name: CountAllUserPhoneNumbers :one
SELECT COUNT(*) FROM users_phone_numbers
WHERE user_id = $1;

-- name: UpdatePhoneNumber :exec
UPDATE users_phone_numbers
SET on_whatsapp = $3,
    is_default = $4
WHERE id = $1 AND user_id = $2;

-- name: DeleteUserPhoneNumber :exec
DELETE FROM users_phone_numbers
WHERE id = $1 AND user_id = $2;

-- name: UpdateUserAgentMoreInfo :exec
INSERT INTO user_more_infos (
  user_id, educational_status, highest_degree, graduation_year, school_name
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE
SET educational_status = COALESCE(EXCLUDED.educational_status, user_more_infos.educational_status),
    highest_degree = COALESCE(EXCLUDED.highest_degree, user_more_infos.highest_degree),
    graduation_year = COALESCE(EXCLUDED.graduation_year, user_more_infos.graduation_year),
    school_name = COALESCE(EXCLUDED.school_name, user_more_infos.school_name),
    updated_at = NOW();

-- name: UpdateUserDegreeCertificateUrl :exec
INSERT INTO user_more_infos (
  user_id, degree_certificate_url
) VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE
SET degree_certificate_url = EXCLUDED.degree_certificate_url,
    updated_at = NOW();

-- name: CheckReferralCodeExists :one
SELECT EXISTS(
    SELECT 1 FROM users
    WHERE referral_code = $1
);

-- name: UpdateUserReferralCode :exec
UPDATE users
SET referral_code = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserHasRole :exec
UPDATE users
SET has_role = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: GetUserVerification :one
SELECT * FROM user_verifications
WHERE user_id = $1 LIMIT 1;

-- name: GetUserPhoneNumbersByUserID :many
SELECT * FROM users_phone_numbers
WHERE user_id = $1;

-- name: GetFakeIDByAdditionalPhone :one
SELECT u.fake_id
FROM users u
JOIN users_phone_numbers upn ON u.id = upn.user_id
WHERE upn.phone = $1 LIMIT 1;

-- name: GetUserIDByNIN :one
SELECT user_id
FROM users_nin
WHERE nin = $1 LIMIT 1;

-- name: GetFakeIDByUserID :one
SELECT fake_id FROM users
WHERE id = $1 LIMIT 1;


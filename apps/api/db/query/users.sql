-- name: CreateUser :one
INSERT INTO users (
  email, phone, username, password_hash, last_name,
  first_name, middle_name, gender, date_of_birth, current_country,
  current_state, current_city, referral_code, referred_by_code
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id;

-- name: CheckReferralCodeExists :one
SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = $1);

-- name: CreateCandidatePlaceholder :one
INSERT INTO users (
  email, password_hash, last_name, first_name, middle_name,
  gender, date_of_birth, current_country, current_state, current_city, state_of_origin,
  party_id, avatar, account_status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'placeholder')
RETURNING id;


-- name: CreateUserNIN :one
INSERT INTO users_nin (user_id, nin)
VALUES ($1, $2)
RETURNING id;

-- name: CreatePhoneNumber :one
INSERT INTO users_phone_numbers (user_id, phone, phonecode, raw_input, on_whatsapp, is_default)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: UpdateUserFakeID :exec
UPDATE users
SET fake_id = $2
WHERE id = $1;

-- name: UpdateUserPasswordByFid :exec
UPDATE users
SET password_hash = $2
WHERE fake_id = $1;

-- name: GetUserByFakeID :one
SELECT * FROM users
WHERE fake_id = $1 LIMIT 1;

-- name: CreateUserSecurityQuestions :one
INSERT INTO user_security_questions (user_fid, nin, question1, answer1, question2, answer2)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: GetUserSecurityQuestionsByNIN :one
SELECT * FROM user_security_questions
WHERE nin = $1 LIMIT 1;

-- name: UpdateUserStatus :exec
UPDATE users
SET account_status = $2
WHERE id = $1;

-- name: ListAdmins :many
SELECT u.id, u.fake_id, u.email, u.phone, u.username, u.first_name, u.last_name, u.gender, u.date_of_birth, u.current_country, u.current_state, u.current_city, u.account_status, u.created_at, u.updated_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.code = 'admin'
ORDER BY u.id DESC;

-- name: UpdateUserAvatar :exec
UPDATE users
SET avatar = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserProfile :exec
UPDATE users
SET first_name = $2,
    last_name = $3,
    middle_name = $4,
    gender = $5,
    avatar = $6,
    current_country = $7,
    current_state = $8,
    current_city = $9,
    updated_at = NOW()
WHERE id = $1;


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
    gender = $5,
    avatar = $6,
    current_country = $7,
    current_state = $8,
    current_city = $9,
    state_of_origin = $10,
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
  user_id, occupation_id, educational_status, highest_degree, graduation_year, school_name, religion, marital_status, education_level, address
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING user_id;

-- name: UpdateMoreInfoAboutThisUser :exec
INSERT INTO user_more_infos (
  user_id, occupation_id, educational_status, highest_degree, graduation_year, school_name, religion, marital_status, education_level, address
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (user_id) DO UPDATE
SET occupation_id = EXCLUDED.occupation_id,
    educational_status = EXCLUDED.educational_status,
    highest_degree = EXCLUDED.highest_degree,
    graduation_year = EXCLUDED.graduation_year,
    school_name = EXCLUDED.school_name,
    religion = EXCLUDED.religion,
    marital_status = EXCLUDED.marital_status,
    education_level = EXCLUDED.education_level,
    address = EXCLUDED.address,
    updated_at = NOW();

-- name: UpdateUserAgentMoreInfo :exec
INSERT INTO user_more_infos (
  user_id, educational_status, highest_degree, graduation_year, school_name, address
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE
SET educational_status = EXCLUDED.educational_status,
    highest_degree = EXCLUDED.highest_degree,
    graduation_year = EXCLUDED.graduation_year,
    school_name = EXCLUDED.school_name,
    address = EXCLUDED.address,
    updated_at = NOW();

-- name: CreateUserVerification :one
INSERT INTO user_verifications (
  user_id, nin_verified, phone_verified, email_verified, voters_card_verified
) VALUES ($1, $2, $3, $4, $5)
RETURNING user_id;

-- name: GetUserVerification :one
SELECT * FROM user_verifications
WHERE user_id = $1 LIMIT 1;

-- name: GetUserPhoneNumbersByUserID :many
SELECT * FROM users_phone_numbers
WHERE user_id = $1 AND is_active = true ORDER BY id ASC;

-- name: CountAllUserPhoneNumbers :one
SELECT count(*) FROM users_phone_numbers
WHERE user_id = $1;

-- name: DeleteUserPhoneNumber :exec
UPDATE users_phone_numbers
SET is_active = false
WHERE id = $1 AND user_id = $2;
-- name: UpdatePhoneNumber :exec
UPDATE users_phone_numbers
SET on_whatsapp = $2, is_default = $3
WHERE id = $1 AND user_id = $4;

-- name: CreateUserBankAccount :one
INSERT INTO user_bank_accounts (
  user_id, account_number, bank_code, is_primary
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserBankAccountsByUserID :many
SELECT * FROM user_bank_accounts
WHERE user_id = $1 ORDER BY is_primary DESC, id DESC;

-- name: UpdateUserBankAccount :one
UPDATE user_bank_accounts
SET account_number = $2, bank_code = $3, is_primary = $4, updated_at = NOW()
WHERE id = $1 AND user_id = $5
RETURNING *;

-- name: DeleteUserBankAccount :exec
DELETE FROM user_bank_accounts
WHERE id = $1 AND user_id = $2;

-- name: SetPrimaryBankAccount :exec
UPDATE user_bank_accounts
SET is_primary = CASE WHEN id = $1 THEN true ELSE false END
WHERE user_id = $2;

-- name: GetFakeIDByUsername :one
SELECT fake_id FROM users
WHERE username = $1 LIMIT 1;

-- name: GetFakeIDByEmail :one
SELECT fake_id FROM users
WHERE email = $1 LIMIT 1;

-- name: GetFakeIDByPhone :one
SELECT fake_id FROM users
WHERE phone = $1 LIMIT 1;

-- name: GetFakeIDByAdditionalPhone :one
SELECT u.fake_id
FROM users u
JOIN users_phone_numbers pn ON u.id = pn.user_id
WHERE pn.phone = $1 LIMIT 1;

-- name: GetFakeIDByUserID :one
SELECT fake_id FROM users
WHERE id = $1 LIMIT 1;

-- name: GetFakeIDByNIN :one
SELECT u.fake_id
FROM users u
JOIN users_nin n ON u.id = n.user_id
WHERE n.nin = $1 LIMIT 1;

-- name: GetUserPasswordHashByFakeID :one
SELECT password_hash FROM users
WHERE fake_id = $1 LIMIT 1;

-- name: UpdateUserHasRole :exec
UPDATE users
SET has_role = $2
WHERE id = $1;


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
  email, password_hash, last_name, first_name, middle_name,
  gender, date_of_birth, current_country, current_state, current_city, state_of_origin,
  party_id, avatar, account_status, role, role_level
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'placeholder', $14, $15)
RETURNING id;


-- name: CreateUserNIN :one
INSERT INTO users_nin (user_id, nin)
VALUES ($1, $2)
RETURNING id;

-- name: CreatePhoneNumber :one
INSERT INTO users_phone_numbers (user_id, phone)
VALUES ($1, $2)
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

-- name: UpdateUserRoleAndStatus :exec
UPDATE users
SET role = $2, account_status = $3
WHERE id = $1;

-- name: ListAdmins :many
SELECT id, fake_id, email, phone, username, first_name, last_name, gender, date_of_birth, current_country, current_state, current_city, account_status, role, created_at, updated_at
FROM users
WHERE role = 'admin'
ORDER BY id DESC;

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

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY id DESC;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: SeedUser :one
INSERT INTO users (
  fake_id, email, avatar, phone, username, password_hash, last_name, first_name, middle_name,
  gender, date_of_birth, current_country, current_state, current_lga, current_city,
  state_of_origin, vin, voters_card_image, bank_account_number, bank_code,
  nin_verified, phone_verified, role, role_level, account_status, party_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
    role = $10,
    role_level = $11,
    party_id = $12,
    email = $13,
    state_of_origin = $14,
    updated_at = NOW()
WHERE id = $1;

-- name: GetUserNINByUserID :one
SELECT * FROM users_nin
WHERE user_id = $1 LIMIT 1;
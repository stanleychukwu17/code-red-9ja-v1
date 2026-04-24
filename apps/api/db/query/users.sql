-- name: CreateUser :one
INSERT INTO users (
  email, phone, username, password_hash, last_name,
  first_name, middle_name, gender, date_of_birth, current_country,
  current_state, current_city
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;

-- name: CreateUserNIN :one
INSERT INTO users_nin (user_id, nin)
VALUES ($1, $2)
RETURNING id;

-- name: UpdateUserFakeID :exec
UPDATE users
SET fake_id = $2
WHERE id = $1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT id, fake_id FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT id, fake_id FROM users
WHERE username = $1 LIMIT 1;


-- name: GetUserNINByUserID :one
SELECT id, nin FROM users_nin
WHERE user_id = $1 LIMIT 1;

-- name: GetUserNINByNIN :one
SELECT id, user_id FROM users_nin
WHERE nin = $1 LIMIT 1;

-- name: GetUserByPhone :one
SELECT id, fake_id FROM users
WHERE phone = $1 LIMIT 1;

-- name: CheckIfPhoneNumberExists :one
SELECT id FROM users_phone_numbers
WHERE phone = $1 LIMIT 1;

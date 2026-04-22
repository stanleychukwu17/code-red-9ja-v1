-- name: CreateUser :one
INSERT INTO users (
  email, phone, username, password_hash, last_name,
  first_name, middle_name, gender, date_of_birth, current_country,
  current_state, current_city
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;
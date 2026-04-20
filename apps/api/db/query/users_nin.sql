-- name: CreateUserNIN :one
INSERT INTO users_nin (user_id, nin)
VALUES ($1, $2)
RETURNING id;

-- name: GetUserNINByUserID :one
SELECT id, nin FROM users_nin
WHERE user_id = $1 LIMIT 1;


-- name: GetUserRoles :many
SELECT user_id, role_id, role_code AS code, date_assigned, who_assigned_user_id AS who_assigned
FROM user_roles
WHERE user_id = $1;

-- name: GetRoleByCode :one
SELECT id, code, name, description
FROM roles
WHERE code = $1;

-- name: AssignUserRole :exec
INSERT INTO user_roles (user_id, role_id, role_code, who_assigned_user_id, date_assigned)
VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- name: RemoveUserRole :exec
DELETE FROM user_roles
WHERE user_id = $1 AND role_code = $2;

-- name: CheckUserHasAnyRole :one
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = $1
);

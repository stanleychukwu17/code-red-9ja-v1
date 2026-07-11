-- name: GetUserRoles :many
SELECT r.code, r.name, r.description
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1;

-- name: AssignUserRole :exec
INSERT INTO user_roles (user_id, role_id)
SELECT $1, id FROM roles WHERE code = $2
ON CONFLICT DO NOTHING;

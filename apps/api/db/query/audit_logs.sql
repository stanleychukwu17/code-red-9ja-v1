-- name: InsertAuditLog :one
INSERT INTO audit_logs (
    module, action, actor_id, actor_role, entity_type, entity_id, old_values, new_values, ip_address, user_agent
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING id, module, action, actor_id, actor_role, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at;

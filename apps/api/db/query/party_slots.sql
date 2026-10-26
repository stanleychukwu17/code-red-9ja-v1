-- name: GetSystemSetting :one
SELECT * FROM system_settings WHERE key = $1;

-- name: UpdateSystemSetting :one
UPDATE system_settings
SET 
    value = $2, 
    description = COALESCE(sqlc.narg('description'), description),
    updated_at = NOW()
WHERE key = $1
RETURNING *;

-- name: AddPartySlots :one
UPDATE parties
SET slots = slots + $1,
    updated_at = NOW()
WHERE id = $2
RETURNING id, slots;

-- name: DeductPartySlots :one
UPDATE parties
SET slots = slots - $1,
    updated_at = NOW()
WHERE id = $2 AND slots >= $1
RETURNING id, slots;

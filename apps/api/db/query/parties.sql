-- name: CreateParty :one
INSERT INTO parties (short_name, name, logo, display_order)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPartyByID :one
SELECT * FROM parties WHERE id = $1;

-- name: GetPartyByShortName :one
SELECT * FROM parties WHERE short_name = $1;

-- name: GetPartyBasicInfo :one
SELECT id, short_name, name, logo FROM parties WHERE id = $1 LIMIT 1;

-- name: ListParties :many
SELECT * FROM parties
WHERE status = 'active'
ORDER BY display_order ASC, name ASC;

-- name: ListAcceptingParties :many
SELECT 
  id, short_name, name, logo, display_order, status, slots, is_verified,
  discount_percentage, agent_payment_balance_kobo, agent_payment_allocation, agent_acquisition_targets,
  created_at, updated_at
FROM parties
WHERE 
  -- Ensure targets are set
  agent_acquisition_targets IS NOT NULL 
  AND agent_acquisition_targets != '{}'::jsonb
  
  -- Ensure allocation is set
  AND agent_payment_allocation IS NOT NULL 
  AND agent_payment_allocation != '{}'::jsonb
  
  -- Ensure balance is sufficient
  AND agent_payment_balance_kobo > 0
  AND agent_payment_balance_kobo >= COALESCE(
    (
      SELECT MAX((value->>'default')::bigint)
      FROM jsonb_each(agent_payment_allocation)
      WHERE value->>'default' IS NOT NULL
    ), 0
  )
ORDER BY display_order ASC, name ASC;

-- name: UpdateParty :one
UPDATE parties
SET short_name = $1, name = $2, logo = $3, display_order = $4, updated_at = NOW()
WHERE id = $5
RETURNING *;

-- name: DeleteParty :exec
DELETE FROM parties WHERE id = $1;

-- name: UpdatePartyAgentAcquisitionTargets :one
UPDATE parties
SET agent_acquisition_targets = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

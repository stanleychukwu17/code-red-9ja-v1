-- name: DepositPartyAllowance :one
UPDATE parties
SET allowance_balance_kobo = allowance_balance_kobo + $1,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

-- name: UpdatePartyAgentPaymentAllocation :one
UPDATE parties
SET agent_payment_allocation = $1,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

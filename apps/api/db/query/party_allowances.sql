-- name: DepositPartyAllowance :one
UPDATE parties
SET allowance_balance_kobo = allowance_balance_kobo + $1,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

-- name: UpdatePartyStateAllowances :one
UPDATE parties
SET state_allowances = $1,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

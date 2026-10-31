-- name: GetUserPrimaryBankAccount :one
SELECT * FROM user_bank_accounts
WHERE user_id = $1 AND is_primary = true
LIMIT 1;

-- name: UpdateUserBankAccountsToNonPrimary :exec
UPDATE user_bank_accounts
SET is_primary = false, updated_at = NOW()
WHERE user_id = $1;

-- name: InsertUserBankAccount :one
INSERT INTO user_bank_accounts (
  user_id,
  account_number,
  bank_code,
  is_primary
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: UpsertPrimaryBankAccount :exec
WITH demoted AS (
  UPDATE user_bank_accounts
  SET is_primary = false, updated_at = NOW()
  WHERE user_id = $1 AND (account_number != $2 OR bank_code != $3) AND is_primary = true
),
updated AS (
  UPDATE user_bank_accounts
  SET is_primary = true, updated_at = NOW()
  WHERE user_id = $1 AND account_number = $2 AND bank_code = $3
  RETURNING id
)
INSERT INTO user_bank_accounts (user_id, account_number, bank_code, is_primary)
SELECT $1, $2, $3, true
WHERE NOT EXISTS (SELECT 1 FROM updated);

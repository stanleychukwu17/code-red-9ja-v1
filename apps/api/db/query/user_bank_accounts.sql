-- name: GetUserPrimaryBankAccount :one
SELECT * FROM user_bank_accounts
WHERE user_id = $1 AND is_primary = true
ORDER BY created_at DESC
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

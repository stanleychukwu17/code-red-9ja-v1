-- name: CreateUserWallet :one
INSERT INTO user_wallets (user_id, account_reference, account_numbers)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserWalletByUserID :one
SELECT * FROM user_wallets WHERE user_id = $1;

-- name: GetUserWalletByID :one
SELECT * FROM user_wallets WHERE id = $1;

-- name: GetUserWalletByAccountReference :one
SELECT * FROM user_wallets WHERE account_reference = $1;

-- name: CreditUserWallet :one
UPDATE user_wallets
SET balance_kobo = balance_kobo + $1,
    updated_at   = NOW()
WHERE id = $2
RETURNING *;

-- name: CreateUserWalletTransaction :one
INSERT INTO user_wallet_transactions (
  wallet_id,
  transaction_reference,
  type,
  amount_kobo,
  balance_after_kobo,
  payer_name,
  payer_account_number,
  payer_bank_code,
  narration,
  raw_payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListUserWalletTransactions :many
SELECT * FROM user_wallet_transactions
WHERE wallet_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetUserWalletTransactionByReference :one
SELECT * FROM user_wallet_transactions
WHERE transaction_reference = $1;

-- name: ListUsersWithoutWallet :many
SELECT u.id, u.fake_id, u.email, u.avatar, u.phone, u.username, u.password_hash, u.last_name, u.first_name, u.middle_name, u.gender, u.date_of_birth, u.voters_card_image, u.current_country, u.current_state, u.current_city, u.current_lga, u.current_ward, u.state_of_origin, u.is_politician, u.is_verified, u.has_role, u.party_id, u.polling_unit_id, u.referral_code, u.account_status, u.created_at, u.updated_at FROM users u 
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE uw.id IS NULL
ORDER BY u.id ASC;

-- name: DebitUserWallet :one
UPDATE user_wallets
SET balance_kobo = balance_kobo - $1,
    updated_at   = NOW()
WHERE id = $2 AND balance_kobo >= $1
RETURNING *;

-- name: CreatePartyWallet :one
INSERT INTO party_wallets (party_id, account_reference, account_numbers)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPartyWalletByPartyID :one
SELECT * FROM party_wallets WHERE party_id = $1;

-- name: GetPartyWalletByID :one
SELECT * FROM party_wallets WHERE id = $1;

-- name: GetPartyWalletByAccountReference :one
SELECT * FROM party_wallets WHERE account_reference = $1;

-- name: CreditPartyWallet :one
UPDATE party_wallets
SET balance_kobo = balance_kobo + $1,
    updated_at   = NOW()
WHERE id = $2
RETURNING *;

-- name: CreateWalletTransaction :one
INSERT INTO party_wallet_transactions (
  wallet_id,
  transaction_reference,
  type,
  transaction_category,
  amount_kobo,
  balance_after_kobo,
  payer_name,
  payer_account_number,
  payer_bank_code,
  narration,
  raw_payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: ListWalletTransactions :many
SELECT * FROM party_wallet_transactions
WHERE wallet_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetWalletTransactionByReference :one
SELECT * FROM party_wallet_transactions
WHERE transaction_reference = $1;

-- name: ListPartiesWithoutWallet :many
SELECT p.* FROM parties p
LEFT JOIN party_wallets pw ON pw.party_id = p.id
WHERE pw.id IS NULL
ORDER BY p.id ASC;

-- name: DebitPartyWallet :one
UPDATE party_wallets
SET balance_kobo = balance_kobo - $1,
    updated_at   = NOW()
WHERE id = $2 AND balance_kobo >= $1
RETURNING *;


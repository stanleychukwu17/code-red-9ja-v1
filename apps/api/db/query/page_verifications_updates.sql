-- name: UpdatePartyIsVerified :exec
UPDATE parties
SET is_verified = $2, updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserIsVerified :exec
UPDATE users
SET is_verified = $2, updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserPhoneNumberIsVerified :exec
UPDATE users_phone_numbers
SET owner_is_verified = $2
WHERE user_id = $1;

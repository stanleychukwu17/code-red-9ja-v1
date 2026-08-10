-- name: CreateReferral :one
INSERT INTO referrals (
  party_id,
  referrer_user_id,
  referred_user_id,
  milestone,
  status
) VALUES (
  $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetReferral :one
SELECT * FROM referrals
WHERE id = $1 LIMIT 1;

-- name: GetReferralByReferredUserID :one
SELECT * FROM referrals
WHERE referred_user_id = $1 LIMIT 1;

-- name: ListReferralsByReferrer :many
SELECT * FROM referrals
WHERE referrer_user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListReferrals :many
SELECT * FROM referrals
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateReferral :one
UPDATE referrals
SET 
  milestone = COALESCE(sqlc.narg('milestone'), milestone),
  status = COALESCE(sqlc.narg('status'), status),
  party_id = COALESCE(sqlc.narg('party_id'), party_id),
  paid_at = COALESCE(sqlc.narg('paid_at'), paid_at),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CreateUserReferralRecord :exec
INSERT INTO user_referrals (
  user_id,
  party_id,
  election_group_id
) VALUES (
  $1, $2, $3
)
ON CONFLICT (user_id, election_group_id) DO NOTHING;

-- name: GetUserReferredByID :one
-- Returns the referred_by_id for a user given their internal user ID.
SELECT referred_by_id FROM users WHERE id = $1 LIMIT 1;

-- name: GetApplicationElectionGroupsByUserAndParty :many
-- Returns all distinct election_group_ids for a user's applications under a party.
SELECT DISTINCT election_group_id FROM party_applications
WHERE user_id = $1 AND party_id = $2;

-- name: GetReferrerUserReferralsForParty :many
-- Returns all user_referrals records for a referrer under a specific party.
SELECT * FROM user_referrals
WHERE user_id = $1 AND party_id = $2;

-- name: IncrementUserReferralAgentCount :exec
-- Increments agent_referrals for the referrer's user_referrals row matching the election group.
UPDATE user_referrals
SET agent_referrals = agent_referrals + 1,
    updated_at = NOW()
WHERE user_id = $1 AND election_group_id = $2;

-- name: IncrementUserReferralUnpaidCount :exec
-- Increments unpaid_referrals for the referrer's user_referrals row matching the election group.
UPDATE user_referrals
SET unpaid_referrals = unpaid_referrals + 1,
    updated_at = NOW()
WHERE user_id = $1 AND election_group_id = $2;

-- name: UpdateReferralOnAgentAcceptance :exec
-- Updates the referrals row when the referred user is accepted as an agent.
-- Sets milestone, amount_to_pay, party_id, election_group_id.
UPDATE referrals
SET milestone        = 'BECAME_AGENT',
    amount_to_pay    = $2,
    party_id         = $3,
    election_group_id = $4,
    updated_at       = NOW()
WHERE referred_user_id = $1;

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
ON CONFLICT (referred_user_id) DO UPDATE SET
  referrer_user_id = EXCLUDED.referrer_user_id,
  party_id = COALESCE(EXCLUDED.party_id, referrals.party_id),
  milestone = EXCLUDED.milestone,
  status = EXCLUDED.status,
  updated_at = NOW()
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
ORDER BY id DESC
LIMIT $2 OFFSET $3;

-- name: ListReferrals :many
SELECT * FROM referrals
ORDER BY id DESC
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
-- Returns the referrer_user_id for a user given their internal user ID.
SELECT referrer_user_id FROM referrals WHERE referred_user_id = $1 LIMIT 1;

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

-- name: UpdateReferralOnApplication :exec
-- Updates the referrals row when the referred user submits a party application matching referrer's user_referrals.
UPDATE referrals
SET user_referral_id  = $2,
    party_id          = $3,
    election_group_id = $4,
    amount_to_pay     = $5,
    milestone         = COALESCE(NULLIF(sqlc.arg('milestone')::text, ''), milestone),
    updated_at        = NOW()
WHERE id = $1;

-- name: IncrementUserReferralTotalCount :exec
-- Increments total_referrals count for the selected user_referrals record.
UPDATE user_referrals
SET total_referrals = total_referrals + 1,
    updated_at      = NOW()
WHERE id = $1;

-- name: GetUserReferralByID :one
SELECT * FROM user_referrals
WHERE id = $1 LIMIT 1;

-- name: IncrementUserReferralAgentCountByID :exec
UPDATE user_referrals
SET agent_referrals = agent_referrals + 1,
    updated_at      = NOW()
WHERE id = $1;

-- name: IncrementUserReferralUnpaidCountByID :exec
UPDATE user_referrals
SET unpaid_referrals = unpaid_referrals + 1,
    updated_at       = NOW()
WHERE id = $1;

-- name: IncrementUserReferralPotentialEarningsByID :exec
UPDATE user_referrals
SET potential_earnings = potential_earnings + $2,
    updated_at         = NOW()
WHERE id = $1;

-- name: IncrementUserReferralEarnedAmountByID :exec
UPDATE user_referrals
SET earned_amount = earned_amount + $2,
    updated_at    = NOW()
WHERE id = $1;

-- name: GetUserReferralByUserAndElectionGroup :one
SELECT * FROM user_referrals
WHERE user_id = $1 AND election_group_id = $2
LIMIT 1;

-- name: ListReferredUsersWithDetails :many
SELECT 
  r.id,
  r.user_referral_id,
  r.party_id,
  r.election_group_id,
  r.referrer_user_id,
  r.referred_user_id,
  r.milestone,
  r.status,
  r.amount_to_pay,
  r.created_at,
  r.updated_at,
  u.first_name,
  u.last_name,
  u.avatar
FROM referrals r
JOIN users u ON u.id = r.referred_user_id
WHERE r.referrer_user_id = $1
  AND (sqlc.narg('election_group_id')::int IS NULL OR r.election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('cursor_id')::bigint IS NULL OR r.id < sqlc.narg('cursor_id'))
ORDER BY r.id DESC
LIMIT $2;

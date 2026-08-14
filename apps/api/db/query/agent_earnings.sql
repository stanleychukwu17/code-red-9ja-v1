-- name: UpsertAgentEarnings :one
INSERT INTO agent_earnings (
  user_id,
  party_id,
  election_group_id,
  role_type,
  base_payment_kobo,
  earnings_allocation,
  readiness_score,
  results_score,
  updates_score,
  attendance_score,
  election_start_score,
  election_end_score,
  live_voters_score,
  readiness_earned_kobo,
  results_earned_kobo,
  updates_earned_kobo,
  attendance_earned_kobo,
  election_start_earned_kobo,
  election_end_earned_kobo,
  live_voters_earned_kobo,
  total_earned_kobo,
  calculated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13, $14,
  $15, $16, $17, $18, $19, $20, $21,
  NOW()
)
ON CONFLICT (user_id, election_group_id, role_type) DO UPDATE SET
  base_payment_kobo          = EXCLUDED.base_payment_kobo,
  earnings_allocation        = EXCLUDED.earnings_allocation,
  readiness_score            = EXCLUDED.readiness_score,
  results_score              = EXCLUDED.results_score,
  updates_score              = EXCLUDED.updates_score,
  attendance_score           = EXCLUDED.attendance_score,
  election_start_score       = EXCLUDED.election_start_score,
  election_end_score         = EXCLUDED.election_end_score,
  live_voters_score          = EXCLUDED.live_voters_score,
  readiness_earned_kobo      = EXCLUDED.readiness_earned_kobo,
  results_earned_kobo        = EXCLUDED.results_earned_kobo,
  updates_earned_kobo        = EXCLUDED.updates_earned_kobo,
  attendance_earned_kobo     = EXCLUDED.attendance_earned_kobo,
  election_start_earned_kobo = EXCLUDED.election_start_earned_kobo,
  election_end_earned_kobo   = EXCLUDED.election_end_earned_kobo,
  live_voters_earned_kobo    = EXCLUDED.live_voters_earned_kobo,
  total_earned_kobo          = EXCLUDED.total_earned_kobo,
  calculated_at              = NOW(),
  updated_at                 = NOW()
RETURNING *;

-- name: GetAgentEarningsByUserAndElectionGroupAndRole :one
SELECT * FROM agent_earnings
WHERE user_id = $1 AND election_group_id = $2 AND role_type = $3
LIMIT 1;

-- name: GetAgentEarningsByID :one
SELECT * FROM agent_earnings
WHERE id = $1
LIMIT 1;

-- name: ListAgentEarnings :many
SELECT ae.*, u.first_name, u.last_name, u.username
FROM agent_earnings ae
JOIN users u ON ae.user_id = u.id
WHERE
  ($1::bigint = 0 OR ae.user_id = $1) AND
  ($2::bigint = 0 OR ae.election_group_id = $2) AND
  ($3::smallint = 0 OR ae.party_id = $3) AND
  ($4::varchar = '' OR ae.status = $4) AND
  ($5::bigint = 0 OR ae.id < $5)
ORDER BY ae.id DESC
LIMIT $6::int;

-- name: ApproveAgentEarnings :one
UPDATE agent_earnings
SET
  status      = 'approved',
  approved_at = NOW(),
  updated_at  = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: MarkAgentEarningsPaid :one
UPDATE agent_earnings
SET
  status     = 'paid',
  paid_at    = NOW(),
  updated_at = NOW()
WHERE id = $1 AND status = 'approved'
RETURNING *;

-- name: GetAssignmentForEarnings :one
SELECT
  a.id,
  a.user_id,
  a.party_id,
  a.election_group_id,
  a.role_type,
  a.arrived_at,
  a.election_started_at,
  a.election_ended_at,
  a.updates_count,
  a.results_submitted_count,
  a.results_expected_to_submit_count,
  a.live_voters_referred_count,
  a.election_practice_test_readiness_percentage,
  a.potential_payment_kobo,
  a.interval_updates,
  cs.name AS state_name,
  eg.election_date
FROM polling_unit_assignments a
JOIN election_groups eg ON a.election_group_id = eg.id
JOIN polling_units pu ON a.polling_unit_id = pu.id
JOIN c_states cs ON pu.state_id = cs.id
WHERE a.id = $1
LIMIT 1;

-- name: GetAssignmentIDByUserAndElectionGroup :one
SELECT id FROM polling_unit_assignments
WHERE user_id = $1 AND election_group_id = $2
LIMIT 1;

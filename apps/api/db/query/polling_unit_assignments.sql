-- name: CreateAssignment :one
INSERT INTO polling_unit_assignments (
  user_id,
  polling_unit_id,
  election_group_id,
  party_id,
  state_id,
  lga_id,
  ward_id,
  role_type,
  assigned_by,
  potential_payment_kobo
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: GetAssignmentByID :one
SELECT 
  a.id,
  a.user_id,
  a.polling_unit_id,
  a.election_group_id,
  a.party_id,
  a.role_type,
  a.assigned_by,
  a.arrived_at,
  a.arrival_video_url,
  a.election_started_at,
  a.election_started_video_url,
  a.election_ended_at,
  a.election_ended_video_url,
  a.created_at,
  a.updated_at,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.username,
  u.avatar,
  pu.name AS polling_unit_name,
  pu.pu_code AS polling_unit_pu_code,
  pu.ward_name,
  pu.lga_name,
  pu.state_name,
  eg.name AS election_group_name,
  eg.election_date
FROM polling_unit_assignments a
JOIN users u ON a.user_id = u.id
JOIN polling_units pu ON a.polling_unit_id = pu.id
JOIN election_groups eg ON a.election_group_id = eg.id
WHERE a.id = $1 LIMIT 1;

-- name: GetUserAssignment :one
SELECT 
  a.id,
  a.user_id,
  a.polling_unit_id,
  a.election_group_id,
  a.party_id,
  a.role_type,
  a.arrived_at,
  a.election_started_at,
  a.election_ended_at,
  pu.name AS polling_unit_name,
  pu.pu_code AS polling_unit_pu_code,
  pu.ward_id,
  pu.ward_name,
  pu.lga_id,
  pu.lga_name,
  pu.state_id,
  pu.state_name
FROM polling_unit_assignments a
JOIN polling_units pu ON a.polling_unit_id = pu.id
WHERE a.user_id = $1 AND a.election_group_id = $2
LIMIT 1;

-- name: ListAssignments :many
SELECT 
  a.id,
  a.user_id,
  a.polling_unit_id,
  a.election_group_id,
  a.party_id,
  a.role_type,
  a.assigned_by,
  a.created_at,
  a.updated_at,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.username,
  u.avatar,
  pu.name AS polling_unit_name,
  pu.pu_code AS polling_unit_pu_code,
  pu.ward_name,
  pu.lga_name,
  pu.state_name,
  eg.name AS election_group_name,
  eg.election_date,
  a.arrived_at,
  a.arrival_video_url,
  a.election_started_at,
  a.election_started_video_url,
  a.election_ended_at,
  a.election_ended_video_url
FROM polling_unit_assignments a
JOIN users u ON a.user_id = u.id
JOIN polling_units pu ON a.polling_unit_id = pu.id
JOIN election_groups eg ON a.election_group_id = eg.id
WHERE 
  (sqlc.arg(election_group_id)::integer = 0 OR a.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(party_id)::smallint = 0 OR a.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(polling_unit_id)::int = 0 OR a.polling_unit_id = sqlc.arg(polling_unit_id)) AND
  (sqlc.arg(user_id)::bigint = 0 OR a.user_id = sqlc.arg(user_id))
ORDER BY a.id DESC
LIMIT $1 OFFSET $2;

-- name: DeleteAssignment :exec
DELETE FROM polling_unit_assignments
WHERE id = $1;

-- name: GetPartyElectionGroupCoverageDistribution :many
WITH counts AS (
  SELECT polling_unit_id, COUNT(*) as agent_count
  FROM polling_unit_assignments
  WHERE party_id = $1 AND election_group_id = $2
  GROUP BY polling_unit_id
)
SELECT gs.threshold::integer AS threshold, COALESCE(COUNT(c.polling_unit_id), 0)::bigint AS count
FROM generate_series(1, 10) AS gs(threshold)
LEFT JOIN counts c ON c.agent_count >= gs.threshold
GROUP BY gs.threshold
ORDER BY gs.threshold;

-- name: UpdateAssignmentTracking :one
UPDATE polling_unit_assignments
SET 
  arrived_at = COALESCE($2, arrived_at),
  arrival_video_url = COALESCE($3, arrival_video_url),
  election_started_at = COALESCE($4, election_started_at),
  election_started_video_url = COALESCE($5, election_started_video_url),
  election_ended_at = COALESCE($6, election_ended_at),
  election_ended_video_url = COALESCE($7, election_ended_video_url),
  updated_at = NOW()
WHERE id = $1
RETURNING id, user_id, polling_unit_id, election_group_id, party_id, role_type, assigned_by, arrived_at, arrival_video_url, election_started_at, election_started_video_url, election_ended_at, election_ended_video_url, created_at, updated_at;

-- name: UpdateAssignmentReadinessPercentage :one
UPDATE polling_unit_assignments
SET
  election_practice_test_readiness_percentage = $2,
  updated_at = NOW()
WHERE id = $1
RETURNING id, user_id, polling_unit_id, election_group_id, party_id, role_type, assigned_by, arrived_at, arrival_video_url, election_started_at, election_started_video_url, election_ended_at, election_ended_video_url, last_update_at, reports_count, updates_count, results_submitted_count, interval_updates, election_practice_test_readiness_percentage, created_at, updated_at;

-- name: UpdatePollingUnitAssignmentEarnedAmountKobo :one
UPDATE polling_unit_assignments
SET earned_amount_kobo = earned_amount_kobo + sqlc.arg(earned_delta_kobo)::bigint,
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;


-- name: CountPollingUnitAssignments :one
SELECT COUNT(*)::integer
FROM polling_unit_assignments
WHERE polling_unit_id = $1
  AND party_id = $2
  AND election_group_id = $3;

-- name: HasActiveAssignment :one
SELECT EXISTS (
  -- 1. Already assigned as a Polling Agent
  SELECT 1
  FROM polling_unit_assignments pua
  JOIN election_groups eg ON pua.election_group_id = eg.id
  WHERE pua.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE

  UNION ALL

  -- 2. Already assigned as a Ward Supervisor
  SELECT 1
  FROM ward_election_supervisors wes
  JOIN election_groups eg ON wes.election_group_id = eg.id
  WHERE wes.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE

  UNION ALL

  -- 3. Already assigned as an LGA Supervisor
  SELECT 1
  FROM lga_election_supervisors les
  JOIN election_groups eg ON les.election_group_id = eg.id
  WHERE les.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE

  UNION ALL

  -- 4. Already assigned as a State Supervisor
  SELECT 1
  FROM state_election_supervisors ses
  JOIN election_groups eg ON ses.election_group_id = eg.id
  WHERE ses.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE
) AS has_active;

-- name: GetUserActiveAssignment :one
SELECT 
  a.id,
  a.user_id,
  a.polling_unit_id,
  a.election_group_id,
  a.party_id,
  a.role_type,
  a.arrived_at,
  a.election_started_at,
  a.election_ended_at,
  a.live_voters_referred_count,
  pu.name AS polling_unit_name,
  pu.pu_code AS polling_unit_pu_code,
  pu.ward_id,
  pu.ward_name,
  pu.lga_id,
  pu.lga_name,
  pu.state_id,
  pu.state_name
FROM polling_unit_assignments a
JOIN polling_units pu ON a.polling_unit_id = pu.id
JOIN election_groups eg ON a.election_group_id = eg.id
WHERE a.user_id = $1
  AND eg.active = TRUE
  AND eg.election_date >= CURRENT_DATE
ORDER BY eg.election_date ASC, a.created_at DESC
LIMIT 1;

-- name: GetActiveSupervisorElectionGroupID :one
SELECT election_group_id FROM (
  SELECT ses.election_group_id
  FROM state_election_supervisors ses
  JOIN election_groups eg ON ses.election_group_id = eg.id
  WHERE ses.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE

  UNION ALL

  SELECT les.election_group_id
  FROM lga_election_supervisors les
  JOIN election_groups eg ON les.election_group_id = eg.id
  WHERE les.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE

  UNION ALL

  SELECT wes.election_group_id
  FROM ward_election_supervisors wes
  JOIN election_groups eg ON wes.election_group_id = eg.id
  WHERE wes.user_id = $1
    AND eg.active = TRUE
    AND eg.election_date >= CURRENT_DATE
) sup
LIMIT 1;

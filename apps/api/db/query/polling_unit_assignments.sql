-- name: CreateAssignment :one
INSERT INTO polling_unit_assignments (
  user_id,
  polling_unit_id,
  election_group_id,
  party_id,
  role_type,
  assigned_by
) VALUES (
  $1, $2, $3, $4, $5, $6
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
  pu.delimitation AS polling_unit_delimitation,
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
  pu.delimitation AS polling_unit_delimitation,
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
  (sqlc.arg(election_group_id)::bigint = 0 OR a.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(party_id)::bigint = 0 OR a.party_id = sqlc.arg(party_id)) AND
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

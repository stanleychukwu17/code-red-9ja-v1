-- name: CreateStateSupervisor :one
INSERT INTO state_election_supervisors (
  user_id,
  state_id,
  election_group_id,
  party_id,
  role_type,
  assigned_by,
  potential_payment_kobo
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: CreateLgaSupervisor :one
INSERT INTO lga_election_supervisors (
  user_id,
  state_id,
  lga_id,
  election_group_id,
  party_id,
  role_type,
  assigned_by,
  potential_payment_kobo
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: CreateWardSupervisor :one
INSERT INTO ward_election_supervisors (
  user_id,
  state_id,
  lga_id,
  ward_id,
  election_group_id,
  party_id,
  role_type,
  assigned_by,
  potential_payment_kobo
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetStateSupervisorByElectionGroup :one
SELECT * FROM state_election_supervisors 
WHERE user_id = $1 AND election_group_id = $2 LIMIT 1;

-- name: GetLgaSupervisorByElectionGroup :one
SELECT * FROM lga_election_supervisors 
WHERE user_id = $1 AND election_group_id = $2 LIMIT 1;

-- name: GetWardSupervisorByElectionGroup :one
SELECT * FROM ward_election_supervisors 
WHERE user_id = $1 AND election_group_id = $2 LIMIT 1;

-- name: UpdateStateSupervisorEarnedAmountKobo :one
UPDATE state_election_supervisors
SET earned_amount_kobo = earned_amount_kobo + sqlc.arg(earned_delta_kobo)::bigint,
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

-- name: UpdateLgaSupervisorEarnedAmountKobo :one
UPDATE lga_election_supervisors
SET earned_amount_kobo = earned_amount_kobo + sqlc.arg(earned_delta_kobo)::bigint,
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

-- name: UpdateWardSupervisorEarnedAmountKobo :one
UPDATE ward_election_supervisors
SET earned_amount_kobo = earned_amount_kobo + sqlc.arg(earned_delta_kobo)::bigint,
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

-- name: UpdateWardSupervisorTracking :one
UPDATE ward_election_supervisors
SET arrived_at = COALESCE(sqlc.narg(arrived_at), arrived_at),
    arrival_video_url = COALESCE(sqlc.narg(arrival_video_url), arrival_video_url),
    completed_at = COALESCE(sqlc.narg(completed_at), completed_at),
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

-- name: UpdateLgaSupervisorTracking :one
UPDATE lga_election_supervisors
SET arrived_at = COALESCE(sqlc.narg(arrived_at), arrived_at),
    arrival_video_url = COALESCE(sqlc.narg(arrival_video_url), arrival_video_url),
    completed_at = COALESCE(sqlc.narg(completed_at), completed_at),
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

-- name: UpdateStateSupervisorTracking :one
UPDATE state_election_supervisors
SET arrived_at = COALESCE(sqlc.narg(arrived_at), arrived_at),
    arrival_video_url = COALESCE(sqlc.narg(arrival_video_url), arrival_video_url),
    completed_at = COALESCE(sqlc.narg(completed_at), completed_at),
    updated_at = NOW()
WHERE user_id = sqlc.arg(user_id) AND election_group_id = sqlc.arg(election_group_id)
RETURNING *;

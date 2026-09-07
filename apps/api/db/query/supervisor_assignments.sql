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

-- name: CheckAndUpdateWardSupervisorCompletion :exec
UPDATE ward_election_supervisors wes
SET completed_at = COALESCE(wes.completed_at, NOW()),
    updated_at   = NOW()
FROM election_group_wards egw
WHERE wes.election_group_id = egw.election_group_id
  AND wes.ward_id = egw.ward_id
  AND wes.completed_at IS NULL
  AND COALESCE((egw.parties->(wes.party_id::text)->>'unique_pu_final_results_uploaded_count')::int, 0) >= COALESCE((egw.parties->(wes.party_id::text)->>'unique_final_results_expected')::int, 1);

-- name: CheckAndUpdateLGASupervisorCompletion :exec
UPDATE lga_election_supervisors les
SET completed_at = COALESCE(les.completed_at, NOW()),
    updated_at   = NOW()
FROM election_group_lgas egl
WHERE les.election_group_id = egl.election_group_id
  AND les.lga_id = egl.lga_id
  AND les.completed_at IS NULL
  AND COALESCE((egl.parties->(les.party_id::text)->>'unique_pu_final_results_uploaded_count')::int, 0) >= COALESCE((egl.parties->(les.party_id::text)->>'unique_final_results_expected')::int, 1);

-- name: CheckAndUpdateStateSupervisorCompletion :exec
UPDATE state_election_supervisors ses
SET completed_at = COALESCE(ses.completed_at, NOW()),
    updated_at   = NOW()
FROM election_group_states egs
WHERE ses.election_group_id = egs.election_group_id
  AND ses.state_id = egs.state_id
  AND ses.completed_at IS NULL
  AND COALESCE((egs.parties->(ses.party_id::text)->>'unique_pu_final_results_uploaded_count')::int, 0) >= COALESCE((egs.parties->(ses.party_id::text)->>'unique_final_results_expected')::int, 1);


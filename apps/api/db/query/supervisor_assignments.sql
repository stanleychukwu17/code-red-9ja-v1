-- name: CreateStateSupervisor :one
INSERT INTO state_election_supervisors (
  user_id,
  state_id,
  election_group_id,
  party_id,
  role_type,
  assigned_by
) VALUES (
  $1, $2, $3, $4, $5, $6
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
  assigned_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
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
  assigned_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
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

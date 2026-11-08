-- =====================================================
-- SUPERVISOR COUNTS FROM SOURCE OF TRUTH
-- =====================================================

-- name: GetWardSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM ward_election_supervisors
WHERE election_group_id = $1 AND ward_id = $2 AND party_id = $3;

-- name: GetLGASupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM lga_election_supervisors
WHERE election_group_id = $1 AND lga_id = $2 AND party_id = $3;

-- name: GetStateSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM state_election_supervisors
WHERE election_group_id = $1 AND state_id = $2 AND party_id = $3;

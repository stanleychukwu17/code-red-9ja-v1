-- name: UpsertPollingUnitFinalResult :one
INSERT INTO election_polling_unit_final_results (
  election_id,
  election_group_id,
  polling_unit_id,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  polling_unit_result_id,
  accredited_voters,
  votes_cast,
  valid_votes,
  rejected_votes,
  candidate_results,
  candidate_results_live,
  matching_submissions_count,
  total_submissions_count
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '[]'::jsonb, $16, $17
)
ON CONFLICT (election_id, polling_unit_id)
DO UPDATE SET
  state_id = EXCLUDED.state_id,
  senatorial_district_id = EXCLUDED.senatorial_district_id,
  federal_constituency_id = EXCLUDED.federal_constituency_id,
  state_constituency_id = EXCLUDED.state_constituency_id,
  lga_id = EXCLUDED.lga_id,
  ward_id = EXCLUDED.ward_id,
  polling_unit_result_id = EXCLUDED.polling_unit_result_id,
  accredited_voters = EXCLUDED.accredited_voters,
  votes_cast = EXCLUDED.votes_cast,
  valid_votes = EXCLUDED.valid_votes,
  rejected_votes = EXCLUDED.rejected_votes,
  candidate_results = EXCLUDED.candidate_results,
  matching_submissions_count = EXCLUDED.matching_submissions_count,
  total_submissions_count = EXCLUDED.total_submissions_count,
  updated_at = NOW()
RETURNING *;

-- name: GetPollingUnitFinalResult :one
SELECT * FROM election_polling_unit_final_results
WHERE election_id = $1 AND polling_unit_id = $2;

-- name: ListPollingUnitFinalResults :many
SELECT 
    id,
    election_id,
    polling_unit_id,
    state_id,
    senatorial_district_id,
    federal_constituency_id,
    state_constituency_id,
    lga_id,
    ward_id,
    polling_unit_result_id,
    accredited_voters,
    votes_cast,
    valid_votes,
    rejected_votes,
    candidate_results,
    candidate_results_live,
    matching_submissions_count,
    total_submissions_count,
    created_at,
    updated_at
FROM election_polling_unit_final_results
WHERE election_id = $1
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::integer IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
  AND (sqlc.narg('federal_constituency_id')::integer IS NULL OR federal_constituency_id = sqlc.narg('federal_constituency_id'))
  AND (sqlc.narg('state_constituency_id')::integer IS NULL OR state_constituency_id = sqlc.narg('state_constituency_id'))
  AND (sqlc.narg('lga_id')::integer IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::integer IS NULL OR ward_id = sqlc.narg('ward_id'))
ORDER BY polling_unit_id;

-- name: RefreshPollingUnitLiveResults :exec
UPDATE election_polling_unit_final_results
SET candidate_results_live = candidate_results,
    updated_at = NOW()
WHERE election_id = $1;

-- name: GetEligiblePollingUnitsForElection :many
SELECT pu.id, pu.ward_id, pu.lga_id, pu.state_id,
       w.state_constituency_id,
       l.federal_constituency_id,
       l.senatorial_district_id
FROM polling_units pu
JOIN wards w ON w.id = pu.ward_id
JOIN lgas l ON l.id = pu.lga_id
WHERE ($1::int = 0 OR pu.ward_id = $1)
  AND ($2::int = 0 OR pu.lga_id = $2)
  AND ($3::smallint = 0 OR pu.state_id = $3)
  AND ($4::int = 0 OR w.state_constituency_id = $4)
  AND ($5::int = 0 OR l.federal_constituency_id = $5)
  AND ($6::int = 0 OR l.senatorial_district_id = $6)
ORDER BY pu.id;

-- name: RollupWardFinalResults :exec
SELECT 1;

-- name: RollupStateConstituencyFinalResults :exec
SELECT 1;

-- name: RollupLGAFinalResults :exec
SELECT 1;

-- name: RollupFederalConstituencyFinalResults :exec
SELECT 1;

-- name: RollupSenatorialDistrictFinalResults :exec
SELECT 1;

-- name: RollupStateFinalResults :exec
SELECT 1;

-- name: RollupElectionFinalResults :exec
SELECT 1;

-- name: RollupSingleWardFinalResults :exec
SELECT 1;

-- name: RollupSingleStateConstituencyFinalResults :exec
SELECT 1;

-- name: RollupSingleLGAFinalResults :exec
SELECT 1;

-- name: RollupSingleFederalConstituencyFinalResults :exec
SELECT 1;

-- name: RollupSingleSenatorialDistrictFinalResults :exec
SELECT 1;

-- name: RollupSingleStateFinalResults :exec
SELECT 1;

-- name: RollupSingleElectionFinalResults :exec
SELECT 1;

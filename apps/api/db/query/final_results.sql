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
  fr.id,
  fr.election_id,
  fr.election_group_id,
  fr.polling_unit_id,
  pu.name AS polling_unit_name,
  fr.state_id,
  s.name AS state_name,
  fr.lga_id,
  l.name AS lga_name,
  fr.ward_id,
  fr.senatorial_district_id,
  fr.federal_constituency_id,
  fr.state_constituency_id,
  fr.polling_unit_result_id,
  r.result_sheet_image_url,
  r.result_sheet_video_url,
  fr.accredited_voters,
  fr.votes_cast,
  fr.valid_votes,
  fr.rejected_votes,
  fr.candidate_results,
  fr.created_at,
  u.first_name AS uploader_first_name,
  u.last_name AS uploader_last_name,
  u.avatar AS uploader_avatar
FROM election_polling_unit_final_results fr
JOIN polling_units pu ON fr.polling_unit_id = pu.id
LEFT JOIN c_states s ON fr.state_id = s.id
LEFT JOIN lgas l ON fr.lga_id = l.id
LEFT JOIN polling_unit_results r ON fr.polling_unit_result_id = r.id
LEFT JOIN users u ON r.submitted_by = u.id
WHERE
  (sqlc.narg('election_group_id')::int IS NULL OR fr.election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR fr.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR fr.senatorial_district_id = sqlc.narg('senatorial_district_id'))
  AND (sqlc.narg('federal_constituency_id')::int IS NULL OR fr.federal_constituency_id = sqlc.narg('federal_constituency_id'))
  AND (sqlc.narg('state_constituency_id')::int IS NULL OR fr.state_constituency_id = sqlc.narg('state_constituency_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR fr.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR fr.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('has_media')::boolean IS NULL OR (sqlc.narg('has_media') = true AND r.result_sheet_image_url IS NOT NULL) OR (sqlc.narg('has_media') = false))
  AND fr.id < sqlc.arg('cursor')::bigint
ORDER BY fr.id DESC
LIMIT sqlc.arg('limit')::int;

-- name: RefreshPollingUnitLiveResults :exec
WITH live_counts AS (
  SELECT 
    p.short_name AS party_short_name,
    COUNT(ev.id)::int AS vote_count
  FROM election_votes ev
  JOIN parties p ON ev.party_id = p.id
  WHERE ev.election_id = $1 AND ev.polling_unit_id = $2
  GROUP BY p.short_name
),
live_json AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)
    ), '[]'::jsonb
  ) as candidate_results_live
  FROM live_counts
)
INSERT INTO election_polling_unit_final_results (
  election_id, election_group_id, polling_unit_id,
  state_id, senatorial_district_id, federal_constituency_id, state_constituency_id, lga_id, ward_id,
  candidate_results_live, candidate_results
) VALUES (
  $1, $3, $2,
  $4, $5, $6, $7, $8, $9,
  (SELECT candidate_results_live FROM live_json),
  '[]'::jsonb
)
ON CONFLICT (election_id, polling_unit_id) DO UPDATE SET
  candidate_results_live = EXCLUDED.candidate_results_live,
  updated_at = NOW();

-- name: GetEligiblePollingUnitsForElection :many
SELECT 
    pu.id,
    pu.state_id,
    pu.senatorial_district_id,
    pu.federal_constituency_id,
    pu.state_constituency_id,
    pu.lga_id,
    pu.ward_id
FROM polling_units pu
JOIN elections e ON e.id = $1
WHERE 
    (e.scope = 'nationwide') OR
    (e.scope = 'state' AND pu.state_id = e.state_id) OR
    (e.scope = 'senatorial-district' AND pu.senatorial_district_id = e.senatorial_district_id) OR
    (e.scope = 'federal-constituency' AND pu.federal_constituency_id = e.federal_constituency_id) OR
    (e.scope = 'state-constituency' AND pu.state_constituency_id = e.state_constituency_id) OR
    (e.scope = 'lga' AND pu.lga_id = e.lga_id) OR
    (e.scope = 'ward' AND pu.ward_id = e.ward_id)
ORDER BY pu.id ASC
LIMIT COALESCE(NULLIF($2::int, 0), 200000);

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

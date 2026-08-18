-- name: CreateUnmatchedPollingUnitResult :one
INSERT INTO unmatched_polling_unit_results (
  election_id,
  election_group_id,
  submitted_by,
  party_id,
  raw_polling_unit_code,
  raw_polling_unit_name,
  raw_ward_name,
  raw_lga_name,
  raw_state_name,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  accredited_voters,
  votes_cast,
  valid_votes,
  rejected_votes,
  candidate_results,
  result_sheet_image_url,
  result_sheet_video_url,
  resolution_status
) VALUES (
  sqlc.arg('election_id'),
  sqlc.arg('election_group_id'),
  sqlc.narg('submitted_by'),
  sqlc.narg('party_id'),
  sqlc.narg('raw_polling_unit_code'),
  sqlc.narg('raw_polling_unit_name'),
  sqlc.narg('raw_ward_name'),
  sqlc.narg('raw_lga_name'),
  sqlc.narg('raw_state_name'),
  sqlc.narg('state_id'),
  sqlc.narg('senatorial_district_id'),
  sqlc.narg('federal_constituency_id'),
  sqlc.narg('state_constituency_id'),
  sqlc.narg('lga_id'),
  sqlc.narg('ward_id'),
  sqlc.arg('accredited_voters'),
  sqlc.arg('votes_cast'),
  sqlc.arg('valid_votes'),
  sqlc.arg('rejected_votes'),
  sqlc.arg('candidate_results'),
  sqlc.narg('result_sheet_image_url'),
  sqlc.narg('result_sheet_video_url'),
  sqlc.arg('resolution_status')
) RETURNING *;

-- name: GetUnmatchedPollingUnitResultByID :one
SELECT * FROM unmatched_polling_unit_results
WHERE id = $1;

-- name: ListUnmatchedPollingUnitResults :many
SELECT * FROM unmatched_polling_unit_results
WHERE (sqlc.narg('election_id')::bigint IS NULL OR election_id = sqlc.narg('election_id'))
  AND (sqlc.narg('resolution_status')::text IS NULL OR resolution_status = sqlc.narg('resolution_status'))
ORDER BY id DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: UpdateUnmatchedPollingUnitResultStatus :one
UPDATE unmatched_polling_unit_results
SET
  resolution_status = $2,
  resolution_notes = $3,
  resolved_polling_unit_id = $4,
  resolved_result_id = $5,
  resolved_by = $6,
  resolved_at = NOW(),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

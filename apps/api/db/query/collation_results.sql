-- name: SubmitCollationResult :one
INSERT INTO collation_results (
  election_id,
  election_group_id,
  submitted_by,
  party_id,
  form_type,
  role_type,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  registered_voters,
  accredited_voters,
  votes_cast,
  valid_votes,
  rejected_votes,
  candidate_results,
  result_sheet_image_url,
  result_sheet_video_url,
  serial_number,
  collation_officer_name,
  has_collation_officer_signature,
  status,
  ai_extracted_data,
  result_is_ai_generated,
  ai_confidence_score
) VALUES (
  sqlc.arg('election_id'),
  sqlc.arg('election_group_id'),
  sqlc.narg('submitted_by'),
  sqlc.arg('party_id'),
  sqlc.arg('form_type'),
  sqlc.arg('role_type'),
  sqlc.arg('state_id'),
  sqlc.narg('senatorial_district_id'),
  sqlc.narg('federal_constituency_id'),
  sqlc.narg('state_constituency_id'),
  sqlc.narg('lga_id'),
  sqlc.narg('ward_id'),
  COALESCE(sqlc.narg('registered_voters'), 0),
  COALESCE(sqlc.narg('accredited_voters'), 0),
  COALESCE(sqlc.narg('votes_cast'), 0),
  COALESCE(sqlc.narg('valid_votes'), 0),
  COALESCE(sqlc.narg('rejected_votes'), 0),
  COALESCE(sqlc.narg('candidate_results')::jsonb, '[]'::jsonb),
  sqlc.arg('result_sheet_image_url'),
  sqlc.narg('result_sheet_video_url'),
  sqlc.narg('serial_number'),
  sqlc.narg('collation_officer_name'),
  COALESCE(sqlc.narg('has_collation_officer_signature'), false),
  COALESCE(sqlc.narg('status')::varchar(30), 'submitted'),
  sqlc.narg('ai_extracted_data'),
  COALESCE(sqlc.narg('result_is_ai_generated'), false),
  sqlc.narg('ai_confidence_score')
) RETURNING *;

-- name: GetCollationResultByID :one
SELECT * FROM collation_results
WHERE id = $1;

-- name: GetCollationResultBySupervisorSubmission :one
SELECT * FROM collation_results
WHERE election_id = $1
  AND submitted_by = $2
  AND form_type = $3
LIMIT 1;

-- name: ListCollationResultsByScope :many
SELECT * FROM collation_results
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('election_id')::int IS NULL OR election_id = sqlc.narg('election_id'))
  AND (sqlc.narg('form_type')::varchar IS NULL OR form_type = sqlc.narg('form_type'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
ORDER BY created_at DESC
LIMIT sqlc.arg('limit_count') OFFSET sqlc.arg('offset_count');

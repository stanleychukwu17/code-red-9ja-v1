-- name: SubmitPollingUnitResult :one
INSERT INTO polling_unit_results (
  assignment_id,
  election_id,
  election_group_id,
  polling_unit_id,
  submitted_by,
  party_id,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  result_sheet_image_url,
  result_sheet_video_url,
  status,
  ai_extracted_data,
  result_is_ai_generated,
  ai_confidence_score
) VALUES (
  sqlc.narg('assignment_id'),
  sqlc.arg('election_id'),
  sqlc.arg('election_group_id'),
  sqlc.arg('polling_unit_id'),
  sqlc.narg('submitted_by'),
  sqlc.arg('party_id'),
  sqlc.narg('state_id'),
  sqlc.narg('senatorial_district_id'),
  sqlc.narg('federal_constituency_id'),
  sqlc.narg('state_constituency_id'),
  sqlc.narg('lga_id'),
  sqlc.narg('ward_id'),
  sqlc.narg('result_sheet_image_url'),
  sqlc.narg('result_sheet_video_url'),
  COALESCE(sqlc.narg('status')::varchar(30), 'submitted'),
  sqlc.narg('ai_extracted_data'),
  sqlc.narg('result_is_ai_generated'),
  sqlc.narg('ai_confidence_score')
) RETURNING *;

-- name: UpdatePollingUnitResult :one
UPDATE polling_unit_results
SET
  accredited_voters = $2,
  votes_cast = $3,
  valid_votes = $4,
  rejected_votes = $5,
  result_sheet_image_url = $6,
  result_sheet_video_url = $7,
  status = 'submitted',
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetPollingUnitResult :one
SELECT *
FROM polling_unit_results
WHERE id = $1;

-- name: ListPollingUnitResults :many
SELECT *
FROM polling_unit_results
WHERE
  (sqlc.narg('election_id')::int    IS NULL OR election_id       = sqlc.narg('election_id'))
  AND (sqlc.narg('election_group_id')::integer IS NULL OR election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('party_id')::smallint   IS NULL OR party_id          = sqlc.narg('party_id'))
  AND (sqlc.narg('polling_unit_id')::int IS NULL OR polling_unit_id = sqlc.narg('polling_unit_id'))
  AND (sqlc.narg('submitted_by')::bigint IS NULL OR submitted_by    = sqlc.narg('submitted_by'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id          = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int        IS NULL OR lga_id            = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int       IS NULL OR ward_id           = sqlc.narg('ward_id'))
  AND (sqlc.narg('status')::text       IS NULL OR status            = sqlc.narg('status'))
  AND id < sqlc.arg('cursor')
ORDER BY id DESC
LIMIT sqlc.arg('limit');

-- name: GetAllPollingUnitResultsByPU :many
SELECT *
FROM polling_unit_results
WHERE election_id = $1 AND polling_unit_id = $2
AND status NOT IN ('nullified');

-- name: UpdateResultStatus :one
UPDATE polling_unit_results
SET
  status              = $2,
  ai_extracted_data   = $3,
  ai_confidence_score = $4,
  disputed_reason     = $5,
  result_is_ai_generated = $6,
  updated_at          = NOW()
WHERE id = $1
RETURNING *;

-- name: CountDistinctSubmittedResultsForAssignment :one
SELECT COUNT(*)::int
FROM polling_unit_results
WHERE assignment_id = $1::bigint;

-- name: MarkAssignmentCompleted :one
UPDATE polling_unit_assignments
SET
  completed_at = COALESCE(completed_at, $2),
  updated_at   = NOW()
WHERE id = $1
RETURNING id, completed_at;

-- name: UpdatePollingUnitResultAIExtraction :one
UPDATE polling_unit_results
SET
  registered_voters               = sqlc.arg('registered_voters'),
  accredited_voters               = sqlc.arg('accredited_voters'),
  ballot_papers_issued            = sqlc.arg('ballot_papers_issued'),
  unused_ballot_papers            = sqlc.arg('unused_ballot_papers'),
  spoiled_ballot_papers           = sqlc.arg('spoiled_ballot_papers'),
  votes_cast                      = sqlc.arg('votes_cast'),
  valid_votes                     = sqlc.arg('valid_votes'),
  rejected_votes                  = sqlc.arg('rejected_votes'),
  used_ballot_papers              = sqlc.arg('used_ballot_papers'),
  serial_number                   = sqlc.narg('serial_number'),
  sheet_date                      = sqlc.narg('sheet_date'),
  presiding_officer_name          = sqlc.narg('presiding_officer_name'),
  has_presiding_officer_signature = sqlc.arg('has_presiding_officer_signature'),
  status                          = sqlc.arg('status'),
  ai_extracted_data               = sqlc.narg('ai_extracted_data'),
  result_is_ai_generated          = sqlc.narg('result_is_ai_generated'),
  ai_confidence_score             = sqlc.narg('ai_confidence_score'),
  disputed_reason                 = sqlc.narg('disputed_reason'),
  updated_at                      = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: GetUserPollingUnitResultInElectionGroup :one
SELECT polling_unit_id
FROM polling_unit_results
WHERE submitted_by = $1 AND election_group_id = $2
LIMIT 1;

-- name: GetPollingUnitResultByUserAndElection :one
SELECT *
FROM polling_unit_results
WHERE election_id = $1 AND party_id = $2 AND polling_unit_id = $3 AND submitted_by = $4
LIMIT 1;

-- name: DeletePollingUnitResultScoresByResultID :exec
DELETE FROM polling_unit_result_scores
WHERE result_id = $1;

-- name: UpsertPollingUnitResultScore :one
INSERT INTO polling_unit_result_scores (
  result_id,
  election_id,
  election_group_id,
  polling_unit_id,
  party_id,
  party_short_name,
  vote_count,
  agent_name,
  has_signature
) VALUES (
  sqlc.arg('result_id'),
  sqlc.arg('election_id'),
  sqlc.arg('election_group_id'),
  sqlc.arg('polling_unit_id'),
  (SELECT id FROM parties WHERE UPPER(short_name) = UPPER(sqlc.arg('party_short_name')) LIMIT 1),
  UPPER(TRIM(sqlc.arg('party_short_name'))),
  sqlc.arg('vote_count'),
  sqlc.narg('agent_name'),
  sqlc.arg('has_signature')
)
ON CONFLICT (result_id, party_short_name) DO UPDATE SET
  party_id      = COALESCE(EXCLUDED.party_id, polling_unit_result_scores.party_id),
  vote_count    = EXCLUDED.vote_count,
  agent_name    = EXCLUDED.agent_name,
  has_signature = EXCLUDED.has_signature,
  updated_at    = NOW()
RETURNING *;

-- name: GetPollingUnitResultScoresByPU :many
SELECT *
FROM polling_unit_result_scores
WHERE election_id = $1 AND polling_unit_id = $2
ORDER BY result_id, party_short_name;

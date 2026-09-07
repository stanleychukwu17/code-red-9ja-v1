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
  accredited_voters,
  votes_cast,
  valid_votes,
  rejected_votes,
  candidate_results,
  result_sheet_image_url,
  result_sheet_video_url,
  uploaded_by_inec,
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
  sqlc.narg('party_id'),
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
  sqlc.arg('uploaded_by_inec'),
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
  candidate_results = $6,
  result_sheet_image_url = $7,
  result_sheet_video_url = $8,
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
  (sqlc.narg('election_id')::bigint    IS NULL OR election_id       = sqlc.narg('election_id'))
  AND (sqlc.narg('election_group_id')::bigint IS NULL OR election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('party_id')::smallint   IS NULL OR party_id          = sqlc.narg('party_id'))
  AND (sqlc.narg('polling_unit_id')::int IS NULL OR polling_unit_id = sqlc.narg('polling_unit_id'))
  AND (sqlc.narg('submitted_by')::bigint IS NULL OR submitted_by    = sqlc.narg('submitted_by'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id          = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int        IS NULL OR lga_id            = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int       IS NULL OR ward_id           = sqlc.narg('ward_id'))
  AND (sqlc.narg('status')::text       IS NULL OR status            = sqlc.narg('status'))
  AND (sqlc.narg('uploaded_by_inec')::boolean IS NULL OR uploaded_by_inec = sqlc.narg('uploaded_by_inec'))
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
  confirmed_at        = $6,
  confirmed_by        = $7,
  result_is_ai_generated = $8,
  updated_at          = NOW()
WHERE id = $1
RETURNING *;

-- name: VoteOnResult :one
UPDATE polling_unit_results
SET
  up_votes   = CASE
                 WHEN sqlc.arg('vote_type')::text = 'up'
                 THEN array_append(array_remove(up_votes, sqlc.arg('user_id')::bigint), sqlc.arg('user_id')::bigint)
                 ELSE array_remove(up_votes, sqlc.arg('user_id')::bigint)
               END,
  down_votes = CASE
                 WHEN sqlc.arg('vote_type')::text = 'down'
                 THEN array_append(array_remove(down_votes, sqlc.arg('user_id')::bigint), sqlc.arg('user_id')::bigint)
                 ELSE array_remove(down_votes, sqlc.arg('user_id')::bigint)
               END,
  updated_at = NOW()
WHERE id = sqlc.arg('id')::bigint
RETURNING *;

-- name: IncrementAssignmentResultCount :exec
UPDATE polling_unit_assignments
SET
  results_submitted_count = results_submitted_count + 1,
  completed_at            = CASE
                              WHEN (results_submitted_count + 1) >= COALESCE((
                                SELECT egpu.unique_final_results_expected
                                FROM election_group_polling_units egpu
                                WHERE egpu.election_group_id = polling_unit_assignments.election_group_id
                                  AND egpu.polling_unit_id = polling_unit_assignments.polling_unit_id
                              ), 1) THEN COALESCE(completed_at, NOW())
                              ELSE completed_at
                            END,
  updated_at              = NOW()
WHERE polling_unit_assignments.id = $1;

-- name: IncrementElectionGroupResultCount :exec
UPDATE election_groups
SET
  results_submitted_count = results_submitted_count + 1,
  updated_at              = NOW()
WHERE id = $1;

-- name: IncrementElectionResultCount :exec
UPDATE elections
SET
  results_submitted_count = results_submitted_count + 1,
  updated_at              = NOW()
WHERE id = $1;

-- name: IncrementPartyElectionGroupResultCount :exec
UPDATE party_election_groups
SET
  results_submitted_count = results_submitted_count + 1,
  updated_at              = NOW()
WHERE party_id = $1 AND election_group_id = $2;

-- name: UpdatePollingUnitResultAIExtraction :one
UPDATE polling_unit_results
SET
  accredited_voters      = $2,
  votes_cast             = $3,
  valid_votes            = $4,
  rejected_votes         = $5,
  candidate_results      = $6,
  status                 = $7,
  ai_extracted_data      = $8,
  result_is_ai_generated = $9,
  ai_confidence_score    = $10,
  disputed_reason        = $11,
  updated_at             = NOW()
WHERE id = $1
RETURNING *;

-- name: GetUserPollingUnitResultInElectionGroup :one
SELECT polling_unit_id
FROM polling_unit_results
WHERE submitted_by = $1 AND election_group_id = $2
LIMIT 1;

-- name: GetPollingUnitResultByUserAndElection :one
SELECT *
FROM polling_unit_results
WHERE election_id = $1 AND polling_unit_id = $2 AND submitted_by = $3
LIMIT 1;

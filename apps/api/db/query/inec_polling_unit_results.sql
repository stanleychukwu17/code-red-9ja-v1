-- name: UpsertINECPollingUnitResult :one
INSERT INTO inec_polling_unit_results (
  election_id,
  election_group_id,
  inec_election_id,
  polling_unit_id,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  registered_voters,
  accredited_voters,
  ballot_papers_issued,
  unused_ballot_papers,
  spoiled_ballot_papers,
  rejected_votes,
  valid_votes,
  used_ballot_papers,
  votes_cast,
  result_sheet_image_url,
  irev_document_url,
  serial_number,
  sheet_date,
  presiding_officer_name,
  has_presiding_officer_signature,
  status,
  ai_extracted_data,
  result_is_ai_generated,
  ai_confidence_score
) VALUES (
  sqlc.narg('election_id'),
  sqlc.narg('election_group_id'),
  sqlc.narg('inec_election_id'),
  sqlc.arg('polling_unit_id'),
  sqlc.narg('state_id'),
  sqlc.narg('senatorial_district_id'),
  sqlc.narg('federal_constituency_id'),
  sqlc.narg('state_constituency_id'),
  sqlc.narg('lga_id'),
  sqlc.narg('ward_id'),
  COALESCE(sqlc.narg('registered_voters'), 0),
  sqlc.arg('accredited_voters'),
  COALESCE(sqlc.narg('ballot_papers_issued'), 0),
  COALESCE(sqlc.narg('unused_ballot_papers'), 0),
  COALESCE(sqlc.narg('spoiled_ballot_papers'), 0),
  sqlc.arg('rejected_votes'),
  sqlc.arg('valid_votes'),
  COALESCE(sqlc.narg('used_ballot_papers'), 0),
  sqlc.arg('votes_cast'),
  sqlc.narg('result_sheet_image_url'),
  sqlc.narg('irev_document_url'),
  sqlc.narg('serial_number'),
  sqlc.narg('sheet_date'),
  sqlc.narg('presiding_officer_name'),
  COALESCE(sqlc.narg('has_presiding_officer_signature'), false),
  COALESCE(sqlc.narg('status')::varchar(30), 'submitted'),
  sqlc.narg('ai_extracted_data'),
  sqlc.narg('result_is_ai_generated'),
  sqlc.narg('ai_confidence_score')
)
ON CONFLICT (election_id, polling_unit_id) WHERE election_id IS NOT NULL DO UPDATE SET
  inec_election_id                = COALESCE(EXCLUDED.inec_election_id, inec_polling_unit_results.inec_election_id),
  registered_voters               = EXCLUDED.registered_voters,
  accredited_voters               = EXCLUDED.accredited_voters,
  ballot_papers_issued            = EXCLUDED.ballot_papers_issued,
  unused_ballot_papers            = EXCLUDED.unused_ballot_papers,
  spoiled_ballot_papers           = EXCLUDED.spoiled_ballot_papers,
  rejected_votes                  = EXCLUDED.rejected_votes,
  valid_votes                     = EXCLUDED.valid_votes,
  used_ballot_papers              = EXCLUDED.used_ballot_papers,
  votes_cast                      = EXCLUDED.votes_cast,
  result_sheet_image_url          = COALESCE(EXCLUDED.result_sheet_image_url, inec_polling_unit_results.result_sheet_image_url),
  irev_document_url               = COALESCE(EXCLUDED.irev_document_url, inec_polling_unit_results.irev_document_url),
  serial_number                   = COALESCE(EXCLUDED.serial_number, inec_polling_unit_results.serial_number),
  sheet_date                      = COALESCE(EXCLUDED.sheet_date, inec_polling_unit_results.sheet_date),
  presiding_officer_name          = COALESCE(EXCLUDED.presiding_officer_name, inec_polling_unit_results.presiding_officer_name),
  has_presiding_officer_signature = EXCLUDED.has_presiding_officer_signature,
  status                          = EXCLUDED.status,
  ai_extracted_data               = EXCLUDED.ai_extracted_data,
  result_is_ai_generated          = EXCLUDED.result_is_ai_generated,
  ai_confidence_score             = EXCLUDED.ai_confidence_score,
  updated_at                      = NOW()
RETURNING *;

-- name: UpsertStandaloneINECPollingUnitResult :one
INSERT INTO inec_polling_unit_results (
  election_id,
  election_group_id,
  inec_election_id,
  polling_unit_id,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  registered_voters,
  accredited_voters,
  ballot_papers_issued,
  unused_ballot_papers,
  spoiled_ballot_papers,
  rejected_votes,
  valid_votes,
  used_ballot_papers,
  votes_cast,
  result_sheet_image_url,
  irev_document_url,
  serial_number,
  sheet_date,
  presiding_officer_name,
  has_presiding_officer_signature,
  status,
  ai_extracted_data,
  result_is_ai_generated,
  ai_confidence_score
) VALUES (
  NULL,
  NULL,
  sqlc.arg('inec_election_id'),
  sqlc.arg('polling_unit_id'),
  sqlc.narg('state_id'),
  sqlc.narg('senatorial_district_id'),
  sqlc.narg('federal_constituency_id'),
  sqlc.narg('state_constituency_id'),
  sqlc.narg('lga_id'),
  sqlc.narg('ward_id'),
  COALESCE(sqlc.narg('registered_voters'), 0),
  sqlc.arg('accredited_voters'),
  COALESCE(sqlc.narg('ballot_papers_issued'), 0),
  COALESCE(sqlc.narg('unused_ballot_papers'), 0),
  COALESCE(sqlc.narg('spoiled_ballot_papers'), 0),
  sqlc.arg('rejected_votes'),
  sqlc.arg('valid_votes'),
  COALESCE(sqlc.narg('used_ballot_papers'), 0),
  sqlc.arg('votes_cast'),
  sqlc.narg('result_sheet_image_url'),
  sqlc.narg('irev_document_url'),
  sqlc.narg('serial_number'),
  sqlc.narg('sheet_date'),
  sqlc.narg('presiding_officer_name'),
  COALESCE(sqlc.narg('has_presiding_officer_signature'), false),
  COALESCE(sqlc.narg('status')::varchar(30), 'submitted'),
  sqlc.narg('ai_extracted_data'),
  sqlc.narg('result_is_ai_generated'),
  sqlc.narg('ai_confidence_score')
)
ON CONFLICT (inec_election_id, polling_unit_id) WHERE election_id IS NULL AND inec_election_id IS NOT NULL DO UPDATE SET
  registered_voters               = EXCLUDED.registered_voters,
  accredited_voters               = EXCLUDED.accredited_voters,
  ballot_papers_issued            = EXCLUDED.ballot_papers_issued,
  unused_ballot_papers            = EXCLUDED.unused_ballot_papers,
  spoiled_ballot_papers           = EXCLUDED.spoiled_ballot_papers,
  rejected_votes                  = EXCLUDED.rejected_votes,
  valid_votes                     = EXCLUDED.valid_votes,
  used_ballot_papers              = EXCLUDED.used_ballot_papers,
  votes_cast                      = EXCLUDED.votes_cast,
  result_sheet_image_url          = COALESCE(EXCLUDED.result_sheet_image_url, inec_polling_unit_results.result_sheet_image_url),
  irev_document_url               = COALESCE(EXCLUDED.irev_document_url, inec_polling_unit_results.irev_document_url),
  serial_number                   = COALESCE(EXCLUDED.serial_number, inec_polling_unit_results.serial_number),
  sheet_date                      = COALESCE(EXCLUDED.sheet_date, inec_polling_unit_results.sheet_date),
  presiding_officer_name          = COALESCE(EXCLUDED.presiding_officer_name, inec_polling_unit_results.presiding_officer_name),
  has_presiding_officer_signature = EXCLUDED.has_presiding_officer_signature,
  status                          = EXCLUDED.status,
  ai_extracted_data               = EXCLUDED.ai_extracted_data,
  result_is_ai_generated          = EXCLUDED.result_is_ai_generated,
  ai_confidence_score             = EXCLUDED.ai_confidence_score,
  updated_at                      = NOW()
RETURNING *;

-- name: GetINECPollingUnitResultByElectionAndPU :one
SELECT *
FROM inec_polling_unit_results
WHERE election_id = $1 AND polling_unit_id = $2
LIMIT 1;

-- name: GetINECPollingUnitResultByINECElectionAndPU :one
SELECT *
FROM inec_polling_unit_results
WHERE inec_election_id = $1 AND polling_unit_id = $2 AND election_id IS NULL
LIMIT 1;

-- name: DeleteINECPollingUnitResultScoresByResultID :exec
DELETE FROM inec_polling_unit_result_scores
WHERE inec_result_id = $1;

-- name: UpsertINECPollingUnitResultScore :one
INSERT INTO inec_polling_unit_result_scores (
  inec_result_id,
  election_group_id,
  election_id,
  polling_unit_id,
  party_id,
  party_short_name,
  vote_count,
  agent_name,
  has_signature
) VALUES (
  sqlc.arg('inec_result_id'),
  sqlc.narg('election_group_id'),
  sqlc.narg('election_id'),
  sqlc.arg('polling_unit_id'),
  (SELECT id FROM parties WHERE UPPER(short_name) = UPPER(sqlc.arg('party_short_name')) LIMIT 1),
  UPPER(TRIM(sqlc.arg('party_short_name'))),
  sqlc.arg('vote_count'),
  sqlc.narg('agent_name'),
  sqlc.arg('has_signature')
)
ON CONFLICT (inec_result_id, party_short_name) DO UPDATE SET
  party_id      = COALESCE(EXCLUDED.party_id, inec_polling_unit_result_scores.party_id),
  vote_count    = EXCLUDED.vote_count,
  agent_name    = EXCLUDED.agent_name,
  has_signature = EXCLUDED.has_signature,
  updated_at    = NOW()
RETURNING *;

-- name: GetINECPollingUnitResultScoresByPU :many
SELECT *
FROM inec_polling_unit_result_scores
WHERE election_id = $1 AND polling_unit_id = $2
ORDER BY inec_result_id, party_short_name;

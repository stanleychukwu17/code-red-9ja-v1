-- name: GetNonVotingReasons :many
SELECT * FROM non_voting_reasons ORDER BY usage_count DESC;

-- name: CreateDidNotVoteReason :one
INSERT INTO did_not_vote_reasons (
  user_id,
  election_group_id,
  non_voting_reason_id,
  explanation,
  state_id,
  lga_id,
  ward_id,
  polling_unit_id
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetUserDidNotVoteReason :one
SELECT 
    dnvr.explanation,
    nvr.reason as predefined_reason
FROM did_not_vote_reasons dnvr
LEFT JOIN non_voting_reasons nvr ON nvr.id = dnvr.non_voting_reason_id
WHERE dnvr.user_id = $1 AND dnvr.election_group_id = $2;

-- name: DeleteUserDidNotVoteReasonByElectionGroup :exec
DELETE FROM did_not_vote_reasons
WHERE user_id = $1 AND election_group_id = $2;

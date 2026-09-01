-- name: CreateINECResultGrabberLog :one
INSERT INTO inec_result_grabber_logs (
  inec_result_grabber_id,
  election_group_id,
  election_id,
  results_collected_count,
  status,
  error_message,
  started_at,
  ended_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: ListINECResultGrabberLogs :many
SELECT * FROM inec_result_grabber_logs
WHERE inec_result_grabber_id = $1
ORDER BY id DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ListINECResultGrabberLogsPaginated :many
SELECT l.*, e.name AS election_name
FROM inec_result_grabber_logs l
JOIN elections e ON l.election_id = e.id
WHERE (sqlc.narg('grabber_id')::bigint IS NULL OR l.inec_result_grabber_id = sqlc.narg('grabber_id')::bigint)
  AND (sqlc.narg('cursor')::bigint IS NULL OR l.id < sqlc.narg('cursor')::bigint)
ORDER BY l.id DESC
LIMIT sqlc.arg('limit');

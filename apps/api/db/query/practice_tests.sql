-- name: CreatePracticeTest :one
INSERT INTO user_practice_tests (
  user_id,
  election_group_id,
  role,
  sequence
) VALUES (
  sqlc.arg(user_id),
  sqlc.arg(election_group_id),
  sqlc.arg(role),
  (
    SELECT COALESCE(MAX(sequence), 0) + 1
    FROM user_practice_tests
    WHERE user_id = sqlc.arg(user_id)
      AND (sqlc.arg(election_group_id)::bigint = 0 OR election_group_id = sqlc.arg(election_group_id))
      AND role = sqlc.arg(role)
  )
)
RETURNING *;

-- name: AppendPracticeTestTask :one
UPDATE user_practice_tests
SET
  task_stats = task_stats || sqlc.arg(task_stat)::jsonb,
  updated_at = NOW()
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
RETURNING *;

-- name: CompletePracticeTest :one
UPDATE user_practice_tests
SET
  final_score  = sqlc.arg(final_score),
  status       = 'completed',
  completed_at = NOW(),
  updated_at   = NOW()
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
RETURNING *;

-- name: GetPracticeTest :one
SELECT * FROM user_practice_tests
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: ListUserPracticeTests :many
SELECT
  upt.*,
  u.first_name,
  u.last_name,
  u.username
FROM user_practice_tests upt
JOIN users u ON upt.user_id = u.id
WHERE
  (sqlc.arg(user_id)::bigint = 0 OR upt.user_id = sqlc.arg(user_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR upt.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(status)::varchar = '' OR upt.status = sqlc.arg(status)) AND
  (sqlc.arg(cursor)::bigint = 0 OR upt.id < sqlc.arg(cursor))
ORDER BY upt.id DESC
LIMIT sqlc.arg(limit_val)::int;

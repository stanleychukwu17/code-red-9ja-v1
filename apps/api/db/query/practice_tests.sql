-- name: SubmitPracticeTest :one
INSERT INTO user_practice_tests (
  user_id,
  election_group_id,
  role,
  test_attempts,
  overall_score,
  status
) VALUES (
  sqlc.arg(user_id),
  sqlc.arg(election_group_id),
  sqlc.arg(role),
  JSONB_BUILD_ARRAY(sqlc.arg(attempt)::jsonb),
  sqlc.arg(overall_score),
  'completed'
)
ON CONFLICT (user_id, election_group_id, role)
DO UPDATE SET
  test_attempts = user_practice_tests.test_attempts || sqlc.arg(attempt)::jsonb,
  overall_score = GREATEST(user_practice_tests.overall_score, sqlc.arg(overall_score)),
  status = 'completed',
  updated_at = NOW()
RETURNING *;

-- name: GetPracticeTest :one
SELECT * FROM user_practice_tests
WHERE user_id = sqlc.arg(user_id) 
  AND election_group_id = sqlc.arg(election_group_id)
  AND role = sqlc.arg(role)
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

-- name: MarkPracticeTestAttemptsPaid :one
-- Sets been_paid=true on every attempt that currently has been_paid=false.
-- Uses a JSONB map to flip the flag without touching any other fields.
UPDATE user_practice_tests
SET test_attempts = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'been_paid')::boolean IS NOT TRUE
      THEN elem || '{"been_paid": true}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(test_attempts) AS elem
),
updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: AddPageVerification :one
INSERT INTO pages_verified (
  page_type, page_id, verification_type_id
) VALUES (
  $1, $2, $3
)
ON CONFLICT (page_type, page_id, verification_type_id) 
DO UPDATE SET verified_at = CURRENT_TIMESTAMP
RETURNING *;

-- name: RemovePageVerification :exec
DELETE FROM pages_verified
WHERE page_type = $1 AND page_id = $2 AND verification_type_id = $3;

-- name: CheckIfPageHasAnyVerification :one
SELECT EXISTS(
  SELECT 1 FROM pages_verified WHERE page_type = $1 AND page_id = $2
);

-- name: ListVerificationTypes :many
SELECT * FROM page_verification_types ORDER BY id ASC;

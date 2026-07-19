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

-- name: GetPageVerifications :many
SELECT 
  pv.id,
  pv.page_type,
  pv.page_id,
  pv.verification_type_id,
  pv.verified_at,
  pvt.verification_type,
  pvt.verification_title,
  pvt.verification_description,
  pvt.badge
FROM pages_verified pv
JOIN page_verification_types pvt ON pv.verification_type_id = pvt.id
WHERE pv.page_type = $1 AND pv.page_id = $2;

-- name: GetPageVerificationType :one
SELECT * FROM page_verification_types
WHERE id = $1 LIMIT 1;

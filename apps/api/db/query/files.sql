-- name: CreateFile :one
INSERT INTO files (
  original_name,
  mime_type,
  file_size,
  file_key,
  public_url,
  folder,
  is_public,
  status,
  uploaded_by,
  owner_id
)
VALUES (
  sqlc.arg(original_name),
  sqlc.arg(mime_type),
  sqlc.arg(file_size),
  sqlc.arg(file_key),
  sqlc.arg(public_url),
  sqlc.arg(folder),
  sqlc.arg(is_public),
  'uploading',
  sqlc.arg(uploaded_by),
  sqlc.arg(owner_id)
)
RETURNING *;

-- name: ConfirmUpload :one
UPDATE files
SET
  status     = CASE WHEN sqlc.arg(success)::boolean THEN 'uploaded' ELSE 'failed' END,
  uploaded_at = CASE WHEN sqlc.arg(success)::boolean THEN NOW() ELSE NULL END,
  updated_at  = NOW()
WHERE id = sqlc.arg(id)
  AND status = 'uploading'
  AND (uploaded_by = sqlc.arg(uploaded_by) OR sqlc.arg(uploaded_by)::bigint IS NULL)
RETURNING *;

-- name: GetFileByID :one
SELECT * FROM files WHERE id = $1 AND status != 'deleted';

-- name: GetFileByKey :one
SELECT * FROM files WHERE file_key = $1 AND status != 'deleted';

-- name: GetFileByPublicUrl :one
SELECT * FROM files WHERE public_url = $1 AND status != 'deleted';

-- name: ListFiles :many
SELECT * FROM files
WHERE
  status != 'deleted'
  AND ($1::bigint = 0 OR id < $1)
  AND (sqlc.arg(folder)::text = '' OR folder = sqlc.arg(folder)::text)
  AND (sqlc.arg(uploaded_by)::bigint = 0 OR uploaded_by = sqlc.arg(uploaded_by)::bigint)
ORDER BY id DESC
LIMIT $2;

-- name: MarkFileDeleted :one
UPDATE files
SET status = 'deleted', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: HardDeleteFile :exec
DELETE FROM files WHERE id = $1;

-- name: CheckFileOwner :one
SELECT EXISTS (
    SELECT 1 FROM files
    WHERE id = $1 AND owner_id = $2 AND status != 'deleted'
);

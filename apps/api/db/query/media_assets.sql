-- ============================================================================
-- ASSET FOLDERS QUERIES
-- ============================================================================

-- name: CreateAssetFolder :one
INSERT INTO asset_folders (
  name,
  slug,
  parent_id,
  r2_prefix,
  description,
  created_by
)
VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetAssetFolderByID :one
SELECT * FROM asset_folders WHERE id = $1;

-- name: GetAssetFolderByPrefix :one
SELECT * FROM asset_folders WHERE r2_prefix = $1;

-- name: ListRootAssetFolders :many
SELECT * FROM asset_folders
WHERE parent_id IS NULL
ORDER BY name ASC;

-- name: ListSubFolders :many
SELECT * FROM asset_folders
WHERE parent_id = $1
ORDER BY name ASC;

-- name: SearchAssetFolders :many
SELECT * FROM asset_folders
WHERE 
  name ILIKE '%' || sqlc.arg(search)::text || '%'
  OR description ILIKE '%' || sqlc.arg(search)::text || '%'
ORDER BY name ASC
LIMIT $1;

-- name: DeleteAssetFolder :exec
DELETE FROM asset_folders WHERE id = $1;

-- name: UpdateAssetFolder :one
UPDATE asset_folders
SET 
  name = COALESCE(sqlc.narg(name), name),
  description = COALESCE(sqlc.narg(description), description),
  updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;


-- ============================================================================
-- MEDIA ASSETS QUERIES
-- ============================================================================

-- name: CreateMediaAsset :one
INSERT INTO media_assets (
  folder_id,
  name,
  r2_key,
  public_url,
  file_type,
  extension,
  mime_type,
  file_size_bytes,
  dimensions,
  duration_seconds,
  tags,
  uploaded_by
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
ON CONFLICT (r2_key) DO UPDATE
SET
  folder_id = EXCLUDED.folder_id,
  name = EXCLUDED.name,
  public_url = EXCLUDED.public_url,
  file_type = EXCLUDED.file_type,
  extension = EXCLUDED.extension,
  mime_type = EXCLUDED.mime_type,
  file_size_bytes = EXCLUDED.file_size_bytes,
  dimensions = COALESCE(EXCLUDED.dimensions, media_assets.dimensions),
  duration_seconds = COALESCE(EXCLUDED.duration_seconds, media_assets.duration_seconds),
  tags = CASE WHEN array_length(EXCLUDED.tags, 1) > 0 THEN EXCLUDED.tags ELSE media_assets.tags END,
  updated_at = NOW()
RETURNING *;

-- name: GetMediaAssetByID :one
SELECT * FROM media_assets WHERE id = $1;

-- name: GetMediaAssetByKey :one
SELECT * FROM media_assets WHERE r2_key = $1;

-- name: ListMediaAssetsByFolder :many
SELECT * FROM media_assets
WHERE 
  (
    (sqlc.narg(folder_id)::int IS NULL AND folder_id IS NULL)
    OR folder_id = sqlc.narg(folder_id)::int
  )
  AND (sqlc.narg(file_type)::text IS NULL OR file_type = sqlc.narg(file_type)::text)
  AND (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search)::text || '%')
ORDER BY id DESC
LIMIT sqlc.arg(limit_count)::int
OFFSET sqlc.arg(offset_count)::int;

-- name: CountMediaAssetsByFolder :one
SELECT COUNT(*) FROM media_assets
WHERE 
  (
    (sqlc.narg(folder_id)::int IS NULL AND folder_id IS NULL)
    OR folder_id = sqlc.narg(folder_id)::int
  )
  AND (sqlc.narg(file_type)::text IS NULL OR file_type = sqlc.narg(file_type)::text)
  AND (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search)::text || '%');

-- name: SearchMediaAssets :many
SELECT * FROM media_assets
WHERE
  name ILIKE '%' || sqlc.arg(query)::text || '%'
  OR sqlc.arg(query)::text = ANY(tags)
ORDER BY id DESC
LIMIT sqlc.arg(limit_count)::int;

-- name: DeleteMediaAsset :exec
DELETE FROM media_assets WHERE id = $1;

-- name: DeleteMediaAssetByKey :exec
DELETE FROM media_assets WHERE r2_key = $1;

-- name: ListAllR2Keys :many
SELECT r2_key FROM media_assets;

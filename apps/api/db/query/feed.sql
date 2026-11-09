-- name: CreateFeedPost :one
INSERT INTO feed_posts (
  author_id,
  target_type,
  target_id,
  post_type,
  visibility,
  content,
  has_media,
  metadata
) VALUES (
  $1,
  $2,
  $3,
  COALESCE(sqlc.narg('post_type')::varchar, 'standard'),
  COALESCE(sqlc.narg('visibility')::varchar, 'public'),
  $4,
  $5,
  COALESCE(sqlc.narg('metadata')::jsonb, '{}'::jsonb)
)
RETURNING *;

-- name: CreateFeedPostMedia :one
INSERT INTO feed_post_media (
  post_id,
  file_id,
  media_type,
  url,
  thumbnail_url,
  width,
  height,
  duration_seconds,
  file_size_bytes,
  sort_order
) VALUES (
  $1,
  sqlc.narg('file_id')::bigint,
  $2,
  $3,
  sqlc.narg('thumbnail_url')::varchar,
  sqlc.narg('width')::int,
  sqlc.narg('height')::int,
  sqlc.narg('duration_seconds')::int,
  COALESCE(sqlc.narg('file_size_bytes')::bigint, 0),
  COALESCE(sqlc.narg('sort_order')::smallint, 0)
)
RETURNING *;

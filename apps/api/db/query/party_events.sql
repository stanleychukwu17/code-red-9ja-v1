-- name: CreatePartyEvent :one
INSERT INTO party_events (
    party_id,
    chapter_id,
    tier,
    title,
    description,
    category,
    venue_name,
    location,
    is_virtual,
    virtual_url,
    starts_at,
    ends_at,
    status,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
) RETURNING *;

-- name: GetPartyEventByID :one
SELECT * FROM party_events
WHERE id = $1 AND party_id = $2
LIMIT 1;

-- name: ListPartyEvents :many
SELECT * FROM party_events
WHERE party_id = $1
  AND (sqlc.narg('chapter_id')::int IS NULL OR chapter_id = sqlc.narg('chapter_id'))
  AND (sqlc.narg('tier')::varchar IS NULL OR tier = sqlc.narg('tier'))
  AND (sqlc.narg('category')::varchar IS NULL OR category = sqlc.narg('category'))
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
  AND (
    sqlc.narg('search')::text IS NULL 
    OR title ILIKE '%' || sqlc.narg('search')::text || '%' 
    OR venue_name ILIKE '%' || sqlc.narg('search')::text || '%' 
    OR location ILIKE '%' || sqlc.narg('search')::text || '%'
  )
ORDER BY starts_at ASC;

-- name: GetUpcomingPartyEvents :many
SELECT * FROM party_events
WHERE party_id = $1
  AND status = 'upcoming'
  AND (sqlc.narg('chapter_id')::int IS NULL OR chapter_id = sqlc.narg('chapter_id') OR tier = 'national')
ORDER BY starts_at ASC
LIMIT $2;

-- name: UpdatePartyEvent :one
UPDATE party_events
SET
    title = COALESCE(sqlc.narg('title')::varchar, title),
    description = COALESCE(sqlc.narg('description')::text, description),
    category = COALESCE(sqlc.narg('category')::varchar, category),
    venue_name = COALESCE(sqlc.narg('venue_name')::varchar, venue_name),
    location = COALESCE(sqlc.narg('location')::text, location),
    is_virtual = COALESCE(sqlc.narg('is_virtual')::boolean, is_virtual),
    virtual_url = COALESCE(sqlc.narg('virtual_url')::varchar, virtual_url),
    starts_at = COALESCE(sqlc.narg('starts_at')::timestamptz, starts_at),
    ends_at = COALESCE(sqlc.narg('ends_at')::timestamptz, ends_at),
    status = COALESCE(sqlc.narg('status')::varchar, status),
    updated_at = NOW()
WHERE id = $1 AND party_id = $2
RETURNING *;

-- name: DeletePartyEvent :exec
DELETE FROM party_events
WHERE id = $1 AND party_id = $2;

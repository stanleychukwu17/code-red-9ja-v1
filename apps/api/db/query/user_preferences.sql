-- name: GetUserPreferencesByUserID :one
SELECT id, user_id, sidebar_state, pinned_links, theme, preference_version, created_at, updated_at
FROM user_preferences
WHERE user_id = $1 LIMIT 1;

-- name: InsertUserPreferences :one
INSERT INTO user_preferences (
  user_id, sidebar_state, pinned_links, theme, preference_version, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING id, user_id, sidebar_state, pinned_links, theme, preference_version, created_at, updated_at;

-- name: UpdateUserPreferencesByUserID :one
UPDATE user_preferences
SET sidebar_state = $2, pinned_links = $3, theme = $4, preference_version = $5, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1
RETURNING id, user_id, sidebar_state, pinned_links, theme, preference_version, created_at, updated_at;

-- name: UpsertUserPreferences :one
INSERT INTO user_preferences (
  user_id, sidebar_state, pinned_links, theme, preference_version, updated_at
) VALUES (
  $1, $2, $3, $4, $5, CURRENT_TIMESTAMP
)
ON CONFLICT (user_id) DO UPDATE SET
  sidebar_state = EXCLUDED.sidebar_state,
  pinned_links = EXCLUDED.pinned_links,
  theme = EXCLUDED.theme,
  preference_version = EXCLUDED.preference_version,
  updated_at = CURRENT_TIMESTAMP
RETURNING id, user_id, sidebar_state, pinned_links, theme, preference_version, created_at, updated_at;

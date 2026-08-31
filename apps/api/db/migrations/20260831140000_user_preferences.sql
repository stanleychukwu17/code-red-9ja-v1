-- +goose Up
-- USERS Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sidebar_state VARCHAR(20) DEFAULT 'expanded' CHECK (sidebar_state IN ('expanded', 'collapsed')),
  pinned_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme VARCHAR(20) DEFAULT 'auto' CHECK (theme IN ('auto', 'light', 'dark')),
  preference_version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS user_preferences;

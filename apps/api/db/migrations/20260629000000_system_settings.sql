-- +goose Up

-- 1. General system settings table for app-wide configurations
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial slot cost setting (1 NGN = 100 Kobo, e.g. 1,000 NGN = 100,000 Kobo)
INSERT INTO system_settings (key, value, description)
VALUES ('slot_cost_kobo', '1000000'::jsonb, 'The default cost of a single polling unit slot in Kobo')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS system_settings;

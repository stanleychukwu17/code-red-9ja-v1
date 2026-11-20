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
VALUES ('slot_cost_kobo', '100000'::jsonb, 'The default cost of a single polling unit slot in Kobo')
ON CONFLICT (key) DO NOTHING;

-- Seed update schedule config
INSERT INTO system_settings (key, value, description)
VALUES (
  'update_schedule_config',
  '{
    "target_updates_count": 18,
    "start_time": "08:00",
    "end_time": "17:00",
    "interval_minutes": 30
  }'::jsonb,
  'Configuration for election update schedule including target updates count, start time (HH:MM), end time (HH:MM), and interval in minutes'
)
ON CONFLICT (key) DO NOTHING;

-- Seed initial earnings allocations (Option A: Results 50%, Updates 30%, Attendance 10%, Election Start 5%, Election End 5%)
INSERT INTO system_settings (key, value, description)
VALUES 
  ('earnings_allocation_polling_agent', '{"results": 50, "updates": 30, "attendance": 10, "election_start": 5, "election_end": 5}'::jsonb, 'Earnings allocation for polling agents'),
  ('earnings_allocation_ward_election_supervisor', '{"results": 50, "updates": 30, "attendance": 10, "election_start": 5, "election_end": 5}'::jsonb, 'Earnings allocation for ward supervisors'),
  ('earnings_allocation_lga_election_supervisor', '{"results": 50, "updates": 30, "attendance": 10, "election_start": 5, "election_end": 5}'::jsonb, 'Earnings allocation for lga supervisors'),
  ('earnings_allocation_state_election_supervisor', '{"results": 50, "updates": 30, "attendance": 10, "election_start": 5, "election_end": 5}'::jsonb, 'Earnings allocation for state supervisors')
ON CONFLICT (key) DO NOTHING;

-- Seed post-election activity window limit (in days)
INSERT INTO system_settings (key, value, description)
VALUES ('post_election_activity_days_limit', '2'::jsonb, 'Number of days after election date during which election activities (updates, result uploads, start/end timestamps) remain allowed')
ON CONFLICT (key) DO NOTHING;

-- Seed INEC API configuration
INSERT INTO system_settings (key, value, description)
VALUES (
  'inec_api_config',
  '{
    "base_url": "https://dolphin-app-sleqh.ondigitalocean.app/api/v1",
    "sync_interval_minutes": 15,
    "active_sync_days_limit": 14,
    "upload_to_r2_default": true,
    "ai_extract_default": true,
    "endpoints": {
      "elections": "/elections?election_type={inec_election_type_id}&state_id={state_id}",
      "lgas": "/elections/{election_id}/lga",
      "state_lgas": "/elections/{election_id}/lga/state/{state_id}",
      "polling_units": "/elections/{election_id}/pus?ward={ward_id}"
    }
  }'::jsonb,
  'Configuration for INEC election result API endpoints, base URL, sync interval (minutes), active sync duration limit (days), and sync default flags'
)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS system_settings;
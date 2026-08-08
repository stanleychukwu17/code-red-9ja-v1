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
VALUES ('slot_cost_kobo', '5000000'::jsonb, 'The default cost of a single polling unit slot in Kobo')
ON CONFLICT (key) DO NOTHING;

-- Seed target for live voters referred
INSERT INTO system_settings (key, value, description)
VALUES ('live_voters_referred', '10'::jsonb, 'The target number of live voters an agent is expected to refer')
ON CONFLICT (key) DO NOTHING;

-- Seed target for updates count
INSERT INTO system_settings (key, value, description)
VALUES ('target_updates_count', '20'::jsonb, 'The target number of updates an agent is expected to give')
ON CONFLICT (key) DO NOTHING;

-- Seed initial earnings allocations
INSERT INTO system_settings (key, value, description)
VALUES 
  ('earnings_allocation_polling_agent', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for polling agents'),
  ('earnings_allocation_ward_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for ward supervisors'),
  ('earnings_allocation_lga_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for lga supervisors'),
  ('earnings_allocation_state_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for state supervisors')
ON CONFLICT (key) DO NOTHING;

-- Seed test requirements per role
-- windows are non-overlapping bands ordered furthest-from-election first
-- days_before_election marks the START of that band; quota = tests allowed in that band
INSERT INTO system_settings (key, value, description)
VALUES
  (
    'test_requirements_polling_agent',
    '{
      "total_required": 10,
      "windows": [
        { "days_before_election": 365, "quota": 4 },
        { "days_before_election": 30,  "quota": 3 },
        { "days_before_election": 7,   "quota": 3 }
      ]
    }'::jsonb,
    'Test requirements for polling agents: total tests expected and how many are allocated per pre-election window'
  ),
  (
    'test_requirements_ward_supervisor',
    '{
      "total_required": 10,
      "windows": [
        { "days_before_election": 365, "quota": 4 },
        { "days_before_election": 30,  "quota": 3 },
        { "days_before_election": 7,   "quota": 3 }
      ]
    }'::jsonb,
    'Test requirements for ward supervisors: total tests expected and how many are allocated per pre-election window'
  ),
  (
    'test_requirements_lga_supervisor',
    '{
      "total_required": 10,
      "windows": [
        { "days_before_election": 365, "quota": 4 },
        { "days_before_election": 30,  "quota": 3 },
        { "days_before_election": 7,   "quota": 3 }
      ]
    }'::jsonb,
    'Test requirements for LGA supervisors: total tests expected and how many are allocated per pre-election window'
  ),
  (
    'test_requirements_state_supervisor',
    '{
      "total_required": 10,
      "windows": [
        { "days_before_election": 365, "quota": 4 },
        { "days_before_election": 30,  "quota": 3 },
        { "days_before_election": 7,   "quota": 3 }
      ]
    }'::jsonb,
    'Test requirements for state supervisors: total tests expected and how many are allocated per pre-election window'
  )
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS system_settings;

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

-- Seed initial earnings allocations
INSERT INTO system_settings (key, value, description)
VALUES 
  ('earnings_allocation_polling_agent', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for polling agents'),
  ('earnings_allocation_ward_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for ward supervisors'),
  ('earnings_allocation_lga_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for lga supervisors'),
  ('earnings_allocation_state_supervisor', '{"readiness": 20, "results": 30, "updates": 20, "attendance": 10, "election_start": 5, "election_end": 5, "live_voters_referred": 10}'::jsonb, 'Earnings allocation for state supervisors')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS system_settings;

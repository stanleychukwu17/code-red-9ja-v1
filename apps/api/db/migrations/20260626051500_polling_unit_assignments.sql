-- +goose Up
CREATE TABLE IF NOT EXISTS polling_unit_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'polling_agent' CHECK (role_type IN ('polling_agent', 'observer', 'collation_agent')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  election_started_at TIMESTAMPTZ,
  election_started_video_url TEXT,
  election_ended_at TIMESTAMPTZ,
  election_ended_video_url TEXT,
  completed_at TIMESTAMPTZ, -- Timestamp when agent completed election day duties (all expected PU results submitted)
  last_update_at TIMESTAMPTZ,
  reports_count INT NOT NULL DEFAULT 0,
  updates_count INT NOT NULL DEFAULT 0,
  
  -- Additional Results & Tracking Fields
  results_submitted_count INT NOT NULL DEFAULT 0,
  live_voters_referred_count INT NOT NULL DEFAULT 0,
  -- {"07:00":2, "07:30": 3, "08:00": 1, ...}
  interval_updates JSONB DEFAULT '{}'::jsonb,

  -- Score from 0-100 reflecting how prepared this agent is based on practice test performance
  election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (election_practice_test_readiness_percentage BETWEEN 0 AND 100),

  potential_payment_kobo BIGINT NOT NULL DEFAULT 0,
  earned_amount_kobo BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  -- An agent (user) can only be assigned to one polling unit per election day (election group)
  CONSTRAINT uq_agent_per_election_day UNIQUE(user_id, election_group_id)
);

CREATE INDEX idx_pu_assignments_user ON polling_unit_assignments(user_id);
CREATE INDEX idx_pu_assignments_party ON polling_unit_assignments(party_id);
CREATE INDEX idx_pu_assignments_pu ON polling_unit_assignments(polling_unit_id);
CREATE INDEX idx_pu_assignments_election_group ON polling_unit_assignments(election_group_id);

-- +goose Down
DROP TABLE IF EXISTS polling_unit_assignments;

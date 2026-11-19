-- +goose Up
CREATE TABLE IF NOT EXISTS polling_unit_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'polling_agent' CHECK (role_type IN ('polling_agent')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  election_started_at TIMESTAMPTZ,
  election_ended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ, -- Timestamp when agent completed election day duties (all expected PU results submitted)
  last_update_at TIMESTAMPTZ,
  reports_count INT NOT NULL DEFAULT 0,
  updates_count INT NOT NULL DEFAULT 0,
  
  -- Additional Results & Tracking Fields
  results_submitted_count INT NOT NULL DEFAULT 0,

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

CREATE INDEX idx_pu_assignments_composite ON polling_unit_assignments(election_group_id, party_id, polling_unit_id);
CREATE INDEX idx_pu_assignments_geo ON polling_unit_assignments(election_group_id, party_id, state_id, lga_id, ward_id);

-- +goose Down
DROP TABLE IF EXISTS polling_unit_assignments;

-- +goose Up
-- State Election Supervisors
CREATE TABLE IF NOT EXISTS state_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'state_election_supervisor' CHECK (role_type IN ('state_election_supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  -- Timestamp when state supervisor completed duties (all expected PU results in state submitted)
  completed_at TIMESTAMPTZ,

  potential_payment_kobo BIGINT NOT NULL DEFAULT 0,
  earned_amount_kobo BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_state_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

-- LGA Election Supervisors
CREATE TABLE IF NOT EXISTS lga_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'lga_election_supervisor' CHECK (role_type IN ('lga_election_supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  -- Timestamp when LGA supervisor completed duties (all expected PU results in LGA submitted)
  completed_at TIMESTAMPTZ,

  potential_payment_kobo BIGINT NOT NULL DEFAULT 0,
  earned_amount_kobo BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_lga_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

-- Ward Election Supervisors
CREATE TABLE IF NOT EXISTS ward_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'ward_election_supervisor' CHECK (role_type IN ('ward_election_supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  -- Timestamp when ward supervisor completed duties (all expected PU results in ward submitted)
  completed_at TIMESTAMPTZ,

  potential_payment_kobo BIGINT NOT NULL DEFAULT 0,
  earned_amount_kobo BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_ward_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

-- +goose Down
DROP TABLE IF EXISTS ward_election_supervisors;
DROP TABLE IF EXISTS lga_election_supervisors;
DROP TABLE IF EXISTS state_election_supervisors;

-- +goose Up
-- State Election Supervisors
CREATE TABLE IF NOT EXISTS state_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'state-election-supervisor' CHECK (role_type IN ('state-election-supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_state_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

CREATE INDEX idx_state_supervisors_user ON state_election_supervisors(user_id);
CREATE INDEX idx_state_supervisors_party ON state_election_supervisors(party_id);
CREATE INDEX idx_state_supervisors_state ON state_election_supervisors(state_id);
CREATE INDEX idx_state_supervisors_election_group ON state_election_supervisors(election_group_id);

-- LGA Election Supervisors
CREATE TABLE IF NOT EXISTS lga_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'lga-election-supervisor' CHECK (role_type IN ('lga-election-supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_lga_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

CREATE INDEX idx_lga_supervisors_user ON lga_election_supervisors(user_id);
CREATE INDEX idx_lga_supervisors_party ON lga_election_supervisors(party_id);
CREATE INDEX idx_lga_supervisors_lga ON lga_election_supervisors(lga_id);
CREATE INDEX idx_lga_supervisors_election_group ON lga_election_supervisors(election_group_id);

-- Ward Election Supervisors
CREATE TABLE IF NOT EXISTS ward_election_supervisors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) DEFAULT 'ward-election-supervisor' CHECK (role_type IN ('ward-election-supervisor')),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agent Tracking & Verification
  arrived_at TIMESTAMPTZ,
  arrival_video_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINTS
  CONSTRAINT uq_ward_supervisor_per_election_day UNIQUE(user_id, election_group_id)
);

CREATE INDEX idx_ward_supervisors_user ON ward_election_supervisors(user_id);
CREATE INDEX idx_ward_supervisors_party ON ward_election_supervisors(party_id);
CREATE INDEX idx_ward_supervisors_ward ON ward_election_supervisors(ward_id);
CREATE INDEX idx_ward_supervisors_election_group ON ward_election_supervisors(election_group_id);

-- +goose Down
DROP TABLE IF EXISTS ward_election_supervisors;
DROP TABLE IF EXISTS lga_election_supervisors;
DROP TABLE IF EXISTS state_election_supervisors;

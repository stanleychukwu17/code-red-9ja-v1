-- +goose Up
CREATE TABLE IF NOT EXISTS party_agent_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE RESTRICT,
  state_id SMALLINT REFERENCES c_states(id) NOT NULL,
  lga_id INTEGER REFERENCES lgas(id),
  ward_id INTEGER REFERENCES wards(id),
  role VARCHAR(50) DEFAULT 'polling_agent' CHECK (role IN ('polling_agent', 'state_election_supervisor', 'lga_election_supervisor', 'ward_election_supervisor')) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) NOT NULL,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_party_agent_applications_user ON party_agent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_party_agent_apps_party_group_status ON party_agent_applications(party_id, election_group_id, status, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_application_per_group ON party_agent_applications (election_group_id, user_id);

-- +goose Down
DROP TABLE IF EXISTS party_agent_applications;

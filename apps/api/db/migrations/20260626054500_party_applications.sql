-- +goose Up
CREATE TABLE IF NOT EXISTS party_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE CASCADE,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE,
  lga_id INTEGER REFERENCES lgas(id) ON DELETE CASCADE,
  ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'pollingagent' CHECK (role IN ('pollingagent', 'state-election-supervisor', 'lga-election-supervisor', 'ward-election-supervisor')) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) NOT NULL,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_party_applications_user ON party_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_party_applications_party ON party_applications(party_id);
CREATE INDEX IF NOT EXISTS idx_party_applications_election_group ON party_applications(election_group_id);

-- Enforce that a user can only have ONE active application per election group
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_user_app_per_group 
ON party_applications (user_id, election_group_id) 
WHERE status NOT IN ('rejected', 'cancelled');

ALTER TABLE users
  ADD CONSTRAINT fk_users_current_lga FOREIGN KEY (current_lga) REFERENCES lgas(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_current_lga;

DROP TABLE IF EXISTS party_applications;

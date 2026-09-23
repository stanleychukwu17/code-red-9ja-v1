-- +goose Up
CREATE TABLE IF NOT EXISTS polling_unit_updates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- The core relationship linking the update to the agent's assignment
  assignment_id BIGINT REFERENCES polling_unit_assignments(id) ON DELETE SET NULL,
  
  -- Denormalized references for fast dashboard filtering
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_assembly_constituency_id INT REFERENCES state_constituencies(id) ON DELETE SET NULL,
  
  -- Update details
  message TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  is_report BOOLEAN DEFAULT FALSE,
  report_types TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying by parties and on election day
CREATE INDEX idx_pu_updates_pu ON polling_unit_updates(polling_unit_id);
CREATE INDEX idx_pu_updates_group_party_cursor ON polling_unit_updates(election_group_id, party_id, id DESC);

-- +goose Down
DROP TABLE IF EXISTS polling_unit_updates;

-- +goose Up
CREATE TABLE IF NOT EXISTS polling_unit_updates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- The core relationship linking the update to the agent's assignment
  assignment_id BIGINT REFERENCES polling_unit_assignments(id) ON DELETE SET NULL,
  
  -- Denormalized references for fast dashboard filtering
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_assembly_constituency_id INT REFERENCES state_assembly_constituencies(id) ON DELETE SET NULL,
  
  -- Update details
  message TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  is_report BOOLEAN DEFAULT FALSE,
  report_types TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying by parties and on election day
CREATE INDEX idx_pu_updates_assignment ON polling_unit_updates(assignment_id);
CREATE INDEX idx_pu_updates_party_group ON polling_unit_updates(party_id, election_group_id);
CREATE INDEX idx_pu_updates_pu ON polling_unit_updates(polling_unit_id);
CREATE INDEX idx_pu_updates_created_at ON polling_unit_updates(created_at);

-- +goose Down
DROP TABLE IF EXISTS polling_unit_updates;

-- +goose Up

-- Supervisor updates table
CREATE TABLE IF NOT EXISTS supervisor_updates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role_type VARCHAR(50) NOT NULL CHECK (role_type IN ('ward_election_supervisor', 'lga_election_supervisor', 'state_election_supervisor')),

  -- Geographic jurisdiction
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  -- Optional Polling Unit tag (if supervisor is reporting on a specific PU)
  polling_unit_id INTEGER REFERENCES polling_units(id) ON DELETE SET NULL,

  -- Category and Stage classification
  -- category_type: 'collation_centre', 'field_monitoring', 'logistics', 'security', 'agent_coordination'
  category_type VARCHAR(50) NOT NULL DEFAULT 'field_monitoring',
  -- stage: e.g. 'arrival_at_collation', 'collation_ongoing', 'collation_concluded', 'result_disputed', etc.
  stage VARCHAR(50) NOT NULL DEFAULT 'field_monitoring',

  title VARCHAR(255),
  message TEXT NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT FALSE,

  -- Supervisor coordinates at time of update
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supervisor_updates_geo ON supervisor_updates(election_group_id, party_id, role_type, state_id, lga_id, ward_id);
CREATE INDEX idx_supervisor_updates_user ON supervisor_updates(user_id, election_group_id);

-- Child table for supervisor update media attachments
CREATE TABLE IF NOT EXISTS supervisor_update_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  update_id BIGINT NOT NULL REFERENCES supervisor_updates(id) ON DELETE CASCADE,
  file_id BIGINT REFERENCES files(id) ON DELETE SET NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  url VARCHAR(2000) NOT NULL,
  thumbnail_url VARCHAR(2000),
  duration_seconds INT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supervisor_update_media_update ON supervisor_update_media(update_id);

-- +goose Down
DROP TABLE IF EXISTS supervisor_update_media;
DROP TABLE IF EXISTS supervisor_updates;

-- +goose Up

CREATE TABLE non_voting_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reason VARCHAR(255) UNIQUE NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO non_voting_reasons (reason) VALUES
  ('Did not register to vote'),
  ('Registered but did not collect PVC (Voter''s Card)'),
  ('Security concerns / Fear of violence'),
  ('Lack of trust in the electoral process / Rigging fears'),
  ('Polling unit was too far / Logistics issues'),
  ('Sickness / Health issues'),
  ('Traveling / Out of town on election day'),
  ('Apathy / Not interested in voting'),
  ('Not interested in any of the candidates'),
  ('Other');

CREATE TABLE did_not_vote_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_group_id BIGINT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  non_voting_reason_id BIGINT REFERENCES non_voting_reasons(id) ON DELETE SET NULL,
  explanation TEXT,

  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, election_group_id)
);

CREATE TABLE election_votes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,
  
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_group_id BIGINT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, election_id)
);

-- +goose Down
DROP TABLE IF EXISTS election_votes;
DROP TABLE IF EXISTS did_not_vote_reasons;
DROP TABLE IF EXISTS non_voting_reasons;

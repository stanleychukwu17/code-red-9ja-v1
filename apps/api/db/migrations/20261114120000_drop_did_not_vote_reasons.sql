-- +goose Up
DROP TABLE IF EXISTS did_not_vote_reasons;
DROP TABLE IF EXISTS non_voting_reasons;

-- +goose Down
CREATE TABLE non_voting_reasons (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reason VARCHAR(255) UNIQUE NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE did_not_vote_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_group_id INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  non_voting_reason_id SMALLINT REFERENCES non_voting_reasons(id) ON DELETE SET NULL,
  explanation TEXT,

  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, election_group_id)
);

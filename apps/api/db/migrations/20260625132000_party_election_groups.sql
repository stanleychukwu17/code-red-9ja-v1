-- +goose Up
CREATE TABLE party_election_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  polling_agents_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,
  elections_contesting INT NOT NULL DEFAULT 0,
  reports_count INT NOT NULL DEFAULT 0,
  updates_count INT NOT NULL DEFAULT 0,
  results_submitted_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, election_group_id)
);

-- +goose Down
DROP TABLE IF EXISTS party_election_groups;

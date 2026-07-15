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

-- Seed default party election group relationships for the two election groups (1 & 2) and all active parties
INSERT INTO party_election_groups (party_id, election_group_id, elections_contesting)
SELECT p.id, eg.id, 1
FROM parties p
CROSS JOIN (SELECT id FROM election_groups WHERE id IN (1, 2)) eg
WHERE p.status = 'active'
ON CONFLICT (party_id, election_group_id) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS party_election_groups;

-- +goose Up
ALTER TABLE election_groups ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX idx_election_groups_active ON election_groups(active);

-- +goose Down
DROP INDEX IF EXISTS idx_election_groups_active;
ALTER TABLE election_groups DROP COLUMN IF EXISTS active;

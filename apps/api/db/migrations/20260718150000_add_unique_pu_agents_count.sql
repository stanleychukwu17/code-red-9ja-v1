-- +goose Up
-- Add unique_pu_agents_count to all election stats geographic rollup tables.
-- (This column was added directly to earlier migration files but for existing databases
-- we need to run a discrete ALTER TABLE statement).

ALTER TABLE election_group_wards ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_lgas ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_state_constituencies ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_federal_constituencies ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_senatorial_districts ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_states ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_groups ADD COLUMN IF NOT EXISTS unique_pu_agents_count INT NOT NULL DEFAULT 0;

-- +goose Down
-- We don't remove the columns on down because they are part of the core schema now.

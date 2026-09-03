-- +goose Up
ALTER TABLE election_group_wards ADD COLUMN IF NOT EXISTS ward_supervisors_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_wards ADD COLUMN IF NOT EXISTS unique_ward_supervisors_count INT NOT NULL DEFAULT 0;

ALTER TABLE election_group_lgas ADD COLUMN IF NOT EXISTS lga_supervisors_count INT NOT NULL DEFAULT 0;
ALTER TABLE election_group_lgas ADD COLUMN IF NOT EXISTS unique_lga_supervisors_count INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE election_group_lgas DROP COLUMN IF EXISTS unique_lga_supervisors_count;
ALTER TABLE election_group_lgas DROP COLUMN IF EXISTS lga_supervisors_count;

ALTER TABLE election_group_wards DROP COLUMN IF EXISTS unique_ward_supervisors_count;
ALTER TABLE election_group_wards DROP COLUMN IF EXISTS ward_supervisors_count;

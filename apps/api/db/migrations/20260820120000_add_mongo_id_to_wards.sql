-- +goose Up
ALTER TABLE wards ADD COLUMN IF NOT EXISTS mongo_id VARCHAR(50);

-- +goose Down
ALTER TABLE wards DROP COLUMN IF EXISTS mongo_id;

-- +goose Up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_of_origin SMALLINT REFERENCES c_countries(id);

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS country_of_origin;

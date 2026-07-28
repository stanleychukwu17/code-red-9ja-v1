-- +goose Up
INSERT INTO c_zones_nigeria (name, state_ids) VALUES
('North West', ARRAY[17, 18, 19, 20, 21, 33, 36]::SMALLINT[]),
('North East', ARRAY[2, 5, 8, 15, 34, 35]::SMALLINT[]),
('North Central', ARRAY[7, 22, 23, 25, 26, 31, 37]::SMALLINT[]),
('South West', ARRAY[13, 24, 27, 28, 29, 30]::SMALLINT[]),
('South East', ARRAY[1, 4, 11, 14, 16]::SMALLINT[]),
('South South', ARRAY[3, 6, 9, 10, 12, 32]::SMALLINT[]);

-- +goose Down
TRUNCATE TABLE c_zones_nigeria RESTART IDENTITY;

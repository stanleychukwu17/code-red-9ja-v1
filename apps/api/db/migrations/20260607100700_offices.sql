-- +goose Up
CREATE TABLE offices (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  election VARCHAR(255) NOT NULL, -- presidential, governorship, senatorial, house_of_representatives, councilor, house_of_assembly, chairmanship
  scope VARCHAR(100) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward
  rank INT NOT NULL,
  instances_count INT NOT NULL DEFAULT 0,
  inec_election_type_id VARCHAR(100),
  is_contested BOOLEAN NOT NULL DEFAULT true,
  parent_office_id SMALLINT REFERENCES offices(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_offices_contested_election ON offices(election) WHERE is_contested = true;
CREATE INDEX idx_offices_parent_office_id ON offices(parent_office_id);

-- Seed default offices with explicit IDs
-- 1. Base contested offices
INSERT INTO offices (id, name, election, scope, rank, instances_count, inec_election_type_id, is_contested, parent_office_id)
OVERRIDING SYSTEM VALUE VALUES
(1,  'President', 'Presidential', 'nationwide', 1, 0, '5f129a04df41d910dcdc1d50', true, NULL),
(7,  'Governor', 'Governorship', 'state', 7, 0, '5f129a04df41d910dcdc1d51', true, NULL),
(9,  'Senator', 'Senatorial', 'senatorial-district', 9, 0, '5f129a04df41d910dcdc1d52', true, NULL),
(10, 'House of Representative Member', 'House of Representatives', 'federal-constituency', 10, 0, '5f129a04df41d910dcdc1d53', true, NULL),
(13, 'Local Government Chairman', 'Chairmanship', 'lga', 13, 0, '5f129a04df41d910dcdc1d55', true, NULL),
(14, 'State House of Assembly Member', 'House of Assembly', 'state-constituency', 14, 0, '5f129a04df41d910dcdc1d54', true, NULL),
(15, 'Councillor', 'Councillorship', 'ward', 15, 0, '5f129a04df41d910dcdc1d56', true, NULL);

-- 2. Non-contested running mate & legislative leadership offices
INSERT INTO offices (id, name, election, scope, rank, instances_count, inec_election_type_id, is_contested, parent_office_id)
OVERRIDING SYSTEM VALUE VALUES
(2,  'Vice President', 'Presidential', 'nationwide', 2, 0, NULL, false, 1),
(3,  'Senate President', 'Senatorial', 'nationwide', 3, 0, NULL, false, 9),
(4,  'Speaker of the House of Representatives', 'House of Representatives', 'nationwide', 4, 0, NULL, false, 10),
(5,  'Deputy Senate President', 'Senatorial', 'nationwide', 5, 0, NULL, false, 9),
(6,  'Deputy Speaker of the House of Representatives', 'House of Representatives', 'nationwide', 6, 0, NULL, false, 10),
(8,  'Deputy Governor', 'Governorship', 'state', 8, 0, NULL, false, 7),
(11, 'Speaker of the State House of Assembly', 'House of Assembly', 'state', 11, 0, NULL, false, 14),
(12, 'Deputy Speaker of the State House of Assembly', 'House of Assembly', 'state', 12, 0, NULL, false, 14);

-- Reset sequence for future auto-generated IDs
SELECT setval(pg_get_serial_sequence('offices', 'id'), (SELECT MAX(id) FROM offices));


-- +goose Down
DROP TABLE IF EXISTS offices;
-- +goose Up
CREATE TABLE offices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  election VARCHAR(255) UNIQUE NOT NULL, -- presidential, governoship, senatorial, house_of_representatives, councilor, house_of_assembly, chairmanship
  scope VARCHAR(100) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward
  rank INT NOT NULL,
  instances_count INT NOT NULL DEFAULT 0,
  inec_election_type_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default offices
INSERT INTO offices (name, election, scope, rank, instances_count, inec_election_type_id) VALUES
('President', 'Presidential', 'nationwide', 1, 0, '5f129a04df41d910dcdc1d50'),
('Governor', 'Governorship', 'state', 2, 0, '5f129a04df41d910dcdc1d51'),
('Senator', 'Senatorial', 'senatorial-district', 3, 0, '5f129a04df41d910dcdc1d52'),
('House of Representative Member', 'House of Representatives', 'federal-constituency', 4, 0, '5f129a04df41d910dcdc1d53'),
('Local Government Chairman', 'Chairmanship', 'lga', 5, 0, '5f129a04df41d910dcdc1d55'),
('State House of Assembly Member', 'House of Assembly', 'state-constituency', 6, 0, '5f129a04df41d910dcdc1d54'),
('Councillor', 'Councillorship', 'ward', 7, 0, '5f129a04df41d910dcdc1d56');


-- +goose Down
DROP TABLE IF EXISTS offices;
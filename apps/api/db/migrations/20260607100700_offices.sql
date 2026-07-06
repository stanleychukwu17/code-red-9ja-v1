-- +goose Up
CREATE TABLE offices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  election VARCHAR(255) UNIQUE NOT NULL,
  scope VARCHAR(100) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward
  rank INT NOT NULL,
  instances_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default offices
INSERT INTO offices (name, election, scope, rank, instances_count) VALUES
('President', 'Presidential', 'nationwide', 1, 0),
('Governor', 'Governorship', 'state', 2, 0),
('Senator', 'Senate', 'senatorial-district', 3, 0),
('House of Representative Member', 'House of Representatives', 'federal-constituency', 4, 0),
('Local Government Chairman', 'Local Government Chairman', 'lga', 5, 0),
('State House of Assembly Member', 'State House of Assembly', 'state-constituency', 6, 0),
('Councillor', 'Councillorship', 'ward', 7, 0);


-- +goose Down
DROP TABLE IF EXISTS offices;

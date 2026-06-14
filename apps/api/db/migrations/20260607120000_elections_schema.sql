-- +goose Up
CREATE TABLE election_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  rank INT NOT NULL,
  elections_count INT NOT NULL DEFAULT 0,
  states_count INT NOT NULL DEFAULT 0,
  election_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE elections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rank INT NOT NULL,
  candidates_count INT NOT NULL DEFAULT 0,
  election_date DATE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  election_group_name VARCHAR(100) NOT NULL, -- 2027 presidential election
  office_id BIGINT REFERENCES offices(id) ON DELETE RESTRICT NOT NULL,
  office_name VARCHAR(100) NOT NULL, -- President, Governor
  scope VARCHAR(50) NOT NULL, -- nationwide, state, senatorial-district
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id INT REFERENCES state_assembly_constituencies(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_election_scope_location CHECK (
    (scope = 'nationwide' AND state_id IS NULL AND senatorial_district_id IS NULL AND federal_constituency_id IS NULL AND state_constituency_id IS NULL AND lga_id IS NULL AND ward_id IS NULL) OR
    (scope = 'state' AND state_id IS NOT NULL AND senatorial_district_id IS NULL AND federal_constituency_id IS NULL AND state_constituency_id IS NULL AND lga_id IS NULL AND ward_id IS NULL) OR
    (scope = 'senatorial-district' AND senatorial_district_id IS NOT NULL AND state_id IS NULL AND federal_constituency_id IS NULL AND state_constituency_id IS NULL AND lga_id IS NULL AND ward_id IS NULL) OR
    (scope = 'federal-constituency' AND federal_constituency_id IS NOT NULL AND state_id IS NULL AND senatorial_district_id IS NULL AND state_constituency_id IS NULL AND lga_id IS NULL AND ward_id IS NULL) OR
    (scope = 'state-constituency' AND state_constituency_id IS NOT NULL AND state_id IS NULL AND senatorial_district_id IS NULL AND federal_constituency_id IS NULL AND lga_id IS NULL AND ward_id IS NULL) OR
    (scope = 'lga' AND lga_id IS NOT NULL AND state_id IS NULL AND senatorial_district_id IS NULL AND federal_constituency_id IS NULL AND state_constituency_id IS NULL AND ward_id IS NULL) OR
    (scope = 'ward' AND ward_id IS NOT NULL AND state_id IS NULL AND senatorial_district_id IS NULL AND federal_constituency_id IS NULL AND state_constituency_id IS NULL AND lga_id IS NULL)
  )
);

CREATE TABLE election_candidates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  candidate_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, candidate_id)
);

-- +goose Down
DROP TABLE IF EXISTS election_candidates;
DROP TABLE IF EXISTS elections;
DROP TABLE IF EXISTS election_groups;

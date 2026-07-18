-- +goose Up
CREATE TABLE election_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  rank INT NOT NULL,
  
  elections_count INT NOT NULL DEFAULT 0,
  states_count INT NOT NULL DEFAULT 0,
  senatorial_districts_count INT NOT NULL DEFAULT 0,
  federal_constituencies_count INT NOT NULL DEFAULT 0,
  lgas_count INT NOT NULL DEFAULT 0,
  state_constituencies_count INT NOT NULL DEFAULT 0,
  wards_count INT NOT NULL DEFAULT 0,
  polling_units_count INT NOT NULL DEFAULT 0,
  
  state_supervisors_count INT NOT NULL DEFAULT 0,
  unique_state_supervisors_count INT NOT NULL DEFAULT 0,
  lga_supervisors_count INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count INT NOT NULL DEFAULT 0,
  ward_supervisors_count INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count INT NOT NULL DEFAULT 0,
  
  reports_count INT NOT NULL DEFAULT 0,
  updates_count INT NOT NULL DEFAULT 0,
  results_submitted_count INT NOT NULL DEFAULT 0,
  
  unique_final_results_expected INT NOT NULL DEFAULT 0,
  pu_agents_count INT NOT NULL DEFAULT 0,
  unique_pu_agents_count INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count INT NOT NULL DEFAULT 0,
  
  pu_average_election_started_at TIMESTAMPTZ,
  pu_average_election_ended_at TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage FLOAT NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count INT NOT NULL DEFAULT 0,
  pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count INT NOT NULL DEFAULT 0,
  
  total_pu_with_reports INT NOT NULL DEFAULT 0,
  total_pu_with_updates INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters INT NOT NULL DEFAULT 0,
  
  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   ... same object shape as outlined by the comment in election_group_wards,
  --   state_supervisors_count,
  --   unique_state_supervisors_count,
  --   lga_supervisors_count,
  --   unique_lga_supervisors_count,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  election_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE elections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id INT REFERENCES state_assembly_constituencies(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  office_id BIGINT REFERENCES offices(id) ON DELETE RESTRICT NOT NULL,

  name VARCHAR(255) NOT NULL,
  rank INT NOT NULL,
  election_date DATE NOT NULL,
  election_group_name VARCHAR(100) NOT NULL, -- 2027 presidential election
  office_name VARCHAR(100) NOT NULL, -- President, Governor
  scope VARCHAR(50) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward

  candidates_count INT NOT NULL DEFAULT 0,
  reports_count INT NOT NULL DEFAULT 0,
  updates_count INT NOT NULL DEFAULT 0,
  results_submitted_count INT NOT NULL DEFAULT 0,

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
  party_id BIGINT NOT NULL DEFAULT 7 REFERENCES parties(id) ON DELETE RESTRICT,
  party_short_name VARCHAR(50) NOT NULL DEFAULT 'N/A',
  votes_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, candidate_id)
);

INSERT INTO election_groups (
  id, name, rank, elections_count, states_count, election_date, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, '2027 Presidential Election', 1, 1, 37, '2027-01-16', '2026-06-26 08:54:12.15353+00', '2026-06-26 11:05:26.181615+00'),
(2, '2026 Governorship Election (Osun)', 2, 1, 1, '2026-08-15', '2026-06-26 11:05:05.893034+00', '2026-06-26 11:05:05.893034+00');

ALTER TABLE election_groups ALTER COLUMN id RESTART WITH 3;

INSERT INTO elections (
  id, name, rank, candidates_count, election_date, election_group_id, election_group_name, office_id, office_name, scope, state_id, senatorial_district_id, federal_constituency_id, state_constituency_id, lga_id, ward_id, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 'Presidential Election', 1, 0, '2027-01-16', 1, '2027 President Election', 1, 'President', 'nationwide', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-26 08:54:12.15353+00', '2026-06-26 08:54:12.15353+00'),
(2, 'Governorship Election (Osun)', 2, 0, '2026-08-15', 2, '2026 Governorship Election (Osun)', 2, 'Governor', 'state', 29, NULL, NULL, NULL, NULL, NULL, '2026-06-26 11:05:05.893034+00', '2026-06-26 11:05:05.893034+00');

ALTER TABLE elections ALTER COLUMN id RESTART WITH 3;

-- +goose Down
DROP TABLE IF EXISTS election_candidates;
DROP TABLE IF EXISTS elections;
DROP TABLE IF EXISTS election_groups;

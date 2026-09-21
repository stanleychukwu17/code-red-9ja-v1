-- +goose Up

-- ============================================================
-- 1. election_group_parties_polling_units
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_polling_units (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  polling_unit_id                                INT NOT NULL REFERENCES polling_units(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                                         INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                                        INT REFERENCES wards(id) ON DELETE SET NULL,
  state_constituency_id                          INT REFERENCES state_constituencies(id) ON DELETE SET NULL,
  federal_constituency_id                        INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  senatorial_district_id                         INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,
  last_update_given_at                           TIMESTAMPTZ,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, polling_unit_id, party_id)
);

CREATE INDEX idx_egppu_party_id ON election_group_parties_polling_units(party_id);
CREATE INDEX idx_egppu_ward_id  ON election_group_parties_polling_units(ward_id);
CREATE INDEX idx_egppu_lga_id   ON election_group_parties_polling_units(lga_id);
CREATE INDEX idx_egppu_state_id ON election_group_parties_polling_units(state_id);

-- ============================================================
-- 2. election_group_parties_wards
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_wards (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  ward_id                                        INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  lga_id                                         INT REFERENCES lgas(id) ON DELETE SET NULL,
  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  ward_supervisors_count                         INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, ward_id, party_id)
);

CREATE INDEX idx_egpw_party_id ON election_group_parties_wards(party_id);
CREATE INDEX idx_egpw_lga_id   ON election_group_parties_wards(lga_id);
CREATE INDEX idx_egpw_state_id ON election_group_parties_wards(state_id);

-- ============================================================
-- 3. election_group_parties_state_constituencies
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_state_constituencies (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_constituency_id                          INT NOT NULL REFERENCES state_constituencies(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, state_constituency_id, party_id)
);

CREATE INDEX idx_egpsc_party_id ON election_group_parties_state_constituencies(party_id);
CREATE INDEX idx_egpsc_state_id ON election_group_parties_state_constituencies(state_id);

-- ============================================================
-- 4. election_group_parties_lgas
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_lgas (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  lga_id                                         INT NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id                         INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id                        INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, lga_id, party_id)
);

CREATE INDEX idx_egplga_party_id ON election_group_parties_lgas(party_id);
CREATE INDEX idx_egplga_state_id ON election_group_parties_lgas(state_id);

-- ============================================================
-- 5. election_group_parties_federal_constituencies
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_federal_constituencies (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  federal_constituency_id                        INT NOT NULL REFERENCES federal_constituencies(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id                         INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                   INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, federal_constituency_id, party_id)
);

CREATE INDEX idx_egpfc_party_id ON election_group_parties_federal_constituencies(party_id);
CREATE INDEX idx_egpfc_state_id ON election_group_parties_federal_constituencies(state_id);

-- ============================================================
-- 6. election_group_parties_senatorial_districts
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_senatorial_districts (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  senatorial_district_id                         INT NOT NULL REFERENCES senatorial_districts(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                   INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, senatorial_district_id, party_id)
);

CREATE INDEX idx_egpsd_party_id ON election_group_parties_senatorial_districts(party_id);
CREATE INDEX idx_egpsd_state_id ON election_group_parties_senatorial_districts(state_id);

-- ============================================================
-- 7. election_group_parties_states
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_states (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_id                                       SMALLINT NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,
  state_supervisor_applications_count            INT NOT NULL DEFAULT 0,
  state_supervisor_accepted_applications_count   INT NOT NULL DEFAULT 0,
  state_supervisor_rejected_applications_count   INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  state_supervisors_count                        INT NOT NULL DEFAULT 0,
  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                   INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, state_id, party_id)
);

CREATE INDEX idx_egpstate_party_id ON election_group_parties_states(party_id);

-- ============================================================
-- 8. election_group_parties_national
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_national (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,
  state_supervisor_applications_count            INT NOT NULL DEFAULT 0,
  state_supervisor_accepted_applications_count   INT NOT NULL DEFAULT 0,
  state_supervisor_rejected_applications_count   INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  state_supervisors_count                        INT NOT NULL DEFAULT 0,
  unique_state_supervisors_count                 INT NOT NULL DEFAULT 0,
  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                   INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, party_id)
);

CREATE INDEX idx_egpnat_party_id ON election_group_parties_national(party_id);

-- +goose Down
DROP TABLE IF EXISTS election_group_parties_national;
DROP TABLE IF EXISTS election_group_parties_states;
DROP TABLE IF EXISTS election_group_parties_senatorial_districts;
DROP TABLE IF EXISTS election_group_parties_federal_constituencies;
DROP TABLE IF EXISTS election_group_parties_lgas;
DROP TABLE IF EXISTS election_group_parties_state_constituencies;
DROP TABLE IF EXISTS election_group_parties_wards;
DROP TABLE IF EXISTS election_group_parties_polling_units;

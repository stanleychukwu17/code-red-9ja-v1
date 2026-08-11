-- +goose Up

-- ============================================================
-- ELECTION STATS TABLES
-- Pre-aggregated cache tables refreshed by the cron worker
-- (same */10 minute cadence as final results rollups).
-- NOT source-of-truth. Summarised from:
--   - polling_unit_assignments  (agent tracking, readiness)
--   - polling_unit_updates      (reports & updates counts)
--   - polling_unit_results      (final result submissions)
--   - election_votes            (live voter referrals)
--   - users.referred_by_code    (agent referral chain)
-- ============================================================


-- ============================================================
-- 1. election_group_polling_units
-- One row per (election_group_id, polling_unit_id).
-- Most granular level — all higher tables roll up from here.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_polling_units (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id         BIGINT    NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  polling_unit_id           INTEGER   NOT NULL REFERENCES polling_units(id) ON DELETE CASCADE,

  -- Denormalised geography (mirrors polling_unit_assignments pattern)
  state_id                  SMALLINT  REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                    INT       REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                   INT       REFERENCES wards(id) ON DELETE SET NULL,
  state_constituency_id     INT       REFERENCES state_assembly_constituencies(id) ON DELETE SET NULL,
  federal_constituency_id   INT       REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  senatorial_district_id    INT       REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  -- Number of elections this PU is eligible for in this election group
  unique_final_results_expected                        INT         NOT NULL DEFAULT 0,

  -- Overall aggregate fields (across all parties at this PU)
  applications_count                                   INT         NOT NULL DEFAULT 0,
  accepted_applications_count                          INT         NOT NULL DEFAULT 0,
  rejected_applications_count                          INT         NOT NULL DEFAULT 0,
  pu_agents_count                                      INT         NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                        INT         NOT NULL DEFAULT 0,
  pu_reports_count                                     INT         NOT NULL DEFAULT 0,
  pu_updates_count                                     INT         NOT NULL DEFAULT 0,
  -- Averaged from polling_unit_assignments.election_started_at / election_ended_at
  pu_average_arrival_time                              TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds           FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                       TIMESTAMPTZ,
  pu_average_election_ended_at                         TIMESTAMPTZ,
  -- Averaged from polling_unit_assignments.pu_election_practice_test_readiness_percentage
  pu_election_practice_test_readiness_percentage       NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Total rows in polling_unit_results for this PU in this election group
  pu_final_results_uploaded_count                      INT         NOT NULL DEFAULT 0,
  -- Distinct election_ids with >=1 result submission for this PU
  unique_pu_final_results_uploaded_count               INT         NOT NULL DEFAULT 0,
  -- Voters whose referred_by_code matches an agent assigned to this PU, who then voted
  pu_live_voters_referred_by_agent_count               INT         NOT NULL DEFAULT 0,

  -- Per-party breakdown. Array of objects:
  -- {
  --   party_id,
  --   applications_count,
  --   accepted_applications_count,
  --   rejected_applications_count,
  --   pu_agents_count,
  --   pu_agents_in_attendance_count,
  --   pu_average_arrival_time,
  --   pu_average_election_started_at,
  --   pu_average_election_ended_at,
  --   pu_updates_count,
  --   pu_reports_count,
  --   pu_final_results_uploaded_count,
  --   unique_pu_final_results_uploaded_count,
  --   last_update_given_at,
  --   pu_average_update_time_interval_in_seconds,
  --   pu_election_practice_test_readiness_percentage,
  --   pu_live_voters_referred_by_agent_count
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_polling_unit UNIQUE (election_group_id, polling_unit_id)
);

CREATE INDEX idx_egpu_polling_unit      ON election_group_polling_units(polling_unit_id);
CREATE INDEX idx_egpu_state             ON election_group_polling_units(state_id);
CREATE INDEX idx_egpu_lga               ON election_group_polling_units(lga_id);
CREATE INDEX idx_egpu_ward              ON election_group_polling_units(ward_id);
CREATE INDEX idx_egpu_state_const       ON election_group_polling_units(state_constituency_id);
CREATE INDEX idx_egpu_federal_const     ON election_group_polling_units(federal_constituency_id);
CREATE INDEX idx_egpu_senatorial        ON election_group_polling_units(senatorial_district_id);


-- ============================================================
-- 2. election_group_wards
-- One row per (election_group_id, ward_id).
-- All pu_* fields are rollups of election_group_polling_units.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_wards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id       BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  ward_id                 INT      NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  lga_id                  INT      REFERENCES lgas(id) ON DELETE SET NULL,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  -- Sum of unique_final_results_expected across all PUs in this ward
  unique_final_results_expected                    INT NOT NULL DEFAULT 1, -- total unique results (a polling unit may have)

  -- Rollups of per-PU scalar fields
  applications_count                            INT NOT NULL DEFAULT 0,
  accepted_applications_count                   INT NOT NULL DEFAULT 0,
  rejected_applications_count                   INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count            INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count   INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count   INT NOT NULL DEFAULT 0,
  pu_agents_count                            INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                     INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count              INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                           INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                           INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count            INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count     INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs

  -- Count of PUs that have crossed each threshold (overall, across all parties)
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   party_id,
  --   applications_count,
  --   accepted_applications_count,
  --   rejected_applications_count,
  --   ward_supervisor_applications_count,
  --   ward_supervisor_accepted_applications_count,
  --   ward_supervisor_rejected_applications_count,
  --   pu_agents_count,
  --   unique_pu_agents_count,
  --   pu_agents_in_attendance_count,
  --   updates_count,
  --   reports_count,
  --   pu_average_arrival_time,
  --   pu_average_election_started_at,
  --   pu_average_election_ended_at,
  --   pu_final_results_uploaded_count,
  --   unique_pu_final_results_uploaded_count,
  --   pu_average_update_time_interval_in_seconds,
  --   pu_election_practice_test_readiness_percentage,
  --   pu_live_voters_referred_by_agent_count,
  --   total_pu_with_reports,
  --   total_pu_with_updates,
  --   total_pu_with_agents_in_attendance,
  --   total_pu_where_election_has_started,
  --   total_pu_where_election_has_ended,
  --   total_pu_unique_final_results_uploaded,
  --   total_pu_where_agents_referred_live_voters
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  polling_units_count                               INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_ward UNIQUE (election_group_id, ward_id)
);

CREATE INDEX idx_egw_ward           ON election_group_wards(ward_id);
CREATE INDEX idx_egw_lga            ON election_group_wards(lga_id);
CREATE INDEX idx_egw_state          ON election_group_wards(state_id);


-- ============================================================
-- 3. election_group_state_constituencies
-- One row per (election_group_id, state_constituency_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_state_constituencies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id         BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_constituency_id     INT      NOT NULL REFERENCES state_assembly_constituencies(id) ON DELETE CASCADE,
  state_id                  SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  -- Application Stats
  applications_count                               INT NOT NULL DEFAULT 0,
  accepted_applications_count                      INT NOT NULL DEFAULT 0,
  rejected_applications_count                      INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count               INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count      INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count      INT NOT NULL DEFAULT 0,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                     TIMESTAMPTZ, -- average time election stops in pu
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count            INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count     INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  ward_supervisors_count                            INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                     INT NOT NULL DEFAULT 0,

  wards_count                                       INT NOT NULL DEFAULT 0,
  polling_units_count                               INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   ... same object shape as outlined by the comment in election_group_wards,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_state_constituency UNIQUE (election_group_id, state_constituency_id)
);

CREATE INDEX idx_egsc_state_constituency ON election_group_state_constituencies(state_constituency_id);
CREATE INDEX idx_egsc_state              ON election_group_state_constituencies(state_id);


-- ============================================================
-- 4. election_group_lgas
-- One row per (election_group_id, lga_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_lgas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id       BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  lga_id                  INT      NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id  INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,

  -- Application Stats
  applications_count                               INT NOT NULL DEFAULT 0,
  accepted_applications_count                      INT NOT NULL DEFAULT 0,
  rejected_applications_count                      INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count               INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count      INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count      INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count                INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count       INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count       INT NOT NULL DEFAULT 0,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                     TIMESTAMPTZ, -- average time election stops in pu
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count                  INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count           INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  ward_supervisors_count                           INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                    INT NOT NULL DEFAULT 0,

  state_constituencies_count                       INT NOT NULL DEFAULT 0,
  wards_count                                      INT NOT NULL DEFAULT 0,
  polling_units_count                              INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   ... same object shape as outlined by the comment in election_group_wards,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_lga UNIQUE (election_group_id, lga_id)
);

CREATE INDEX idx_eglga_lga            ON election_group_lgas(lga_id);
CREATE INDEX idx_eglga_state          ON election_group_lgas(state_id);


-- ============================================================
-- 5. election_group_federal_constituencies
-- One row per (election_group_id, federal_constituency_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_federal_constituencies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id                                BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  federal_constituency_id                          INT      NOT NULL REFERENCES federal_constituencies(id) ON DELETE CASCADE,
  state_id                                         SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id                           INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  -- Application Stats
  applications_count                               INT NOT NULL DEFAULT 0,
  accepted_applications_count                      INT NOT NULL DEFAULT 0,
  rejected_applications_count                      INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count               INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count      INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count      INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count                INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count       INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count       INT NOT NULL DEFAULT 0,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                     TIMESTAMPTZ, -- average time election stops in pu
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count                  INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count           INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  lga_supervisors_count                            INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                     INT NOT NULL DEFAULT 0,
  ward_supervisors_count                           INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                    INT NOT NULL DEFAULT 0,

  lgas_count                                       INT NOT NULL DEFAULT 0,
  state_constituencies_count                       INT NOT NULL DEFAULT 0,
  wards_count                                      INT NOT NULL DEFAULT 0,
  polling_units_count                              INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   ... same object shape as outlined by the comment in election_group_wards,
  --   lga_supervisors_count,
  --   unique_lga_supervisors_count,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_federal_constituency UNIQUE (election_group_id, federal_constituency_id)
);

CREATE INDEX idx_egfc_federal_constituency ON election_group_federal_constituencies(federal_constituency_id);
CREATE INDEX idx_egfc_state                ON election_group_federal_constituencies(state_id);


-- ============================================================
-- 6. election_group_senatorial_districts
-- One row per (election_group_id, senatorial_district_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_senatorial_districts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id           BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  senatorial_district_id      INT      NOT NULL REFERENCES senatorial_districts(id) ON DELETE CASCADE,
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  -- Application Stats
  applications_count                               INT NOT NULL DEFAULT 0,
  accepted_applications_count                      INT NOT NULL DEFAULT 0,
  rejected_applications_count                      INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count               INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count      INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count      INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count                INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count       INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count       INT NOT NULL DEFAULT 0,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                     TIMESTAMPTZ, -- average time election stops in pu
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count            INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count     INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  lga_supervisors_count                             INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                      INT NOT NULL DEFAULT 0,
  ward_supervisors_count                            INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                     INT NOT NULL DEFAULT 0,

  federal_constituencies_count                       INT NOT NULL DEFAULT 0,
  lgas_count                                        INT NOT NULL DEFAULT 0,
  state_constituencies_count                         INT NOT NULL DEFAULT 0,
  wards_count                                       INT NOT NULL DEFAULT 0,
  polling_units_count                               INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   ... same object shape as outlined by the comment in election_group_wards,
  --   lga_supervisors_count,
  --   unique_lga_supervisors_count,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_senatorial_district UNIQUE (election_group_id, senatorial_district_id)
);

CREATE INDEX idx_egsd_senatorial_district ON election_group_senatorial_districts(senatorial_district_id);
CREATE INDEX idx_egsd_state               ON election_group_senatorial_districts(state_id);


-- ============================================================
-- 7. election_group_states
-- One row per (election_group_id, state_id).
-- Highest geographic level for stats aggregation.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_states (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id   BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_id            SMALLINT NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,

  -- Application Stats
  applications_count                               INT NOT NULL DEFAULT 0,
  accepted_applications_count                      INT NOT NULL DEFAULT 0,
  rejected_applications_count                      INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count               INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count      INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count      INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count                INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count       INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count       INT NOT NULL DEFAULT 0,
  state_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  state_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  state_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,
  
  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_average_arrival_time                          TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu
  pu_average_election_ended_at                     TIMESTAMPTZ, -- average time election stops in pu
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0, -- average election practice test readiness percentage across all PUs
  pu_final_results_uploaded_count                  INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count           INT NOT NULL DEFAULT 0, -- total unique final result uploads
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0, -- total live voters referred by agents across all PUs
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0, -- total pu where election has started
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0, -- total pu where election has ended
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0, -- total pu where agents have referred live voters

  lga_supervisors_count                            INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                     INT NOT NULL DEFAULT 0,
  ward_supervisors_count                           INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                    INT NOT NULL DEFAULT 0,

  state_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_state_supervisors_count                   INT NOT NULL DEFAULT 0,

  senatorial_districts_count                       INT NOT NULL DEFAULT 0,
  federal_constituencies_count                     INT NOT NULL DEFAULT 0,
  lgas_count                                       INT NOT NULL DEFAULT 0,
  state_constituencies_count                       INT NOT NULL DEFAULT 0,
  wards_count                                      INT NOT NULL DEFAULT 0,
  polling_units_count                              INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   party_id,
  --   applications_count,
  --   accepted_applications_count,
  --   rejected_applications_count,
  --   ward_supervisor_applications_count,
  --   ward_supervisor_accepted_applications_count,
  --   ward_supervisor_rejected_applications_count,
  --   lga_supervisor_applications_count,
  --   lga_supervisor_accepted_applications_count,
  --   lga_supervisor_rejected_applications_count,
  --   state_supervisor_applications_count,
  --   state_supervisor_accepted_applications_count,
  --   state_supervisor_rejected_applications_count,
  --   lga_supervisors_count,
  --   unique_lga_supervisors_count,
  --   ward_supervisors_count,
  --   unique_ward_supervisors_count,
  --   state_supervisors_count,
  --   unique_state_supervisors_count,
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_state UNIQUE (election_group_id, state_id)
);

CREATE INDEX idx_egstate_state          ON election_group_states(state_id);


-- +goose Down
DROP TABLE IF EXISTS election_group_states;
DROP TABLE IF EXISTS election_group_senatorial_districts;
DROP TABLE IF EXISTS election_group_federal_constituencies;
DROP TABLE IF EXISTS election_group_lgas;
DROP TABLE IF EXISTS election_group_state_constituencies;
DROP TABLE IF EXISTS election_group_wards;
DROP TABLE IF EXISTS election_group_polling_units;


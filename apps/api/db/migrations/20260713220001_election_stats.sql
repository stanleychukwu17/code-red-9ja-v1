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
-- election_polling_units
-- One row per (election_group_id, polling_unit_id).
-- Most granular level — all higher tables roll up from here.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_polling_units (
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
  unique_final_results_expected               INT         NOT NULL DEFAULT 0,

  -- Overall aggregate fields (across all parties at this PU)
  total_agents_count                          INT         NOT NULL DEFAULT 0,
  total_agents_in_attendance_count            INT         NOT NULL DEFAULT 0,
  total_reports_count                         INT         NOT NULL DEFAULT 0,
  total_updates_count                         INT         NOT NULL DEFAULT 0,
  -- Averaged from polling_unit_assignments.election_started_at / election_ended_at
  average_election_started_at                 TIMESTAMPTZ,
  average_election_ended_at                 TIMESTAMPTZ,
  -- Averaged from polling_unit_assignments.election_practice_test_readiness_percentage
  election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Total rows in polling_unit_results for this PU in this election group
  total_final_results_uploaded_count          INT         NOT NULL DEFAULT 0,
  -- Distinct election_ids with >=1 result submission for this PU
  total_unique_final_results_uploaded_count   INT         NOT NULL DEFAULT 0,
  -- Voters whose referred_by_code matches an agent assigned to this PU, who then voted
  live_voters_referred_by_agent_count         INT         NOT NULL DEFAULT 0,

  -- Per-party breakdown. Array of objects:
  -- {
  --   party_id,
  --   agents_in_attendance_count,
  --   average_arrival_time,
  --   election_started_at,
  --   election_ended_at,
  --   updates_count,
  --   reports_count,
  --   agents_count,
  --   final_results_uploaded_count,
  --   unique_final_results_uploaded_count,
  --   last_update_given_at,
  --   average_update_time_interval_in_seconds,
  --   election_practice_test_readiness_percentage,
  --   live_voters_referred_by_agent_count
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_polling_unit UNIQUE (election_group_id, polling_unit_id)
);

CREATE INDEX idx_epu_election_group    ON election_polling_units(election_group_id);
CREATE INDEX idx_epu_polling_unit      ON election_polling_units(polling_unit_id);
CREATE INDEX idx_epu_state             ON election_polling_units(state_id);
CREATE INDEX idx_epu_lga               ON election_polling_units(lga_id);
CREATE INDEX idx_epu_ward              ON election_polling_units(ward_id);
CREATE INDEX idx_epu_state_const       ON election_polling_units(state_constituency_id);
CREATE INDEX idx_epu_federal_const     ON election_polling_units(federal_constituency_id);
CREATE INDEX idx_epu_senatorial        ON election_polling_units(senatorial_district_id);


-- ============================================================
-- election_wards
-- One row per (election_group_id, ward_id).
-- All pu_* fields are rollups of election_polling_units.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_wards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id       BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  ward_id                 INT      NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  lga_id                  INT      REFERENCES lgas(id) ON DELETE SET NULL,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  -- Sum of unique_final_results_expected across all PUs in this ward
  unique_final_results_expected                    INT NOT NULL DEFAULT 0,

  -- Rollups of per-PU scalar fields
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,

  -- Count of PUs that have crossed each threshold (overall, across all parties)
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  -- Per-party rollup. Array of objects, one per party:
  -- {
  --   party_id,
  --   pu_total_agents_in_attendance_count,
  --   pu_average_arrival_time,
  --   pu_average_election_started_at,
  --   pu_average_election_ended_at,
  --   pu_total_updates_count,
  --   pu_total_reports_count,
  --   pu_total_agents_count,
  --   pu_total_final_results_uploaded_count,
  --   pu_total_unique_final_results_uploaded_count,
  --   pu_average_update_time_interval_in_seconds,
  --   pu_election_practice_test_readiness_percentage,
  --   pu_live_voters_referred_by_agent_count,
  --   total_pu_with_reports,
  --   total_pu_with_updates,
  --   total_pu_with_agents_in_attendance,
  --   total_pu_where_election_has_started,
  --   total_pu_where_election_has_ended,
  --   total_pu_unique_final_results_uploaded_count,
  --   total_pu_where_agents_referred_live_voters
  -- }
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_ward UNIQUE (election_group_id, ward_id)
);

CREATE INDEX idx_ew_election_group ON election_wards(election_group_id);
CREATE INDEX idx_ew_ward           ON election_wards(ward_id);
CREATE INDEX idx_ew_lga            ON election_wards(lga_id);
CREATE INDEX idx_ew_state          ON election_wards(state_id);


-- ============================================================
-- election_lgas
-- One row per (election_group_id, lga_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_lgas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id       BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  lga_id                  INT      NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id  INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0,
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                     TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_lga UNIQUE (election_group_id, lga_id)
);

CREATE INDEX idx_elga_election_group ON election_lgas(election_group_id);
CREATE INDEX idx_elga_lga            ON election_lgas(lga_id);
CREATE INDEX idx_elga_state          ON election_lgas(state_id);


-- ============================================================
-- election_state_constituencies
-- One row per (election_group_id, state_constituency_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_state_constituencies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id         BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_constituency_id     INT      NOT NULL REFERENCES state_assembly_constituencies(id) ON DELETE CASCADE,
  state_id                  SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0,
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                     TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_state_constituency UNIQUE (election_group_id, state_constituency_id)
);

CREATE INDEX idx_esc_election_group     ON election_state_constituencies(election_group_id);
CREATE INDEX idx_esc_state_constituency ON election_state_constituencies(state_constituency_id);
CREATE INDEX idx_esc_state              ON election_state_constituencies(state_id);


-- ============================================================
-- election_federal_constituencies
-- One row per (election_group_id, federal_constituency_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_federal_constituencies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id           BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  federal_constituency_id     INT      NOT NULL REFERENCES federal_constituencies(id) ON DELETE CASCADE,
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0,
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                     TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_federal_constituency UNIQUE (election_group_id, federal_constituency_id)
);

CREATE INDEX idx_efc_election_group       ON election_federal_constituencies(election_group_id);
CREATE INDEX idx_efc_federal_constituency ON election_federal_constituencies(federal_constituency_id);
CREATE INDEX idx_efc_state                ON election_federal_constituencies(state_id);


-- ============================================================
-- election_senatorial_districts
-- One row per (election_group_id, senatorial_district_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_senatorial_districts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id           BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  senatorial_district_id      INT      NOT NULL REFERENCES senatorial_districts(id) ON DELETE CASCADE,
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0,
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                     TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_senatorial_district UNIQUE (election_group_id, senatorial_district_id)
);

CREATE INDEX idx_esd_election_group      ON election_senatorial_districts(election_group_id);
CREATE INDEX idx_esd_senatorial_district ON election_senatorial_districts(senatorial_district_id);
CREATE INDEX idx_esd_state               ON election_senatorial_districts(state_id);


-- ============================================================
-- election_states
-- One row per (election_group_id, state_id).
-- Highest geographic level for stats aggregation.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_states (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id   BIGINT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_id            SMALLINT NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,

  unique_final_results_expected                    INT NOT NULL DEFAULT 0,
  pu_total_agents_count                            INT NOT NULL DEFAULT 0,
  pu_total_agents_in_attendance_count              INT NOT NULL DEFAULT 0,
  pu_total_reports_count                           INT NOT NULL DEFAULT 0,
  pu_total_updates_count                           INT NOT NULL DEFAULT 0,
  pu_average_election_started_at                   TIMESTAMPTZ,
  pu_average_election_ended_at                     TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_total_final_results_uploaded_count            INT NOT NULL DEFAULT 0,
  pu_total_unique_final_results_uploaded_count     INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count           INT NOT NULL DEFAULT 0,
  total_pu_with_reports                            INT NOT NULL DEFAULT 0,
  total_pu_with_updates                            INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started              INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended                INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters       INT NOT NULL DEFAULT 0,

  parties JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_state UNIQUE (election_group_id, state_id)
);

CREATE INDEX idx_estate_election_group ON election_states(election_group_id);
CREATE INDEX idx_estate_state          ON election_states(state_id);


-- +goose Down
DROP TABLE IF EXISTS election_states;
DROP TABLE IF EXISTS election_senatorial_districts;
DROP TABLE IF EXISTS election_federal_constituencies;
DROP TABLE IF EXISTS election_state_constituencies;
DROP TABLE IF EXISTS election_lgas;
DROP TABLE IF EXISTS election_wards;
DROP TABLE IF EXISTS election_polling_units;


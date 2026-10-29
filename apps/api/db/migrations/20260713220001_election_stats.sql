-- +goose Up

-- ============================================================
-- ELECTION STATS TABLES
-- Pre-aggregated cache tables refreshed by the cron worker
-- (same */10 minute cadence as final results roll-ups).
-- NOT source-of-truth. Summarized from:
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

  election_group_id INT    NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  polling_unit_id           INTEGER   NOT NULL REFERENCES polling_units(id) ON DELETE CASCADE,

  -- Denormalized geography (mirrors polling_unit_assignments pattern)
  state_id                  SMALLINT  REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                    INT       REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                   INT       REFERENCES wards(id) ON DELETE SET NULL,
  state_constituency_id     INT       REFERENCES state_constituencies(id) ON DELETE SET NULL,
  federal_constituency_id   INT       REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  senatorial_district_id    INT       REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  -- Number of elections this PU is eligible for in this election group
  unique_final_results_expected                        INT         NOT NULL DEFAULT 0,

  -- Overall aggregate fields (across all parties at this PU)
  pu_agents_count                                      INT         NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                        INT         NOT NULL DEFAULT 0,
  pu_reports_count                                     INT         NOT NULL DEFAULT 0,
  pu_updates_count                                     INT         NOT NULL DEFAULT 0,
  -- Total rows in polling_unit_results for this PU in this election group
  pu_final_results_uploaded_count                      INT         NOT NULL DEFAULT 0,
  -- Distinct election_ids with >=1 result submission for this PU
  unique_pu_final_results_uploaded_count               INT         NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_polling_unit UNIQUE (election_group_id, polling_unit_id)
);

CREATE INDEX idx_egpu_group_ward        ON election_group_polling_units(election_group_id, ward_id);
CREATE INDEX idx_egpu_group_state_const ON election_group_polling_units(election_group_id, state_constituency_id);


-- ============================================================
-- 2. election_group_wards
-- One row per (election_group_id, ward_id).
-- All pu_* fields are rollups of election_group_polling_units.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_wards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id INT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  ward_id                 INT      NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  lga_id                  INT      REFERENCES lgas(id) ON DELETE SET NULL,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  -- Sum of unique_final_results_expected across all PUs in this ward
  unique_final_results_expected                    INT NOT NULL DEFAULT 1, -- total unique results (a polling unit may have)


  -- Rollups of per-PU scalar fields
  pu_agents_count                            INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                     INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count              INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                           INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                           INT NOT NULL DEFAULT 0, -- total updates
  pu_final_results_uploaded_count            INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count     INT NOT NULL DEFAULT 0, -- total unique final result uploads

  -- Count of PUs that have crossed each threshold (overall, across all parties)
  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)

  ward_supervisors_count                           INT NOT NULL DEFAULT 0, 


  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_ward UNIQUE (election_group_id, ward_id)
);

CREATE INDEX idx_egw_group_lga      ON election_group_wards(election_group_id, lga_id);
CREATE INDEX idx_egw_group_state    ON election_group_wards(election_group_id, state_id);


-- ============================================================

-- ============================================================
-- 4. election_group_lgas
-- One row per (election_group_id, lga_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_lgas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id INT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  lga_id                  INT      NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  state_id                SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id  INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,


  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_final_results_uploaded_count                  INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count           INT NOT NULL DEFAULT 0, -- total unique final result uploads

  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)

  lga_supervisors_count                            INT NOT NULL DEFAULT 0,
  ward_supervisors_count                           INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                    INT NOT NULL DEFAULT 0,


  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_lga UNIQUE (election_group_id, lga_id)
);

CREATE INDEX idx_eglga_group_state    ON election_group_lgas(election_group_id, state_id);


-- ============================================================

-- ============================================================

-- ============================================================
-- 7. election_group_states
-- One row per (election_group_id, state_id).
-- Highest geographic level for stats aggregation.
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_states (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id INT   NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  state_id            SMALLINT NOT NULL REFERENCES c_states(id) ON DELETE CASCADE,


  unique_final_results_expected                    INT NOT NULL DEFAULT 0, -- total unique results (a polling unit may have)
  pu_agents_count                                  INT NOT NULL DEFAULT 0, -- total pu agents
  unique_pu_agents_count                           INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents
  pu_agents_in_attendance_count                    INT NOT NULL DEFAULT 0, -- total agents in attendance
  pu_reports_count                                 INT NOT NULL DEFAULT 0, -- total reports
  pu_updates_count                                 INT NOT NULL DEFAULT 0, -- total updates
  pu_final_results_uploaded_count                  INT NOT NULL DEFAULT 0, -- total pu final result uploads
  unique_pu_final_results_uploaded_count           INT NOT NULL DEFAULT 0, -- total unique final result uploads

  total_pu_with_reports                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more reports
  total_pu_with_updates                            INT NOT NULL DEFAULT 0, -- total pu with 1 or more updates
  total_pu_with_agents_in_attendance               INT NOT NULL DEFAULT 0, -- total pu with 1 or more agents in attendance
  total_pu_unique_final_results_uploaded           INT NOT NULL DEFAULT 0, -- total pu with 1 or more unique election final results uploaded (1 recorded for each election final result upload within the election group)

  lga_supervisors_count                            INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                     INT NOT NULL DEFAULT 0,
  ward_supervisors_count                           INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                    INT NOT NULL DEFAULT 0,

  state_supervisors_count                          INT NOT NULL DEFAULT 0,


  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_election_group_state UNIQUE (election_group_id, state_id)
);



-- +goose Down
DROP TABLE IF EXISTS election_group_states;
DROP TABLE IF EXISTS election_group_lgas;
DROP TABLE IF EXISTS election_group_wards;
DROP TABLE IF EXISTS election_group_polling_units;


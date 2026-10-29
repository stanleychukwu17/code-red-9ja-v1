-- +goose Up

-- ============================================================
-- ELECTION STATS TABLES
-- Most granular level — all rollups computed dynamically from here.
-- ============================================================

-- ============================================================
-- 1. election_group_polling_units
-- One row per (election_group_id, polling_unit_id).
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
CREATE INDEX idx_egpu_group_lga         ON election_group_polling_units(election_group_id, lga_id);
CREATE INDEX idx_egpu_group_state       ON election_group_polling_units(election_group_id, state_id);
CREATE INDEX idx_egpu_group_state_const ON election_group_polling_units(election_group_id, state_constituency_id);
CREATE INDEX idx_egpu_group_fed_const   ON election_group_polling_units(election_group_id, federal_constituency_id);
CREATE INDEX idx_egpu_group_senat       ON election_group_polling_units(election_group_id, senatorial_district_id);

-- +goose Down
DROP TABLE IF EXISTS election_group_polling_units;

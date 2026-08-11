-- -- +goose Up

-- -- ============================================================
-- -- ELECTION DAILY STATS
-- -- Periodic daily rollups for time-range filtering (start_date -> end_date)
-- -- across all geographic scopes (State, LGA, Ward, Polling Unit, Senatorial,
-- -- Federal Constituency, State Constituency).
-- -- Stores overall admin daily totals in outer scalar fields and per-party
-- -- daily breakdowns inside parties JSONB.
-- -- ============================================================

-- CREATE TABLE IF NOT EXISTS election_group_daily_stats (
--   id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

--   election_group_id         BIGINT    NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
--   stat_date                 DATE      NOT NULL, -- e.g. '2026-08-11'

--   -- Explicit Foreign Keys (denormalized geography matching election_stats schema)
--   state_id                  SMALLINT  REFERENCES c_states(id) ON DELETE SET NULL,
--   lga_id                    INT       REFERENCES lgas(id) ON DELETE SET NULL,
--   ward_id                   INT       REFERENCES wards(id) ON DELETE SET NULL,
--   polling_unit_id           INT       REFERENCES polling_units(id) ON DELETE SET NULL,
--   state_constituency_id     INT       REFERENCES state_assembly_constituencies(id) ON DELETE SET NULL,
--   federal_constituency_id   INT       REFERENCES federal_constituencies(id) ON DELETE SET NULL,
--   senatorial_district_id    INT       REFERENCES senatorial_districts(id) ON DELETE SET NULL,

--   -- Overall / Admin Daily Incremental Counts (Across all parties)
--   applications_count                     INT NOT NULL DEFAULT 0, -- Total applications submitted on this date
--   polling_agent_applications_count       INT NOT NULL DEFAULT 0, -- Polling agent applications submitted on this date
--   ward_supervisor_applications_count     INT NOT NULL DEFAULT 0, -- Ward supervisor applications submitted on this date
--   lga_supervisor_applications_count      INT NOT NULL DEFAULT 0, -- LGA supervisor applications submitted on this date
--   state_supervisor_applications_count    INT NOT NULL DEFAULT 0, -- State supervisor applications submitted on this date
--   accepted_applications_count            INT NOT NULL DEFAULT 0, -- Applications accepted/approved on this date
--   rejected_applications_count            INT NOT NULL DEFAULT 0, -- Applications rejected on this date
--   polling_agents_count                   INT NOT NULL DEFAULT 0, -- Polling agents confirmed/assigned on this date
--   ward_supervisors_count                 INT NOT NULL DEFAULT 0, -- Ward supervisors confirmed/assigned on this date
--   lga_supervisors_count                  INT NOT NULL DEFAULT 0, -- LGA supervisors confirmed/assigned on this date
--   state_supervisors_count                INT NOT NULL DEFAULT 0, -- State supervisors confirmed/assigned on this date

--   -- Per-Party Daily Breakdown. Array of objects:
--   -- [
--   --   {
--   --     "party_id": 1,
--   --     "applications_count": 50,
--   --     "polling_agent_applications_count": 40,
--   --     "ward_supervisor_applications_count": 5,
--   --     "lga_supervisor_applications_count": 3,
--   --     "state_supervisor_applications_count": 2,
--   --     "accepted_applications_count": 30,
--   --     "rejected_applications_count": 5,
--   --     "polling_agents_count": 25,
--   --     "ward_supervisors_count": 3,
--   --     "lga_supervisors_count": 2,
--   --     "state_supervisors_count": 1
--   --   }
--   -- ]
--   parties JSONB NOT NULL DEFAULT '[]'::jsonb,

--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Compound indexes for fast date-range queries per geographic scope
-- CREATE INDEX idx_egds_state  ON election_group_daily_stats (election_group_id, state_id, stat_date);
-- CREATE INDEX idx_egds_lga    ON election_group_daily_stats (election_group_id, lga_id, stat_date);
-- CREATE INDEX idx_egds_ward   ON election_group_daily_stats (election_group_id, ward_id, stat_date);
-- CREATE INDEX idx_egds_pu     ON election_group_daily_stats (election_group_id, polling_unit_id, stat_date);
-- CREATE INDEX idx_egds_sconst ON election_group_daily_stats (election_group_id, state_constituency_id, stat_date);
-- CREATE INDEX idx_egds_fconst ON election_group_daily_stats (election_group_id, federal_constituency_id, stat_date);
-- CREATE INDEX idx_egds_senate ON election_group_daily_stats (election_group_id, senatorial_district_id, stat_date);


-- -- ============================================================
-- -- COVERED COMPOSITE INDEXES ON party_applications & assignments
-- -- Enables high-performance exact timestamp (hour/minute) range filtering
-- -- across geographic scopes.
-- -- ============================================================

-- CREATE INDEX IF NOT EXISTS idx_pa_eg_state_party_created 
--   ON party_applications (election_group_id, state_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pa_eg_lga_party_created 
--   ON party_applications (election_group_id, lga_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pa_eg_ward_party_created 
--   ON party_applications (election_group_id, ward_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pua_eg_state_party_created 
--   ON polling_unit_assignments (election_group_id, state_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pua_eg_lga_party_created 
--   ON polling_unit_assignments (election_group_id, lga_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pua_eg_ward_party_created 
--   ON polling_unit_assignments (election_group_id, ward_id, party_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_pua_eg_pu_party_created 
--   ON polling_unit_assignments (election_group_id, polling_unit_id, party_id, created_at);


-- -- +goose Down
-- DROP INDEX IF EXISTS idx_pua_eg_pu_party_created;
-- DROP INDEX IF EXISTS idx_pua_eg_ward_party_created;
-- DROP INDEX IF EXISTS idx_pua_eg_lga_party_created;
-- DROP INDEX IF EXISTS idx_pua_eg_state_party_created;
-- DROP INDEX IF EXISTS idx_pa_eg_ward_party_created;
-- DROP INDEX IF EXISTS idx_pa_eg_lga_party_created;
-- DROP INDEX IF EXISTS idx_pa_eg_state_party_created;
-- DROP TABLE IF EXISTS election_group_daily_stats;

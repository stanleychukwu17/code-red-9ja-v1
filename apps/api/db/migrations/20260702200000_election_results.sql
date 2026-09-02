-- +goose Up

-- ============================================================
-- unmatched_polling_unit_results
-- Queue for results submitted without a matching polling_unit_id
-- ============================================================
CREATE TABLE IF NOT EXISTS unmatched_polling_unit_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Core context
  election_id              BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id        BIGINT   REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  submitted_by             BIGINT   REFERENCES users(id) ON DELETE SET NULL,
  party_id                 SMALLINT REFERENCES parties(id) ON DELETE SET NULL,

  -- Raw unmapped metadata provided by submitter / API
  raw_polling_unit_code    VARCHAR(100), -- e.g. "24/01/05/012"
  raw_polling_unit_name    VARCHAR(255), -- e.g. "Primary School Open Space"
  raw_ward_name            VARCHAR(255),
  raw_lga_name             VARCHAR(255),
  raw_state_name           VARCHAR(255),

  -- Optional partial geographic links
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,

  -- Vote counts & candidate breakdown
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Evidence files
  result_sheet_image_url   TEXT,
  result_sheet_video_url   TEXT,

  -- Admin Resolution Tracking
  resolution_status        VARCHAR(30) NOT NULL DEFAULT 'pending'
                           CHECK (resolution_status IN ('pending', 'resolved_mapped', 'resolved_created_pu', 'rejected')),
  resolution_notes         TEXT,
  resolved_polling_unit_id INTEGER  REFERENCES polling_units(id) ON DELETE SET NULL,
  resolved_result_id       BIGINT,  -- Links to polling_unit_results(id) once resolved
  resolved_by              BIGINT   REFERENCES users(id) ON DELETE SET NULL,
  resolved_at              TIMESTAMPTZ,

  created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_unmatched_pu_results_election_id ON unmatched_polling_unit_results(election_id);
CREATE INDEX idx_unmatched_pu_results_status ON unmatched_polling_unit_results(resolution_status);
CREATE INDEX idx_unmatched_pu_results_raw_code ON unmatched_polling_unit_results(raw_polling_unit_code);

-- ============================================================
-- polling_unit_results
-- One row per (election x polling_unit x party) for party-linked
-- submissions, and one row per (election x polling_unit x submitted_by)
-- for general citizen submissions (party_id IS NULL).
-- ============================================================
CREATE TABLE polling_unit_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Core relationships
  assignment_id            BIGINT   REFERENCES polling_unit_assignments(id) ON DELETE SET NULL,
  election_id              BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id        BIGINT   REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id          INTEGER  REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  submitted_by             BIGINT   REFERENCES users(id) ON DELETE SET NULL,
  party_id                 SMALLINT   REFERENCES parties(id) ON DELETE SET NULL,  -- NULL for general users

  -- Denormalized for fast geo-filtering (mirrors polling_unit_updates)
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,

  -- Aggregate vote counts
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Per-candidate breakdown: [{party_short_name, vote_count, agent_name, has_signature}]
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Evidence (exactly two URL slots)
  result_sheet_image_url   TEXT,   -- Gemini scans this to extract & verify data
  result_sheet_video_url   TEXT,   -- On-site video proof

  -- Gemini AI verification lifecycle
  status                   VARCHAR(30) NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted', 'ai_verified', 'confirmed', 'disputed', 'nullified')),
  -- Shape of ai_extracted_data:
  -- {
  --   "accredited_voters": 150,
  --   "votes_cast": 150,
  --   "valid_votes": 145,
  --   "rejected_votes": 5,
  --   "candidate_results": [
  --     {"party_short_name": "APC", "vote_count": 70, "agent_name": "John Doe", "has_signature": true},
  --     {"party_short_name": "PDP", "vote_count": 75, "agent_name": "Jane Smith", "has_signature": true}
  --   ]
  -- }
  ai_extracted_data        JSONB,           -- Raw data Gemini pulled from the image
  result_is_ai_generated   BOOLEAN DEFAULT FALSE, -- Flag indicating if Gemini suspects the result_sheet_image_url is AI-generated
  ai_confidence_score      NUMERIC(5, 4),   -- 0.0000 – 1.0000

  -- Manual override (platform admin)
  disputed_reason          TEXT,
  confirmed_at             TIMESTAMPTZ,
  confirmed_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,

  -- Community validation
  up_votes                 BIGINT[] NOT NULL DEFAULT '{}',   -- array of user IDs who upvoted
  down_votes               BIGINT[] NOT NULL DEFAULT '{}',   -- array of user IDs who downvoted

  -- Flags
  uploaded_by_inec         BOOLEAN  NOT NULL DEFAULT FALSE,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- One result per election per polling unit from a specific user
CREATE UNIQUE INDEX uq_result_submission ON polling_unit_results (election_id, polling_unit_id, submitted_by);

-- Indexes for common query patterns
CREATE INDEX idx_pu_results_election_group ON polling_unit_results(election_group_id);
CREATE INDEX idx_pu_results_pu             ON polling_unit_results(polling_unit_id);
CREATE INDEX idx_pu_results_party_group    ON polling_unit_results(party_id, election_group_id);
CREATE INDEX idx_pu_results_submitted_by   ON polling_unit_results(submitted_by);
CREATE INDEX idx_pu_results_location       ON polling_unit_results(state_id, lga_id, ward_id);
CREATE INDEX idx_pu_results_status         ON polling_unit_results(status);

-- ============================================================
-- election_polling_unit_final_results
-- Represents the consensus (or INEC/Admin overridden) final result
-- for a specific polling unit in an election.
-- ============================================================
CREATE TABLE election_polling_unit_final_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_id              BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id        BIGINT   REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id          INTEGER  REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,

  -- Denormalized for fast geo-filtering
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,

  -- The actual submission that was accepted as the final result
  polling_unit_result_id BIGINT   REFERENCES polling_unit_results(id) ON DELETE SET NULL,

  -- Final calculated values based on consensus
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count}]
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live   JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Confidence metrics
  matching_submissions_count INT     NOT NULL DEFAULT 1,
  total_submissions_count INT     NOT NULL DEFAULT 1,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- One final result per election per polling unit
CREATE UNIQUE INDEX uq_pu_final_result
  ON election_polling_unit_final_results (election_id, polling_unit_id);

CREATE INDEX idx_pu_final_results_election_group ON election_polling_unit_final_results(election_group_id);
CREATE INDEX idx_pu_final_results_pu ON election_polling_unit_final_results(polling_unit_id);
CREATE INDEX idx_pu_final_results_location ON election_polling_unit_final_results(state_id, lga_id, ward_id);
CREATE INDEX idx_pu_final_results_senatorial ON election_polling_unit_final_results(senatorial_district_id);
CREATE INDEX idx_pu_final_results_federal ON election_polling_unit_final_results(federal_constituency_id);
CREATE INDEX idx_pu_final_results_state_assembly ON election_polling_unit_final_results(state_constituency_id);
CREATE INDEX idx_pu_final_results_lga ON election_polling_unit_final_results(lga_id);
CREATE INDEX idx_pu_final_results_ward ON election_polling_unit_final_results(ward_id);


-- ============================================================
-- election_ward_final_result
-- ============================================================
CREATE TABLE election_ward_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  ward_id                     INT      REFERENCES wards(id) ON DELETE CASCADE NOT NULL,
  -- Denormalized for fast geo-filtering
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id     INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id       INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                      INT      REFERENCES lgas(id) ON DELETE SET NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  polling_units_counted       INTEGER  NOT NULL DEFAULT 0,
  total_polling_units         INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_ward_final_result_election_ward ON election_ward_final_result (election_id, ward_id);
CREATE INDEX idx_ward_final_result_ward ON election_ward_final_result(ward_id);
CREATE INDEX idx_ward_final_result_location ON election_ward_final_result(state_id, lga_id);
CREATE INDEX idx_ward_final_result_senatorial ON election_ward_final_result(senatorial_district_id);
CREATE INDEX idx_ward_final_result_federal ON election_ward_final_result(federal_constituency_id);
CREATE INDEX idx_ward_final_result_state_assembly ON election_ward_final_result(state_constituency_id);
CREATE INDEX idx_ward_final_result_lga ON election_ward_final_result(lga_id);

-- ============================================================
-- election_state_constituency_final_result
-- ============================================================
CREATE TABLE election_state_constituency_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  state_constituency_id       INT      REFERENCES state_constituencies(id) ON DELETE CASCADE NOT NULL,
  -- Denormalized for fast geo-filtering
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id     INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  lga_id                      INT      REFERENCES lgas(id) ON DELETE SET NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  wards_counted               INTEGER  NOT NULL DEFAULT 0,
  total_wards                 INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_sc_final_result_election_sc ON election_state_constituency_final_result (election_id, state_constituency_id);
CREATE INDEX idx_sc_final_result_sc ON election_state_constituency_final_result(state_constituency_id);
CREATE INDEX idx_sc_final_result_location ON election_state_constituency_final_result(state_id, lga_id);
CREATE INDEX idx_sc_final_result_senatorial ON election_state_constituency_final_result(senatorial_district_id);
CREATE INDEX idx_sc_final_result_federal ON election_state_constituency_final_result(federal_constituency_id);
CREATE INDEX idx_sc_final_result_lga ON election_state_constituency_final_result(lga_id);

-- ============================================================
-- election_lga_final_result
-- ============================================================
CREATE TABLE election_lga_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  lga_id                      INT      REFERENCES lgas(id) ON DELETE CASCADE NOT NULL,
  -- Denormalized for fast geo-filtering
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id     INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count, state_constituency_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  wards_counted               INTEGER  NOT NULL DEFAULT 0,
  total_wards                 INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_lga_final_result_election_lga ON election_lga_final_result (election_id, lga_id);
CREATE INDEX idx_lga_final_result_lga ON election_lga_final_result(lga_id);
CREATE INDEX idx_lga_final_result_state ON election_lga_final_result(state_id);
CREATE INDEX idx_lga_final_result_senatorial ON election_lga_final_result(senatorial_district_id);
CREATE INDEX idx_lga_final_result_federal ON election_lga_final_result(federal_constituency_id);

-- ============================================================
-- election_federal_constituency_final_result
-- ============================================================
CREATE TABLE election_federal_constituency_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  federal_constituency_id     INT      REFERENCES federal_constituencies(id) ON DELETE CASCADE NOT NULL,
  -- Denormalized for fast geo-filtering
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count, state_constituency_winning_count, lgas_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  lgas_counted                INTEGER  NOT NULL DEFAULT 0,
  total_lgas                  INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_fc_final_result_election_fc ON election_federal_constituency_final_result (election_id, federal_constituency_id);
CREATE INDEX idx_fc_final_result_fc ON election_federal_constituency_final_result(federal_constituency_id);
CREATE INDEX idx_fc_final_result_state ON election_federal_constituency_final_result(state_id);
CREATE INDEX idx_fc_final_result_senatorial ON election_federal_constituency_final_result(senatorial_district_id);

-- ============================================================
-- election_senatorial_district_final_result
-- ============================================================
CREATE TABLE election_senatorial_district_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  senatorial_district_id      INT      REFERENCES senatorial_districts(id) ON DELETE CASCADE NOT NULL,
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count, state_constituency_winning_count, lgas_winning_count, federal_constituencies_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  lgas_counted                INTEGER  NOT NULL DEFAULT 0,
  total_lgas                  INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_sd_final_result_election_sd ON election_senatorial_district_final_result (election_id, senatorial_district_id);
CREATE INDEX idx_sd_final_result_sd ON election_senatorial_district_final_result(senatorial_district_id);
CREATE INDEX idx_sd_final_result_state ON election_senatorial_district_final_result(state_id);

-- ============================================================
-- election_state_final_result
-- ============================================================
CREATE TABLE election_state_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  state_id                    SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count, state_constituency_winning_count, lgas_winning_count, federal_constituencies_winning_count, senatorial_districts_winning_count}]
  senatorial_districts_counted  INTEGER  NOT NULL DEFAULT 0,
  total_senatorial_districts    INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_state_final_result_election_state ON election_state_final_result (election_id, state_id);
CREATE INDEX idx_state_final_result_state ON election_state_final_result(state_id);

-- ============================================================
-- election_final_result
-- ============================================================
CREATE TABLE election_final_result (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id                 BIGINT   REFERENCES elections(id) ON DELETE CASCADE NOT NULL,

  accredited_voters           INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast                  INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes                 INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, polling_units_winning_count, wards_winning_count, state_constituency_winning_count, lgas_winning_count, federal_constituencies_winning_count, senatorial_districts_winning_count, states_winning_count}]
  candidate_results           JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live      JSONB    NOT NULL DEFAULT '[]'::jsonb,

  states_counted              INTEGER  NOT NULL DEFAULT 0,
  total_states                INTEGER  NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_election_final_result_election ON election_final_result (election_id);

-- +goose Down

DROP TABLE IF EXISTS election_final_result;
DROP TABLE IF EXISTS election_state_final_result;
DROP TABLE IF EXISTS election_federal_constituency_final_result;
DROP TABLE IF EXISTS election_senatorial_district_final_result;
DROP TABLE IF EXISTS election_lga_final_result;
DROP TABLE IF EXISTS election_state_constituency_final_result;
DROP TABLE IF EXISTS election_ward_final_result;
DROP TABLE IF EXISTS election_polling_unit_final_results;
DROP TABLE IF EXISTS unmatched_polling_unit_results;
DROP TABLE IF EXISTS polling_unit_results;

-- +goose Up

CREATE TABLE IF NOT EXISTS unmatched_polling_unit_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Core context
  election_id              INT      REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id        INT      REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
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

  -- Vote counts & ballot accounting (INEC Form EC 8A boxes #1-#8)
  registered_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (registered_voters >= 0),
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  ballot_papers_issued     INTEGER  NOT NULL DEFAULT 0 CHECK (ballot_papers_issued >= 0),
  unused_ballot_papers     INTEGER  NOT NULL DEFAULT 0 CHECK (unused_ballot_papers >= 0),
  spoiled_ballot_papers    INTEGER  NOT NULL DEFAULT 0 CHECK (spoiled_ballot_papers >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),
  used_ballot_papers       INTEGER  NOT NULL DEFAULT 0 CHECK (used_ballot_papers >= 0),
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Evidence & sheet certification
  result_sheet_image_url          TEXT,
  result_sheet_video_url          TEXT,
  serial_number                   VARCHAR(50),
  sheet_date                      DATE,
  presiding_officer_name          VARCHAR(255),
  has_presiding_officer_signature BOOLEAN NOT NULL DEFAULT FALSE,

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


CREATE TABLE polling_unit_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id            BIGINT     REFERENCES polling_unit_assignments(id) ON DELETE SET NULL,

  -- Core relationships
  election_group_id        INT        REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  party_id                 SMALLINT   REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  election_id              INT        REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id          INTEGER    REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,
  submitted_by             BIGINT     REFERENCES users(id) ON DELETE SET NULL,

  -- Denormalized for fast geo-filtering (mirrors polling_unit_updates)
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,

  -- Aggregate vote & ballot accounting (INEC Form EC 8A boxes #1-#8)
  registered_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (registered_voters >= 0),      -- #1 Voters on Register
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),      -- #2 Accredited Voters
  ballot_papers_issued     INTEGER  NOT NULL DEFAULT 0 CHECK (ballot_papers_issued >= 0),   -- #3 Ballot Papers Issued to PU
  unused_ballot_papers     INTEGER  NOT NULL DEFAULT 0 CHECK (unused_ballot_papers >= 0),   -- #4 Unused Ballot Papers
  spoiled_ballot_papers    INTEGER  NOT NULL DEFAULT 0 CHECK (spoiled_ballot_papers >= 0),  -- #5 Spoiled Ballot Papers
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),         -- #6 Rejected Ballots
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),            -- #7 Total Valid Votes
  used_ballot_papers       INTEGER  NOT NULL DEFAULT 0 CHECK (used_ballot_papers >= 0),     -- #8 Total Used Ballots (#5 + #6 + #7)
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),             -- Valid + Rejected (#6 + #7)
  -- Sheet authenticity & Presiding Officer certification
  serial_number                   VARCHAR(50),
  sheet_date                      DATE,
  presiding_officer_name          VARCHAR(255),
  has_presiding_officer_signature BOOLEAN  NOT NULL DEFAULT FALSE,


  -- Evidence (exactly two URL slots)
  result_sheet_image_url   TEXT,   -- Gemini scans this to extract & verify data
  result_sheet_video_url   TEXT,   -- On-site video proof

  -- Gemini AI verification lifecycle
  status                   VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'ai_verified', 'confirmed', 'disputed', 'nullified')),
  
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
  is_valid_result_sheet    BOOLEAN,                -- NULL while pending AI check; TRUE if valid EC8A sheet, FALSE if non-EC8A/invalid image
  result_is_ai_generated   BOOLEAN DEFAULT FALSE, -- Flag indicating if Gemini suspects the result_sheet_image_url is AI-generated
  ai_confidence_score      NUMERIC(5, 4),   -- 0.0000 – 1.0000

  -- Manual override (platform admin)
  dispute_codes            TEXT[] NOT NULL DEFAULT '{}',
  disputed_reason          TEXT,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- One result per election per polling unit from a specific user
CREATE UNIQUE INDEX uq_result_submission ON polling_unit_results (election_id, party_id, polling_unit_id, submitted_by);
CREATE INDEX idx_pu_results_assignment ON polling_unit_results (assignment_id);



CREATE TABLE IF NOT EXISTS polling_unit_result_scores (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  result_id         BIGINT      REFERENCES polling_unit_results(id) ON DELETE CASCADE NOT NULL,

  election_group_id INT         REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  election_id       INT         REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  party_short_name  VARCHAR(30) NOT NULL,
  party_id          SMALLINT    REFERENCES parties(id) ON DELETE SET NULL, -- Resolved from party_short_name when matched
  polling_unit_id   INTEGER     REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,

  vote_count        INTEGER     NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  agent_name        VARCHAR(255),
  has_signature     BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_pu_result_score_party ON polling_unit_result_scores (result_id, party_short_name);




CREATE TABLE election_polling_unit_final_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  election_group_id        INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  election_id              INT      REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  polling_unit_id          INTEGER  REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,

  -- Denormalized for fast geo-filtering
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,

  -- The actual submission that was accepted as the final result
  polling_unit_result_id BIGINT   REFERENCES polling_unit_results(id) ON DELETE SET NULL,

  -- Final calculated values based on consensus
  registered_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (registered_voters >= 0),
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  ballot_papers_issued     INTEGER  NOT NULL DEFAULT 0 CHECK (ballot_papers_issued >= 0),
  unused_ballot_papers     INTEGER  NOT NULL DEFAULT 0 CHECK (unused_ballot_papers >= 0),
  spoiled_ballot_papers    INTEGER  NOT NULL DEFAULT 0 CHECK (spoiled_ballot_papers >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),
  used_ballot_papers       INTEGER  NOT NULL DEFAULT 0 CHECK (used_ballot_papers >= 0),

  -- Final per-party breakdown: [{party_short_name, vote_count, vote_share}]
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,
  candidate_results_live   JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Confidence metrics
  matching_submissions_count INT     NOT NULL DEFAULT 1,
  total_submissions_count INT     NOT NULL DEFAULT 1,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- One final result per election per polling unit
CREATE UNIQUE INDEX uq_pu_final_result ON election_polling_unit_final_results (election_id, polling_unit_id);

-- ============================================================
-- collation_results
-- Supervisor-submitted INEC collation result sheets:
--   EC8B (Ward Collation), EC8C (LGA Collation), EC8D (State Collation).
-- Kept separate from polling_unit_results (EC8A) so aggregated collation
-- totals are never double-counted into bottom-up PU rollups, and can be
-- reconciled side-by-side against summed EC8A rollups in control-center.
-- ============================================================
CREATE TABLE IF NOT EXISTS collation_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Core relationships
  election_id              INT      REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id        INT      REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  submitted_by             BIGINT   REFERENCES users(id) ON DELETE SET NULL,
  party_id                 SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,

  -- Collation tier & supervisor role
  form_type                VARCHAR(10) NOT NULL
                           CHECK (form_type IN ('EC8B', 'EC8C', 'EC8D')),
  role_type                VARCHAR(50) NOT NULL
                           CHECK (role_type IN ('ward_election_supervisor', 'lga_election_supervisor', 'state_election_supervisor')),

  -- Geographic hierarchy (enforced per form_type below)
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE CASCADE NOT NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE CASCADE,
  ward_id                  INT      REFERENCES wards(id) ON DELETE CASCADE,

  -- Aggregate vote counts reported on the collation sheet
  registered_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (registered_voters >= 0),
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),

  -- Per-candidate breakdown: [{party_short_name, vote_count, vote_share, agent_name, has_signature}]
  candidate_results        JSONB    NOT NULL DEFAULT '[]'::jsonb,

  -- Evidence (result sheet photo + optional verification video)
  result_sheet_image_url   TEXT     NOT NULL,
  result_sheet_video_url   TEXT,

  -- Sheet authenticity & Collation Officer certification
  serial_number                   VARCHAR(50),
  sheet_date                      DATE,
  collation_officer_name          VARCHAR(255),
  has_collation_officer_signature BOOLEAN  NOT NULL DEFAULT FALSE,

  -- Gemini AI verification lifecycle
  status                   VARCHAR(30) NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted', 'ai_verified', 'confirmed', 'disputed', 'nullified')),
  ai_extracted_data        JSONB,
  is_valid_result_sheet    BOOLEAN,
  result_is_ai_generated   BOOLEAN DEFAULT FALSE,
  ai_confidence_score      NUMERIC(5, 4),

  -- Manual override / discrepancy resolution
  dispute_codes            TEXT[] NOT NULL DEFAULT '{}',
  disputed_reason          TEXT,

  created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Enforce geographic scope integrity per collation form tier
  CONSTRAINT chk_collation_scope CHECK (
    (form_type = 'EC8B' AND role_type = 'ward_election_supervisor'  AND ward_id IS NOT NULL AND lga_id IS NOT NULL) OR
    (form_type = 'EC8C' AND role_type = 'lga_election_supervisor'   AND lga_id IS NOT NULL  AND ward_id IS NULL) OR
    (form_type = 'EC8D' AND role_type = 'state_election_supervisor' AND lga_id IS NULL      AND ward_id IS NULL)
  )
);

-- One submission per supervisor per election per collation scope
CREATE UNIQUE INDEX uq_collation_ward_submission ON collation_results (election_id, ward_id, submitted_by) WHERE form_type = 'EC8B';
CREATE UNIQUE INDEX uq_collation_lga_submission ON collation_results (election_id, lga_id, submitted_by) WHERE form_type = 'EC8C';
CREATE UNIQUE INDEX uq_collation_state_submission ON collation_results (election_id, state_id, submitted_by) WHERE form_type = 'EC8D';



CREATE TABLE IF NOT EXISTS inec_polling_unit_results (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Core relationships (election_id / election_group_id are NULL when scraped standalone from INEC before a local election exists)
  election_group_id        INT      REFERENCES election_groups(id) ON DELETE CASCADE,
  election_id              INT      REFERENCES elections(id) ON DELETE CASCADE,
  inec_election_id         VARCHAR(100),
  polling_unit_id          INTEGER  REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,

  -- Denormalized for fast geo-filtering
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id   INT      REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id  INT      REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id    INT      REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id                   INT      REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                  INT      REFERENCES wards(id) ON DELETE SET NULL,

  -- Aggregate vote & ballot accounting (INEC Form EC 8A boxes #1-#8)
  registered_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (registered_voters >= 0),
  accredited_voters        INTEGER  NOT NULL DEFAULT 0 CHECK (accredited_voters >= 0),
  ballot_papers_issued     INTEGER  NOT NULL DEFAULT 0 CHECK (ballot_papers_issued >= 0),
  unused_ballot_papers     INTEGER  NOT NULL DEFAULT 0 CHECK (unused_ballot_papers >= 0),
  spoiled_ballot_papers    INTEGER  NOT NULL DEFAULT 0 CHECK (spoiled_ballot_papers >= 0),
  rejected_votes           INTEGER  NOT NULL DEFAULT 0 CHECK (rejected_votes >= 0),
  valid_votes              INTEGER  NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  used_ballot_papers       INTEGER  NOT NULL DEFAULT 0 CHECK (used_ballot_papers >= 0),
  votes_cast               INTEGER  NOT NULL DEFAULT 0 CHECK (votes_cast >= 0),

  -- Evidence & sheet certification
  result_sheet_image_url          TEXT,
  irev_document_url               TEXT,
  serial_number                   VARCHAR(50),
  sheet_date                      DATE,
  presiding_officer_name          VARCHAR(255),
  has_presiding_officer_signature BOOLEAN NOT NULL DEFAULT FALSE,

  -- Gemini AI verification lifecycle
  status                   VARCHAR(30) NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted', 'ai_verified', 'confirmed', 'disputed', 'nullified')),
  ai_extracted_data        JSONB,
  is_valid_result_sheet    BOOLEAN,
  result_is_ai_generated   BOOLEAN DEFAULT FALSE,
  ai_confidence_score      NUMERIC(5, 4),

  -- Manual override (platform admin)
  dispute_codes            TEXT[] NOT NULL DEFAULT '{}',
  disputed_reason          TEXT,

  created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX uq_inec_pu_result ON inec_polling_unit_results (election_id, polling_unit_id) WHERE election_id IS NOT NULL;
CREATE UNIQUE INDEX uq_inec_pu_result_standalone ON inec_polling_unit_results (inec_election_id, polling_unit_id) WHERE election_id IS NULL AND inec_election_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS inec_polling_unit_result_scores (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inec_result_id    BIGINT      REFERENCES inec_polling_unit_results(id) ON DELETE CASCADE NOT NULL,

  election_group_id INT         REFERENCES election_groups(id) ON DELETE CASCADE,
  election_id       INT         REFERENCES elections(id) ON DELETE CASCADE,
  party_short_name  VARCHAR(30) NOT NULL,
  party_id          SMALLINT    REFERENCES parties(id) ON DELETE SET NULL, -- Resolved from party_short_name when matched
  polling_unit_id   INTEGER     REFERENCES polling_units(id) ON DELETE CASCADE NOT NULL,

  vote_count        INTEGER     NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  agent_name        VARCHAR(255),
  has_signature     BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX uq_inec_pu_result_score_party ON inec_polling_unit_result_scores (inec_result_id, party_short_name);

-- +goose Down
DROP TABLE IF EXISTS inec_polling_unit_result_scores;
DROP TABLE IF EXISTS inec_polling_unit_results;
DROP TABLE IF EXISTS collation_results;
DROP TABLE IF EXISTS election_polling_unit_final_results;
DROP TABLE IF EXISTS unmatched_polling_unit_results;
DROP TABLE IF EXISTS polling_unit_result_scores;
DROP TABLE IF EXISTS polling_unit_results;

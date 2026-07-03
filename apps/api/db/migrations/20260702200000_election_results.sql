-- +goose Up

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
  submitted_by             BIGINT   REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  party_id                 BIGINT   REFERENCES parties(id) ON DELETE SET NULL,  -- NULL for general users

  -- Denormalized for fast geo-filtering (mirrors polling_unit_updates)
  state_id                 SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
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
  ai_extracted_data        JSONB,           -- Raw data Gemini pulled from the image
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

-- One result per election per polling unit from a specific party agent
CREATE UNIQUE INDEX uq_result_party_submission
  ON polling_unit_results (election_id, polling_unit_id, party_id)
  WHERE party_id IS NOT NULL;

-- One result per election per polling unit from a specific general user (no party affiliation)
CREATE UNIQUE INDEX uq_result_user_submission
  ON polling_unit_results (election_id, polling_unit_id, submitted_by)
  WHERE party_id IS NULL;

-- Indexes for common query patterns
CREATE INDEX idx_pu_results_election       ON polling_unit_results(election_id);
CREATE INDEX idx_pu_results_election_group ON polling_unit_results(election_group_id);
CREATE INDEX idx_pu_results_pu             ON polling_unit_results(polling_unit_id);
CREATE INDEX idx_pu_results_party_group    ON polling_unit_results(party_id, election_group_id);
CREATE INDEX idx_pu_results_submitted_by   ON polling_unit_results(submitted_by);
CREATE INDEX idx_pu_results_state          ON polling_unit_results(state_id);
CREATE INDEX idx_pu_results_lga            ON polling_unit_results(lga_id);
CREATE INDEX idx_pu_results_status         ON polling_unit_results(status);

-- ============================================================
-- Additions to existing tables
-- ============================================================

-- Track result-submission progress on each agent assignment
ALTER TABLE polling_unit_assignments
  ADD COLUMN results_submitted_count INT          NOT NULL DEFAULT 0,
  ADD COLUMN results_status          VARCHAR(30)  NOT NULL DEFAULT 'pending'
    CHECK (results_status IN ('pending', 'partial', 'complete'));

-- Add a lifecycle status to elections so the API knows when to accept result submissions
ALTER TABLE elections
  ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'ongoing', 'ended', 'cancelled'));


-- +goose Down
ALTER TABLE elections
  DROP COLUMN IF EXISTS status;

ALTER TABLE polling_unit_assignments
  DROP COLUMN IF EXISTS results_submitted_count,
  DROP COLUMN IF EXISTS results_status;

DROP TABLE IF EXISTS polling_unit_results;

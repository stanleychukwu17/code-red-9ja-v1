-- +goose Up

CREATE TABLE IF NOT EXISTS agent_earnings (
  id                           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id                     SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  election_group_id            BIGINT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  role_type                    VARCHAR(50) NOT NULL,

  -- The base payment for this role (kobo), snapshotted from party.agent_payment_allocation_kobo at calc time
  base_payment_kobo            BIGINT NOT NULL DEFAULT 0,

  -- Snapshot of earnings_allocation_* used for this calculation
  earnings_allocation          JSONB NOT NULL DEFAULT '{}',

  -- Per-factor achievement scores (0.00–100.00)
  readiness_score              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  results_score                NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (results_score BETWEEN 0 AND 100),
  updates_score                NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (updates_score BETWEEN 0 AND 100),
  attendance_score             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (attendance_score BETWEEN 0 AND 100),
  election_start_score         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (election_start_score BETWEEN 0 AND 100),
  election_end_score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (election_end_score BETWEEN 0 AND 100),
  live_voters_score            NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (live_voters_score BETWEEN 0 AND 100),

  -- Per-factor earnings (kobo)
  readiness_earned_kobo        BIGINT NOT NULL DEFAULT 0,
  results_earned_kobo          BIGINT NOT NULL DEFAULT 0,
  updates_earned_kobo          BIGINT NOT NULL DEFAULT 0,
  attendance_earned_kobo       BIGINT NOT NULL DEFAULT 0,
  election_start_earned_kobo   BIGINT NOT NULL DEFAULT 0,
  election_end_earned_kobo     BIGINT NOT NULL DEFAULT 0,
  live_voters_earned_kobo      BIGINT NOT NULL DEFAULT 0,

  -- Total computed earnings (kobo)
  total_earned_kobo            BIGINT NOT NULL DEFAULT 0,

  -- Admin payout workflow
  status  VARCHAR(20) NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'requested', 'approved', 'paid', 'disputed')),

  calculated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  requested_at   TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique per agent per election group and role
  UNIQUE (user_id, election_group_id, role_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_earnings_party_eg_id ON agent_earnings(party_id, election_group_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_eg ON agent_earnings(election_group_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_status ON agent_earnings(status);

-- +goose Down
DROP TABLE IF EXISTS agent_earnings;

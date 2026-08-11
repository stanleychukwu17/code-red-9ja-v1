-- +goose Up

CREATE TABLE IF NOT EXISTS user_practice_tests (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE SET NULL,
  role              VARCHAR(50) NOT NULL DEFAULT 'pollingagent',
  -- JSON array: [{attempt_number: 1, final_score: 85.0, task_stats: [{task_id: 1, score: 100, ...}], been_paid: false, completed_at: ...}]
  -- Scores are stored on a 0-100 scale. Divide by 10 for display purposes only.
  test_attempts     JSONB NOT NULL DEFAULT '[]',
  -- Highest or overall average score
  overall_score     NUMERIC(5, 2),
  status            VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed')),
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_user_practice_test UNIQUE(user_id, election_group_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_practice_tests_user_id ON user_practice_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_election_group ON user_practice_tests(election_group_id);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_status ON user_practice_tests(status);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_user_status ON user_practice_tests(user_id, status);

-- +goose Down
DROP TABLE IF EXISTS user_practice_tests;

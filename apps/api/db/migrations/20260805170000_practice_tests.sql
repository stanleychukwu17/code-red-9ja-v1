-- +goose Up

CREATE TABLE IF NOT EXISTS user_practice_tests (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE SET NULL,
  role              VARCHAR(50) NOT NULL DEFAULT 'pollingagent',
  sequence          SMALLINT NOT NULL DEFAULT 1,
  -- JSON array: [{task_id, score, failed_attempts, completed_at}]
  task_stats        JSONB NOT NULL DEFAULT '[]',
  final_score       NUMERIC(5, 2),
  status            VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed')),
  started_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_practice_tests_user_id ON user_practice_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_election_group ON user_practice_tests(election_group_id);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_status ON user_practice_tests(status);
CREATE INDEX IF NOT EXISTS idx_user_practice_tests_user_status ON user_practice_tests(user_id, status);

-- +goose Down
DROP TABLE IF EXISTS user_practice_tests;

-- +goose Up

-- 1. Create 1-to-1 table linking elections to INEC API results & statistics
CREATE TABLE IF NOT EXISTS inec_result_grabber (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  election_id BIGINT UNIQUE NOT NULL REFERENCES elections(id) ON DELETE CASCADE,

  name VARCHAR(255), -- name
  scope VARCHAR(50) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward
  election_date DATE NOT NULL,

  -- Bodies with complete results
  lgas_with_complete_results_count INT NOT NULL DEFAULT 0,
  wards_with_complete_results_count INT NOT NULL DEFAULT 0,

  -- Total uploaded results
  uploaded_results_count INT NOT NULL DEFAULT 0,

  -- Party Vote Totals [{ "party_code": "apc", "votes": 1500 }, ...]
  -- party_results JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Cron Sync Status
  sync_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed', 'paused')),
  sync_error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);



-- 2. Trigger Function to automatically create a 1-to-1 inec_result_grabber record upon election insertion
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION create_inec_result_grabber_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inec_result_grabber (election_group_id, election_id, name, scope, election_date)
  VALUES (NEW.election_group_id, NEW.id, NEW.name, NEW.scope, NEW.election_date)
  ON CONFLICT (election_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd



-- 3. Trigger on elections table
CREATE TRIGGER trg_create_inec_result_grabber
AFTER INSERT ON elections
FOR EACH ROW
EXECUTE FUNCTION create_inec_result_grabber_record();



-- 4. Create log table for tracking individual grabber execution runs
CREATE TABLE IF NOT EXISTS inec_result_grabber_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inec_result_grabber_id BIGINT REFERENCES inec_result_grabber(id) ON DELETE CASCADE NOT NULL,
  election_group_id BIGINT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  election_id BIGINT REFERENCES elections(id) ON DELETE CASCADE NOT NULL,

  results_collected_count INT NOT NULL DEFAULT 0,

  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed')),
  error_message TEXT,

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_inec_result_grabber_logs_grabber_id ON inec_result_grabber_logs(inec_result_grabber_id, id DESC);


-- +goose Down
DROP TRIGGER IF EXISTS trg_create_inec_result_grabber ON elections;
DROP FUNCTION IF EXISTS create_inec_result_grabber_record();
DROP TABLE IF EXISTS inec_result_grabber_logs;
DROP TABLE IF EXISTS inec_result_grabber;

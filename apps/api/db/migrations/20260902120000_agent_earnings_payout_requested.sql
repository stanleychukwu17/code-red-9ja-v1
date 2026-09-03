-- +goose Up
ALTER TABLE agent_earnings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- Drop existing status check constraint if it exists and recreate with 'requested'
-- +goose StatementBegin
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'agent_earnings' AND column_name = 'status'
  ) LOOP
    EXECUTE 'ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;
-- +goose StatementEnd

ALTER TABLE agent_earnings
  ADD CONSTRAINT chk_agent_earnings_status
  CHECK (status IN ('pending', 'requested', 'approved', 'paid', 'disputed'));

-- +goose Down
ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS chk_agent_earnings_status;
ALTER TABLE agent_earnings DROP COLUMN IF EXISTS requested_at;

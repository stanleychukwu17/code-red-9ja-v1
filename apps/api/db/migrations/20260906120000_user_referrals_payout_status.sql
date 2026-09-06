-- +goose Up
ALTER TABLE user_referrals 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- +goose StatementBegin
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_referrals' AND column_name = 'status'
  ) LOOP
    EXECUTE 'ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;
-- +goose StatementEnd

ALTER TABLE user_referrals
  ADD CONSTRAINT chk_user_referrals_status
  CHECK (status IN ('pending', 'requested', 'approved', 'paid', 'disputed'));

CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON user_referrals(status);

-- +goose Down
ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS chk_user_referrals_status;
DROP INDEX IF EXISTS idx_user_referrals_status;
ALTER TABLE user_referrals DROP COLUMN IF EXISTS paid_at;
ALTER TABLE user_referrals DROP COLUMN IF EXISTS approved_at;
ALTER TABLE user_referrals DROP COLUMN IF EXISTS requested_at;
ALTER TABLE user_referrals DROP COLUMN IF EXISTS status;

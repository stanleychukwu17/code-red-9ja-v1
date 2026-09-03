-- +goose Up
-- Timestamp when agent completed duties (all expected election results for their polling unit uploaded/submitted)
ALTER TABLE polling_unit_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
COMMENT ON COLUMN polling_unit_assignments.completed_at IS 'Timestamp when agent completed election day duties (all expected PU results submitted)';

-- Timestamp when supervisor completed duties (all expected PU final results in their jurisdiction uploaded/submitted)
ALTER TABLE state_election_supervisors ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
COMMENT ON COLUMN state_election_supervisors.completed_at IS 'Timestamp when state supervisor completed duties (all expected PU results in state submitted)';

ALTER TABLE lga_election_supervisors ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
COMMENT ON COLUMN lga_election_supervisors.completed_at IS 'Timestamp when LGA supervisor completed duties (all expected PU results in LGA submitted)';

ALTER TABLE ward_election_supervisors ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
COMMENT ON COLUMN ward_election_supervisors.completed_at IS 'Timestamp when ward supervisor completed duties (all expected PU results in ward submitted)';

-- +goose Down
ALTER TABLE polling_unit_assignments DROP COLUMN IF EXISTS completed_at;
ALTER TABLE state_election_supervisors DROP COLUMN IF EXISTS completed_at;
ALTER TABLE lga_election_supervisors DROP COLUMN IF EXISTS completed_at;
ALTER TABLE ward_election_supervisors DROP COLUMN IF EXISTS completed_at;

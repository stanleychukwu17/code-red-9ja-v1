-- +goose Up
-- Drop column results_expected_to_submit_count from polling_unit_assignments
-- as expected result counts are now sourced directly from election_group_polling_units.unique_final_results_expected.
ALTER TABLE polling_unit_assignments DROP COLUMN IF EXISTS results_expected_to_submit_count;

-- +goose Down
ALTER TABLE polling_unit_assignments ADD COLUMN IF EXISTS results_expected_to_submit_count INT NOT NULL DEFAULT 0;

-- Standardize system_settings supervisor keys to canonical Option 1 names:
-- ward_election_supervisor, lga_election_supervisor, state_election_supervisor

INSERT INTO system_settings (key, value, description)
SELECT 'earnings_allocation_ward_election_supervisor', value, 'Earnings allocation for ward election supervisors'
FROM system_settings WHERE key = 'earnings_allocation_ward_supervisor'
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
SELECT 'earnings_allocation_lga_election_supervisor', value, 'Earnings allocation for lga election supervisors'
FROM system_settings WHERE key = 'earnings_allocation_lga_supervisor'
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
SELECT 'earnings_allocation_state_election_supervisor', value, 'Earnings allocation for state election supervisors'
FROM system_settings WHERE key = 'earnings_allocation_state_supervisor'
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
SELECT 'test_requirements_ward_election_supervisor', value, 'Test requirements for ward election supervisors'
FROM system_settings WHERE key = 'test_requirements_ward_supervisor'
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
SELECT 'test_requirements_lga_election_supervisor', value, 'Test requirements for lga election supervisors'
FROM system_settings WHERE key = 'test_requirements_lga_supervisor'
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description)
SELECT 'test_requirements_state_election_supervisor', value, 'Test requirements for state election supervisors'
FROM system_settings WHERE key = 'test_requirements_state_supervisor'
ON CONFLICT (key) DO NOTHING;

-- +goose Up
CREATE TABLE offices (
  id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('elective', 'joint_ticket', 'legislative_presiding', 'executive_appointive')),
  election VARCHAR(255), -- presidential, governorship, senatorial, house_of_representatives, councilor, house_of_assembly, chairmanship (NULL for appointive)
  scope VARCHAR(100) NOT NULL, -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward
  rank INT NOT NULL,
  instances_count INT NOT NULL DEFAULT 0,
  inec_election_type_id VARCHAR(100),
  is_contested BOOLEAN NOT NULL DEFAULT true,
  parent_office_id SMALLINT REFERENCES offices(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  appointing_office_id SMALLINT REFERENCES offices(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default offices with explicit IDs
-- 1. Base contested elective offices
INSERT INTO offices (id, name, category, election, scope, rank, instances_count, inec_election_type_id, is_contested, parent_office_id, appointing_office_id)
OVERRIDING SYSTEM VALUE VALUES
(1,  'President',                       'elective', 'Presidential',             'nationwide',           1,  0, '5f129a04df41d910dcdc1d50', true, NULL, NULL),
(13, 'Governor',                        'elective', 'Governorship',             'state',                13, 0, '5f129a04df41d910dcdc1d51', true, NULL, NULL),
(21, 'Senator',                         'elective', 'Senatorial',               'senatorial-district',  21, 0, '5f129a04df41d910dcdc1d52', true, NULL, NULL),
(22, 'House of Representative Member',  'elective', 'House of Representatives', 'federal-constituency', 22, 0, '5f129a04df41d910dcdc1d53', true, NULL, NULL),
(23, 'State House of Assembly Member',  'elective', 'House of Assembly',        'state-constituency',   23, 0, '5f129a04df41d910dcdc1d54', true, NULL, NULL),
(24, 'Local Government Chairman',       'elective', 'Chairmanship',             'lga',                  24, 0, '5f129a04df41d910dcdc1d55', true, NULL, NULL),
(28, 'Councillor',                      'elective', 'Councillorship',           'ward',                 28, 0, '5f129a04df41d910dcdc1d56', true, NULL, NULL);

-- 2. Joint-ticket and legislative presiding offices
INSERT INTO offices (id, name, category, election, scope, rank, instances_count, inec_election_type_id, is_contested, parent_office_id, appointing_office_id)
OVERRIDING SYSTEM VALUE VALUES
(2,  'Vice President',                                'joint_ticket',          'Presidential',             'nationwide', 2,  0, NULL, false, 1,  NULL),
(3,  'Senate President',                              'legislative_presiding', 'Senatorial',               'nationwide', 3,  0, NULL, false, 21, NULL),
(4,  'Speaker of the House of Representatives',        'legislative_presiding', 'House of Representatives', 'nationwide', 4,  0, NULL, false, 22, NULL),
(5,  'Deputy Senate President',                       'legislative_presiding', 'Senatorial',               'nationwide', 5,  0, NULL, false, 21, NULL),
(6,  'Deputy Speaker of the House of Representatives', 'legislative_presiding', 'House of Representatives', 'nationwide', 6,  0, NULL, false, 22, NULL),
(14, 'Deputy Governor',                               'joint_ticket',          'Governorship',             'state',      14, 0, NULL, false, 13, NULL),
(15, 'Speaker of the State House of Assembly',         'legislative_presiding', 'House of Assembly',        'state',      15, 0, NULL, false, 23, NULL),
(16, 'Deputy Speaker of the State House of Assembly',  'legislative_presiding', 'House of Assembly',        'state',      16, 0, NULL, false, 23, NULL),
(25, 'Vice Chairman of Local Government',              'joint_ticket',          'Chairmanship',             'lga',        25, 0, NULL, false, 24, NULL);

-- 3. Executive appointive offices
INSERT INTO offices (id, name, category, election, scope, rank, instances_count, inec_election_type_id, is_contested, parent_office_id, appointing_office_id)
OVERRIDING SYSTEM VALUE VALUES
(7,  'Secretary to the Government of the Federation (SGF)', 'executive_appointive', NULL, 'nationwide', 7,  0, NULL, false, NULL, 1),
(8,  'Chief of Staff to the President',                     'executive_appointive', NULL, 'nationwide', 8,  0, NULL, false, NULL, 1),
(9,  'National Security Adviser (NSA)',                     'executive_appointive', NULL, 'nationwide', 9,  0, NULL, false, NULL, 1),
(10, 'Federal Minister',                                    'executive_appointive', NULL, 'nationwide', 10, 0, NULL, false, NULL, 1),
(11, 'Minister of State',                                   'executive_appointive', NULL, 'nationwide', 11, 0, NULL, false, NULL, 1),
(12, 'Special Adviser to the President',                    'executive_appointive', NULL, 'nationwide', 12, 0, NULL, false, NULL, 1),
(17, 'Secretary to the State Government (SSG)',             'executive_appointive', NULL, 'state',      17, 0, NULL, false, NULL, 13),
(18, 'Chief of Staff to the Governor',                      'executive_appointive', NULL, 'state',      18, 0, NULL, false, NULL, 13),
(19, 'State Commissioner',                                  'executive_appointive', NULL, 'state',      19, 0, NULL, false, NULL, 13),
(20, 'Special Adviser to the Governor',                     'executive_appointive', NULL, 'state',      20, 0, NULL, false, NULL, 13),
(26, 'Secretary to the Local Government (SLG)',             'executive_appointive', NULL, 'lga',        26, 0, NULL, false, NULL, 24),
(27, 'Supervisory Councillor',                              'executive_appointive', NULL, 'lga',        27, 0, NULL, false, NULL, 24);

-- Reset sequence for future auto-generated IDs
SELECT setval(pg_get_serial_sequence('offices', 'id'), (SELECT MAX(id) FROM offices));


-- +goose Down
DROP TABLE IF EXISTS offices;
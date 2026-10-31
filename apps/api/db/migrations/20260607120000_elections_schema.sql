-- +goose Up
-- ELECTION GROUPS TABLE
-- Umbrella container representing an entire election cycle/season (e.g. "2027 General Elections")
-- Holds high-level rollups for supervisor recruitment, agent coverage, and election day PU operations
CREATE TABLE election_groups (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,                                   -- Public-facing obfuscated identifier for clean URLs
  name VARCHAR(255) UNIQUE NOT NULL,                       -- Human-readable name (e.g. "2027 Nigerian General Elections")
  election_date DATE NOT NULL,                             -- Scheduled polling date for this group
  active BOOLEAN NOT NULL DEFAULT true,                    -- Whether this group is current and active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Election groups indexes
CREATE INDEX idx_election_groups_date ON election_groups(election_date DESC);           -- Quick date sorting
CREATE INDEX idx_election_groups_active_date ON election_groups(active, election_date DESC); -- Active cycle lookup

-- Automatically generate unique fake_id for election_groups if not provided
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_election_group_fake_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fake_id IS NULL THEN
    NEW.fake_id := (floor(random() * 900 + 100)::text || NEW.id::text || floor(random() * 900 + 100)::text)::bigint;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_set_election_group_fake_id
BEFORE INSERT ON election_groups
FOR EACH ROW
EXECUTE FUNCTION set_election_group_fake_id();

-- ELECTIONS TABLE
-- Individual contested election race (e.g. Presidential, Lagos Gubernatorial, Kano Central Senatorial)
CREATE TABLE elections (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,                                   -- Public-facing obfuscated identifier for clean URLs
  election_group_id INT REFERENCES election_groups(id) ON DELETE RESTRICT NOT NULL, -- Umbrella election cycle
  
  -- Geographic boundary targeting (populated according to scope; NULL if outside scope)
  state_id SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  senatorial_district_id INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,
  federal_constituency_id INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  state_constituency_id INT REFERENCES state_constituencies(id) ON DELETE SET NULL,
  lga_id INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  
  -- Office definition & race details
  office_id SMALLINT REFERENCES offices(id) ON DELETE RESTRICT NOT NULL, -- Contested office (e.g. President, Governor, Senator)
  name VARCHAR(255) NOT NULL,                              -- e.g. "2027 Presidential Election", "2027 Lagos State Gubernatorial Election"
  election_date DATE NOT NULL,                             -- Scheduled polling date
  scope VARCHAR(50) NOT NULL,                              -- nationwide, state, senatorial-district, federal-constituency, lga, state-constituency, ward

  -- Election day report and update rollups
  reports_count INT NOT NULL DEFAULT 0,                    -- Situation reports logged for this election
  updates_count INT NOT NULL DEFAULT 0,                    -- Real-time progress updates logged
  results_submitted_count INT NOT NULL DEFAULT 0,          -- Count of PU result forms processed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically generate unique fake_id for elections if not provided
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_election_fake_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fake_id IS NULL THEN
    NEW.fake_id := (floor(random() * 900 + 100)::text || NEW.id::text || floor(random() * 900 + 100)::text)::bigint;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_set_election_fake_id
BEFORE INSERT ON elections
FOR EACH ROW
EXECUTE FUNCTION set_election_fake_id();

-- Enable pg_trgm for fuzzy text search on election names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Elections table indexes
CREATE INDEX idx_elections_group_date_id ON elections(election_group_id, election_date DESC, id DESC); -- Group filtering with date-based cursor pagination
CREATE INDEX idx_elections_office_id ON elections(office_id);                                         -- Quick filter by contested office
CREATE INDEX idx_elections_election_date_id ON elections(election_date DESC, id DESC);               -- Timeline and status (upcoming/ongoing/ended) queries
CREATE INDEX idx_elections_state_id ON elections(state_id) WHERE state_id IS NOT NULL;               -- Partial index for state-scoped races
CREATE INDEX idx_elections_name_trgm ON elections USING gin (name gin_trgm_ops);                     -- Fast ILIKE / autocomplete search on election names

-- ELECTION CANDIDATES TABLE
-- Tracks fielded candidate tickets (principal candidate and optional running mate) per political party
CREATE TABLE election_candidates (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id INT REFERENCES elections(id) ON DELETE CASCADE NOT NULL,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  candidate_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,         -- Principal candidate
  running_mate_id BIGINT REFERENCES users(id) ON DELETE SET NULL,              -- Optional joint-ticket partner (e.g. Vice President, Deputy Governor)
  party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,        -- Fielded political party
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(election_group_id, candidate_id), -- A candidate can contest only one race per election group/cycle
  UNIQUE(election_id, party_id)            -- Each party can field only one candidate ticket per election race
);

-- Election candidates indexes
CREATE INDEX idx_election_candidates_candidate_id ON election_candidates(candidate_id);  -- Fast lookup of all races contested by a user
CREATE INDEX idx_election_candidates_party_id ON election_candidates(party_id);          -- Fast lookup of all candidates fielded by a party
-- Ensure a running mate cannot be nominated on multiple tickets within the same election group
CREATE UNIQUE INDEX uq_election_candidates_running_mate_group ON election_candidates (running_mate_id, election_group_id) WHERE running_mate_id IS NOT NULL;

-- +goose Down
DROP TRIGGER IF EXISTS trg_set_election_fake_id ON elections;
DROP FUNCTION IF EXISTS set_election_fake_id();
DROP TRIGGER IF EXISTS trg_set_election_group_fake_id ON election_groups;
DROP FUNCTION IF EXISTS set_election_group_fake_id();
DROP TABLE IF EXISTS election_candidates;
DROP TABLE IF EXISTS elections;
DROP TABLE IF EXISTS election_groups;

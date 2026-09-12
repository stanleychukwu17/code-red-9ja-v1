-- +goose Up


CREATE TABLE party_chapters (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_type VARCHAR(20) NOT NULL CHECK (chapter_type IN ('national', 'zonal', 'state', 'lga', 'ward')),
    country_id SMALLINT REFERENCES c_countries(id) ON DELETE CASCADE,
    zonal_id SMALLINT REFERENCES c_zones_nigeria(id) ON DELETE CASCADE,
    state_id SMALLINT REFERENCES c_states(id) ON DELETE CASCADE,
    lga_id INT REFERENCES lgas(id) ON DELETE CASCADE,
    ward_id INT REFERENCES wards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique indexes to strictly enforce one chapter per entity level per party
CREATE UNIQUE INDEX idx_party_chapter_national ON party_chapters (party_id, country_id) WHERE chapter_type = 'national';
CREATE UNIQUE INDEX idx_party_chapter_zonal ON party_chapters (party_id, zonal_id) WHERE chapter_type = 'zonal';
CREATE UNIQUE INDEX idx_party_chapter_state ON party_chapters (party_id, state_id) WHERE chapter_type = 'state';
CREATE UNIQUE INDEX idx_party_chapter_lga ON party_chapters (party_id, lga_id) WHERE chapter_type = 'lga';
CREATE UNIQUE INDEX idx_party_chapter_ward ON party_chapters (party_id, ward_id) WHERE chapter_type = 'ward';

-- Listing / lookup indexes
CREATE INDEX idx_party_chapters_party_type ON party_chapters (party_id, chapter_type);
CREATE INDEX idx_party_chapters_state_id ON party_chapters (party_id, state_id);
CREATE INDEX idx_party_chapters_lga_id ON party_chapters (party_id, lga_id);
CREATE INDEX idx_party_chapters_ward_id ON party_chapters (party_id, ward_id);

CREATE TABLE party_chapter_settings (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(party_id, chapter_id)
);

CREATE TABLE party_membership (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id INT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, party_id, chapter_id)
);

CREATE INDEX idx_party_membership_created_at ON party_membership(created_at);
CREATE INDEX idx_party_membership_party_chapter ON party_membership(party_id, chapter_id);
CREATE INDEX idx_party_membership_chapter_id ON party_membership(chapter_id);

CREATE TABLE party_membership_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for chapter admins to view/sort pending requests
CREATE INDEX idx_party_reqs_chapter_status_date ON party_membership_requests(party_id, chapter_id, status, created_at);
-- Index for quickly finding a user's specific request
CREATE INDEX idx_party_reqs_user_chapter ON party_membership_requests(user_id, party_id, chapter_id);
-- Prevent a user from having multiple 'pending' requests for the exact same chapter
CREATE UNIQUE INDEX idx_unique_pending_party_req ON party_membership_requests(user_id, party_id, chapter_id) WHERE status = 'pending';


CREATE TABLE party_membership_history (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('joined', 'left')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quickly retrieving a user's membership history in chronological order
CREATE INDEX idx_party_membership_history_user_date ON party_membership_history(user_id, created_at);

CREATE TABLE party_position_types (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    position_name VARCHAR(255)
);

CREATE TABLE party_custom_positions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    custom_position_name VARCHAR(255) NOT NULL,
    UNIQUE(party_id, custom_position_name)
);

-- Auto-provision National, Zonal, and State chapters on party creation
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION create_initial_party_chapters()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. National Chapter (Nigeria = country_id 161)
  INSERT INTO party_chapters (party_id, chapter_type, country_id)
  VALUES (NEW.id, 'national', 161)
  ON CONFLICT (party_id, country_id) WHERE chapter_type = 'national' DO NOTHING;

  -- 2. Zonal Chapters (6 geopolitical zones)
  INSERT INTO party_chapters (party_id, chapter_type, zonal_id)
  SELECT NEW.id, 'zonal', id
  FROM c_zones_nigeria
  ON CONFLICT (party_id, zonal_id) WHERE chapter_type = 'zonal' DO NOTHING;

  -- 3. State Chapters (37 states including FCT)
  INSERT INTO party_chapters (party_id, chapter_type, state_id)
  SELECT NEW.id, 'state', id
  FROM c_states
  WHERE country_id = 161
  ON CONFLICT (party_id, state_id) WHERE chapter_type = 'state' DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_create_party_top_chapters
AFTER INSERT ON parties
FOR EACH ROW
EXECUTE FUNCTION create_initial_party_chapters();

-- START backfill
-- One-time backfill: Provision National, Zonal, and State chapters for parties created prior to this migration
-- (since the trigger above only fires for newly created parties going forward).
INSERT INTO party_chapters (party_id, chapter_type, country_id)
SELECT id, 'national', 161 FROM parties
ON CONFLICT (party_id, country_id) WHERE chapter_type = 'national' DO NOTHING;

INSERT INTO party_chapters (party_id, chapter_type, zonal_id)
SELECT p.id, 'zonal', z.id FROM parties p CROSS JOIN c_zones_nigeria z
ON CONFLICT (party_id, zonal_id) WHERE chapter_type = 'zonal' DO NOTHING;

INSERT INTO party_chapters (party_id, chapter_type, state_id)
SELECT p.id, 'state', s.id FROM parties p CROSS JOIN c_states s
WHERE s.country_id = 161
ON CONFLICT (party_id, state_id) WHERE chapter_type = 'state' DO NOTHING;
-- END backfill

-- +goose Down
DROP TRIGGER IF EXISTS trg_create_party_top_chapters ON parties;
DROP FUNCTION IF EXISTS create_initial_party_chapters();
DROP TABLE IF EXISTS party_custom_positions;
DROP TABLE IF EXISTS party_position_types;
DROP TABLE IF EXISTS party_membership_history;
DROP TABLE IF EXISTS party_membership_requests;
DROP TABLE IF EXISTS party_membership;
DROP TABLE IF EXISTS party_chapter_settings;
DROP TABLE IF EXISTS party_chapters;

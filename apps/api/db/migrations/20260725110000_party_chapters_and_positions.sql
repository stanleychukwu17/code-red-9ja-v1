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

-- 1. Party Positions Catalog (Default pre-seeded positions + party custom positions)
CREATE TABLE party_positions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    position_type VARCHAR(20) NOT NULL DEFAULT 'default' CHECK (position_type IN ('default', 'custom')),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(100) NOT NULL,
    party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE,
    description TEXT,
    allowed_levels VARCHAR(20)[] NOT NULL DEFAULT ARRAY['national', 'zonal', 'state', 'lga', 'ward'],
    rank_order SMALLINT NOT NULL DEFAULT 100,
    max_occupants SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_party_positions_global_code ON party_positions (code) WHERE party_id IS NULL;
CREATE UNIQUE INDEX idx_party_positions_party_code ON party_positions (party_id, code) WHERE party_id IS NOT NULL;
CREATE INDEX idx_party_positions_party_id ON party_positions (party_id);
CREATE INDEX idx_party_positions_rank_order ON party_positions (rank_order ASC);
CREATE INDEX idx_party_positions_type ON party_positions (position_type);

-- 2. Party Position Assignments (Binds a member to a position within a chapter)
CREATE TABLE party_position_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    position_id INT NOT NULL REFERENCES party_positions(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_type VARCHAR(20) NOT NULL DEFAULT 'substantive' CHECK (appointment_type IN ('substantive', 'acting', 'caretaker', 'interim')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'vacated', 'past')),
    tenure_start DATE NOT NULL DEFAULT CURRENT_DATE,
    tenure_end DATE,
    appointed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate active assignment for the same position, chapter, and user
CREATE UNIQUE INDEX idx_unique_active_chapter_position_user ON party_position_assignments (chapter_id, position_id, user_id) WHERE status = 'active';
CREATE INDEX idx_pos_assign_chapter ON party_position_assignments (party_id, chapter_id, status);
CREATE INDEX idx_pos_assign_user ON party_position_assignments (user_id, status);
CREATE INDEX idx_pos_assign_position ON party_position_assignments (position_id);

-- 3. Pre-seed Default Party Positions
INSERT INTO party_positions (party_id, name, code, position_type, allowed_levels, rank_order, max_occupants) VALUES
(NULL, 'Chairman', 'chairman', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 1, 1),
(NULL, 'Deputy Chairman', 'deputy_chairman', 'default', ARRAY['national', 'state', 'lga'], 2, 2),
(NULL, 'Vice Chairman', 'vice_chairman', 'default', ARRAY['zonal', 'ward'], 3, 1),
(NULL, 'Secretary', 'secretary', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 4, 1),
(NULL, 'Deputy Secretary', 'deputy_secretary', 'default', ARRAY['national', 'state'], 5, 1),
(NULL, 'Assistant Secretary', 'assistant_secretary', 'default', ARRAY['zonal', 'lga', 'ward'], 6, 1),
(NULL, 'Treasurer', 'treasurer', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 7, 1),
(NULL, 'Financial Secretary', 'financial_secretary', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 8, 1),
(NULL, 'Organizing Secretary', 'organizing_secretary', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 9, 1),
(NULL, 'Publicity Secretary', 'publicity_secretary', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 10, 1),
(NULL, 'Legal Adviser', 'legal_adviser', 'default', ARRAY['national', 'zonal', 'state', 'lga'], 11, 1),
(NULL, 'Auditor', 'auditor', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 12, 1),
(NULL, 'Women Leader', 'women_leader', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 13, 1),
(NULL, 'Youth Leader', 'youth_leader', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 14, 1),
(NULL, 'Welfare Secretary', 'welfare_secretary', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 15, 1),
(NULL, 'Ex-Officio Member', 'ex_officio', 'default', ARRAY['national', 'zonal', 'state', 'lga', 'ward'], 16, 5);

-- 4. Helper Function to Format Display Title with Geographic Context & Appointment Type
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION format_position_display_title(
    p_chapter_type VARCHAR,
    p_geo_name VARCHAR,
    p_position_name VARCHAR,
    p_appointment_type VARCHAR DEFAULT 'substantive'
) RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR := '';
    v_title VARCHAR := '';
BEGIN
    IF p_appointment_type = 'acting' THEN
        v_prefix := 'Acting ';
    ELSIF p_appointment_type = 'caretaker' THEN
        v_prefix := 'Caretaker ';
    ELSIF p_appointment_type = 'interim' THEN
        v_prefix := 'Interim ';
    END IF;

    IF p_chapter_type = 'national' THEN
        v_title := 'National ' || p_position_name;
    ELSIF p_chapter_type = 'zonal' THEN
        v_title := COALESCE(p_geo_name || ' Zonal ', '') || p_position_name;
    ELSIF p_chapter_type = 'state' THEN
        v_title := COALESCE(p_geo_name || ' State ', '') || p_position_name;
    ELSIF p_chapter_type = 'lga' THEN
        v_title := COALESCE(p_geo_name || ' LGA ', '') || p_position_name;
    ELSIF p_chapter_type = 'ward' THEN
        v_title := COALESCE(p_geo_name || ' Ward ', '') || p_position_name;
    ELSE
        v_title := p_position_name;
    END IF;

    RETURN v_prefix || v_title;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
-- +goose StatementEnd

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
DROP FUNCTION IF EXISTS format_position_display_title(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP TRIGGER IF EXISTS trg_create_party_top_chapters ON parties;
DROP FUNCTION IF EXISTS create_initial_party_chapters();
DROP TABLE IF EXISTS party_position_assignments;
DROP TABLE IF EXISTS party_positions;
DROP TABLE IF EXISTS party_membership_history;
DROP TABLE IF EXISTS party_membership_requests;
DROP TABLE IF EXISTS party_membership;
DROP TABLE IF EXISTS party_chapter_settings;
DROP TABLE IF EXISTS party_chapters;

-- +goose Up


CREATE TABLE party_chapters (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_type VARCHAR(20) NOT NULL CHECK (chapter_type IN ('national', 'zonal', 'state', 'lga', 'ward', 'polling_unit')),
    country_id SMALLINT,
    zonal_id SMALLINT,
    state_id SMALLINT,
    lga_id SMALLINT,
    ward_id SMALLINT,
    polling_unit_id INT,
    UNIQUE(party_id, chapter_type, country_id, zonal_id, state_id, lga_id, ward_id, polling_unit_id)
);

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

-- CREATE TABLE party_nomination_positions (
--     id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
--     position_name VARCHAR(255) NOT NULL,
--     position_description TEXT,
--     is_active BOOLEAN NOT NULL DEFAULT true,
--     UNIQUE(party_id, position_name)
-- );

-- CREATE TABLE party_nomination_applications (
--     id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
--     nomination_position_id INT NOT NULL REFERENCES party_nomination_positions(id) ON DELETE CASCADE,
--     user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     status party_request_status_enum NOT NULL DEFAULT 'pending'
-- );

-- +goose Down
-- DROP TABLE IF EXISTS party_nomination_applications;
-- DROP TABLE IF EXISTS party_nomination_positions;
DROP TABLE IF EXISTS party_custom_positions;
DROP TABLE IF EXISTS party_position_types;
DROP TABLE IF EXISTS party_membership_requests;
DROP TABLE IF EXISTS party_members;
DROP TABLE IF EXISTS party_chapter_settings;
DROP TABLE IF EXISTS party_chapters;

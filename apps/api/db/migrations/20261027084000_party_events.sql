-- +goose Up

-- ============================================================================
-- PARTY EVENTS
-- Party assemblies, rallies, conventions, meetings, and grassroots mobilization
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('national', 'zonal', 'state', 'lga', 'ward')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'Meeting', -- 'Meeting', 'Convention', 'Rally', 'Workshop', etc.
    
    venue_name VARCHAR(255) NOT NULL DEFAULT '',
    location TEXT NOT NULL,
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    virtual_url VARCHAR(500),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
    
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_party_events_chapter_tier ON party_events (party_id, chapter_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_party_events_upcoming ON party_events (party_id, starts_at ASC) WHERE status = 'upcoming';

-- +goose Down
DROP TABLE IF EXISTS party_events;

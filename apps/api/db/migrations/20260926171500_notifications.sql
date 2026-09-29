-- +goose Up

-- ============================================================================
-- 1. USER NOTIFICATIONS (Personal In-App Alerts & Grouped Rollups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE,

    category VARCHAR(50) NOT NULL, -- controlled dynamically at API/service level
    type VARCHAR(100) NOT NULL,    -- e.g. 'post_comment', 'new_follower', 'agent_payout'
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Optional grouping for rollups (e.g. 'post:123:comment')
    group_key VARCHAR(150),
    actor_count INT NOT NULL DEFAULT 1,
    
    -- Dynamic event payload & deep links (e.g. action_url, post_id, etc. all in metadata)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast unread queries for the notification bell badge & list
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON notifications(recipient_user_id, id DESC) 
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_all 
    ON notifications(recipient_user_id, id DESC);

-- Prevents duplicate unread notification rows for the same event group
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_group_unread 
    ON notifications(recipient_user_id, group_key) 
    WHERE read_at IS NULL AND group_key IS NOT NULL;


-- ============================================================================
-- 2. PARTY NOTIFICATIONS (Shared Secretariat & Official Chapter Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Scoping: NULL = national / all party staff, or scoped to a specific chapter
    chapter_id INT REFERENCES party_chapters(id) ON DELETE CASCADE,
    
    -- Optional role filtering: e.g. NULL (all positions), 'executive', 'operations', 'ict'
    target_category VARCHAR(50), 
    
    category VARCHAR(50) NOT NULL, -- controlled dynamically at API/service level
    type VARCHAR(100) NOT NULL,    -- e.g. 'new_agent_application', 'new_member_joined', 'pu_result_flagged'
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    group_key VARCHAR(150),
    event_count INT NOT NULL DEFAULT 1,
    
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_notifications_lookup 
    ON party_notifications(party_id, chapter_id, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_party_notifications_group 
    ON party_notifications(party_id, COALESCE(chapter_id, 0), group_key) 
    WHERE group_key IS NOT NULL;


-- ============================================================================
-- 3. PARTY NOTIFICATION READS (Per-user read tracking for shared party alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_notification_reads (
    party_notification_id BIGINT NOT NULL REFERENCES party_notifications(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (party_notification_id, user_id)
);


-- ============================================================================
-- 4. USER NOTIFICATION PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    
    category_preferences JSONB NOT NULL DEFAULT '{
        "social": true,
        "election": true,
        "party": true,
        "wallet": true,
        "system": true
    }'::jsonb,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- +goose Down
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS party_notification_reads;
DROP TABLE IF EXISTS party_notifications;
DROP TABLE IF EXISTS notifications;

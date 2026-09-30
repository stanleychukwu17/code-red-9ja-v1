-- +goose Up

-- ============================================================================
-- 1. USER FOLLOWS (User <-> User Social Graph)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_follows (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id),
    CONSTRAINT uq_user_follows_pair UNIQUE (follower_id, following_id)
);

-- Fast lookup of a user's followers and follower counts (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id 
    ON user_follows(following_id);


-- ============================================================================
-- 2. PARTY FOLLOWS (User -> Party / Chapter Subscription)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_follows (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    chapter_id INT NOT NULL REFERENCES party_chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_party_follows_user_party_chapter UNIQUE (user_id, party_id, chapter_id)
);

-- Fast lookup of party/chapter followers and follower counts
CREATE INDEX IF NOT EXISTS idx_party_follows_party_chapter 
    ON party_follows (party_id, chapter_id);


-- +goose Down
DROP TABLE IF EXISTS party_follows;
DROP TABLE IF EXISTS user_follows;

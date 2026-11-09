-- +goose Up

-- ============================================================================
-- 1. FEED POSTS
-- Unified social communications table for campaign groups, parties, chapters, and community spaces.
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- Author identity
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Polymorphic Container: WHERE does this post live?
  -- e.g. 'campaign_group', 'party', 'user_wall'
  target_type VARCHAR(32) NOT NULL,
  target_id BIGINT NOT NULL,

  -- Category/Type of communication
  -- 'standard', 'broadcast', 'announcement', 'directive', 'rally_alert'
  post_type VARCHAR(32) NOT NULL DEFAULT 'standard',

  -- Access control level
  -- 'public' (everyone), 'followers' (party followers), 'members' (group operatives)
  visibility VARCHAR(32) NOT NULL DEFAULT 'public',

  -- Post content
  content TEXT NOT NULL,
  
  -- Operational and presentation flags
  has_media BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE, -- disables new comments

  -- Fast denormalized counters for instant sub-millisecond feed reads
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,

  -- Extensible JSON metadata for embedded election references, polls, location coordinates, rich link cards
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup composite indexes for container timelines and cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_feed_posts_container 
  ON feed_posts(target_type, target_id, is_pinned DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author 
  ON feed_posts(author_id, id DESC);


-- ============================================================================
-- 2. FEED POST MEDIA
-- Attachments (photos, videos, audio/voice notes, documents) with stored dimensions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_post_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  file_id BIGINT REFERENCES files(id) ON DELETE SET NULL,

  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document')),
  url VARCHAR(2000) NOT NULL,
  thumbnail_url VARCHAR(2000),

  -- Storing dimensions prevents Cumulative Layout Shift (CLS) on Web & Mobile
  width INT,
  height INT,
  duration_seconds INT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_post_media_post 
  ON feed_post_media(post_id, sort_order ASC);


-- ============================================================================
-- 3. FEED POST LIKES / REACTIONS
-- Tracks user post reactions. Primary key prevents duplicate likes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_post_likes (
  post_id BIGINT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_post_likes_user 
  ON feed_post_likes(user_id);


-- ============================================================================
-- 4. FEED POST COMMENTS
-- Supports 2-tier discussion (root comments + replies via parent_id).
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_post_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  parent_id BIGINT REFERENCES feed_post_comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for root comments
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_post_root 
  ON feed_post_comments(post_id, id ASC) WHERE parent_id IS NULL;

-- Fast lookup for nested comment replies
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_parent 
  ON feed_post_comments(parent_id, id ASC) WHERE parent_id IS NOT NULL;


-- ============================================================================
-- 5. FEED POST COMMENT LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_post_comment_likes (
  comment_id BIGINT NOT NULL REFERENCES feed_post_comments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (comment_id, user_id)
);


-- ============================================================================
-- 6. TRIGGERS FOR ATOMIC COUNTERS
-- Ensures likes_count and comments_count are guaranteed in sync without race conditions.
-- ============================================================================

-- Function & Trigger: Feed Post Likes Count
CREATE OR REPLACE FUNCTION update_feed_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feed_post_likes_count
AFTER INSERT OR DELETE ON feed_post_likes
FOR EACH ROW EXECUTE FUNCTION update_feed_post_likes_count();

-- Function & Trigger: Feed Post Comments Count
CREATE OR REPLACE FUNCTION update_feed_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feed_post_comments_count
AFTER INSERT OR DELETE ON feed_post_comments
FOR EACH ROW EXECUTE FUNCTION update_feed_post_comments_count();

-- Function & Trigger: Feed Post Comment Likes Count
CREATE OR REPLACE FUNCTION update_feed_post_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_post_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feed_post_comment_likes_count
AFTER INSERT OR DELETE ON feed_post_comment_likes
FOR EACH ROW EXECUTE FUNCTION update_feed_post_comment_likes_count();


-- +goose Down
DROP TRIGGER IF EXISTS trg_feed_post_comment_likes_count ON feed_post_comment_likes;
DROP FUNCTION IF EXISTS update_feed_post_comment_likes_count();

DROP TRIGGER IF EXISTS trg_feed_post_comments_count ON feed_post_comments;
DROP FUNCTION IF EXISTS update_feed_post_comments_count();

DROP TRIGGER IF EXISTS trg_feed_post_likes_count ON feed_post_likes;
DROP FUNCTION IF EXISTS update_feed_post_likes_count();

DROP TABLE IF EXISTS feed_post_comment_likes;
DROP TABLE IF EXISTS feed_post_comments;
DROP TABLE IF EXISTS feed_post_likes;
DROP TABLE IF EXISTS feed_post_media;
DROP TABLE IF EXISTS feed_posts;

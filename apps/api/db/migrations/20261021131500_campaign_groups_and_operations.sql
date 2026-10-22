-- +goose Up

-- 1. CAMPAIGN GROUPS
-- Represents tiered situation and campaign coordination groups for political parties in an election group.
-- Hierarchy: National -> State -> LGA -> Ward
CREATE TABLE IF NOT EXISTS campaign_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,

  scope VARCHAR(32) NOT NULL, -- 'national', 'state', 'lga', 'ward'

  -- Geographic boundary scopes
  state_id INT REFERENCES c_states(id) ON DELETE CASCADE,
  lga_id INT REFERENCES lgas(id) ON DELETE CASCADE,
  ward_id INT REFERENCES wards(id) ON DELETE CASCADE,

  -- Custom display name (e.g., "Team Peter-Obi Epe Command Center"); if NULL, dynamic fallback is rendered
  name VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'archived'
  officials_added BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT uq_campaign_group_territory UNIQUE NULLS NOT DISTINCT (party_id, election_group_id, scope, state_id, lga_id, ward_id)
);


-- 2. CAMPAIGN GROUP MEMBERS
-- Tracks users enrolled in a campaign group with their operational assignment role.
CREATE TABLE IF NOT EXISTS campaign_group_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE NOT NULL,
  group_id BIGINT REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(32) NOT NULL, -- 'candidate', 'state_supervisor', 'lga_supervisor', 'ward_supervisor', 'agent', 'party_official'
  can_broadcast BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT uq_campaign_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_group_members_user_cycle 
ON campaign_group_members(user_id, election_group_id, party_id);


-- 3. CAMPAIGN TIMELINE POSTS
-- Internal campaign social feed for announcements, community updates, instructions, and rally news.
CREATE TABLE IF NOT EXISTS campaign_timeline_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  author_id BIGINT REFERENCES users(id) ON DELETE RESTRICT NOT NULL,

  content TEXT NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT FALSE,

  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,

  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_timeline_posts_group_id ON campaign_timeline_posts(group_id, id DESC);


-- 4. CAMPAIGN GROUP MESSAGES ("Talks")
-- Real-time team and agent chat discussion room.
CREATE TABLE IF NOT EXISTS campaign_group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id BIGINT REFERENCES users(id) ON DELETE RESTRICT NOT NULL,

  content TEXT NOT NULL,
  has_media BOOLEAN NOT NULL DEFAULT FALSE,

  reply_to_message_id BIGINT REFERENCES campaign_group_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_group_messages_group_id ON campaign_group_messages(group_id, id DESC);


-- 5. CAMPAIGN GROUP ISSUES ("Challenges")
-- Dedicated problem and incident management board for polling unit agents, supervisors, and candidates.
CREATE TABLE IF NOT EXISTS campaign_group_issues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  reporter_id BIGINT REFERENCES users(id) ON DELETE RESTRICT NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(64) NOT NULL, -- 'materials', 'bvas_failure', 'violence', 'turnout', 'logistics', 'other'
  priority VARCHAR(16) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'urgent', 'critical'

  has_media BOOLEAN NOT NULL DEFAULT FALSE,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,

  status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'in_progress', 'resolved'
  resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  upvotes_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- 6. CAMPAIGN GROUP MEDIA
-- Normalized media asset storage for timeline posts, talks messages, and reported issues.
CREATE TABLE IF NOT EXISTS campaign_group_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT REFERENCES campaign_groups(id) ON DELETE CASCADE NOT NULL,
  uploader_id BIGINT REFERENCES users(id) ON DELETE RESTRICT NOT NULL,

  entity_type VARCHAR(32) NOT NULL, -- 'timeline_post', 'message', 'issue'
  entity_id BIGINT NOT NULL,

  file_id BIGINT REFERENCES files(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  media_type VARCHAR(16) NOT NULL, -- 'image', 'video', 'document', 'audio'
  file_size_bytes BIGINT,
  mime_type VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- +goose Down
DROP TABLE IF EXISTS campaign_group_media;
DROP TABLE IF EXISTS campaign_group_issues;
DROP TABLE IF EXISTS campaign_group_messages;
DROP TABLE IF EXISTS campaign_timeline_posts;
DROP TABLE IF EXISTS campaign_group_members;
DROP TABLE IF EXISTS campaign_groups;

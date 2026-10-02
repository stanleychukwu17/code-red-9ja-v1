-- +goose Up

-- 1. USER-TO-USER BLOCKS
-- Represents personal blocks between users (e.g. chat, posts, profile visibility).
CREATE TABLE IF NOT EXISTS user_blocks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blocker_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT uq_user_blocker_blocked UNIQUE (blocker_id, blocked_user_id),
  CONSTRAINT chk_user_cannot_block_self CHECK (blocker_id <> blocked_user_id)
);

-- Enables fast index-only scans for feed/chat filtering (e.g. checking who blocked the current user)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_blocker ON user_blocks(blocked_user_id, blocker_id);


-- 2. PARTY-TO-USER BLOCKS
-- Represents organizational bans/blocks by a political party.
CREATE TABLE IF NOT EXISTS party_user_blocks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Audit trail: which party official/admin initiated this action
  blocked_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT uq_party_blocked_user UNIQUE (party_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_party_user_blocks_blocked_party ON party_user_blocks(blocked_user_id, party_id);
CREATE INDEX IF NOT EXISTS idx_party_user_blocks_party_id_id_desc ON party_user_blocks (party_id, id DESC);

-- +goose Down
DROP TABLE IF EXISTS party_user_blocks;
DROP TABLE IF EXISTS user_blocks;
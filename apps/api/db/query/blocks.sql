-- ========================================================
-- USER BLOCKS
-- ========================================================

-- name: BlockUser :one
INSERT INTO user_blocks (
  blocker_id,
  blocked_user_id,
  created_at
) VALUES (
  $1, $2, NOW()
)
ON CONFLICT (blocker_id, blocked_user_id) DO UPDATE
SET created_at = EXCLUDED.created_at
RETURNING id, blocker_id, blocked_user_id, created_at;

-- name: UnblockUser :exec
DELETE FROM user_blocks
WHERE blocker_id = $1 AND blocked_user_id = $2;

-- name: UnblockUserByID :exec
DELETE FROM user_blocks
WHERE id = $1 AND blocker_id = $2;

-- name: IsUserBlocked :one
-- Checks if blocker_id has blocked blocked_user_id
SELECT EXISTS (
  SELECT 1 FROM user_blocks
  WHERE blocker_id = $1 AND blocked_user_id = $2
) AS is_blocked;

-- name: IsUserBlockedBidirectional :one
-- Useful for chat/DMs/feed: true if either user has blocked the other
SELECT EXISTS (
  SELECT 1 FROM user_blocks
  WHERE (blocker_id = $1 AND blocked_user_id = $2)
     OR (blocker_id = $2 AND blocked_user_id = $1)
) AS is_blocked;

-- name: ListBlockedUsersByUser :many
SELECT
  ub.id,
  ub.blocker_id,
  ub.blocked_user_id,
  ub.created_at,
  u.username,
  u.first_name,
  u.last_name,
  u.avatar
FROM user_blocks ub
JOIN users u ON u.id = ub.blocked_user_id
WHERE ub.blocker_id = $1
ORDER BY ub.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetBlockedUserIDsForUser :many
-- Helper for filtering feeds / search results
SELECT blocked_user_id
FROM user_blocks
WHERE blocker_id = $1;


-- ========================================================
-- PARTY USER BLOCKS
-- ========================================================

-- name: BlockUserByParty :one
INSERT INTO party_user_blocks (
  party_id,
  blocked_user_id,
  blocked_by_user_id,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, NOW(), NOW()
)
ON CONFLICT (party_id, blocked_user_id) DO UPDATE
SET
  blocked_by_user_id = EXCLUDED.blocked_by_user_id,
  updated_at = NOW()
RETURNING id, party_id, blocked_user_id, blocked_by_user_id, created_at, updated_at;

-- name: UnblockUserByParty :exec
DELETE FROM party_user_blocks
WHERE party_id = $1 AND blocked_user_id = $2;

-- name: UnblockUserByPartyBlockID :exec
DELETE FROM party_user_blocks
WHERE id = $1 AND party_id = $2;

-- name: IsUserBlockedByParty :one
SELECT EXISTS (
  SELECT 1 FROM party_user_blocks
  WHERE party_id = $1 AND blocked_user_id = $2
) AS is_blocked;

-- name: ListBlockedUsersByParty :many
SELECT
  pub.id,
  pub.party_id,
  pub.blocked_user_id,
  pub.blocked_by_user_id,
  pub.created_at,
  pub.updated_at,
  u.username AS blocked_username,
  u.first_name AS blocked_first_name,
  u.last_name AS blocked_last_name,
  u.avatar AS blocked_avatar,
  admin.username AS admin_username
FROM party_user_blocks pub
JOIN users u ON u.id = pub.blocked_user_id
LEFT JOIN users admin ON admin.id = pub.blocked_by_user_id
WHERE pub.party_id = $1
ORDER BY pub.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetBlockedPartyIDsForUser :many
SELECT party_id
FROM party_user_blocks
WHERE blocked_user_id = $1;

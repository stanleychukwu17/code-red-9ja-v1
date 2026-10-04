-- name: FollowUser :exec
INSERT INTO user_follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- name: UnfollowUser :exec
DELETE FROM user_follows
WHERE follower_id = $1 AND following_id = $2;

-- name: FollowParty :execrows
INSERT INTO party_follows (user_id, party_id, chapter_id)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, party_id, chapter_id) DO NOTHING;

-- name: UnfollowParty :exec
DELETE FROM party_follows
WHERE user_id = $1 AND party_id = $2 AND chapter_id = $3;

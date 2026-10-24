-- name: FindOrCreateCampaignGroup :one
INSERT INTO campaign_groups (
  party_id,
  target_election_group_id,
  scope,
  state_id,
  lga_id,
  ward_id,
  name,
  status
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, 'active'
)
ON CONFLICT (party_id, scope, state_id, lga_id, ward_id)
DO UPDATE SET 
  target_election_group_id = COALESCE(EXCLUDED.target_election_group_id, campaign_groups.target_election_group_id),
  updated_at = NOW()
RETURNING *;

-- name: GetCampaignGroupByID :one
SELECT * FROM campaign_groups WHERE id = $1;

-- name: AddCampaignGroupMember :one
INSERT INTO campaign_group_members (
  party_id,
  election_group_id,
  group_id,
  user_id,
  role,
  can_broadcast
)
VALUES (
  $1, $2, $3, $4, $5, $6
)
ON CONFLICT (group_id, user_id)
DO UPDATE SET
  role = CASE 
    WHEN campaign_group_members.role = 'candidate' THEN 'candidate'
    ELSE EXCLUDED.role
  END,
  can_broadcast = EXCLUDED.can_broadcast OR campaign_group_members.can_broadcast,
  party_id = EXCLUDED.party_id,
  election_group_id = COALESCE(EXCLUDED.election_group_id, campaign_group_members.election_group_id)
RETURNING *;

-- name: RemoveCampaignGroupMember :exec
DELETE FROM campaign_group_members
WHERE group_id = $1 AND user_id = $2;

-- name: RemoveCampaignGroupMembersByElectionGroup :many
DELETE FROM campaign_group_members
WHERE party_id = $1 AND election_group_id = $2 AND user_id = $3
RETURNING group_id;

-- name: MarkCampaignGroupOfficialsAdded :exec
UPDATE campaign_groups
SET officials_added = TRUE, updated_at = NOW()
WHERE id = $1;

-- name: ListCampaignGroupMembers :many
SELECT 
    m.id,
    m.party_id,
    m.election_group_id,
    m.group_id,
    m.user_id,
    m.role,
    m.can_broadcast,
    m.joined_at,
    u.fake_id,
    u.first_name,
    u.last_name,
    u.username,
    u.avatar
FROM campaign_group_members m
JOIN users u ON u.id = m.user_id
WHERE m.group_id = $1
ORDER BY 
    CASE m.role
        WHEN 'candidate' THEN 1
        WHEN 'party_official' THEN 2
        WHEN 'state_supervisor' THEN 3
        WHEN 'lga_supervisor' THEN 4
        WHEN 'ward_supervisor' THEN 5
        WHEN 'agent' THEN 6
        ELSE 7
    END ASC,
    m.joined_at ASC;

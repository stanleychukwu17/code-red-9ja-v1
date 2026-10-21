-- name: FindOrCreateCampaignGroup :one
INSERT INTO campaign_groups (
  party_id,
  election_group_id,
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
ON CONFLICT (party_id, election_group_id, scope, state_id, lga_id, ward_id)
DO UPDATE SET updated_at = NOW()
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
  role = EXCLUDED.role,
  can_broadcast = EXCLUDED.can_broadcast,
  party_id = EXCLUDED.party_id,
  election_group_id = EXCLUDED.election_group_id
RETURNING *;

-- name: RemoveCampaignGroupMember :exec
DELETE FROM campaign_group_members
WHERE group_id = $1 AND user_id = $2;

-- name: RemoveCampaignGroupMemberByRole :exec
DELETE FROM campaign_group_members
WHERE group_id = $1 AND user_id = $2 AND role = $3;

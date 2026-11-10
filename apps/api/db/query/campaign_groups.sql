-- name: FindOrCreateCampaignGroup :one
INSERT INTO campaign_groups (
  party_id,
  target_election_group_id,
  scope,
  state_id,
  lga_id,
  ward_id,
  status
)
VALUES (
  $1, $2, $3, $4, $5, $6, 'active'
)
ON CONFLICT (party_id, scope, state_id, lga_id, ward_id)
DO UPDATE SET 
  target_election_group_id = COALESCE(EXCLUDED.target_election_group_id, campaign_groups.target_election_group_id),
  updated_at = NOW()
RETURNING *;

-- name: GetCampaignGroupByID :one
SELECT 
    cg.id,
    cg.party_id,
    cg.target_election_group_id,
    cg.scope,
    cg.state_id,
    cg.lga_id,
    cg.ward_id,
    cg.status,
    cg.officials_added,
    cg.created_at,
    cg.updated_at,
    s.name AS state_name,
    l.name AS lga_name,
    w.name AS ward_name
FROM campaign_groups cg
LEFT JOIN c_states s ON s.id = cg.state_id
LEFT JOIN lgas l ON l.id = cg.lga_id
LEFT JOIN wards w ON w.id = cg.ward_id
WHERE cg.id = $1;

-- name: CheckUserInCampaignGroup :one
SELECT EXISTS (
  SELECT 1 FROM campaign_group_members
  WHERE group_id = $1 AND user_id = $2
);

-- name: CheckUserInPartyCampaignGroup :one
SELECT EXISTS (
  SELECT 1 FROM campaign_group_members
  WHERE party_id = $1 AND user_id = $2
);

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

-- name: RemoveAgentCampaignGroupMembers :many
DELETE FROM campaign_group_members
WHERE party_id = $1 
  AND user_id = $2
  AND role != 'candidate'
RETURNING group_id;

-- name: RemoveCampaignGroupMembersByElectionGroupExcept :many
DELETE FROM campaign_group_members
WHERE party_id = $1 
  AND user_id = $2 
  AND group_id != $3
  AND role != 'candidate'
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
        WHEN 'state_election_supervisor' THEN 3
        WHEN 'state_supervisor' THEN 3
        WHEN 'lga_election_supervisor' THEN 4
        WHEN 'lga_supervisor' THEN 4
        WHEN 'ward_election_supervisor' THEN 5
        WHEN 'ward_supervisor' THEN 5
        WHEN 'polling_agent' THEN 6
        WHEN 'agent' THEN 6
        ELSE 7
    END ASC,
    m.joined_at ASC;

-- name: ListCampaignGroupOfficials :many
SELECT user_id FROM campaign_group_members
WHERE group_id = $1 AND role = 'party_official';

-- name: GetCampaignGroupIDByTerritory :one
SELECT id FROM campaign_groups
WHERE party_id = $1
  AND scope = $2
  AND state_id IS NOT DISTINCT FROM $3
  AND lga_id IS NOT DISTINCT FROM $4
  AND ward_id IS NOT DISTINCT FROM $5
LIMIT 1;

-- name: GetCampaignGroupNationalStats :many
SELECT 
    cgm.role, 
    COUNT(*)::bigint AS count
FROM campaign_group_members cgm
WHERE cgm.party_id = $1
GROUP BY cgm.role;

-- name: GetCampaignGroupStateStats :many
SELECT 
    cgm.role, 
    COUNT(*)::bigint AS count
FROM campaign_group_members cgm
JOIN campaign_groups cg ON cg.id = cgm.group_id
WHERE cg.party_id = $1 AND cg.state_id = $2
GROUP BY cgm.role;

-- name: GetCampaignGroupLGAStats :many
SELECT 
    cgm.role, 
    COUNT(*)::bigint AS count
FROM campaign_group_members cgm
JOIN campaign_groups cg ON cg.id = cgm.group_id
WHERE cg.party_id = $1 AND cg.lga_id = $2
GROUP BY cgm.role;

-- name: GetCampaignGroupWardStats :many
SELECT 
    cgm.role, 
    COUNT(*)::bigint AS count
FROM campaign_group_members cgm
JOIN campaign_groups cg ON cg.id = cgm.group_id
WHERE cg.party_id = $1 AND cg.ward_id = $2
GROUP BY cgm.role;

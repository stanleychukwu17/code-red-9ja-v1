-- name: CreateParty :one
INSERT INTO parties (short_name, name, logo, logo_file_id, display_order, color_hex, dark_color_hex, cover_image, cover_image_file_id, cover_position_y, date_founded)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetPartyByID :one
SELECT * FROM parties WHERE id = $1;

-- name: GetPartyBasicInfo :one
SELECT id, short_name, name, logo, is_verified, color_hex, dark_color_hex FROM parties WHERE id = $1 LIMIT 1;

-- name: ListParties :many
SELECT 
  id,
  short_name,
  name,
  logo,
  logo_file_id,
  cover_image,
  cover_image_file_id,
  cover_position_y,
  display_order,
  status,
  slots,
  is_verified,
  color_hex,
  dark_color_hex,
  date_founded,
  created_at,
  updated_at
FROM parties
WHERE status = 'active'
ORDER BY display_order ASC, name ASC;

-- name: GetAcceptingPartyIDs :many
SELECT id FROM parties
WHERE status = 'active'
  AND slots > 0
  AND agent_payment_balance_kobo > 0
  AND agent_acquisition_targets IS NOT NULL 
  AND agent_acquisition_targets != '{}'::jsonb
  AND agent_payment_allocation_kobo IS NOT NULL 
  AND agent_payment_allocation_kobo != '{}'::jsonb
  AND agent_payment_balance_kobo >= COALESCE(
    (
      SELECT MAX((value->>'default')::bigint)
      FROM jsonb_each(agent_payment_allocation_kobo)
      WHERE value->>'default' IS NOT NULL
    ), 0
  );

-- name: IsPartyAcceptingApplications :one
SELECT EXISTS (
  SELECT 1 FROM parties
  WHERE id = $1
    AND status = 'active'
    AND slots > 0
    AND agent_payment_balance_kobo > 0
    AND agent_acquisition_targets IS NOT NULL 
    AND agent_acquisition_targets != '{}'::jsonb
    AND agent_payment_allocation_kobo IS NOT NULL 
    AND agent_payment_allocation_kobo != '{}'::jsonb
    AND agent_payment_balance_kobo >= COALESCE(
      (
        SELECT MAX((value->>'default')::bigint)
        FROM jsonb_each(agent_payment_allocation_kobo)
        WHERE value->>'default' IS NOT NULL
      ), 0
    )
) AS is_accepting;

-- name: ListAcceptingParties :many
SELECT 
  id, short_name, name, logo, display_order, status, slots, is_verified,
  discount_percentage, agent_payment_balance_kobo, agent_payment_allocation_kobo, agent_acquisition_targets,
  color_hex, dark_color_hex,
  created_at, updated_at
FROM parties
WHERE 
  -- Ensure targets are set
  agent_acquisition_targets IS NOT NULL 
  AND agent_acquisition_targets != '{}'::jsonb
  
  -- Ensure allocation is set
  AND agent_payment_allocation_kobo IS NOT NULL 
  AND agent_payment_allocation_kobo != '{}'::jsonb
  
  -- Ensure balance is sufficient
  AND agent_payment_balance_kobo > 0
  AND agent_payment_balance_kobo >= COALESCE(
    (
      SELECT MAX((value->>'default')::bigint)
      FROM jsonb_each(agent_payment_allocation_kobo)
      WHERE value->>'default' IS NOT NULL
    ), 0
  )
ORDER BY display_order ASC, name ASC;

-- name: UpdateParty :one
UPDATE parties
SET short_name = $1, name = $2, logo = $3, logo_file_id = $4, display_order = $5, color_hex = $6, dark_color_hex = $7,
    cover_image = $8, cover_image_file_id = $9, cover_position_y = $10, date_founded = $11, updated_at = NOW()
WHERE id = $12
RETURNING *;

-- name: DeleteParty :exec
UPDATE parties SET status = 'deleted' WHERE id = $1;

-- name: DeletePartyMembership :many
DELETE FROM party_membership WHERE user_id = $1 AND party_id = $2 RETURNING chapter_id;

-- name: AddPartyMemberMilestone :exec
INSERT INTO party_member_milestones (user_id, party_id, chapter_id, milestone_type, metadata)
VALUES ($1, $2, $3, $4, $5);

-- name: GetNationalChapter :one
SELECT id FROM party_chapters 
WHERE party_id = $1 AND chapter_type = 'national' AND country_id = $2 LIMIT 1;

-- name: CreateNationalChapter :one
INSERT INTO party_chapters (party_id, chapter_type, country_id)
VALUES ($1, 'national', $2)
RETURNING id;

-- name: GetPartyChapterByID :one
SELECT * FROM party_chapters
WHERE id = $1 LIMIT 1;

-- name: GetOrCreateNationalChapter :one
INSERT INTO party_chapters (party_id, chapter_type, country_id)
VALUES ($1, 'national', $2)
ON CONFLICT (party_id, country_id) WHERE chapter_type = 'national'
DO UPDATE SET party_id = EXCLUDED.party_id
RETURNING id;

-- name: GetOrCreateZonalChapter :one
INSERT INTO party_chapters (party_id, chapter_type, zonal_id)
VALUES ($1, 'zonal', $2)
ON CONFLICT (party_id, zonal_id) WHERE chapter_type = 'zonal'
DO UPDATE SET party_id = EXCLUDED.party_id
RETURNING id;

-- name: GetOrCreateStateChapter :one
INSERT INTO party_chapters (party_id, chapter_type, state_id)
VALUES ($1, 'state', $2)
ON CONFLICT (party_id, state_id) WHERE chapter_type = 'state'
DO UPDATE SET party_id = EXCLUDED.party_id
RETURNING id;

-- name: GetOrCreateLGAChapter :one
INSERT INTO party_chapters (party_id, chapter_type, state_id, lga_id)
SELECT $1, 'lga', l.state_id, l.id
FROM lgas l WHERE l.id = $2
ON CONFLICT (party_id, lga_id) WHERE chapter_type = 'lga'
DO UPDATE SET party_id = EXCLUDED.party_id
RETURNING id;

-- name: GetOrCreateWardChapter :one
INSERT INTO party_chapters (party_id, chapter_type, state_id, lga_id, ward_id)
SELECT $1, 'ward', w.state_id, w.lga_id, w.id
FROM wards w WHERE w.id = $2
ON CONFLICT (party_id, ward_id) WHERE chapter_type = 'ward'
DO UPDATE SET party_id = EXCLUDED.party_id
RETURNING id;

-- name: GetStateChapter :one
SELECT id FROM party_chapters
WHERE party_id = $1 AND chapter_type = 'state' AND state_id = $2 LIMIT 1;

-- name: GetZonalChapter :one
SELECT id FROM party_chapters
WHERE party_id = $1 AND chapter_type = 'zonal' AND zonal_id = $2 LIMIT 1;

-- name: GetLGAChapter :one
SELECT id FROM party_chapters
WHERE party_id = $1 AND chapter_type = 'lga' AND lga_id = $2 LIMIT 1;

-- name: GetWardChapter :one
SELECT id FROM party_chapters
WHERE party_id = $1 AND chapter_type = 'ward' AND ward_id = $2 LIMIT 1;

-- name: ListPartyChapters :many
SELECT * FROM party_chapters
WHERE party_id = $1 
  AND (sqlc.narg('chapter_type')::varchar IS NULL OR chapter_type = sqlc.narg('chapter_type'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
ORDER BY id ASC;

-- name: AddPartyMembership :exec
INSERT INTO party_membership (user_id, party_id, chapter_id, status)
VALUES ($1, $2, $3, 'active');
-- name: GetChapterMemberCount :one
SELECT COUNT(*) FROM party_membership WHERE party_id = $1 AND chapter_id = $2 AND status = 'active';

-- name: ResetPartyLogo :exec
UPDATE parties
SET logo = '', logo_file_id = NULL, updated_at = NOW()
WHERE id = $1;
-- name: UpdatePartyAgentAcquisitionTargets :one
UPDATE parties
SET agent_acquisition_targets = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeductPartyAgentPaymentBalance :one
UPDATE parties
SET agent_payment_balance_kobo = agent_payment_balance_kobo - $1,
    updated_at = NOW()
WHERE id = $2 AND agent_payment_balance_kobo >= $1
RETURNING *;


-- name: GetPartySampleMemberAvatars :many
SELECT pm.party_id, u.id AS user_id, u.first_name, u.last_name, u.username, u.avatar
FROM party_membership pm
JOIN users u ON u.id = pm.user_id
WHERE pm.party_id = $1 
  AND pm.status = 'active' 
  AND u.avatar IS NOT NULL 
  AND u.avatar != ''
ORDER BY pm.id DESC
LIMIT 5;

-- name: GetOnePartyChapterOfficial :one
SELECT 
    pa.id AS assignment_id,
    pa.party_id,
    pa.chapter_id,
    pa.position_id,
    pa.user_id,
    pa.appointment_type,
    pa.status AS assignment_status,
    pa.tenure_start,
    pa.tenure_end,
    pos.name AS position_name,
    u.first_name,
    u.last_name,
    u.username,
    u.avatar
FROM party_position_assignments pa
JOIN party_positions pos ON pos.id = pa.position_id
JOIN users u ON u.id = pa.user_id
WHERE pa.chapter_id = $1 
  AND pa.position_id = $2 
  AND pa.status = 'active'
LIMIT 1;

-- name: CreatePartyMemberSuspension :one
INSERT INTO party_member_suspensions (
    party_id, user_id, suspended_by, reason, starts_at, ends_at, status
) VALUES (
    $1, $2, $3, $4, NOW(), NULL, 'active'
) RETURNING *;

-- name: GetActivePartyMemberSuspension :one
SELECT * FROM party_member_suspensions
WHERE party_id = $1 AND user_id = $2 AND status = 'active'
LIMIT 1;

-- name: SuspendPartyMembership :many
UPDATE party_membership
SET status = 'suspended'
WHERE party_id = $1 AND user_id = $2
RETURNING chapter_id;

-- name: VacateAllUserPositionsInParty :exec
UPDATE party_position_assignments
SET 
    status = 'vacated',
    tenure_end = CURRENT_DATE,
    updated_at = NOW()
WHERE party_id = $1 AND user_id = $2 AND status = 'active';

-- name: LiftPartyMemberSuspension :one
UPDATE party_member_suspensions
SET 
    status = 'lifted',
    lifted_at = NOW(),
    lifted_by = $3,
    lift_reason = $4,
    updated_at = NOW()
WHERE party_id = $1 AND user_id = $2 AND status = 'active'
RETURNING *;

-- name: ReactivatePartyMembership :many
UPDATE party_membership
SET status = 'active'
WHERE party_id = $1 AND user_id = $2
RETURNING chapter_id;


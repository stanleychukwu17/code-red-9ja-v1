-- name: CreateParty :one
INSERT INTO parties (short_name, name, logo, logo_file_id, display_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetPartyByID :one
SELECT * FROM parties WHERE id = $1;

-- name: GetPartyByShortName :one
SELECT * FROM parties WHERE short_name = $1;

-- name: GetPartyBasicInfo :one
SELECT id, short_name, name, logo, is_verified FROM parties WHERE id = $1 LIMIT 1;

-- name: ListParties :many
SELECT * FROM parties
WHERE status = 'active'
ORDER BY display_order ASC, name ASC;

-- name: ListAcceptingParties :many
SELECT 
  id, short_name, name, logo, display_order, status, slots, is_verified,
  discount_percentage, agent_payment_balance_kobo, agent_payment_allocation, agent_acquisition_targets,
  created_at, updated_at
FROM parties
WHERE 
  -- Ensure targets are set
  agent_acquisition_targets IS NOT NULL 
  AND agent_acquisition_targets != '{}'::jsonb
  
  -- Ensure allocation is set
  AND agent_payment_allocation IS NOT NULL 
  AND agent_payment_allocation != '{}'::jsonb
  
  -- Ensure balance is sufficient
  AND agent_payment_balance_kobo > 0
  AND agent_payment_balance_kobo >= COALESCE(
    (
      SELECT MAX((value->>'default')::bigint)
      FROM jsonb_each(agent_payment_allocation)
      WHERE value->>'default' IS NOT NULL
    ), 0
  )
ORDER BY display_order ASC, name ASC;

-- name: UpdateParty :one
UPDATE parties
SET short_name = $1, name = $2, logo = $3, logo_file_id = $4, display_order = $5, updated_at = NOW()
WHERE id = $6
RETURNING *;

-- name: DeleteParty :exec
UPDATE parties SET status = 'deleted' WHERE id = $1;

-- name: DeletePartyMembership :many
DELETE FROM party_membership WHERE user_id = $1 AND party_id = $2 RETURNING chapter_id;

-- name: RecordPartyMembershipHistory :exec
INSERT INTO party_membership_history (user_id, party_id, chapter_id, action)
VALUES ($1, $2, $3, $4);

-- name: GetNationalChapter :one
SELECT id FROM party_chapters 
WHERE party_id = $1 AND chapter_type = 'national' AND country_id = $2 LIMIT 1;

-- name: CreateNationalChapter :one
INSERT INTO party_chapters (party_id, chapter_type, country_id)
VALUES ($1, 'national', $2)
RETURNING id;

-- name: AddPartyMembership :exec
INSERT INTO party_membership (user_id, party_id, chapter_id, status)
VALUES ($1, $2, $3, 'active');

-- name: GetChapterSettings :one
SELECT settings FROM party_chapter_settings
WHERE party_id = $1 AND chapter_id = $2 LIMIT 1;

-- name: CreateChapterSettings :one
INSERT INTO party_chapter_settings (party_id, chapter_id, settings)
VALUES ($1, $2, $3)
RETURNING settings;

-- name: GetChapterMemberCount :one
SELECT COUNT(*) FROM party_membership WHERE chapter_id = $1 AND status = 'active';

-- name: AddPartyMembershipRequest :one
INSERT INTO party_membership_requests (user_id, party_id, chapter_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ResetPartyLogo :exec
UPDATE parties
SET logo = '', logo_file_id = NULL, updated_at = NOW()
WHERE id = $1;
-- name: UpdatePartyAgentAcquisitionTargets :one
UPDATE parties
SET agent_acquisition_targets = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

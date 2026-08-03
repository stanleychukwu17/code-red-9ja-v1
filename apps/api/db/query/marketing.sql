-- name: GetPlans :many
-- Pass empty string '' to skip a filter.
-- $1 = type filter ('' = all types), $2 = is_active filter ('' = all, 'true'/'false' to filter)
SELECT * FROM plans
WHERE ($1::text = '' OR type::text = $1::text)
  AND ($2::text = '' OR is_active = ($2::text = 'true'))
ORDER BY display_order ASC, price ASC;

-- name: GetMarketingPlansByType :many
SELECT * FROM plans
WHERE is_active = true AND type = $1
ORDER BY display_order ASC, price ASC;

-- name: UpdatePlanDisplayOrder :one
UPDATE plans
SET display_order = $2,
    updated_at    = NOW()
WHERE id = $1
RETURNING *;

-- name: GetPlanByID :one
SELECT * FROM plans 
WHERE id = $1;

-- name: CreatePlan :one
INSERT INTO plans (name, description, price, type, features, scopes_recommendation, color_hex)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdatePlan :one
UPDATE plans
SET
    name                 = $2,
    description          = $3,
    price                = $4,
    type                 = $5,
    features             = $6,
    scopes_recommendation = $7,
    color_hex            = $8,
    is_active            = $9,
    updated_at           = NOW()
WHERE id = $1
RETURNING *;

-- name: DeletePlan :exec
DELETE FROM plans WHERE id = $1;

-- name: CreatePartyMarketingCampaign :one
INSERT INTO party_marketing_campaigns (
    party_id,
    election_group_id,
    election_id,
    plan_id,
    type,
    states,
    duration_in_days,
    budget,
    amount_spent,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: GetPartyMarketingCampaigns :many
SELECT pmc.*, p.name as plan_name, p.price as plan_price, p.color_hex as plan_color
FROM party_marketing_campaigns pmc
JOIN plans p ON pmc.plan_id = p.id
WHERE pmc.party_id = $1
ORDER BY pmc.created_at DESC;

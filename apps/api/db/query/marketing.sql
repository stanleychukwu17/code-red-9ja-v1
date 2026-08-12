-- name: GetPlans :many
-- Pass empty string '' to skip a filter.
-- $1 = type filter ('' = all types), $2 = is_active filter ('' = all, 'true'/'false' to filter)
SELECT * FROM plans
WHERE ($1::text = '' OR type::text = $1::text)
  AND ($2::text = '' OR is_active = ($2::text = 'true'))
ORDER BY display_order ASC, price_kobo ASC;

-- name: GetMarketingPlansByType :many
SELECT * FROM plans
WHERE is_active = true AND type = $1
ORDER BY display_order ASC, price_kobo ASC;

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
INSERT INTO plans (name, description, price_kobo, type, features, scopes_recommendation, color_hex)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdatePlan :one
UPDATE plans
SET
    name                 = $2,
    description          = $3,
    price_kobo           = $4,
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
    start_date,
    end_date,
    budget_per_day_kobo,
    budget_kobo,
    referral_amount_kobo,
    amount_spent_kobo,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + ($7::int * interval '1 day'), $8, $9, $10, $11, $12
)
RETURNING *;

-- name: GetPartyMarketingCampaigns :many
SELECT 
    pmc.*, 
    p.name AS plan_name, 
    p.price_kobo AS plan_price_kobo, 
    p.color_hex AS plan_color,
    eg.name AS election_group_name,
    e.name AS election_name
FROM party_marketing_campaigns pmc
JOIN plans p ON pmc.plan_id = p.id
JOIN election_groups eg ON pmc.election_group_id = eg.id
JOIN elections e ON pmc.election_id = e.id
WHERE pmc.party_id = $1
ORDER BY pmc.created_at DESC;

-- name: ListAllPartyMarketingCampaigns :many
SELECT 
    pmc.id,
    pmc.party_id,
    pmc.election_group_id,
    pmc.election_id,
    pmc.plan_id,
    pmc.type,
    pmc.states,
    pmc.duration_in_days,
    pmc.start_date,
    pmc.end_date,
    pmc.status,
    pmc.budget_per_day_kobo,
    pmc.budget_kobo,
    pmc.referral_amount_kobo,
    pmc.amount_spent_kobo,
    pmc.created_at,
    pmc.updated_at,
    pt.name AS party_name,
    pt.short_name AS party_short_name,
    pt.logo AS party_logo,
    p.name AS plan_name,
    p.description AS plan_description,
    p.price_kobo AS plan_price_kobo,
    p.color_hex AS plan_color_hex,
    eg.name AS election_group_name,
    e.name AS election_name
FROM party_marketing_campaigns pmc
JOIN parties pt ON pmc.party_id = pt.id
JOIN plans p ON pmc.plan_id = p.id
JOIN election_groups eg ON pmc.election_group_id = eg.id
JOIN elections e ON pmc.election_id = e.id
WHERE (sqlc.arg('party_id')::int = 0 OR pmc.party_id = sqlc.arg('party_id'))
  AND (sqlc.arg('election_group_id')::int = 0 OR pmc.election_group_id = sqlc.arg('election_group_id'))
  AND (sqlc.arg('status_filter')::text = '' OR pmc.status::text = sqlc.arg('status_filter'))
  AND (sqlc.arg('cursor')::int = 0 OR pmc.id < sqlc.arg('cursor'))
ORDER BY pmc.id DESC
LIMIT sqlc.arg('limit_val');

-- name: GetActiveMarketingCampaignForElectionGroup :one
-- Returns the active campaign (if any) for a party + election group where NOW() is within start/end dates.
SELECT * FROM party_marketing_campaigns
WHERE party_id = $1
  AND election_group_id = $2
  AND status = 'active'
  AND start_date IS NOT NULL
  AND end_date IS NOT NULL
  AND NOW() BETWEEN start_date AND end_date
LIMIT 1;

-- name: UpdateMarketingCampaignStatus :one
UPDATE party_marketing_campaigns
SET 
    status = sqlc.arg('status')::marketing_campaign_status,
    start_date = CASE WHEN sqlc.arg('status')::marketing_campaign_status = 'active'::marketing_campaign_status THEN NOW() ELSE start_date END,
    end_date = CASE WHEN sqlc.arg('status')::marketing_campaign_status = 'active'::marketing_campaign_status THEN NOW() + (duration_in_days::text || ' days')::interval ELSE end_date END,
    amount_spent_kobo = CASE WHEN sqlc.arg('status')::marketing_campaign_status = 'active'::marketing_campaign_status THEN amount_spent_kobo + budget_per_day_kobo ELSE amount_spent_kobo END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeletePartyMarketingCampaign :exec
DELETE FROM party_marketing_campaigns
WHERE id = $1;

-- name: ProcessDailyMarketingCampaignDeductions :many
-- Run once daily via cron to deduct budget_per_day_kobo, update amount_spent_kobo, and mark expired campaigns as completed.
-- Skips deduction if the campaign was activated today (start_date::date = CURRENT_DATE) to prevent double deduction on activation day.
UPDATE party_marketing_campaigns
SET
    amount_spent_kobo = CASE 
        WHEN status = 'active' AND NOW() < end_date AND (start_date IS NULL OR start_date::date < CURRENT_DATE) THEN amount_spent_kobo + budget_per_day_kobo 
        ELSE amount_spent_kobo 
    END,
    status = CASE 
        WHEN status = 'active' AND NOW() >= end_date THEN 'completed'::marketing_campaign_status 
        ELSE status 
    END,
    updated_at = NOW()
WHERE status = 'active'
RETURNING *;

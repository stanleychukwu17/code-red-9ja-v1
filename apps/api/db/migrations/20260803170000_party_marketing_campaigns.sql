-- +goose Up
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price_kobo BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'agent-campaign' CHECK (type IN ('agent-campaign', 'votes-campaign')),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    scopes_recommendation JSONB NOT NULL DEFAULT '[]'::jsonb,
    color_hex VARCHAR(50) DEFAULT NULL,
    dark_color_hex VARCHAR(50) DEFAULT NULL,
    referral_amount_kobo BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed basic plans based on UI
INSERT INTO plans (name, description, price_kobo, type, features, scopes_recommendation, color_hex, dark_color_hex, referral_amount_kobo, display_order)
SELECT 'Starter', 'Ideal for: ward-level or small-parties', 22000000, 'agent-campaign', '["Low-budget referral", "1 to 1,000 applications per month"]'::jsonb, '["ward"]'::jsonb, '#313131', '#D1D5DB', 20000, 1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Starter')
UNION ALL
SELECT 'Basic', 'Ideal for: LGA-level and mid-parties', 60000000, 'agent-campaign', '["Everything in Starter", "Mid-budget referral", "Facebook & Instagram Advertising", "1 to 3,000 applications per month"]'::jsonb, '["lga"]'::jsonb, '#3742FA', '#5352ED', 30000, 2
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Basic')
UNION ALL
SELECT 'Pro', 'Ideal for: senatorial and house of rep', 120000000, 'agent-campaign', '["Everything in Basic", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 6,000 applications per month"]'::jsonb, '["senatorial-district", "federal-constituency"]'::jsonb, '#009A49', '#2ED573', 50000, 3
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Pro')
UNION ALL
SELECT 'Premium', 'Ideal for: presidential and governorship', 500000000, 'agent-campaign', '["Everything in Pro", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 20,000 applications per month", "5X more aggressive than Pro"]'::jsonb, '["nationwide", "state"]'::jsonb, '#FF8D28', '#FFA502', 100000, 4
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium')
UNION ALL
SELECT 'Premium Plus', 'Ideal for: presidential and governorship', 1000000000, 'agent-campaign', '["Everything in Pro", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 20,000 application per month", "10X more aggressive than Pro"]'::jsonb, '["nationwide", "state"]'::jsonb, '#F44336', '#FF4757', 200000, 5
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium Plus');

CREATE TABLE IF NOT EXISTS party_marketing_campaigns (
    id SERIAL PRIMARY KEY,
    party_id INT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    election_group_id INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
    election_id INT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL DEFAULT 'agent-campaign' CHECK (type IN ('agent-campaign', 'votes-campaign')),
    states JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_in_days INT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    budget_per_day_kobo BIGINT NOT NULL DEFAULT 0,
    budget_kobo BIGINT NOT NULL,
    referral_amount_kobo BIGINT NOT NULL DEFAULT 0,
    amount_spent_kobo BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- party_marketing_campaigns
CREATE INDEX IF NOT EXISTS idx_pmc_party_created ON party_marketing_campaigns (party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pmc_party_eg_status ON party_marketing_campaigns (party_id, election_group_id, status);
CREATE INDEX IF NOT EXISTS idx_pmc_status_active ON party_marketing_campaigns (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_pmc_election_group_id ON party_marketing_campaigns (election_group_id);

-- +goose Down
DROP TABLE IF EXISTS party_marketing_campaigns;
DROP TABLE IF EXISTS plans;

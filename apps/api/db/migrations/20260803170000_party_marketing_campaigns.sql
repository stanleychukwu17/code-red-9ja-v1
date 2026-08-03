-- +goose Up
CREATE TYPE marketing_campaign_type AS ENUM ('agent-campaign', 'votes-campaign');
CREATE TYPE marketing_campaign_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    type marketing_campaign_type NOT NULL DEFAULT 'agent-campaign',
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    scopes_recommendation JSONB NOT NULL DEFAULT '[]'::jsonb,
    color_hex VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed basic plans based on UI
INSERT INTO plans (name, description, price, type, features, scopes_recommendation, color_hex, display_order) VALUES
('Starter',      'Ideal for: ward-level or small-parties',          220000,   'agent-campaign', '["Low-budget referral", "1 to 1,000 applications per month"]'::jsonb, '["ward"]'::jsonb, '#313131', 1),
('Basic',        'Ideal for: LGA-level and mid-parties',             600000,   'agent-campaign', '["Everything in Starter", "Mid-budget referral", "Facebook & Instagram Advertising", "1 to 3,000 applications per month"]'::jsonb, '["lga"]'::jsonb, '#3742FA', 2),
('Pro',          'Ideal for: senatorial and house of rep',           1200000,  'agent-campaign', '["Everything in Basic", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 6,000 applications per month"]'::jsonb, '["senatorial-district", "federal-constituency"]'::jsonb, '#009A49', 3),
('Premium',      'Ideal for: presidential and governorship',        5000000,  'agent-campaign', '["Everything in Pro", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 20,000 applications per month", "5X more aggressive than Pro"]'::jsonb, '["nationwide", "state"]'::jsonb, '#FF8D28', 4),
('Premium Plus', 'Ideal for: presidential and governorship',        10000000, 'agent-campaign', '["Everything in Pro", "High-budget referral", "Multi-platform advertising (Facebook, Instagram, TikTok, X)", "High-end UGC Ad Video", "Geo-targeted Campaign", "24/7 campaign monitoring", "1 to 20,000 application per month", "10X more aggressive than Pro"]'::jsonb, '["nationwide", "state"]'::jsonb, '#F44336', 5);

CREATE TABLE party_marketing_campaigns (
    id SERIAL PRIMARY KEY,
    party_id INT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    election_group_id INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
    election_id INT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    type marketing_campaign_type NOT NULL DEFAULT 'agent-campaign',
    states JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_in_days INT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status marketing_campaign_status NOT NULL DEFAULT 'pending',
    budget DECIMAL(15, 2) NOT NULL,
    amount_spent DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS party_marketing_campaigns;
DROP TABLE IF EXISTS plans;
DROP TYPE IF EXISTS marketing_campaign_status;
DROP TYPE IF EXISTS marketing_campaign_type;

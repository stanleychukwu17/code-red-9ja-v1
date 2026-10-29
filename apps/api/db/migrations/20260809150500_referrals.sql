-- +goose Up
CREATE TABLE IF NOT EXISTS user_referrals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id SMALLINT REFERENCES parties(id) ON DELETE CASCADE,
  election_group_id INT REFERENCES election_groups(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Admin payout workflow (mirroring agent_earnings)
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'requested', 'approved', 'paid', 'disputed')),
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, election_group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_user_party ON user_referrals(user_id, party_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON user_referrals(status);


CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_referral_id BIGINT REFERENCES user_referrals(id) ON DELETE SET NULL,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,
  election_group_id INT REFERENCES election_groups(id) ON DELETE SET NULL,
  referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  milestone VARCHAR(50) NOT NULL, -- e.g., 'SIGNED_UP', 'BECAME_AGENT', 'VOTED', 'UPLOADED_RESULTS'
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  amount_to_pay DECIMAL(15, 2) DEFAULT 0, -- the amount the referrer will be paid if the user became an agent during an active election group marketting campaign for this election_group_id
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMPTZ,
  
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_user_id, id DESC);

-- +goose Down
DROP TABLE IF EXISTS user_referrals;
DROP TABLE IF EXISTS referrals;
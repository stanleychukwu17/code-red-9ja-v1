-- +goose Up

-- USERS TABLE
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(25) UNIQUE,
  username VARCHAR(30) UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  first_name VARCHAR(30),
  last_name VARCHAR(30),
  middle_name VARCHAR(30),
  full_name VARCHAR(65) GENERATED ALWAYS AS (TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) STORED,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  date_of_birth DATE,

  avatar VARCHAR(1000),
  avatar_file_id BIGINT,

  voters_card_image VARCHAR(255),

  current_country SMALLINT REFERENCES c_countries(id) NOT NULL,
  current_state SMALLINT REFERENCES c_states(id) NOT NULL,
  current_city INT REFERENCES c_cities(id),
  current_lga INTEGER REFERENCES lgas(id) ON DELETE SET NULL,
  current_ward INTEGER REFERENCES wards(id) ON DELETE SET NULL,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,

  country_of_origin SMALLINT REFERENCES c_countries(id),
  state_of_origin SMALLINT REFERENCES c_states(id),

  has_role BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_politician BOOLEAN DEFAULT false,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,

  account_status VARCHAR(30)
    CHECK (account_status IN (
      'just_registered',
      'placeholder',
      'active',
      'inactive',
      'suspended',
      'banned',
      'deleted'
    ))
    DEFAULT 'just_registered',

  -- Referral system
  -- referral_code format: {FIRST_NAME}{2-digit suffix} e.g. "DANIEL40"
  -- Generated server-side at user registration time, unique per user
  referral_code VARCHAR(30) UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically generate unique fake_id for users if not provided
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_user_fake_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fake_id IS NULL THEN
    NEW.fake_id := (floor(random() * 900 + 100)::text || NEW.id::text || floor(random() * 900 + 100)::text)::bigint;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_set_user_fake_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_user_fake_id();

-- create indexes for the users table
CREATE INDEX idx_users_party_id ON users(party_id) WHERE party_id IS NOT NULL;
CREATE INDEX idx_users_avatar_file_id ON users(avatar_file_id) WHERE avatar_file_id IS NOT NULL;
-- pg_trgm extension and indexes for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_search_username_trgm ON users USING gin (username gin_trgm_ops) WHERE account_status IN ('active', 'placeholder');
CREATE INDEX idx_users_search_fullname_trgm ON users USING gin (full_name gin_trgm_ops) WHERE account_status IN ('active', 'placeholder');
CREATE INDEX idx_users_username_trgm_gist ON users USING gist (username gist_trgm_ops);


-- USER BANK ACCOUNTS TABLE
CREATE TABLE user_bank_accounts (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE UNIQUE INDEX idx_user_bank_accounts_unique_primary ON user_bank_accounts(user_id) WHERE is_primary = true;

-- USERS NIN TABLE
CREATE TABLE users_nin (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nin VARCHAR(12) UNIQUE NOT NULL
);

-- USERS Phone number table
CREATE TABLE users_phone_numbers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_is_verified BOOLEAN DEFAULT false,
  phone VARCHAR(25) UNIQUE NOT NULL,
  raw_input VARCHAR(25) NOT NULL,
  phonecode VARCHAR(10) NOT NULL,
  on_whatsapp BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);
CREATE INDEX idx_users_phone_numbers_user_id ON users_phone_numbers(user_id);

CREATE TABLE user_more_infos (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  occupation_id SMALLINT REFERENCES occupations(id) ON DELETE SET NULL,
  educational_status VARCHAR(20) CHECK (educational_status IN ('graduate', 'student', 'none')),
  highest_degree VARCHAR(20) CHECK (highest_degree IN ('none', 'primary', 'secondary', 'polytechnic', 'bachelors', 'masters', 'phd')),
  graduation_year VARCHAR(4),
  school_name VARCHAR(255),
  degree_certificate_url TEXT,
  religion VARCHAR(20) CHECK (religion IN ('christianity', 'islam', 'traditional', 'other')),
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  address VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- +goose Down
DROP TRIGGER IF EXISTS trg_set_user_fake_id ON users;
DROP FUNCTION IF EXISTS set_user_fake_id();
DROP TABLE IF EXISTS user_more_infos;
DROP TABLE IF EXISTS users_phone_numbers;
DROP TABLE IF EXISTS users_nin;
DROP TABLE IF EXISTS user_bank_accounts;
DROP TABLE IF EXISTS users;

-- +goose Up

-- USERS TABLE
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,
  email VARCHAR(255) UNIQUE,
  avatar VARCHAR(1000),
  avatar_file_id BIGINT,
  phone VARCHAR(25) UNIQUE,
  username VARCHAR(30) UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  last_name VARCHAR(30),
  first_name VARCHAR(30),
  middle_name VARCHAR(30),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  date_of_birth DATE,

  voters_card_image VARCHAR(255),

  current_country SMALLINT REFERENCES c_countries(id) NOT NULL,
  current_state SMALLINT REFERENCES c_states(id) NOT NULL,
  current_city INT REFERENCES c_cities(id),
  current_lga INTEGER REFERENCES lgas(id) ON DELETE SET NULL,
  current_ward INTEGER REFERENCES wards(id) ON DELETE SET NULL,
  address VARCHAR(255),

  country_of_origin SMALLINT REFERENCES c_countries(id),
  state_of_origin SMALLINT REFERENCES c_states(id),

  is_politician BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  has_role BOOLEAN DEFAULT false,
  party_id SMALLINT REFERENCES parties(id) ON DELETE SET NULL,
  polling_unit_id INT REFERENCES polling_units(id) ON DELETE SET NULL,

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
  referred_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_party_id ON users(party_id);
CREATE INDEX idx_users_polling_unit_id ON users(polling_unit_id);
CREATE INDEX idx_users_is_politician ON users(is_politician);
CREATE INDEX idx_users_account_status ON users(account_status);

-- pg_trgm extension and indexes for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_first_name_trgm ON users USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_users_last_name_trgm ON users USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);


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
CREATE INDEX idx_users_phone_numbers_phone ON users_phone_numbers(phone);



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

CREATE TABLE user_verifications (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nin_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  voters_card_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255) DEFAULT NULL,
  email_last_reminded_at TIMESTAMPTZ,
  phone_last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_nin_verified ON user_verifications(nin_verified);
CREATE INDEX idx_user_verifications_phone_verified ON user_verifications(phone_verified);
CREATE INDEX idx_user_verifications_email_verified ON user_verifications(email_verified);

-- +goose Down
DROP TABLE IF EXISTS user_verifications;
DROP TABLE IF EXISTS user_more_infos;
DROP TABLE IF EXISTS users_phone_numbers;
DROP TABLE IF EXISTS users_nin;
DROP TABLE IF EXISTS user_bank_accounts;
DROP TABLE IF EXISTS users;

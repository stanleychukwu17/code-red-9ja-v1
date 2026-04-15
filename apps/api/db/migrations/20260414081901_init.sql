-- +goose Up

-- USERS TABLE
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(25) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  last_name VARCHAR(50),
  first_name VARCHAR(50),
  other_name VARCHAR(50),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),

  date_of_birth DATE,

  citizenship SMALLINT,
  current_country SMALLINT,
  current_state INT,

  verification_type VARCHAR(20)
    CHECK (verification_type IN (
      'nin',
      'long_verification',
      'short_verification',
      'none'
    ))
    DEFAULT 'none',

  -- where long verification includes email, phone, passport, live camera, head movement, device fingerprint, otp
  -- and short verification includes email, phone, otp

  account_status VARCHAR(20)
    CHECK (account_status IN (
      'active',
      'inactive',
      'suspended',
      'banned',
      'deleted'
    ))
    DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS NIN TABLE
CREATE TABLE users_nin (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nin VARCHAR(15) UNIQUE NOT NULL
);

-- users country resident, will use to calculate diaspora nigerians on the app
CREATE TABLE users_country_resident (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  citizenship SMALLINT NOT NULL,
  current_country SMALLINT NOT NULL,
  current_state INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_users_country_resident_citizenship ON users_country_resident(citizenship);
CREATE INDEX idx_users_country_resident_current_country ON users_country_resident(current_country);
CREATE INDEX idx_users_country_resident_current_state ON users_country_resident(current_state);

-- +goose Down

DROP TABLE IF EXISTS users_country_resident;
DROP TABLE IF EXISTS users_nin;
DROP TABLE IF EXISTS users;

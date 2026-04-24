-- +goose Up

-- USERS TABLE
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(25) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  last_name VARCHAR(30),
  first_name VARCHAR(30),
  middle_name VARCHAR(30),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),

  date_of_birth DATE,

  current_country SMALLINT NOT NULL,
  current_state SMALLINT NOT NULL,
  current_city INT,

  nin_verified VARCHAR(5) CHECK (nin_verified IN ('true', 'false')) DEFAULT 'false',
  phone_verified VARCHAR(5) CHECK (phone_verified IN ('true', 'false')) DEFAULT 'false',

  account_status VARCHAR(30)
    CHECK (account_status IN (
      'just_registered',
      'active',
      'inactive',
      'suspended',
      'banned',
      'deleted'
    ))
    DEFAULT 'just_registered',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS NIN TABLE
CREATE TABLE users_nin (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id BIGINT UNIQUE NOT NULL,
  nin VARCHAR(12) UNIQUE NOT NULL
);

-- USERS Phone number table
CREATE TABLE users_phone_numbers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  phone VARCHAR(25) UNIQUE NOT NULL,
  on_whatsapp VARCHAR(25) CHECK (on_whatsapp IN ('yes','no')) DEFAULT 'no'
);
CREATE INDEX idx_users_phone_numbers_user_id ON users_phone_numbers(user_id);
CREATE INDEX idx_users_phone_numbers_phone ON users_phone_numbers(phone);


-- +goose Down
DROP TABLE IF EXISTS users_phone_numbers;
DROP TABLE IF EXISTS users_nin;
DROP TABLE IF EXISTS users;

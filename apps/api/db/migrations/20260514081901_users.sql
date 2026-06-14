-- +goose Up

-- USERS TABLE
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fake_id BIGINT UNIQUE,
  email VARCHAR(255) UNIQUE,
  avatar VARCHAR(255) UNIQUE,
  phone VARCHAR(25) UNIQUE,
  username VARCHAR(30) UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  last_name VARCHAR(30),
  first_name VARCHAR(30),
  middle_name VARCHAR(30),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),

  date_of_birth DATE,

  current_country SMALLINT REFERENCES c_countries(id) NOT NULL,
  current_state SMALLINT REFERENCES c_states(id) NOT NULL,
  current_city INT REFERENCES c_cities(id),
  
  state_of_origin SMALLINT REFERENCES c_states(id),

  nin_verified VARCHAR(5) CHECK (nin_verified IN ('true', 'false')) DEFAULT 'false',
  phone_verified VARCHAR(5) CHECK (phone_verified IN ('true', 'false')) DEFAULT 'false',
  role VARCHAR(20) CHECK (role IN ('user', 'partymember', 'admin')) DEFAULT 'user',
  role_level VARCHAR(20) CHECK (role_level IN ('user', 'partyagent', 'admin', 'member', 'placeholder', 'superadmin')) DEFAULT 'user',
  -- role (role_level)
  -- [user (user, partyagent) | partymember (admin, member, placeholder) | admin (admin, superadmin)]

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

  party_id BIGINT REFERENCES parties(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS NIN TABLE
CREATE TABLE users_nin (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- USERS security questions table
CREATE TABLE user_security_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_fid BIGINT UNIQUE NOT NULL,
  nin CHAR(11) UNIQUE NOT NULL,
  question1 SMALLINT NOT NULL,
  answer1 VARCHAR(255) NOT NULL,
  question2 SMALLINT NOT NULL,
  answer2 VARCHAR(255) NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS user_security_questions;
DROP TABLE IF EXISTS users_phone_numbers;
DROP TABLE IF EXISTS users_nin;
DROP TABLE IF EXISTS users;

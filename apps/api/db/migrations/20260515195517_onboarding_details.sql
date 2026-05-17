-- +goose Up
CREATE TABLE users_onboarding (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fake_id BIGINT,
    otp VARCHAR(100),
    date_time_otp_sent TIMESTAMPTZ,
    otp_verified VARCHAR(3) CHECK (otp_verified IN ('yes', 'no')) DEFAULT 'no',
    country_id SMALLINT NOT NULL,
    state_id SMALLINT,
    city_id INT,
    email VARCHAR(255),
    phone VARCHAR(25) NOT NULL,
    completed VARCHAR(3) CHECK (completed IN ('yes', 'no')) DEFAULT 'no',
    date_created TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_onboarding_phone ON users_onboarding(phone);

-- +goose Down
DROP TABLE IF EXISTS users_onboarding;

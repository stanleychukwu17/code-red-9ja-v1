-- +goose Up

CREATE TABLE IF NOT EXISTS national_metrics (
    id INT PRIMARY KEY,
    states_count INT DEFAULT 0 NOT NULL,
    senatorial_districts_count INT DEFAULT 0 NOT NULL,
    federal_constituencies_count INT DEFAULT 0 NOT NULL,
    state_constituencies_count INT DEFAULT 0 NOT NULL,
    lgas_count INT DEFAULT 0 NOT NULL,
    wards_count INT DEFAULT 0 NOT NULL,
    polling_units_count INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO national_metrics (id) VALUES (1) ON CONFLICT DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS national_metrics;

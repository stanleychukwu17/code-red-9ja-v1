-- +goose Up
DROP TABLE IF EXISTS party_membership_requests CASCADE;
DROP TABLE IF EXISTS party_chapter_settings CASCADE;

-- +goose Down

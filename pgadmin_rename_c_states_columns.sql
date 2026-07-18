-- Script to rename geographic count columns in c_states to use pluralized names
-- Run this in PgAdmin since 20260417093101_create_regions.sql has already been migrated

ALTER TABLE c_states RENAME COLUMN senatorial_district_count TO senatorial_districts_count;
ALTER TABLE c_states RENAME COLUMN federal_constituency_count TO federal_constituencies_count;
ALTER TABLE c_states RENAME COLUMN lga_count TO lgas_count;
ALTER TABLE c_states RENAME COLUMN state_constituency_count TO state_constituencies_count;
ALTER TABLE c_states RENAME COLUMN ward_count TO wards_count;
ALTER TABLE c_states RENAME COLUMN polling_unit_count TO polling_units_count;

import re

# 1. Update 20260713220001_election_stats.sql
path1 = r"c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\migrations\20260713220001_election_stats.sql"
with open(path1, "r", encoding="utf-8") as f:
    content1 = f.read()

# Add to election_group_polling_units
content1 = content1.replace(
    "  average_election_started_at                 TIMESTAMPTZ,",
    "  average_arrival_time                        TIMESTAMPTZ,\n  average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,\n  average_election_started_at                 TIMESTAMPTZ,"
)

# Add to all other tables (wards, lgas, etc.)
content1 = content1.replace(
    "  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu",
    "  pu_average_arrival_time                          TIMESTAMPTZ,\n  pu_average_update_time_interval_in_seconds       FLOAT NOT NULL DEFAULT 0,\n  pu_average_election_started_at                   TIMESTAMPTZ, -- average time election starts in pu"
)

with open(path1, "w", encoding="utf-8") as f:
    f.write(content1)

# 2. Update 20260607120000_elections_schema.sql
path2 = r"c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\migrations\20260607120000_elections_schema.sql"
with open(path2, "r", encoding="utf-8") as f:
    content2 = f.read()

# It already has pu_average_update_time_interval_in_seconds. Just add pu_average_arrival_time
content2 = content2.replace(
    "  pu_average_election_started_at TIMESTAMPTZ,",
    "  pu_average_arrival_time TIMESTAMPTZ,\n  pu_average_election_started_at TIMESTAMPTZ,"
)

with open(path2, "w", encoding="utf-8") as f:
    f.write(content2)

# 3. Create the PGAdmin script
pgadmin_script = """-- Script to add missing columns to existing tables in PGAdmin

-- 1. election_group_polling_units
ALTER TABLE election_group_polling_units
ADD COLUMN IF NOT EXISTS average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 2. election_group_wards
ALTER TABLE election_group_wards
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 3. election_group_lgas
ALTER TABLE election_group_lgas
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 4. election_group_states
ALTER TABLE election_group_states
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 5. election_group_senatorial_districts
ALTER TABLE election_group_senatorial_districts
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 6. election_group_federal_constituencies
ALTER TABLE election_group_federal_constituencies
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 7. election_group_state_constituencies
ALTER TABLE election_group_state_constituencies
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pu_average_update_time_interval_in_seconds FLOAT NOT NULL DEFAULT 0;

-- 8. election_groups (already has pu_average_update_time_interval_in_seconds)
ALTER TABLE election_groups
ADD COLUMN IF NOT EXISTS pu_average_arrival_time TIMESTAMPTZ;
"""

with open(r"c:\Users\danie\.gemini\antigravity-ide\brain\215b9a0b-e0ea-486c-b471-f5a7d08f90d1\pgadmin_script.sql", "w", encoding="utf-8") as f:
    f.write(pgadmin_script)

print("Done")

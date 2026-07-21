import re

path = r"c:\Users\danie\Desktop\Repos\free9ja\apps\api\db\query\election_stats.sql"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update PU -> Ward Expansion
def patch_party_expanded_pu_ward(m):
    return m.group(0) + """
    (p.value->>'average_arrival_time')::timestamptz                   AS average_arrival_time,
    (p.value->>'average_election_started_at')::timestamptz            AS average_election_started_at,
    (p.value->>'average_election_ended_at')::timestamptz              AS average_election_ended_at,"""

pu_expanded_pattern = re.compile(r'party_expanded AS \(\s*SELECT\s*epu\.election_group_id, epu\.ward_id,')
content = pu_expanded_pattern.sub(patch_party_expanded_pu_ward, content, count=1)


# 2. Update all OTHER Expansions (Ward -> LGA, LGA -> State, etc.)
def patch_party_expanded_others(m):
    return m.group(0) + """
    (p.value->>'pu_average_arrival_time')::timestamptz                AS average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz         AS average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz           AS average_election_ended_at,"""

# Replace for LGA, State, Senatorial, Federal, State Constituency
content = re.sub(r'party_expanded AS \(\s*SELECT\s*epu\.election_group_id, epu\.(lga_id|state_id|senatorial_district_id|federal_constituency_id|state_constituency_id),', patch_party_expanded_others, content)


# And for the GLOBAL expansion (which just selects election_group_id):
# We match specifically to avoid hitting the ward_id one
def patch_party_expanded_global(m):
    return m.group(1) + """
    (p.value->>'pu_average_arrival_time')::timestamptz                AS average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz         AS average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz           AS average_election_ended_at,
""" + m.group(2)

content = re.sub(r'(party_expanded AS \(\s*SELECT\s*epu\.election_group_id,)(\s*\(p\.value->>\'party_id\'\))', patch_party_expanded_global, content)


# 3. Update Aggregations (party_agg)
def patch_party_agg(m):
    return m.group(0) + """
    to_timestamp(AVG(EXTRACT(epoch FROM average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,"""

content = re.sub(r'party_agg AS \(\s*SELECT\s*election_group_id(.*?party_id),', patch_party_agg, content)


# 4. Update JSON generation (party_json)
content = content.replace(
    "'pu_average_arrival_time',               NULL",
    "'pu_average_arrival_time',               pu_average_arrival_time"
)
content = content.replace(
    "'pu_average_arrival_time',                          NULL",
    "'pu_average_arrival_time',               pu_average_arrival_time"
)
content = content.replace(
    "'pu_average_election_started_at',        NULL",
    "'pu_average_election_started_at',        pu_average_election_started_at"
)
content = content.replace(
    "'pu_average_election_started_at',                   NULL",
    "'pu_average_election_started_at',        pu_average_election_started_at"
)
content = content.replace(
    "'pu_average_election_ended_at',          NULL",
    "'pu_average_election_ended_at',          pu_average_election_ended_at"
)
content = content.replace(
    "'pu_average_election_ended_at',                     NULL",
    "'pu_average_election_ended_at',          pu_average_election_ended_at"
)

# Fix zeroes for intervals/readiness in global stats
content = content.replace(
    "'pu_average_update_time_interval_in_seconds',       0,",
    "'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,"
)
content = content.replace(
    "'pu_election_practice_test_readiness_percentage',   0,",
    "'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

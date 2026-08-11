-- name: RefreshAllElectionGroupPollingUnitStats :exec
-- Aggregates stats from source tables for every (election_group_id, polling_unit_id)
-- that has at least one agent assignment. Designed for cron execution.
WITH
-- -------------------------------------------------------
-- 1. Agent-level data (assignments + referral codes)
-- -------------------------------------------------------
assignments AS (
  SELECT
    pua.election_group_id,
    pua.polling_unit_id,
    pua.party_id,
    pua.user_id,
    pua.arrived_at,
    pua.election_started_at,
    pua.election_ended_at,
    pua.last_update_at,
    pua.reports_count,
    pua.updates_count,
    pua.election_practice_test_readiness_percentage,
    u.referral_code
  FROM polling_unit_assignments pua
  JOIN users u ON u.id = pua.user_id
),
-- -------------------------------------------------------
-- 2. Overall PU-level scalar aggregates (across all parties)
-- -------------------------------------------------------
overall_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                                              AS pu_agents_count,
    COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)        AS pu_agents_in_attendance_count,
    SUM(reports_count)                                    AS pu_reports_count,
    SUM(updates_count)                                    AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM election_started_at)))                              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM election_ended_at)))                                AS pu_average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),
-- -------------------------------------------------------
-- 3. Final result submission counts
-- -------------------------------------------------------
result_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                    AS pu_final_results_uploaded_count,
    COUNT(DISTINCT election_id) AS unique_pu_final_results_uploaded_count
  FROM polling_unit_results
  GROUP BY election_group_id, polling_unit_id
),
-- -------------------------------------------------------
-- 4. Referral codes per (election_group_id, polling_unit_id)
-- -------------------------------------------------------
referral_codes AS (
  SELECT
    election_group_id,
    polling_unit_id,
    array_agg(user_id) FILTER (WHERE user_id IS NOT NULL) AS agent_ids
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),
-- Voters who used an agent code at this PU and then voted
referral_counts AS (
  SELECT
    rc.election_group_id,
    rc.polling_unit_id,
    COUNT(DISTINCT ev.user_id) AS pu_live_voters_referred_by_agent_count
  FROM referral_codes rc
  JOIN users voter ON voter.referred_by_id = ANY(rc.agent_ids)
  JOIN election_votes ev ON ev.user_id = voter.id AND ev.election_group_id = rc.election_group_id
  GROUP BY rc.election_group_id, rc.polling_unit_id
),
-- -------------------------------------------------------
-- 5. How many elections this PU is eligible for in the group
-- -------------------------------------------------------
expected_counts AS (
  SELECT
    a.election_group_id,
    a.polling_unit_id,
    COUNT(DISTINCT e.id) AS unique_final_results_expected
  FROM (SELECT DISTINCT election_group_id, polling_unit_id FROM assignments) a
  JOIN polling_units pu ON pu.id = a.polling_unit_id
  JOIN wards w ON w.id = pu.ward_id
  JOIN lgas l ON l.id = pu.lga_id
  JOIN elections e ON e.election_group_id = a.election_group_id
    AND (
      e.scope = 'nationwide' OR
      (e.scope = 'state'                 AND e.state_id              = pu.state_id) OR
      (e.scope = 'senatorial-district'   AND e.senatorial_district_id = l.senatorial_district_id) OR
      (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id) OR
      (e.scope = 'lga'                  AND e.lga_id                 = pu.lga_id) OR
      (e.scope = 'state-constituency'   AND e.state_constituency_id  = w.state_assembly_constituency_id) OR
      (e.scope = 'ward'                 AND e.ward_id                = pu.ward_id)
    )
  GROUP BY a.election_group_id, a.polling_unit_id
),
-- -------------------------------------------------------
-- 6. Per-party aggregates
-- -------------------------------------------------------
party_overall AS (
  SELECT
    election_group_id, polling_unit_id, party_id,
    COUNT(*)                                              AS agents_count,
    COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)        AS agents_in_attendance_count,
    to_timestamp(AVG(EXTRACT(epoch FROM arrived_at)))                                       AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM election_started_at)))                              AS election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM election_ended_at)))                                AS election_ended_at,
    SUM(updates_count)                                    AS updates_count,
    SUM(reports_count)                                    AS reports_count,
    MAX(last_update_at)                                   AS last_update_given_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage
  FROM assignments
  GROUP BY election_group_id, polling_unit_id, party_id
),
party_results AS (
  SELECT
    election_group_id, polling_unit_id, party_id,
    COUNT(*)                   AS final_results_uploaded_count,
    COUNT(DISTINCT election_id) AS unique_final_results_uploaded_count
  FROM polling_unit_results
  WHERE party_id IS NOT NULL
  GROUP BY election_group_id, polling_unit_id, party_id
),
-- Average time gap between consecutive updates per party per PU (in seconds)
update_gaps AS (
  SELECT
    election_group_id, polling_unit_id, party_id,
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (
      PARTITION BY election_group_id, polling_unit_id, party_id ORDER BY created_at
    ))) AS gap_seconds
  FROM polling_unit_updates
  WHERE party_id IS NOT NULL
),
update_intervals AS (
  SELECT
    election_group_id, polling_unit_id, party_id,
    AVG(gap_seconds) AS avg_interval_seconds
  FROM update_gaps
  WHERE gap_seconds IS NOT NULL
  GROUP BY election_group_id, polling_unit_id, party_id
),
party_referral_counts AS (
  SELECT
    a.election_group_id, a.polling_unit_id, a.party_id,
    COUNT(DISTINCT ev.user_id) AS pu_live_voters_referred_by_agent_count
  FROM assignments a
  JOIN users voter ON voter.referred_by_id = a.user_id
  JOIN election_votes ev ON ev.user_id = voter.id AND ev.election_group_id = a.election_group_id
  WHERE a.user_id IS NOT NULL
  GROUP BY a.election_group_id, a.polling_unit_id, a.party_id
),
-- -------------------------------------------------------
-- 7. Build per-party JSONB array
-- -------------------------------------------------------
party_json AS (
  SELECT
    po.election_group_id,
    po.polling_unit_id,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'party_id',                              po.party_id,
        'applications_count',                       0,
        'accepted_applications_count',              0,
        'rejected_applications_count',              0,
        'pu_agents_in_attendance_count',            po.agents_in_attendance_count,
        'pu_average_arrival_time',                  po.pu_average_arrival_time,
        'pu_average_election_started_at',                   po.election_started_at,
        'pu_average_election_ended_at',                     po.election_ended_at,
        'pu_updates_count',                         po.updates_count,
        'pu_reports_count',                         po.reports_count,
        'pu_agents_count',                          po.agents_count,
        'pu_final_results_uploaded_count',          COALESCE(pr.final_results_uploaded_count, 0),
        'unique_pu_final_results_uploaded_count',   COALESCE(pr.unique_final_results_uploaded_count, 0),
        'last_update_given_at',                  po.last_update_given_at,
        'pu_average_update_time_interval_in_seconds', COALESCE(ui.avg_interval_seconds, 0),
        'pu_election_practice_test_readiness_percentage', po.pu_election_practice_test_readiness_percentage,
        'pu_live_voters_referred_by_agent_count',   COALESCE(prc.pu_live_voters_referred_by_agent_count, 0)
      )
    ), '[]'::jsonb) AS parties
  FROM party_overall po
  LEFT JOIN party_results pr USING (election_group_id, polling_unit_id, party_id)
  LEFT JOIN update_intervals ui USING (election_group_id, polling_unit_id, party_id)
  LEFT JOIN party_referral_counts prc USING (election_group_id, polling_unit_id, party_id)
  GROUP BY po.election_group_id, po.polling_unit_id
)
-- -------------------------------------------------------
-- 8. Final upsert
-- -------------------------------------------------------
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id,
  state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected,
  pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_arrival_time, pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  parties
)
SELECT
  oa.election_group_id, oa.polling_unit_id,
  pu.state_id, pu.lga_id, pu.ward_id,
  w.state_assembly_constituency_id, l.federal_constituency_id, l.senatorial_district_id,
  COALESCE(ec.unique_final_results_expected, 0),
  oa.pu_agents_count, oa.pu_agents_in_attendance_count,
  oa.pu_reports_count, oa.pu_updates_count,
  oa.pu_average_arrival_time, oa.pu_average_election_started_at, oa.pu_average_election_ended_at,
  oa.pu_election_practice_test_readiness_percentage,
  COALESCE(ra.pu_final_results_uploaded_count, 0),
  COALESCE(ra.unique_pu_final_results_uploaded_count, 0),
  COALESCE(rc.pu_live_voters_referred_by_agent_count, 0),
  COALESCE(pj.parties, '[]'::jsonb)
FROM overall_agg oa
JOIN polling_units pu ON pu.id = oa.polling_unit_id
JOIN wards w ON w.id = pu.ward_id
JOIN lgas l ON l.id = pu.lga_id
LEFT JOIN result_agg ra USING (election_group_id, polling_unit_id)
LEFT JOIN referral_counts rc USING (election_group_id, polling_unit_id)
LEFT JOIN expected_counts ec USING (election_group_id, polling_unit_id)
LEFT JOIN party_json pj USING (election_group_id, polling_unit_id)
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  lga_id = EXCLUDED.lga_id,
  ward_id = EXCLUDED.ward_id,
  state_constituency_id = EXCLUDED.state_constituency_id,
  federal_constituency_id = EXCLUDED.federal_constituency_id,
  senatorial_district_id = EXCLUDED.senatorial_district_id,
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_arrival_time = EXCLUDED.pu_average_arrival_time,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupWardStats :exec
-- Aggregates from election_group_polling_units (one level up from PUs).
WITH epu_agg AS (
  SELECT
    election_group_id, ward_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                          AS pu_agents_count,
      COUNT(*) FILTER (WHERE pu_agents_count > 0)   AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)            AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                         AS pu_reports_count,
    SUM(pu_updates_count)                         AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE pu_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE pu_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE pu_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_polling_units
  GROUP BY election_group_id, ward_id, lga_id, state_id
),
-- Expand per-party JSONB from all PUs in each ward
party_expanded AS (
  SELECT
    epu.election_group_id, epu.ward_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_agents_in_attendance_count')::int                      AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                                   AS agents_count,
    (p.value->>'pu_updates_count')::int                                  AS updates_count,
    (p.value->>'pu_reports_count')::int                                  AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int                   AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int            AS unique_final_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float      AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float  AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int            AS referrals,
    epu.pu_reports_count > 0                AS has_reports,
    epu.pu_updates_count > 0               AS has_updates,
    epu.pu_agents_in_attendance_count > 0  AS has_attendance,
    epu.pu_average_election_started_at IS NOT NULL AS election_started,
    epu.pu_average_election_ended_at IS NOT NULL   AS election_ended,
    epu.unique_pu_final_results_uploaded_count > 0 AS has_results,
    epu.pu_live_voters_referred_by_agent_count > 0 AS has_referrals,
      (p.value->>'pu_agents_count')::int > 0            AS has_agents
  FROM election_group_polling_units epu,
       jsonb_array_elements(epu.parties) AS p(value)
),
party_agg AS (
  SELECT
    election_group_id, ward_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    COUNT(*) FILTER (WHERE has_agents)     AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    COUNT(*) FILTER (WHERE has_reports)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE has_updates)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE has_attendance)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE election_started) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE election_ended)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE has_results)      AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE has_referrals)    AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, ward_id, party_id
),
party_json AS (
  SELECT
    election_group_id, ward_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, ward_id
)
INSERT INTO election_group_wards (
  election_group_id, ward_id, lga_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.ward_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM epu_agg a
LEFT JOIN party_json pj USING (election_group_id, ward_id)
ON CONFLICT (election_group_id, ward_id) DO UPDATE SET
  lga_id = EXCLUDED.lga_id,
  state_id = EXCLUDED.state_id,
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupLGAStats :exec
-- Aggregates from election_group_wards grouped by lga_id.
WITH src_agg AS (
  SELECT
    election_group_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_wards
  WHERE lga_id IS NOT NULL
  GROUP BY election_group_id, lga_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.lga_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_wards s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.lga_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, lga_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, lga_id, party_id
),
party_json AS (
  SELECT
    election_group_id, lga_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, lga_id
)
INSERT INTO election_group_lgas (
  election_group_id, lga_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, lga_id)
ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters, state_id = EXCLUDED.state_id,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupStateConstituencyStats :exec
-- Aggregates from election_group_polling_units grouped by state_constituency_id.
WITH src_agg AS (
  SELECT
    election_group_id, state_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                          AS pu_agents_count,
    COUNT(*) FILTER (WHERE pu_agents_count > 0)   AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)            AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                         AS pu_reports_count,
    SUM(pu_updates_count)                         AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE pu_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE pu_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE pu_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_polling_units
  WHERE state_constituency_id IS NOT NULL
  GROUP BY election_group_id, state_constituency_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_constituency_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_polling_units s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.state_constituency_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, state_constituency_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_constituency_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_constituency_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_constituency_id
)
INSERT INTO election_group_state_constituencies (
  election_group_id, state_constituency_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_constituency_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_constituency_id)
ON CONFLICT (election_group_id, state_constituency_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters, state_id = EXCLUDED.state_id,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupFederalConstituencyStats :exec
-- Aggregates from election_group_lgas grouped by federal_constituency_id.
WITH src_agg AS (
  SELECT
    election_group_id, federal_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_lgas
  WHERE federal_constituency_id IS NOT NULL
  GROUP BY election_group_id, federal_constituency_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.federal_constituency_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.federal_constituency_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, federal_constituency_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, federal_constituency_id, party_id
),
party_json AS (
  SELECT
    election_group_id, federal_constituency_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, federal_constituency_id
)
INSERT INTO election_group_federal_constituencies (
  election_group_id, federal_constituency_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.federal_constituency_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, federal_constituency_id)
ON CONFLICT (election_group_id, federal_constituency_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters, state_id = EXCLUDED.state_id,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupSenatorialDistrictStats :exec
-- Aggregates from election_group_lgas grouped by senatorial_district_id.
WITH src_agg AS (
  SELECT
    election_group_id, senatorial_district_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_lgas
  WHERE senatorial_district_id IS NOT NULL
  GROUP BY election_group_id, senatorial_district_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.senatorial_district_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.senatorial_district_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, senatorial_district_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, senatorial_district_id, party_id
),
party_json AS (
  SELECT
    election_group_id, senatorial_district_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, senatorial_district_id
)
INSERT INTO election_group_senatorial_districts (
  election_group_id, senatorial_district_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.senatorial_district_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, senatorial_district_id)
ON CONFLICT (election_group_id, senatorial_district_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters, state_id = EXCLUDED.state_id,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionGroupStateStats :exec
-- Aggregates from election_group_lgas grouped by state_id.
WITH src_agg AS (
  SELECT
    election_group_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_lgas
  WHERE state_id IS NOT NULL
  GROUP BY election_group_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.state_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, state_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_id
)
INSERT INTO election_group_states (
  election_group_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_id)
ON CONFLICT (election_group_id, state_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();


-- =====================================================
-- READ QUERIES
-- =====================================================

-- name: GetElectionGroupPollingUnitStats :one
SELECT * FROM election_group_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2;

-- name: ListElectionGroupPollingUnitStatsByGroup :many
SELECT * FROM election_group_polling_units
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY polling_unit_id;

-- name: GetElectionGroupWardStats :one
SELECT * FROM election_group_wards
WHERE election_group_id = $1 AND ward_id = $2;

-- name: ListElectionGroupWardStatsByGroup :many
SELECT * FROM election_group_wards
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY ward_id;

-- name: GetElectionGroupLGAStats :one
SELECT * FROM election_group_lgas
WHERE election_group_id = $1 AND lga_id = $2;

-- name: ListElectionGroupLGAStatsByGroup :many
SELECT * FROM election_group_lgas
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY lga_id;

-- name: GetElectionGroupStateConstituencyStats :one
SELECT * FROM election_group_state_constituencies
WHERE election_group_id = $1 AND state_constituency_id = $2;

-- name: ListElectionGroupStateConstituencyStatsByGroup :many
SELECT * FROM election_group_state_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY state_constituency_id;

-- name: GetElectionGroupFederalConstituencyStats :one
SELECT * FROM election_group_federal_constituencies
WHERE election_group_id = $1 AND federal_constituency_id = $2;

-- name: ListElectionGroupFederalConstituencyStatsByGroup :many
SELECT * FROM election_group_federal_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY federal_constituency_id;

-- name: GetElectionGroupSenatorialDistrictStats :one
SELECT * FROM election_group_senatorial_districts
WHERE election_group_id = $1 AND senatorial_district_id = $2;

-- name: ListElectionGroupSenatorialDistrictStatsByGroup :many
SELECT * FROM election_group_senatorial_districts
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY senatorial_district_id;

-- name: GetElectionGroupStateStats :one
SELECT * FROM election_group_states
WHERE election_group_id = $1 AND state_id = $2;

-- name: ListElectionGroupStateStatsByGroup :many
SELECT * FROM election_group_states
WHERE election_group_id = $1
ORDER BY state_id;

-- ============================================================
-- SEED QUERIES
-- Called once when an election group is created. Inserts zeroed
-- stat rows for all geographies that are in-scope for the group.
-- Uses ON CONFLICT DO NOTHING so re-running is safe (idempotent).
-- election_group_polling_units is excluded — those are seeded
-- lazily by the RefreshAllElectionGroupPollingUnitStats cron.
-- ============================================================

-- name: SeedElectionGroupStateStats :exec
-- Inserts one zeroed row per state that is in-scope for this election group.
-- For a 'nationwide' election that means all 37 states.
-- For a scoped election (e.g. state/senatorial-district/etc.) only the
-- relevant state(s) are inserted.
INSERT INTO election_group_states (
  election_group_id, state_id,
  senatorial_districts_count, federal_constituencies_count, lgas_count,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::bigint, s.id,
  s.senatorial_districts_count, s.federal_constituencies_count, s.lgas_count,
  s.state_constituencies_count, s.wards_count, s.polling_units_count
FROM c_states s
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = s.id)
    OR (e.scope = 'senatorial-district' AND e.state_id = s.id)
    OR (e.scope = 'federal-constituency' AND e.state_id = s.id)
    OR (e.scope = 'lga'                 AND e.state_id = s.id)
    OR (e.scope = 'state-constituency'  AND e.state_id = s.id)
    OR (e.scope = 'ward'                AND e.state_id = s.id)
  )
ON CONFLICT (election_group_id, state_id) DO NOTHING;

-- name: SeedElectionGroupSenatorialDistrictStats :exec
-- Inserts one zeroed row per senatorial district in-scope for this election group.
INSERT INTO election_group_senatorial_districts (
  election_group_id, senatorial_district_id, state_id,
  federal_constituencies_count, lgas_count,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::bigint, sd.id, sd.state_id,
  sd.federal_constituencies_count, sd.lgas_count,
  sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
FROM senatorial_districts sd
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = sd.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = sd.id)
    OR (e.scope = 'federal-constituency' AND EXISTS (
          SELECT 1 FROM federal_constituencies fc
          WHERE fc.id = e.federal_constituency_id AND fc.senatorial_district_id = sd.id))
    OR (e.scope = 'lga'                 AND EXISTS (
          SELECT 1 FROM lgas l
          WHERE l.id = e.lga_id AND l.senatorial_district_id = sd.id))
    OR (e.scope = 'state-constituency' AND e.state_id = sd.state_id)
    OR (e.scope = 'ward'               AND e.state_id = sd.state_id)
  )
ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING;

-- name: SeedElectionGroupFederalConstituencyStats :exec
-- Inserts one zeroed row per federal constituency in-scope for this election group.
INSERT INTO election_group_federal_constituencies (
  election_group_id, federal_constituency_id, state_id, senatorial_district_id,
  lgas_count, state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::bigint, fc.id, fc.state_id, fc.senatorial_district_id,
  fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
FROM federal_constituencies fc
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = fc.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = fc.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = fc.id)
    OR (e.scope = 'lga'                 AND EXISTS (
          SELECT 1 FROM lgas l
          WHERE l.id = e.lga_id AND l.federal_constituency_id = fc.id))
    OR (e.scope = 'state-constituency' AND e.state_id = fc.state_id)
    OR (e.scope = 'ward'               AND e.state_id = fc.state_id)
  )
ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING;

-- name: SeedElectionGroupLGAStats :exec
-- Inserts one zeroed row per LGA in-scope for this election group.
INSERT INTO election_group_lgas (
  election_group_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
  state_constituencies_count, wards_count, polling_units_count
)
SELECT DISTINCT $1::bigint, l.id, l.state_id, l.senatorial_district_id, l.federal_constituency_id,
  l.state_constituencies_count, l.wards_count, l.polling_units_count
FROM lgas l
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = l.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = l.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id)
    OR (e.scope = 'lga'                 AND e.lga_id = l.id)
    OR (e.scope = 'state-constituency'  AND e.state_id = l.state_id)
    OR (e.scope = 'ward'                AND e.state_id = l.state_id)
  )
ON CONFLICT (election_group_id, lga_id) DO NOTHING;

-- name: SeedElectionGroupStateConstituencyStats :exec
-- Inserts one zeroed row per state constituency in-scope for this election group.
INSERT INTO election_group_state_constituencies (
  election_group_id, state_constituency_id, state_id,
  wards_count, polling_units_count
)
SELECT DISTINCT $1::bigint, sc.id, sc.state_id,
  sc.wards_count, sc.polling_units_count
FROM state_assembly_constituencies sc
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'              AND e.state_id = sc.state_id)
    OR (e.scope = 'senatorial-district' AND e.state_id = sc.state_id)
    OR (e.scope = 'federal-constituency' AND e.state_id = sc.state_id)
    OR (e.scope = 'lga'                AND e.state_id = sc.state_id)
    OR (e.scope = 'state-constituency' AND e.state_constituency_id = sc.id)
    OR (e.scope = 'ward'               AND e.state_id = sc.state_id)
  )
ON CONFLICT (election_group_id, state_constituency_id) DO NOTHING;

-- name: SeedElectionGroupWardStats :exec
-- Inserts one zeroed row per ward in-scope for this election group.
INSERT INTO election_group_wards (
  election_group_id, ward_id, lga_id, state_id,
  polling_units_count
)
SELECT DISTINCT $1::bigint, w.id, w.lga_id, l.state_id,
  w.polling_units_count
FROM wards w
JOIN lgas l ON l.id = w.lga_id
JOIN elections e ON e.election_group_id = $1
  AND (
    e.scope = 'nationwide'
    OR (e.scope = 'state'               AND e.state_id = l.state_id)
    OR (e.scope = 'senatorial-district' AND e.senatorial_district_id = l.senatorial_district_id)
    OR (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id)
    OR (e.scope = 'lga'                 AND e.lga_id = w.lga_id)
    OR (e.scope = 'state-constituency'  AND e.state_constituency_id = w.state_assembly_constituency_id)
    OR (e.scope = 'ward'                AND e.ward_id = w.id)
  )
ON CONFLICT (election_group_id, ward_id) DO NOTHING;

-- ============================================================
-- INCREMENTAL PARTY ENTRY UPSERTS
-- Called from Go (ApproveApplication) after a polling agent is
-- assigned. These keep agents_count and unique_pu_agents_count
-- in the parties JSONB accurate pre-election without a full cron
-- refresh.
--
-- Pattern: if the party_id already exists in the JSONB array,
--   increment agents_count and (if first agent in this PU for
--   this party) increment unique_pu_agents_count.
-- If party_id does not exist, append a new object.
-- ============================================================

-- name: UpsertElectionGroupPUPartyEntry :exec
-- Upserts the party entry inside election_group_polling_units.parties.
-- $1 = election_group_id (bigint)
-- $2 = polling_unit_id   (int)
-- $3 = party_id          (bigint)
-- $4 = delta             (int, +1 for assign, -1 for remove)
UPDATE election_group_polling_units
SET
  pu_agents_count = GREATEST(0, pu_agents_count + sqlc.arg(delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 elem,
                 '{agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                sqlc.arg(party_id)::smallint,
      'pu_agents_count',                            GREATEST(0, sqlc.arg(delta)::int),
      'pu_agents_in_attendance_count',              0,
      'pu_average_arrival_time',                    NULL,
      'pu_average_election_started_at',                     NULL,
      'pu_average_election_ended_at',                       NULL,
      'pu_updates_count',                           0,
      'pu_reports_count',                           0,
      'pu_final_results_uploaded_count',            0,
      'unique_pu_final_results_uploaded_count',     0,
      'last_update_given_at',                    NULL,
      'pu_average_update_time_interval_in_seconds', 0,
      'pu_election_practice_test_readiness_percentage', 0,
      'pu_live_voters_referred_by_agent_count',     0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int;

-- name: IncrementElectionGroupPUPartyMetrics :exec
-- Increments metrics in election_group_polling_units when a polling unit update/report is submitted.
-- $1 = election_group_id, $2 = polling_unit_id, $3 = party_id
-- $4 = reports_delta (+1 or 0), $5 = updates_delta (+1 or 0)
UPDATE election_group_polling_units
SET
  pu_reports_count = pu_reports_count + sqlc.arg(reports_delta)::int,
  pu_updates_count = pu_updates_count + sqlc.arg(updates_delta)::int,
  parties = (
    SELECT jsonb_agg(
      CASE
        WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
        THEN jsonb_set(
               jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     elem,
                     '{pu_reports_count}',
                     to_jsonb(COALESCE((elem->>'pu_reports_count')::int, 0) + sqlc.arg(reports_delta)::int)
                   ),
                   '{pu_updates_count}',
                   to_jsonb(COALESCE((elem->>'pu_updates_count')::int, 0) + sqlc.arg(updates_delta)::int)
                 ),
                 '{last_update_given_at}',
                 to_jsonb(NOW()::text)
               ),
               '{pu_average_update_time_interval_in_seconds}',
               to_jsonb(
                 CASE
                   WHEN (elem->>'last_update_given_at') IS NULL THEN 0.0
                   ELSE (
                     (COALESCE((elem->>'pu_average_update_time_interval_in_seconds')::numeric, 0.0) * (COALESCE((elem->>'pu_updates_count')::numeric, 0) + COALESCE((elem->>'pu_reports_count')::numeric, 0)))
                     + EXTRACT(EPOCH FROM (NOW() - (elem->>'last_update_given_at')::timestamptz))
                   ) / (COALESCE((elem->>'pu_updates_count')::numeric, 0) + COALESCE((elem->>'pu_reports_count')::numeric, 0) + 1.0)
                 END
               )
             )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(parties) AS elem
  ),
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
  AND parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint));

-- name: UpsertElectionGroupWardPartyEntry :exec
-- Upserts party entry in election_group_wards.parties.
-- $1 = election_group_id, $2 = ward_id, $3 = party_id, $4 = agents_delta (+1 or -1)
-- $5 = unique_pu_delta (+1, 0 or -1): whether to also adjust unique_pu_agents_count
UPDATE election_group_wards
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND ward_id           = sqlc.arg(ward_id)::int;

-- name: UpsertElectionGroupLGAPartyEntry :exec
-- Upserts party entry in election_group_lgas.parties.
-- $1=election_group_id, $2=lga_id, $3=party_id, $4=agents_delta, $5=unique_pu_delta
UPDATE election_group_lgas
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND lga_id            = sqlc.arg(lga_id)::int;

-- name: UpsertElectionGroupStateConstituencyPartyEntry :exec
-- Upserts party entry in election_group_state_constituencies.parties.
UPDATE election_group_state_constituencies
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id       = sqlc.arg(election_group_id)::bigint
  AND state_constituency_id   = sqlc.arg(state_constituency_id)::int;

-- name: UpsertElectionGroupFederalConstituencyPartyEntry :exec
-- Upserts party entry in election_group_federal_constituencies.parties.
UPDATE election_group_federal_constituencies
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id       = sqlc.arg(election_group_id)::bigint
  AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int;

-- name: UpsertElectionGroupSenatorialDistrictPartyEntry :exec
-- Upserts party entry in election_group_senatorial_districts.parties.
UPDATE election_group_senatorial_districts
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id      = sqlc.arg(election_group_id)::bigint
  AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int;

-- name: UpsertElectionGroupStatePartyEntry :exec
-- Upserts party entry in election_group_states.parties.
UPDATE election_group_states
SET
  pu_agents_count        = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) AS elem
    )
    ELSE parties || jsonb_build_object(
      'party_id',                                         sqlc.arg(party_id)::smallint,
      'pu_agents_count',                                  GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count',                           GREATEST(0, sqlc.arg(unique_pu_delta)::int),
      'pu_agents_in_attendance_count',                    0,
      'pu_updates_count',                                    0,
      'pu_reports_count',                                    0,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_final_results_uploaded_count',                  0,
      'unique_pu_final_results_uploaded_count',           0,
      'pu_average_update_time_interval_in_seconds',       pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage',   pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count',           0,
      'total_pu_with_reports',                            0,
      'total_pu_with_updates',                            0,
      'total_pu_with_agents_in_attendance',               0,
      'total_pu_where_election_has_started',              0,
      'total_pu_where_election_has_ended',                0,
      'total_pu_unique_final_results_uploaded',           0,
      'total_pu_where_agents_referred_live_voters',       0
    )::jsonb
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND state_id          = sqlc.arg(state_id)::smallint;

-- ============================================================
-- QUERY: get current party agents_count in a PU for a given party
-- Used by Go before calling the upsert to compute unique_pu_delta.
-- Returns the current agents_count for the party in this PU,
-- or 0 if no entry exists yet.
-- ============================================================

-- name: GetPUPartyAgentsCount :one
SELECT COALESCE(
  (
    SELECT (elem->>'pu_agents_count')::int
    FROM jsonb_array_elements(parties) AS elem
    WHERE (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
    LIMIT 1
  ),
  0
)::int AS agents_count
FROM election_group_polling_units
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int;

-- ============================================================
-- SUPERVISOR COUNT INCREMENTS / DECREMENTS
-- Called from Go after creating/removing supervisor records.
-- delta = +1 (assign) or -1 (remove).
-- ============================================================

-- name: AdjustElectionGroupLGAWardSupervisorCounts :exec
-- Adjusts ward_supervisors_count on election_group_lgas.
UPDATE election_group_lgas
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND lga_id            = sqlc.arg(lga_id)::int;

-- name: AdjustElectionGroupStateConstituencyWardSupervisorCounts :exec
UPDATE election_group_state_constituencies
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id     = sqlc.arg(election_group_id)::bigint
  AND state_constituency_id = sqlc.arg(state_constituency_id)::int;

-- name: AdjustElectionGroupFederalConstituencyWardSupervisorCounts :exec
UPDATE election_group_federal_constituencies
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id       = sqlc.arg(election_group_id)::bigint
  AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int;

-- name: AdjustElectionGroupSenatorialDistrictWardSupervisorCounts :exec
UPDATE election_group_senatorial_districts
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id      = sqlc.arg(election_group_id)::bigint
  AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int;

-- name: AdjustElectionGroupStateWardSupervisorCounts :exec
UPDATE election_group_states
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND state_id          = sqlc.arg(state_id)::smallint;

-- name: AdjustElectionGroupFederalConstituencyLGASupervisorCounts :exec
UPDATE election_group_federal_constituencies
SET
  lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{lga_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_lga_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_lga_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'lga_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_lga_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id       = sqlc.arg(election_group_id)::bigint
  AND federal_constituency_id = sqlc.arg(federal_constituency_id)::int;

-- name: AdjustElectionGroupSenatorialDistrictLGASupervisorCounts :exec
UPDATE election_group_senatorial_districts
SET
  lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{lga_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_lga_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_lga_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'lga_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_lga_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id      = sqlc.arg(election_group_id)::bigint
  AND senatorial_district_id = sqlc.arg(senatorial_district_id)::int;

-- name: AdjustElectionGroupStateLGASupervisorCounts :exec
UPDATE election_group_states
SET
  lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{lga_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_lga_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_lga_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'lga_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_lga_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND state_id          = sqlc.arg(state_id)::smallint;


-- name: GetWardSupervisorCount :one
-- Returns the current count of ward supervisors for a party in a given ward+election group.
-- Used to determine unique_delta when assigning/removing a ward supervisor.
SELECT COUNT(*)::int AS supervisor_count
FROM ward_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND ward_id           = sqlc.arg(ward_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: GetLGASupervisorCount :one
-- Returns the current count of LGA supervisors for a party in a given lga+election group.
SELECT COUNT(*)::int AS supervisor_count
FROM lga_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND lga_id            = sqlc.arg(lga_id)::int
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: GetStateSupervisorCount :one
-- Returns the current count of state supervisors for a party in a given state+election group.
SELECT COUNT(*)::int AS supervisor_count
FROM state_election_supervisors
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND state_id          = sqlc.arg(state_id)::smallint
  AND party_id          = sqlc.arg(party_id)::smallint;

-- name: AdjustElectionGroupWardWardSupervisorCounts :exec
UPDATE election_group_wards
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND ward_id           = sqlc.arg(ward_id)::int;

-- name: AdjustElectionGroupNationalWardSupervisorCounts :exec
UPDATE election_groups
SET
  ward_supervisors_count        = GREATEST(0, ward_supervisors_count + sqlc.arg(delta)::int),
  unique_ward_supervisors_count = GREATEST(0, unique_ward_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{ward_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_ward_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_ward_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'ward_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_ward_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE id = sqlc.arg(election_group_id)::bigint;

-- name: AdjustElectionGroupNationalLGASupervisorCounts :exec
UPDATE election_groups
SET
  lga_supervisors_count        = GREATEST(0, lga_supervisors_count + sqlc.arg(delta)::int),
  unique_lga_supervisors_count = GREATEST(0, unique_lga_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{lga_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_lga_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_lga_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'lga_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_lga_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE id = sqlc.arg(election_group_id)::bigint;

-- name: AdjustElectionGroupNationalStateSupervisorCounts :exec
UPDATE election_groups
SET
  state_supervisors_count        = GREATEST(0, state_supervisors_count + sqlc.arg(delta)::int),
  unique_state_supervisors_count = GREATEST(0, unique_state_supervisors_count + sqlc.arg(unique_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{state_supervisors_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'state_supervisors_count')::int, 0) + sqlc.arg(delta)::int))
                 ),
                 '{unique_state_supervisors_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_state_supervisors_count')::int, 0) + sqlc.arg(unique_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'state_supervisors_count', GREATEST(0, sqlc.arg(delta)::int),
      'unique_state_supervisors_count', GREATEST(0, sqlc.arg(unique_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE id = sqlc.arg(election_group_id)::bigint;

-- name: UpsertElectionGroupNationalPartyEntry :exec
-- Upserts the party entry inside election_groups.parties.
UPDATE election_groups
SET
  pu_agents_count = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
  unique_pu_agents_count = GREATEST(0, unique_pu_agents_count + sqlc.arg(unique_pu_delta)::int),
  parties = CASE
    WHEN parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   elem,
                   '{pu_agents_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'pu_agents_count')::int, 0) + sqlc.arg(agents_delta)::int))
                 ),
                 '{unique_pu_agents_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'unique_pu_agents_count')::int, 0) + sqlc.arg(unique_pu_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(parties) elem
    )
    ELSE parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'pu_agents_count', GREATEST(0, sqlc.arg(agents_delta)::int),
      'unique_pu_agents_count', GREATEST(0, sqlc.arg(unique_pu_delta)::int)
    )
  END,
  updated_at = NOW()
WHERE id = sqlc.arg(election_group_id)::bigint;
-- name: RefreshAllElectionGroupGlobalStats :exec
-- Aggregates from election_group_states up to election_groups.
WITH src_agg AS (
  SELECT
    election_group_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_states
  GROUP BY election_group_id
),
party_expanded AS (
  SELECT
    s.election_group_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_states s,
       jsonb_array_elements(s.parties) AS p(value)
),
party_agg AS (
  SELECT
    election_group_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, party_id
),
party_json AS (
  SELECT
    election_group_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
      'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id
)
UPDATE election_groups
SET
  unique_final_results_expected = COALESCE(s.unique_final_results_expected, 0),
  pu_agents_count = COALESCE(s.pu_agents_count, 0),
  unique_pu_agents_count = COALESCE(s.unique_pu_agents_count, 0),
  pu_agents_in_attendance_count = COALESCE(s.pu_agents_in_attendance_count, 0),
  pu_reports_count = COALESCE(s.pu_reports_count, 0),
  pu_updates_count = COALESCE(s.pu_updates_count, 0),
  pu_average_election_started_at = s.pu_average_election_started_at,
  pu_average_election_ended_at = s.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = COALESCE(s.pu_election_practice_test_readiness_percentage, 0),
  pu_final_results_uploaded_count = COALESCE(s.pu_final_results_uploaded_count, 0),
  unique_pu_final_results_uploaded_count = COALESCE(s.unique_pu_final_results_uploaded_count, 0),
  pu_live_voters_referred_by_agent_count = COALESCE(s.pu_live_voters_referred_by_agent_count, 0),
  total_pu_with_reports = COALESCE(s.total_pu_with_reports, 0),
  total_pu_with_updates = COALESCE(s.total_pu_with_updates, 0),
  total_pu_with_agents_in_attendance = COALESCE(s.total_pu_with_agents_in_attendance, 0),
  total_pu_where_election_has_started = COALESCE(s.total_pu_where_election_has_started, 0),
  total_pu_where_election_has_ended = COALESCE(s.total_pu_where_election_has_ended, 0),
  total_pu_unique_final_results_uploaded = COALESCE(s.total_pu_unique_final_results_uploaded, 0),
  total_pu_where_agents_referred_live_voters = COALESCE(s.total_pu_where_agents_referred_live_voters, 0),
  parties = COALESCE(pj.parties, '[]'::jsonb),
  updated_at = NOW()
FROM src_agg s
LEFT JOIN party_json pj ON s.election_group_id = pj.election_group_id
WHERE election_groups.id = s.election_group_id;

-- name: RefreshSingleElectionGroupPollingUnitStats :exec
-- Aggregates from polling_unit_assignments, results, and updates for a single PU
WITH assignments AS (
  SELECT
    election_group_id,
    polling_unit_id,
    arrived_at,
    election_started_at,
    election_ended_at,
    election_practice_test_readiness_percentage,
    reports_count,
    updates_count,
    results_submitted_count,
    live_voters_referred_count,
    party_id
  FROM polling_unit_assignments
  WHERE polling_unit_assignments.election_group_id = $1 AND polling_unit_assignments.polling_unit_id = $2
),
assignment_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                                              AS pu_agents_count,
    COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)        AS pu_agents_in_attendance_count,
    SUM(reports_count)                                    AS pu_reports_count,
    SUM(updates_count)                                    AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM election_started_at)))                              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM election_ended_at)))                                AS pu_average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),
result_agg AS (
  SELECT
    election_group_id,
    polling_unit_id,
    COUNT(*)                   AS pu_final_results_uploaded_count,
    COUNT(DISTINCT election_id) AS unique_pu_final_results_uploaded_count
  FROM polling_unit_results
  WHERE polling_unit_results.election_group_id = $1 AND polling_unit_results.polling_unit_id = $2
  GROUP BY election_group_id, polling_unit_id
),
referral_codes AS (
  SELECT
    election_group_id,
    polling_unit_id,
    SUM(live_voters_referred_count) AS pu_live_voters_referred_by_agent_count
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),
party_expanded AS (
  SELECT
    a.election_group_id,
    a.polling_unit_id,
    a.party_id,
    COUNT(*) AS agents_count,
    COUNT(*) FILTER (WHERE a.arrived_at IS NOT NULL) AS agents_in_attendance_count,
    SUM(a.updates_count) AS updates_count,
    SUM(a.reports_count) AS reports_count,
    to_timestamp(AVG(EXTRACT(epoch FROM a.arrived_at))) AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM a.election_started_at))) AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM a.election_ended_at))) AS pu_average_election_ended_at,
    COALESCE(AVG(a.election_practice_test_readiness_percentage), 0) AS readiness_pct,
    SUM(a.live_voters_referred_count) AS referrals
  FROM assignments a
  GROUP BY a.election_group_id, a.polling_unit_id, a.party_id
),
party_results AS (
  SELECT
    r.election_group_id,
    r.polling_unit_id,
    r.party_id,
    COUNT(*) AS final_results_uploaded_count,
    COUNT(DISTINCT r.election_id) AS unique_final_results_uploaded_count
  FROM polling_unit_results r
  WHERE r.election_group_id = $1 AND r.polling_unit_id = $2
  GROUP BY r.election_group_id, r.polling_unit_id, r.party_id
),
party_intervals AS (
  SELECT
    sub.election_group_id,
    sub.polling_unit_id,
    sub.party_id,
    AVG(gap_seconds) AS avg_interval_seconds
  FROM (
    SELECT
      pu.election_group_id,
      pu.polling_unit_id,
      a2.party_id,
      EXTRACT(EPOCH FROM (pu.created_at - LAG(pu.created_at) OVER (PARTITION BY pu.election_group_id, pu.polling_unit_id, pu.user_id ORDER BY pu.created_at))) AS gap_seconds
    FROM polling_unit_updates pu
    JOIN polling_unit_assignments a2 ON pu.election_group_id = a2.election_group_id
                                    AND pu.polling_unit_id = a2.polling_unit_id
                                    AND pu.user_id = a2.user_id
    WHERE pu.election_group_id = $1 AND pu.polling_unit_id = $2
  ) sub
  WHERE gap_seconds > 0
  GROUP BY sub.election_group_id, sub.polling_unit_id, sub.party_id
),
party_json AS (
  SELECT
    pe.election_group_id,
    pe.polling_unit_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              pe.party_id,
      'pu_agents_in_attendance_count',            pe.agents_in_attendance_count,
      'pu_agents_count',                          pe.agents_count,
      'pu_updates_count',                         pe.updates_count,
      'pu_reports_count',                         pe.reports_count,
      'pu_average_arrival_time',                  pe.pu_average_arrival_time,
      'pu_average_election_started_at',           pe.pu_average_election_started_at,
      'pu_average_election_ended_at',             pe.pu_average_election_ended_at,
      'pu_final_results_uploaded_count',          COALESCE(pr.final_results_uploaded_count, 0),
      'unique_pu_final_results_uploaded_count',   COALESCE(pr.unique_final_results_uploaded_count, 0),
      'pu_average_update_time_interval_in_seconds', COALESCE(pi.avg_interval_seconds, 0),
      'pu_election_practice_test_readiness_percentage', pe.readiness_pct,
      'pu_live_voters_referred_by_agent_count',   pe.referrals
    )), '[]'::jsonb) AS parties
  FROM party_expanded pe
  LEFT JOIN party_results pr ON pe.election_group_id = pr.election_group_id AND pe.polling_unit_id = pr.polling_unit_id AND pe.party_id = pr.party_id
  LEFT JOIN party_intervals pi ON pe.election_group_id = pi.election_group_id AND pe.polling_unit_id = pi.polling_unit_id AND pe.party_id = pi.party_id
  GROUP BY pe.election_group_id, pe.polling_unit_id
)
UPDATE election_group_polling_units
SET
  pu_agents_count = COALESCE(aa.pu_agents_count, 0),
  pu_agents_in_attendance_count = COALESCE(aa.pu_agents_in_attendance_count, 0),
  pu_reports_count = COALESCE(aa.pu_reports_count, 0),
  pu_updates_count = COALESCE(aa.pu_updates_count, 0),
  pu_average_election_started_at = aa.pu_average_election_started_at,
  pu_average_election_ended_at = aa.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = COALESCE(aa.pu_election_practice_test_readiness_percentage, 0),
  pu_final_results_uploaded_count = COALESCE(ra.pu_final_results_uploaded_count, 0),
  unique_pu_final_results_uploaded_count = COALESCE(ra.unique_pu_final_results_uploaded_count, 0),
  pu_live_voters_referred_by_agent_count = COALESCE(rc.pu_live_voters_referred_by_agent_count, 0),
  parties = COALESCE(pj.parties, '[]'::jsonb),
  updated_at = NOW()
FROM assignment_agg aa
LEFT JOIN result_agg ra ON aa.election_group_id = ra.election_group_id AND aa.polling_unit_id = ra.polling_unit_id
LEFT JOIN referral_codes rc ON aa.election_group_id = rc.election_group_id AND aa.polling_unit_id = rc.polling_unit_id
LEFT JOIN party_json pj ON aa.election_group_id = pj.election_group_id AND aa.polling_unit_id = pj.polling_unit_id
WHERE election_group_polling_units.election_group_id = aa.election_group_id
  AND election_group_polling_units.polling_unit_id = aa.polling_unit_id;

-- =====================================================
-- EVENT-DRIVEN CASCADE: RefreshSingle* queries
-- Each query targets exactly one geographic unit so
-- the cascading worker chain only touches the rows
-- that actually changed, instead of full table scans.
-- =====================================================

-- name: GetElectionGroupPollingUnitGeoIDs :one
-- Returns the geographic IDs for a single PU row (used by the cascade to know what to enqueue next).
SELECT
  ward_id,
  lga_id,
  state_id,
  state_constituency_id,
  federal_constituency_id,
  senatorial_district_id
FROM election_group_polling_units
WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  AND polling_unit_id   = sqlc.arg(polling_unit_id)::int;

-- name: RefreshSingleElectionGroupWardStats :exec
-- Aggregates from election_group_polling_units for a single ward.
WITH epu_agg AS (
  SELECT
    election_group_id, ward_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                          AS pu_agents_count,
      COUNT(*) FILTER (WHERE pu_agents_count > 0)   AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)            AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                         AS pu_reports_count,
    SUM(pu_updates_count)                         AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE pu_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE pu_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE pu_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_polling_units
  WHERE election_group_id = sqlc.arg(election_group_id)::bigint
    AND ward_id = sqlc.arg(ward_id)::int
  GROUP BY election_group_id, ward_id, lga_id, state_id
),
party_expanded AS (
  SELECT
    epu.election_group_id, epu.ward_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int                     AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                                   AS agents_count,
    (p.value->>'pu_updates_count')::int                                  AS updates_count,
    (p.value->>'pu_reports_count')::int                                  AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int                   AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int            AS unique_final_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float      AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float  AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int            AS referrals,
    epu.pu_reports_count > 0                AS has_reports,
    epu.pu_updates_count > 0               AS has_updates,
    epu.pu_agents_in_attendance_count > 0  AS has_attendance,
    epu.pu_average_election_started_at IS NOT NULL AS election_started,
    epu.pu_average_election_ended_at IS NOT NULL   AS election_ended,
    epu.unique_pu_final_results_uploaded_count > 0 AS has_results,
    epu.pu_live_voters_referred_by_agent_count > 0 AS has_referrals,
    (p.value->>'pu_agents_count')::int > 0            AS has_agents
  FROM election_group_polling_units epu,
       jsonb_array_elements(epu.parties) AS p(value)
  WHERE epu.election_group_id = sqlc.arg(election_group_id)::bigint
    AND epu.ward_id = sqlc.arg(ward_id)::int
),
party_agg AS (
  SELECT
    election_group_id, ward_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    COUNT(*) FILTER (WHERE has_agents)     AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    COUNT(*) FILTER (WHERE has_reports)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE has_updates)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE has_attendance)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE election_started) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE election_ended)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE has_results)      AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE has_referrals)    AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, ward_id, party_id
),
party_json AS (
  SELECT
    election_group_id, ward_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, ward_id
)
INSERT INTO election_group_wards (
  election_group_id, ward_id, lga_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.ward_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM epu_agg a
LEFT JOIN party_json pj USING (election_group_id, ward_id)
ON CONFLICT (election_group_id, ward_id) DO UPDATE SET
  lga_id = EXCLUDED.lga_id,
  state_id = EXCLUDED.state_id,
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupLGAStats :exec
-- Aggregates from election_group_wards for a single LGA.
WITH src_agg AS (
  SELECT
    election_group_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_wards
  WHERE election_group_id = sqlc.arg(election_group_id)::bigint
    AND lga_id = sqlc.arg(lga_id)::int
  GROUP BY election_group_id, lga_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.lga_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_wards s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.election_group_id = sqlc.arg(election_group_id)::bigint
    AND s.lga_id = sqlc.arg(lga_id)::int
),
party_agg AS (
  SELECT
    election_group_id, lga_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, lga_id, party_id
),
party_json AS (
  SELECT
    election_group_id, lga_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
        'unique_pu_agents_count', unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, lga_id
)
INSERT INTO election_group_lgas (
  election_group_id, lga_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, lga_id)
ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupStateConstituencyStats :exec
-- Aggregates from election_group_polling_units for a single state constituency.
WITH src_agg AS (
  SELECT
    election_group_id, state_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                          AS pu_agents_count,
    COUNT(*) FILTER (WHERE pu_agents_count > 0)   AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)            AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                         AS pu_reports_count,
    SUM(pu_updates_count)                         AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE pu_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE pu_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE pu_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE pu_average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE pu_average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE unique_pu_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE pu_live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_group_polling_units
  WHERE election_group_id = sqlc.arg(election_group_id)::bigint
    AND state_constituency_id = sqlc.arg(state_constituency_id)::int
  GROUP BY election_group_id, state_constituency_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_constituency_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'pu_agents_count')::int > 0                       AS has_agents,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    s.pu_reports_count > 0               AS has_reports,
    s.pu_updates_count > 0               AS has_updates,
    s.pu_agents_in_attendance_count > 0  AS has_attendance,
    s.pu_average_election_started_at IS NOT NULL AS election_started,
    s.pu_average_election_ended_at IS NOT NULL   AS election_ended,
    s.unique_pu_final_results_uploaded_count > 0 AS has_results,
    s.pu_live_voters_referred_by_agent_count > 0 AS has_referrals
  FROM election_group_polling_units s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.election_group_id = sqlc.arg(election_group_id)::bigint
    AND s.state_constituency_id = sqlc.arg(state_constituency_id)::int
),
party_agg AS (
  SELECT
    election_group_id, state_constituency_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    COUNT(*) FILTER (WHERE has_agents)     AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE has_reports)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE has_updates)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE has_attendance)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE election_started) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE election_ended)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE has_results)      AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE has_referrals)    AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_constituency_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_constituency_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
      'unique_pu_agents_count',          unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_constituency_id
)
INSERT INTO election_group_state_constituencies (
  election_group_id, state_constituency_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_constituency_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_constituency_id)
ON CONFLICT (election_group_id, state_constituency_id) DO UPDATE SET
  state_id = EXCLUDED.state_id,
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupStateStats :exec
-- Aggregates from election_group_lgas for a single state.
WITH src_agg AS (
  SELECT
    election_group_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_lgas
  WHERE election_group_id = sqlc.arg(election_group_id)::bigint
    AND state_id = sqlc.arg(state_id)::smallint
  GROUP BY election_group_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.election_group_id = sqlc.arg(election_group_id)::bigint
    AND s.state_id = sqlc.arg(state_id)::smallint
),
party_agg AS (
  SELECT
    election_group_id, state_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
      'unique_pu_agents_count',          unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_id
)
INSERT INTO election_group_states (
  election_group_id, state_id,
  unique_final_results_expected,
  pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,
  pu_reports_count, pu_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count, unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,
  a.pu_reports_count, a.pu_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_final_results_uploaded_count, a.unique_pu_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_id)
ON CONFLICT (election_group_id, state_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_agents_count = EXCLUDED.pu_agents_count,
  unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,
  pu_agents_in_attendance_count = EXCLUDED.pu_agents_in_attendance_count,
  pu_reports_count = EXCLUDED.pu_reports_count,
  pu_updates_count = EXCLUDED.pu_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_final_results_uploaded_count = EXCLUDED.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = EXCLUDED.unique_pu_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count = EXCLUDED.pu_live_voters_referred_by_agent_count,
  total_pu_with_reports = EXCLUDED.total_pu_with_reports,
  total_pu_with_updates = EXCLUDED.total_pu_with_updates,
  total_pu_with_agents_in_attendance = EXCLUDED.total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started = EXCLUDED.total_pu_where_election_has_started,
  total_pu_where_election_has_ended = EXCLUDED.total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded = EXCLUDED.total_pu_unique_final_results_uploaded,
  total_pu_where_agents_referred_live_voters = EXCLUDED.total_pu_where_agents_referred_live_voters,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshSingleElectionGroupGlobalStats :exec
-- Aggregates from election_group_states for a single election group.
WITH src_agg AS (
  SELECT
    election_group_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(pu_reports_count)                   AS pu_reports_count,
    SUM(pu_updates_count)                   AS pu_updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))              AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_final_results_uploaded_count)       AS pu_final_results_uploaded_count,
    SUM(unique_pu_final_results_uploaded_count) AS unique_pu_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_group_states
  WHERE election_group_id = sqlc.arg(election_group_id)::bigint
  GROUP BY election_group_id
),
party_expanded AS (
  SELECT
    s.election_group_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_average_arrival_time')::timestamptz                   AS pu_average_arrival_time,
    (p.value->>'pu_average_election_started_at')::timestamptz            AS pu_average_election_started_at,
    (p.value->>'pu_average_election_ended_at')::timestamptz              AS pu_average_election_ended_at,
    (p.value->>'pu_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_agents_count')::int                           AS agents_count,
    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,
    (p.value->>'pu_updates_count')::int                          AS updates_count,
    (p.value->>'pu_reports_count')::int                          AS reports_count,
    (p.value->>'pu_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'unique_pu_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_group_states s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.election_group_id = sqlc.arg(election_group_id)::bigint
),
party_agg AS (
  SELECT
    election_group_id, party_id,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_arrival_time))) AT TIME ZONE 'UTC' AS pu_average_arrival_time,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at))) AT TIME ZONE 'UTC' AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at))) AT TIME ZONE 'UTC' AS pu_average_election_ended_at,
    SUM(agents_in_attendance_count)        AS pu_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_agents_count,
    SUM(unique_agents_count)               AS unique_pu_agents_count,
    SUM(updates_count)                     AS updates_count,
    SUM(reports_count)                     AS reports_count,
    SUM(final_results_uploaded_count)      AS pu_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS unique_pu_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, party_id
),
party_json AS (
  SELECT
    election_group_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_agents_in_attendance_count',   pu_agents_in_attendance_count,
      'pu_average_arrival_time',               pu_average_arrival_time,
      'pu_average_election_started_at',        pu_average_election_started_at,
      'pu_average_election_ended_at',          pu_average_election_ended_at,
      'pu_updates_count',                updates_count,
      'pu_reports_count',                reports_count,
      'pu_agents_count',                 pu_agents_count,
      'unique_pu_agents_count',          unique_pu_agents_count,
      'pu_final_results_uploaded_count', pu_final_results_uploaded_count,
      'unique_pu_final_results_uploaded_count', unique_pu_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded', total_pu_unique_final_results_uploaded,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id
)
UPDATE election_groups
SET
  unique_final_results_expected = COALESCE(s.unique_final_results_expected, 0),
  pu_agents_count = COALESCE(s.pu_agents_count, 0),
  unique_pu_agents_count = COALESCE(s.unique_pu_agents_count, 0),
  pu_agents_in_attendance_count = COALESCE(s.pu_agents_in_attendance_count, 0),
  pu_reports_count = COALESCE(s.pu_reports_count, 0),
  pu_updates_count = COALESCE(s.pu_updates_count, 0),
  pu_average_election_started_at = s.pu_average_election_started_at,
  pu_average_election_ended_at = s.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = COALESCE(s.pu_election_practice_test_readiness_percentage, 0),
  pu_final_results_uploaded_count = COALESCE(s.pu_final_results_uploaded_count, 0),
  unique_pu_final_results_uploaded_count = COALESCE(s.unique_pu_final_results_uploaded_count, 0),
  pu_live_voters_referred_by_agent_count = COALESCE(s.pu_live_voters_referred_by_agent_count, 0),
  total_pu_with_reports = COALESCE(s.total_pu_with_reports, 0),
  total_pu_with_updates = COALESCE(s.total_pu_with_updates, 0),
  total_pu_with_agents_in_attendance = COALESCE(s.total_pu_with_agents_in_attendance, 0),
  total_pu_where_election_has_started = COALESCE(s.total_pu_where_election_has_started, 0),
  total_pu_where_election_has_ended = COALESCE(s.total_pu_where_election_has_ended, 0),
  total_pu_unique_final_results_uploaded = COALESCE(s.total_pu_unique_final_results_uploaded, 0),
  total_pu_where_agents_referred_live_voters = COALESCE(s.total_pu_where_agents_referred_live_voters, 0),
  parties = COALESCE(pj.parties, '[]'::jsonb),
  updated_at = NOW()
FROM src_agg s
LEFT JOIN party_json pj ON s.election_group_id = pj.election_group_id
WHERE election_groups.id = s.election_group_id;

-- ============================================================
-- APPLICATION COUNT INCREMENT QUERIES
-- Increments/updates application counts (total, accepted, rejected, and role specific)
-- across polling units, wards, lgas, states, and election_groups.
-- ============================================================

-- name: AdjustElectionGroupPollingUnitApplicationCounts :exec
INSERT INTO election_group_polling_units (
  election_group_id, polling_unit_id, state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  parties
)
SELECT
  sqlc.arg(election_group_id)::bigint,
  sqlc.arg(polling_unit_id)::int,
  pu.state_id, pu.lga_id, pu.ward_id,
  w.state_assembly_constituency_id, l.federal_constituency_id, l.senatorial_district_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  jsonb_build_array(jsonb_build_object(
    'party_id', sqlc.arg(party_id)::smallint,
    'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
    'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
    'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int)
  ))
FROM polling_units pu
JOIN wards w ON w.id = pu.ward_id
JOIN lgas l ON l.id = pu.lga_id
WHERE pu.id = sqlc.arg(polling_unit_id)::int
ON CONFLICT (election_group_id, polling_unit_id) DO UPDATE SET
  applications_count          = GREATEST(0, election_group_polling_units.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count = GREATEST(0, election_group_polling_units.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count = GREATEST(0, election_group_polling_units.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  parties = CASE
    WHEN election_group_polling_units.parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     elem,
                     '{applications_count}',
                     to_jsonb(GREATEST(0, COALESCE((elem->>'applications_count')::int, 0) + sqlc.arg(app_delta)::int))
                   ),
                   '{accepted_applications_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'accepted_applications_count')::int, 0) + sqlc.arg(accepted_delta)::int))
                 ),
                 '{rejected_applications_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'rejected_applications_count')::int, 0) + sqlc.arg(rejected_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(election_group_polling_units.parties) elem
    )
    ELSE election_group_polling_units.parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
      'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
      'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int)
    )
  END,
  updated_at = NOW();

-- name: AdjustElectionGroupWardApplicationCounts :exec
INSERT INTO election_group_wards (
  election_group_id, ward_id, lga_id, state_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  parties
)
SELECT
  sqlc.arg(election_group_id)::bigint,
  sqlc.arg(ward_id)::int,
  w.lga_id, w.state_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  jsonb_build_array(jsonb_build_object(
    'party_id', sqlc.arg(party_id)::smallint,
    'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
    'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
    'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
    'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int)
  ))
FROM wards w
WHERE w.id = sqlc.arg(ward_id)::int
ON CONFLICT (election_group_id, ward_id) DO UPDATE SET
  applications_count                            = GREATEST(0, election_group_wards.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                   = GREATEST(0, election_group_wards.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                   = GREATEST(0, election_group_wards.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count            = GREATEST(0, election_group_wards.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_wards.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_wards.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  parties = CASE
    WHEN election_group_wards.parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         jsonb_set(
                           elem,
                           '{applications_count}',
                           to_jsonb(GREATEST(0, COALESCE((elem->>'applications_count')::int, 0) + sqlc.arg(app_delta)::int))
                         ),
                         '{accepted_applications_count}',
                         to_jsonb(GREATEST(0, COALESCE((elem->>'accepted_applications_count')::int, 0) + sqlc.arg(accepted_delta)::int))
                       ),
                       '{rejected_applications_count}',
                       to_jsonb(GREATEST(0, COALESCE((elem->>'rejected_applications_count')::int, 0) + sqlc.arg(rejected_delta)::int))
                     ),
                     '{ward_supervisor_applications_count}',
                     to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_applications_count')::int, 0) + sqlc.arg(ward_sup_app_delta)::int))
                   ),
                   '{ward_supervisor_accepted_applications_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(ward_sup_accepted_delta)::int))
                 ),
                 '{ward_supervisor_rejected_applications_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(ward_sup_rejected_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(election_group_wards.parties) elem
    )
    ELSE election_group_wards.parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
      'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
      'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
      'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
      'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
      'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int)
    )
  END,
  updated_at = NOW();

-- name: AdjustElectionGroupLGAApplicationCounts :exec
INSERT INTO election_group_lgas (
  election_group_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
  parties
)
SELECT
  sqlc.arg(election_group_id)::bigint,
  sqlc.arg(lga_id)::int,
  l.state_id, l.senatorial_district_id, l.federal_constituency_id,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
  jsonb_build_array(jsonb_build_object(
    'party_id', sqlc.arg(party_id)::smallint,
    'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
    'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
    'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
    'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
    'lga_supervisor_applications_count', GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
    'lga_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
    'lga_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int)
  ))
FROM lgas l
WHERE l.id = sqlc.arg(lga_id)::int
ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
  applications_count                            = GREATEST(0, election_group_lgas.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                   = GREATEST(0, election_group_lgas.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                   = GREATEST(0, election_group_lgas.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count            = GREATEST(0, election_group_lgas.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_lgas.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_lgas.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  lga_supervisor_applications_count             = GREATEST(0, election_group_lgas.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
  lga_supervisor_accepted_applications_count    = GREATEST(0, election_group_lgas.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
  lga_supervisor_rejected_applications_count    = GREATEST(0, election_group_lgas.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
  parties = CASE
    WHEN election_group_lgas.parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         jsonb_set(
                           jsonb_set(
                             jsonb_set(
                               jsonb_set(
                                 elem,
                                 '{applications_count}',
                                 to_jsonb(GREATEST(0, COALESCE((elem->>'applications_count')::int, 0) + sqlc.arg(app_delta)::int))
                               ),
                               '{accepted_applications_count}',
                               to_jsonb(GREATEST(0, COALESCE((elem->>'accepted_applications_count')::int, 0) + sqlc.arg(accepted_delta)::int))
                             ),
                             '{rejected_applications_count}',
                             to_jsonb(GREATEST(0, COALESCE((elem->>'rejected_applications_count')::int, 0) + sqlc.arg(rejected_delta)::int))
                           ),
                           '{ward_supervisor_applications_count}',
                           to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_applications_count')::int, 0) + sqlc.arg(ward_sup_app_delta)::int))
                         ),
                         '{ward_supervisor_accepted_applications_count}',
                         to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(ward_sup_accepted_delta)::int))
                       ),
                       '{ward_supervisor_rejected_applications_count}',
                       to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(ward_sup_rejected_delta)::int))
                     ),
                     '{lga_supervisor_applications_count}',
                     to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_applications_count')::int, 0) + sqlc.arg(lga_sup_app_delta)::int))
                   ),
                   '{lga_supervisor_accepted_applications_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(lga_sup_accepted_delta)::int))
                 ),
                 '{lga_supervisor_rejected_applications_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(lga_sup_rejected_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(election_group_lgas.parties) elem
    )
    ELSE election_group_lgas.parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
      'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
      'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
      'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
      'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
      'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
      'lga_supervisor_applications_count', GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
      'lga_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
      'lga_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int)
    )
  END,
  updated_at = NOW();

-- name: AdjustElectionGroupStateApplicationCounts :exec
INSERT INTO election_group_states (
  election_group_id, state_id,
  applications_count, accepted_applications_count, rejected_applications_count,
  ward_supervisor_applications_count, ward_supervisor_accepted_applications_count, ward_supervisor_rejected_applications_count,
  lga_supervisor_applications_count, lga_supervisor_accepted_applications_count, lga_supervisor_rejected_applications_count,
  state_supervisor_applications_count, state_supervisor_accepted_applications_count, state_supervisor_rejected_applications_count,
  parties
)
VALUES (
  sqlc.arg(election_group_id)::bigint,
  sqlc.arg(state_id)::smallint,
  GREATEST(0, sqlc.arg(app_delta)::int),
  GREATEST(0, sqlc.arg(accepted_delta)::int),
  GREATEST(0, sqlc.arg(rejected_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
  GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int),
  jsonb_build_array(jsonb_build_object(
    'party_id', sqlc.arg(party_id)::smallint,
    'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
    'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
    'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
    'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
    'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
    'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
    'lga_supervisor_applications_count', GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
    'lga_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
    'lga_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
    'state_supervisor_applications_count', GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
    'state_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
    'state_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int)
  ))
)
ON CONFLICT (election_group_id, state_id) DO UPDATE SET
  applications_count                            = GREATEST(0, election_group_states.applications_count + sqlc.arg(app_delta)::int),
  accepted_applications_count                   = GREATEST(0, election_group_states.accepted_applications_count + sqlc.arg(accepted_delta)::int),
  rejected_applications_count                   = GREATEST(0, election_group_states.rejected_applications_count + sqlc.arg(rejected_delta)::int),
  ward_supervisor_applications_count            = GREATEST(0, election_group_states.ward_supervisor_applications_count + sqlc.arg(ward_sup_app_delta)::int),
  ward_supervisor_accepted_applications_count   = GREATEST(0, election_group_states.ward_supervisor_accepted_applications_count + sqlc.arg(ward_sup_accepted_delta)::int),
  ward_supervisor_rejected_applications_count   = GREATEST(0, election_group_states.ward_supervisor_rejected_applications_count + sqlc.arg(ward_sup_rejected_delta)::int),
  lga_supervisor_applications_count             = GREATEST(0, election_group_states.lga_supervisor_applications_count + sqlc.arg(lga_sup_app_delta)::int),
  lga_supervisor_accepted_applications_count    = GREATEST(0, election_group_states.lga_supervisor_accepted_applications_count + sqlc.arg(lga_sup_accepted_delta)::int),
  lga_supervisor_rejected_applications_count    = GREATEST(0, election_group_states.lga_supervisor_rejected_applications_count + sqlc.arg(lga_sup_rejected_delta)::int),
  state_supervisor_applications_count           = GREATEST(0, election_group_states.state_supervisor_applications_count + sqlc.arg(state_sup_app_delta)::int),
  state_supervisor_accepted_applications_count  = GREATEST(0, election_group_states.state_supervisor_accepted_applications_count + sqlc.arg(state_sup_accepted_delta)::int),
  state_supervisor_rejected_applications_count  = GREATEST(0, election_group_states.state_supervisor_rejected_applications_count + sqlc.arg(state_sup_rejected_delta)::int),
  parties = CASE
    WHEN election_group_states.parties @> jsonb_build_array(jsonb_build_object('party_id', sqlc.arg(party_id)::smallint))
    THEN (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'party_id')::bigint = sqlc.arg(party_id)::smallint
          THEN jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         jsonb_set(
                           jsonb_set(
                             jsonb_set(
                               jsonb_set(
                                 jsonb_set(
                                   jsonb_set(
                                     jsonb_set(
                                       elem,
                                       '{applications_count}',
                                       to_jsonb(GREATEST(0, COALESCE((elem->>'applications_count')::int, 0) + sqlc.arg(app_delta)::int))
                                     ),
                                     '{accepted_applications_count}',
                                     to_jsonb(GREATEST(0, COALESCE((elem->>'accepted_applications_count')::int, 0) + sqlc.arg(accepted_delta)::int))
                                   ),
                                   '{rejected_applications_count}',
                                   to_jsonb(GREATEST(0, COALESCE((elem->>'rejected_applications_count')::int, 0) + sqlc.arg(rejected_delta)::int))
                                 ),
                                 '{ward_supervisor_applications_count}',
                                 to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_applications_count')::int, 0) + sqlc.arg(ward_sup_app_delta)::int))
                               ),
                               '{ward_supervisor_accepted_applications_count}',
                               to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(ward_sup_accepted_delta)::int))
                             ),
                             '{ward_supervisor_rejected_applications_count}',
                             to_jsonb(GREATEST(0, COALESCE((elem->>'ward_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(ward_sup_rejected_delta)::int))
                           ),
                           '{lga_supervisor_applications_count}',
                           to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_applications_count')::int, 0) + sqlc.arg(lga_sup_app_delta)::int))
                         ),
                         '{lga_supervisor_accepted_applications_count}',
                         to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(lga_sup_accepted_delta)::int))
                       ),
                       '{lga_supervisor_rejected_applications_count}',
                       to_jsonb(GREATEST(0, COALESCE((elem->>'lga_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(lga_sup_rejected_delta)::int))
                     ),
                     '{state_supervisor_applications_count}',
                     to_jsonb(GREATEST(0, COALESCE((elem->>'state_supervisor_applications_count')::int, 0) + sqlc.arg(state_sup_app_delta)::int))
                   ),
                   '{state_supervisor_accepted_applications_count}',
                   to_jsonb(GREATEST(0, COALESCE((elem->>'state_supervisor_accepted_applications_count')::int, 0) + sqlc.arg(state_sup_accepted_delta)::int))
                 ),
                 '{state_supervisor_rejected_applications_count}',
                 to_jsonb(GREATEST(0, COALESCE((elem->>'state_supervisor_rejected_applications_count')::int, 0) + sqlc.arg(state_sup_rejected_delta)::int))
               )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(election_group_states.parties) elem
    )
    ELSE election_group_states.parties || jsonb_build_object(
      'party_id', sqlc.arg(party_id)::smallint,
      'applications_count', GREATEST(0, sqlc.arg(app_delta)::int),
      'accepted_applications_count', GREATEST(0, sqlc.arg(accepted_delta)::int),
      'rejected_applications_count', GREATEST(0, sqlc.arg(rejected_delta)::int),
      'ward_supervisor_applications_count', GREATEST(0, sqlc.arg(ward_sup_app_delta)::int),
      'ward_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(ward_sup_accepted_delta)::int),
      'ward_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(ward_sup_rejected_delta)::int),
      'lga_supervisor_applications_count', GREATEST(0, sqlc.arg(lga_sup_app_delta)::int),
      'lga_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(lga_sup_accepted_delta)::int),
      'lga_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(lga_sup_rejected_delta)::int),
      'state_supervisor_applications_count', GREATEST(0, sqlc.arg(state_sup_app_delta)::int),
      'state_supervisor_accepted_applications_count', GREATEST(0, sqlc.arg(state_sup_accepted_delta)::int),
      'state_supervisor_rejected_applications_count', GREATEST(0, sqlc.arg(state_sup_rejected_delta)::int)
    )
  END,
  updated_at = NOW();



-- name: RefreshAllElectionPollingUnitStats :exec
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
    COUNT(*)                                              AS total_agents_count,
    COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)        AS total_agents_in_attendance_count,
    SUM(reports_count)                                    AS total_reports_count,
    SUM(updates_count)                                    AS total_updates_count,
    AVG(election_started_at)                              AS average_election_started_at,
    AVG(election_ended_at)                                AS average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS election_practice_test_readiness_percentage
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
    COUNT(*)                   AS total_final_results_uploaded_count,
    COUNT(DISTINCT election_id) AS total_unique_final_results_uploaded_count
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
    array_agg(referral_code) FILTER (WHERE referral_code IS NOT NULL) AS codes
  FROM assignments
  GROUP BY election_group_id, polling_unit_id
),
-- Voters who used an agent code at this PU and then voted
referral_counts AS (
  SELECT
    rc.election_group_id,
    rc.polling_unit_id,
    COUNT(DISTINCT ev.user_id) AS live_voters_referred_by_agent_count
  FROM referral_codes rc
  JOIN users voter ON voter.referred_by_code = ANY(rc.codes)
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
    AVG(arrived_at)                                       AS average_arrival_time,
    AVG(election_started_at)                              AS election_started_at,
    AVG(election_ended_at)                                AS election_ended_at,
    SUM(updates_count)                                    AS updates_count,
    SUM(reports_count)                                    AS reports_count,
    MAX(last_update_at)                                   AS last_update_given_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS election_practice_test_readiness_percentage
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
      PARTITION BY election_group_id, polling_unit_id, party_id, user_id ORDER BY created_at
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
    COUNT(DISTINCT ev.user_id) AS live_voters_referred_by_agent_count
  FROM assignments a
  JOIN users voter ON voter.referred_by_code = a.referral_code
  JOIN election_votes ev ON ev.user_id = voter.id AND ev.election_group_id = a.election_group_id
  WHERE a.referral_code IS NOT NULL
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
        'agents_in_attendance_count',            po.agents_in_attendance_count,
        'average_arrival_time',                  po.average_arrival_time,
        'election_started_at',                   po.election_started_at,
        'election_ended_at',                     po.election_ended_at,
        'updates_count',                         po.updates_count,
        'reports_count',                         po.reports_count,
        'agents_count',                          po.agents_count,
        'final_results_uploaded_count',          COALESCE(pr.final_results_uploaded_count, 0),
        'unique_final_results_uploaded_count',   COALESCE(pr.unique_final_results_uploaded_count, 0),
        'last_update_given_at',                  po.last_update_given_at,
        'average_update_time_interval_in_seconds', COALESCE(ui.avg_interval_seconds, 0),
        'election_practice_test_readiness_percentage', po.election_practice_test_readiness_percentage,
        'live_voters_referred_by_agent_count',   COALESCE(prc.live_voters_referred_by_agent_count, 0)
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
INSERT INTO election_polling_units (
  election_group_id, polling_unit_id,
  state_id, lga_id, ward_id, state_constituency_id, federal_constituency_id, senatorial_district_id,
  unique_final_results_expected,
  total_agents_count, total_agents_in_attendance_count,
  total_reports_count, total_updates_count,
  average_election_started_at, average_election_ended_at,
  election_practice_test_readiness_percentage,
  total_final_results_uploaded_count, total_unique_final_results_uploaded_count,
  live_voters_referred_by_agent_count,
  parties
)
SELECT
  oa.election_group_id, oa.polling_unit_id,
  pu.state_id, pu.lga_id, pu.ward_id,
  w.state_assembly_constituency_id, l.federal_constituency_id, l.senatorial_district_id,
  COALESCE(ec.unique_final_results_expected, 0),
  oa.total_agents_count, oa.total_agents_in_attendance_count,
  oa.total_reports_count, oa.total_updates_count,
  oa.average_election_started_at, oa.average_election_ended_at,
  oa.election_practice_test_readiness_percentage,
  COALESCE(ra.total_final_results_uploaded_count, 0),
  COALESCE(ra.total_unique_final_results_uploaded_count, 0),
  COALESCE(rc.live_voters_referred_by_agent_count, 0),
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
  total_agents_count = EXCLUDED.total_agents_count,
  total_agents_in_attendance_count = EXCLUDED.total_agents_in_attendance_count,
  total_reports_count = EXCLUDED.total_reports_count,
  total_updates_count = EXCLUDED.total_updates_count,
  average_election_started_at = EXCLUDED.average_election_started_at,
  average_election_ended_at = EXCLUDED.average_election_ended_at,
  election_practice_test_readiness_percentage = EXCLUDED.election_practice_test_readiness_percentage,
  total_final_results_uploaded_count = EXCLUDED.total_final_results_uploaded_count,
  total_unique_final_results_uploaded_count = EXCLUDED.total_unique_final_results_uploaded_count,
  live_voters_referred_by_agent_count = EXCLUDED.live_voters_referred_by_agent_count,
  parties = EXCLUDED.parties,
  updated_at = NOW();

-- name: RefreshAllElectionWardStats :exec
-- Aggregates from election_polling_units (one level up from PUs).
WITH epu_agg AS (
  SELECT
    election_group_id, ward_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(total_agents_count)                          AS pu_total_agents_count,
    SUM(total_agents_in_attendance_count)            AS pu_total_agents_in_attendance_count,
    SUM(total_reports_count)                         AS pu_total_reports_count,
    SUM(total_updates_count)                         AS pu_total_updates_count,
    AVG(average_election_started_at)                 AS pu_average_election_started_at,
    AVG(average_election_ended_at)                   AS pu_average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(total_final_results_uploaded_count)          AS pu_total_final_results_uploaded_count,
    SUM(total_unique_final_results_uploaded_count)   AS pu_total_unique_final_results_uploaded_count,
    SUM(live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE total_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE total_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE total_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE total_unique_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters
  FROM election_polling_units
  GROUP BY election_group_id, ward_id, lga_id, state_id
),
-- Expand per-party JSONB from all PUs in each ward
party_expanded AS (
  SELECT
    epu.election_group_id, epu.ward_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'agents_in_attendance_count')::int                      AS agents_in_attendance_count,
    (p.value->>'agents_count')::int                                   AS agents_count,
    (p.value->>'updates_count')::int                                  AS updates_count,
    (p.value->>'reports_count')::int                                  AS reports_count,
    (p.value->>'final_results_uploaded_count')::int                   AS final_results_uploaded_count,
    (p.value->>'unique_final_results_uploaded_count')::int            AS unique_final_results_uploaded_count,
    (p.value->>'average_update_time_interval_in_seconds')::float      AS avg_interval_seconds,
    (p.value->>'election_practice_test_readiness_percentage')::float  AS readiness_pct,
    (p.value->>'live_voters_referred_by_agent_count')::int            AS referrals,
    epu.total_reports_count > 0                AS has_reports,
    epu.total_updates_count > 0               AS has_updates,
    epu.total_agents_in_attendance_count > 0  AS has_attendance,
    epu.average_election_started_at IS NOT NULL AS election_started,
    epu.average_election_ended_at IS NOT NULL   AS election_ended,
    epu.total_unique_final_results_uploaded_count > 0 AS has_results,
    epu.live_voters_referred_by_agent_count > 0 AS has_referrals
  FROM election_polling_units epu,
       jsonb_array_elements(epu.parties) AS p(value)
),
party_agg AS (
  SELECT
    election_group_id, ward_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    COUNT(*) FILTER (WHERE has_reports)     AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE has_updates)     AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE has_attendance)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE election_started) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE election_ended)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE has_results)      AS total_pu_unique_final_results_uploaded_count,
    COUNT(*) FILTER (WHERE has_referrals)    AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, ward_id, party_id
),
party_json AS (
  SELECT
    election_group_id, ward_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, ward_id
)
INSERT INTO election_wards (
  election_group_id, ward_id, lga_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.ward_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
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
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: RefreshAllElectionLGAStats :exec
-- Aggregates from election_wards grouped by lga_id.
WITH src_agg AS (
  SELECT
    election_group_id, lga_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_total_agents_count)                       AS pu_total_agents_count,
    SUM(pu_total_agents_in_attendance_count)         AS pu_total_agents_in_attendance_count,
    SUM(pu_total_reports_count)                      AS pu_total_reports_count,
    SUM(pu_total_updates_count)                      AS pu_total_updates_count,
    AVG(pu_average_election_started_at)              AS pu_average_election_started_at,
    AVG(pu_average_election_ended_at)                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_total_final_results_uploaded_count)       AS pu_total_final_results_uploaded_count,
    SUM(pu_total_unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_wards
  WHERE lga_id IS NOT NULL
  GROUP BY election_group_id, lga_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.lga_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_total_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_total_agents_count')::int                           AS agents_count,
    (p.value->>'pu_total_updates_count')::int                          AS updates_count,
    (p.value->>'pu_total_reports_count')::int                          AS reports_count,
    (p.value->>'pu_total_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'pu_total_unique_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded_count')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_wards s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.lga_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, lga_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS pu_total_unique_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded_count,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, lga_id, party_id
),
party_json AS (
  SELECT
    election_group_id, lga_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, lga_id
)
INSERT INTO election_lgas (
  election_group_id, lga_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.lga_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, lga_id)
ON CONFLICT (election_group_id, lga_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: RefreshAllElectionStateConstituencyStats :exec
-- Aggregates from election_polling_units grouped by state_constituency_id.
WITH src_agg AS (
  SELECT
    election_group_id, state_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_total_agents_count)                       AS pu_total_agents_count,
    SUM(pu_total_agents_in_attendance_count)         AS pu_total_agents_in_attendance_count,
    SUM(pu_total_reports_count)                      AS pu_total_reports_count,
    SUM(pu_total_updates_count)                      AS pu_total_updates_count,
    AVG(pu_average_election_started_at)              AS pu_average_election_started_at,
    AVG(pu_average_election_ended_at)                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_total_final_results_uploaded_count)       AS pu_total_final_results_uploaded_count,
    SUM(pu_total_unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_polling_units
  WHERE state_constituency_id IS NOT NULL
  GROUP BY election_group_id, state_constituency_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_constituency_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_total_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_total_agents_count')::int                           AS agents_count,
    (p.value->>'pu_total_updates_count')::int                          AS updates_count,
    (p.value->>'pu_total_reports_count')::int                          AS reports_count,
    (p.value->>'pu_total_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'pu_total_unique_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded_count')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_polling_units s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.state_constituency_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, state_constituency_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS pu_total_unique_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded_count,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_constituency_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_constituency_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_constituency_id
)
INSERT INTO election_state_constituencies (
  election_group_id, state_constituency_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_constituency_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_constituency_id)
ON CONFLICT (election_group_id, state_constituency_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: RefreshAllElectionFederalConstituencyStats :exec
-- Aggregates from election_lgas grouped by federal_constituency_id.
WITH src_agg AS (
  SELECT
    election_group_id, federal_constituency_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_total_agents_count)                       AS pu_total_agents_count,
    SUM(pu_total_agents_in_attendance_count)         AS pu_total_agents_in_attendance_count,
    SUM(pu_total_reports_count)                      AS pu_total_reports_count,
    SUM(pu_total_updates_count)                      AS pu_total_updates_count,
    AVG(pu_average_election_started_at)              AS pu_average_election_started_at,
    AVG(pu_average_election_ended_at)                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_total_final_results_uploaded_count)       AS pu_total_final_results_uploaded_count,
    SUM(pu_total_unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_lgas
  WHERE federal_constituency_id IS NOT NULL
  GROUP BY election_group_id, federal_constituency_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.federal_constituency_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_total_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_total_agents_count')::int                           AS agents_count,
    (p.value->>'pu_total_updates_count')::int                          AS updates_count,
    (p.value->>'pu_total_reports_count')::int                          AS reports_count,
    (p.value->>'pu_total_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'pu_total_unique_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded_count')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.federal_constituency_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, federal_constituency_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS pu_total_unique_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded_count,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, federal_constituency_id, party_id
),
party_json AS (
  SELECT
    election_group_id, federal_constituency_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, federal_constituency_id
)
INSERT INTO election_federal_constituencies (
  election_group_id, federal_constituency_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.federal_constituency_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, federal_constituency_id)
ON CONFLICT (election_group_id, federal_constituency_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: RefreshAllElectionSenatorialDistrictStats :exec
-- Aggregates from election_lgas grouped by senatorial_district_id.
WITH src_agg AS (
  SELECT
    election_group_id, senatorial_district_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_total_agents_count)                       AS pu_total_agents_count,
    SUM(pu_total_agents_in_attendance_count)         AS pu_total_agents_in_attendance_count,
    SUM(pu_total_reports_count)                      AS pu_total_reports_count,
    SUM(pu_total_updates_count)                      AS pu_total_updates_count,
    AVG(pu_average_election_started_at)              AS pu_average_election_started_at,
    AVG(pu_average_election_ended_at)                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_total_final_results_uploaded_count)       AS pu_total_final_results_uploaded_count,
    SUM(pu_total_unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_lgas
  WHERE senatorial_district_id IS NOT NULL
  GROUP BY election_group_id, senatorial_district_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.senatorial_district_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_total_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_total_agents_count')::int                           AS agents_count,
    (p.value->>'pu_total_updates_count')::int                          AS updates_count,
    (p.value->>'pu_total_reports_count')::int                          AS reports_count,
    (p.value->>'pu_total_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'pu_total_unique_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded_count')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.senatorial_district_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, senatorial_district_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS pu_total_unique_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded_count,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, senatorial_district_id, party_id
),
party_json AS (
  SELECT
    election_group_id, senatorial_district_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, senatorial_district_id
)
INSERT INTO election_senatorial_districts (
  election_group_id, senatorial_district_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.senatorial_district_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, senatorial_district_id)
ON CONFLICT (election_group_id, senatorial_district_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: RefreshAllElectionStateStats :exec
-- Aggregates from election_lgas grouped by state_id.
WITH src_agg AS (
  SELECT
    election_group_id, state_id,
    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_total_agents_count)                       AS pu_total_agents_count,
    SUM(pu_total_agents_in_attendance_count)         AS pu_total_agents_in_attendance_count,
    SUM(pu_total_reports_count)                      AS pu_total_reports_count,
    SUM(pu_total_updates_count)                      AS pu_total_updates_count,
    AVG(pu_average_election_started_at)              AS pu_average_election_started_at,
    AVG(pu_average_election_ended_at)                AS pu_average_election_ended_at,
    COALESCE(AVG(pu_election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(pu_total_final_results_uploaded_count)       AS pu_total_final_results_uploaded_count,
    SUM(pu_total_unique_final_results_uploaded_count) AS pu_total_unique_final_results_uploaded_count,
    SUM(pu_live_voters_referred_by_agent_count)      AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)                       AS total_pu_with_reports,
    SUM(total_pu_with_updates)                       AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance)          AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started)         AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)           AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_final_results_uploaded)      AS total_pu_unique_final_results_uploaded,
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters
  FROM election_lgas
  WHERE state_id IS NOT NULL
  GROUP BY election_group_id, state_id
),
party_expanded AS (
  SELECT
    s.election_group_id, s.state_id,
    (p.value->>'party_id')::bigint                                    AS party_id,
    (p.value->>'pu_total_agents_in_attendance_count')::int             AS agents_in_attendance_count,
    (p.value->>'pu_total_agents_count')::int                           AS agents_count,
    (p.value->>'pu_total_updates_count')::int                          AS updates_count,
    (p.value->>'pu_total_reports_count')::int                          AS reports_count,
    (p.value->>'pu_total_final_results_uploaded_count')::int           AS final_results_uploaded_count,
    (p.value->>'pu_total_unique_final_results_uploaded_count')::int    AS unique_results_uploaded_count,
    (p.value->>'pu_average_update_time_interval_in_seconds')::float    AS avg_interval_seconds,
    (p.value->>'pu_election_practice_test_readiness_percentage')::float AS readiness_pct,
    (p.value->>'pu_live_voters_referred_by_agent_count')::int          AS referrals,
    (p.value->>'total_pu_with_reports')::int                           AS total_pu_with_reports,
    (p.value->>'total_pu_with_updates')::int                           AS total_pu_with_updates,
    (p.value->>'total_pu_with_agents_in_attendance')::int              AS total_pu_with_agents_in_attendance,
    (p.value->>'total_pu_where_election_has_started')::int             AS total_pu_where_election_has_started,
    (p.value->>'total_pu_where_election_has_ended')::int               AS total_pu_where_election_has_ended,
    (p.value->>'total_pu_unique_final_results_uploaded_count')::int    AS total_pu_unique_results_uploaded,
    (p.value->>'total_pu_where_agents_referred_live_voters')::int      AS total_pu_referrals
  FROM election_lgas s,
       jsonb_array_elements(s.parties) AS p(value)
  WHERE s.state_id IS NOT NULL
),
party_agg AS (
  SELECT
    election_group_id, state_id, party_id,
    SUM(agents_in_attendance_count)        AS pu_total_agents_in_attendance_count,
    SUM(agents_count)                      AS pu_total_agents_count,
    SUM(updates_count)                     AS pu_total_updates_count,
    SUM(reports_count)                     AS pu_total_reports_count,
    SUM(final_results_uploaded_count)      AS pu_total_final_results_uploaded_count,
    SUM(unique_results_uploaded_count)     AS pu_total_unique_final_results_uploaded_count,
    COALESCE(AVG(avg_interval_seconds), 0) AS pu_average_update_time_interval_in_seconds,
    COALESCE(AVG(readiness_pct), 0)        AS pu_election_practice_test_readiness_percentage,
    SUM(referrals)                         AS pu_live_voters_referred_by_agent_count,
    SUM(total_pu_with_reports)             AS total_pu_with_reports,
    SUM(total_pu_with_updates)             AS total_pu_with_updates,
    SUM(total_pu_with_agents_in_attendance) AS total_pu_with_agents_in_attendance,
    SUM(total_pu_where_election_has_started) AS total_pu_where_election_has_started,
    SUM(total_pu_where_election_has_ended)   AS total_pu_where_election_has_ended,
    SUM(total_pu_unique_results_uploaded)    AS total_pu_unique_final_results_uploaded_count,
    SUM(total_pu_referrals)                  AS total_pu_where_agents_referred_live_voters
  FROM party_expanded
  GROUP BY election_group_id, state_id, party_id
),
party_json AS (
  SELECT
    election_group_id, state_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'party_id',                              party_id,
      'pu_total_agents_in_attendance_count',   pu_total_agents_in_attendance_count,
      'pu_average_arrival_time',               NULL,
      'pu_average_election_started_at',        NULL,
      'pu_average_election_ended_at',          NULL,
      'pu_total_updates_count',                pu_total_updates_count,
      'pu_total_reports_count',                pu_total_reports_count,
      'pu_total_agents_count',                 pu_total_agents_count,
      'pu_total_final_results_uploaded_count', pu_total_final_results_uploaded_count,
      'pu_total_unique_final_results_uploaded_count', pu_total_unique_final_results_uploaded_count,
      'pu_average_update_time_interval_in_seconds', pu_average_update_time_interval_in_seconds,
      'pu_election_practice_test_readiness_percentage', pu_election_practice_test_readiness_percentage,
      'pu_live_voters_referred_by_agent_count', pu_live_voters_referred_by_agent_count,
      'total_pu_with_reports',                 total_pu_with_reports,
      'total_pu_with_updates',                 total_pu_with_updates,
      'total_pu_with_agents_in_attendance',    total_pu_with_agents_in_attendance,
      'total_pu_where_election_has_started',   total_pu_where_election_has_started,
      'total_pu_where_election_has_ended',     total_pu_where_election_has_ended,
      'total_pu_unique_final_results_uploaded_count', total_pu_unique_final_results_uploaded_count,
      'total_pu_where_agents_referred_live_voters', total_pu_where_agents_referred_live_voters
    )), '[]'::jsonb) AS parties
  FROM party_agg
  GROUP BY election_group_id, state_id
)
INSERT INTO election_states (
  election_group_id, state_id,
  unique_final_results_expected,
  pu_total_agents_count, pu_total_agents_in_attendance_count,
  pu_total_reports_count, pu_total_updates_count,
  pu_average_election_started_at, pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count, pu_total_unique_final_results_uploaded_count,
  pu_live_voters_referred_by_agent_count,
  total_pu_with_reports, total_pu_with_updates, total_pu_with_agents_in_attendance,
  total_pu_where_election_has_started, total_pu_where_election_has_ended,
  total_pu_unique_final_results_uploaded, total_pu_where_agents_referred_live_voters,
  parties
)
SELECT
  a.election_group_id, a.state_id,
  a.unique_final_results_expected,
  a.pu_total_agents_count, a.pu_total_agents_in_attendance_count,
  a.pu_total_reports_count, a.pu_total_updates_count,
  a.pu_average_election_started_at, a.pu_average_election_ended_at,
  a.pu_election_practice_test_readiness_percentage,
  a.pu_total_final_results_uploaded_count, a.pu_total_unique_final_results_uploaded_count,
  a.pu_live_voters_referred_by_agent_count,
  a.total_pu_with_reports, a.total_pu_with_updates, a.total_pu_with_agents_in_attendance,
  a.total_pu_where_election_has_started, a.total_pu_where_election_has_ended,
  a.total_pu_unique_final_results_uploaded, a.total_pu_where_agents_referred_live_voters,
  COALESCE(pj.parties, '[]'::jsonb)
FROM src_agg a
LEFT JOIN party_json pj USING (election_group_id, state_id)
ON CONFLICT (election_group_id, state_id) DO UPDATE SET
  unique_final_results_expected = EXCLUDED.unique_final_results_expected,
  pu_total_agents_count = EXCLUDED.pu_total_agents_count,
  pu_total_agents_in_attendance_count = EXCLUDED.pu_total_agents_in_attendance_count,
  pu_total_reports_count = EXCLUDED.pu_total_reports_count,
  pu_total_updates_count = EXCLUDED.pu_total_updates_count,
  pu_average_election_started_at = EXCLUDED.pu_average_election_started_at,
  pu_average_election_ended_at = EXCLUDED.pu_average_election_ended_at,
  pu_election_practice_test_readiness_percentage = EXCLUDED.pu_election_practice_test_readiness_percentage,
  pu_total_final_results_uploaded_count = EXCLUDED.pu_total_final_results_uploaded_count,
  pu_total_unique_final_results_uploaded_count = EXCLUDED.pu_total_unique_final_results_uploaded_count,
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

-- name: GetElectionPollingUnitStats :one
SELECT * FROM election_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2;

-- name: ListElectionPollingUnitStatsByGroup :many
SELECT * FROM election_polling_units
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY polling_unit_id;

-- name: GetElectionWardStats :one
SELECT * FROM election_wards
WHERE election_group_id = $1 AND ward_id = $2;

-- name: ListElectionWardStatsByGroup :many
SELECT * FROM election_wards
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY ward_id;

-- name: GetElectionLGAStats :one
SELECT * FROM election_lgas
WHERE election_group_id = $1 AND lga_id = $2;

-- name: ListElectionLGAStatsByGroup :many
SELECT * FROM election_lgas
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY lga_id;

-- name: GetElectionStateConstituencyStats :one
SELECT * FROM election_state_constituencies
WHERE election_group_id = $1 AND state_constituency_id = $2;

-- name: ListElectionStateConstituencyStatsByGroup :many
SELECT * FROM election_state_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY state_constituency_id;

-- name: GetElectionFederalConstituencyStats :one
SELECT * FROM election_federal_constituencies
WHERE election_group_id = $1 AND federal_constituency_id = $2;

-- name: ListElectionFederalConstituencyStatsByGroup :many
SELECT * FROM election_federal_constituencies
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR senatorial_district_id = sqlc.narg('senatorial_district_id'))
ORDER BY federal_constituency_id;

-- name: GetElectionSenatorialDistrictStats :one
SELECT * FROM election_senatorial_districts
WHERE election_group_id = $1 AND senatorial_district_id = $2;

-- name: ListElectionSenatorialDistrictStatsByGroup :many
SELECT * FROM election_senatorial_districts
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY senatorial_district_id;

-- name: GetElectionStateStats :one
SELECT * FROM election_states
WHERE election_group_id = $1 AND state_id = $2;

-- name: ListElectionStateStatsByGroup :many
SELECT * FROM election_states
WHERE election_group_id = $1
ORDER BY state_id;

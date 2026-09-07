-- name: ListPollingAgentPerformanceStats :many
SELECT
  pua.id,
  pua.user_id,
  pua.party_id,
  pua.election_group_id,
  COALESCE(pu.state_id, 0)::smallint AS state_id,
  COALESCE(pu.lga_id, 0)::int AS lga_id,
  COALESCE(pu.ward_id, 0)::int AS ward_id,
  pua.polling_unit_id,
  TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::varchar AS user_name,
  COALESCE(u.avatar, '')::varchar AS avatar_url,
  pua.role_type,
  pua.election_practice_test_readiness_percentage::numeric(5,2) AS readiness_pct,
  COALESCE(TO_CHAR(pua.arrived_at, 'HH12:MI AM'), '')::varchar AS arrived_at,
  COALESCE(TO_CHAR(pua.election_started_at, 'HH12:MI AM'), '')::varchar AS election_started_at,
  COALESCE(TO_CHAR(pua.election_ended_at, 'HH12:MI AM'), '')::varchar AS election_ended_at,
  pua.updates_count AS updates_given,
  pua.reports_count AS reports_given,
  pua.live_voters_referred_count AS live_voters_referred,
  CONCAT(pua.results_submitted_count, '/', COALESCE(egpu.unique_final_results_expected, 1))::varchar AS results_uploaded,
  COALESCE(ae.total_earned_kobo, pua.earned_amount_kobo, 0)::bigint AS earnings_kobo,
  CONCAT('₦', TO_CHAR(COALESCE(ae.total_earned_kobo, pua.earned_amount_kobo, 0) / 100.0, 'FM999,999,999,990.00'))::varchar AS earnings_formatted,
  (pua.completed_at IS NOT NULL)::boolean AS completion_status,
  COALESCE(ae.status = 'requested' OR ae.requested_at IS NOT NULL, false)::boolean AS requested_payout,
  COALESCE(ae.status = 'paid' OR ae.paid_at IS NOT NULL, false)::boolean AS paid,
  COALESCE(pu.state_name, '')::varchar AS state_name,
  COALESCE(pu.lga_name, '')::varchar AS lga_name,
  COALESCE(pu.ward_name, '')::varchar AS ward_name,
  COALESCE(pu.name, '')::varchar AS polling_unit_name,
  COALESCE(pu.pu_code, pu.code, '')::varchar AS polling_unit_code
FROM polling_unit_assignments pua
JOIN users u ON u.id = pua.user_id
LEFT JOIN polling_units pu ON pu.id = pua.polling_unit_id
LEFT JOIN agent_earnings ae ON ae.user_id = pua.user_id AND ae.election_group_id = pua.election_group_id AND ae.role_type = pua.role_type
LEFT JOIN election_group_polling_units egpu ON egpu.election_group_id = pua.election_group_id AND egpu.polling_unit_id = pua.polling_unit_id
WHERE
  (sqlc.arg(party_id)::smallint = 0 OR pua.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR pua.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(state_id)::smallint = 0 OR pu.state_id = sqlc.arg(state_id)) AND
  (sqlc.arg(lga_id)::int = 0 OR pu.lga_id = sqlc.arg(lga_id)) AND
  (sqlc.arg(ward_id)::int = 0 OR pu.ward_id = sqlc.arg(ward_id)) AND
  (sqlc.arg(search_query)::varchar = '' OR u.first_name ILIKE '%' || sqlc.arg(search_query) || '%' OR u.last_name ILIKE '%' || sqlc.arg(search_query) || '%' OR pu.pu_code ILIKE '%' || sqlc.arg(search_query) || '%' OR pu.code ILIKE '%' || sqlc.arg(search_query) || '%') AND
  (sqlc.arg(cursor_id)::bigint = 0 OR pua.id < sqlc.arg(cursor_id))
ORDER BY pua.id DESC
LIMIT sqlc.arg(limit_val)::int;

-- name: ListWardSupervisorPerformanceStats :many
SELECT
  wes.id,
  wes.user_id,
  wes.party_id,
  wes.election_group_id,
  wes.state_id,
  wes.lga_id,
  wes.ward_id,
  0::int AS polling_unit_id,
  TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::varchar AS user_name,
  COALESCE(u.avatar, '')::varchar AS avatar_url,
  wes.role_type,
  100::numeric(5,2) AS readiness_pct,
  COALESCE(TO_CHAR(wes.arrived_at, 'HH12:MI AM'), '')::varchar AS arrived_at,
  COALESCE(TO_CHAR(egw.pu_average_election_started_at, 'HH12:MI AM'), '')::varchar AS election_started_at,
  COALESCE(TO_CHAR(egw.pu_average_election_ended_at, 'HH12:MI AM'), '')::varchar AS election_ended_at,
  COALESCE(ae.total_earned_kobo, wes.earned_amount_kobo, 0)::bigint AS earnings_kobo,
  CONCAT('₦', TO_CHAR(COALESCE(ae.total_earned_kobo, wes.earned_amount_kobo, 0) / 100.0, 'FM999,999,999,990.00'))::varchar AS earnings_formatted,
  (wes.completed_at IS NOT NULL)::boolean AS completion_status,
  COALESCE(ae.status = 'requested' OR ae.requested_at IS NOT NULL, false)::boolean AS requested_payout,
  COALESCE(ae.status = 'paid' OR ae.paid_at IS NOT NULL, false)::boolean AS paid,
  COALESCE(w.state_name, '')::varchar AS state_name,
  COALESCE(w.lga_name, '')::varchar AS lga_name,
  COALESCE(w.name, '')::varchar AS ward_name
FROM ward_election_supervisors wes
JOIN users u ON u.id = wes.user_id
LEFT JOIN wards w ON w.id = wes.ward_id
LEFT JOIN agent_earnings ae ON ae.user_id = wes.user_id AND ae.election_group_id = wes.election_group_id AND ae.role_type = wes.role_type
LEFT JOIN election_group_wards egw ON egw.election_group_id = wes.election_group_id AND egw.ward_id = wes.ward_id
WHERE
  (sqlc.arg(party_id)::smallint = 0 OR wes.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR wes.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(state_id)::smallint = 0 OR wes.state_id = sqlc.arg(state_id)) AND
  (sqlc.arg(lga_id)::int = 0 OR wes.lga_id = sqlc.arg(lga_id)) AND
  (sqlc.arg(ward_id)::int = 0 OR wes.ward_id = sqlc.arg(ward_id)) AND
  (sqlc.arg(search_query)::varchar = '' OR u.first_name ILIKE '%' || sqlc.arg(search_query) || '%' OR u.last_name ILIKE '%' || sqlc.arg(search_query) || '%') AND
  (sqlc.arg(cursor_id)::bigint = 0 OR wes.id < sqlc.arg(cursor_id))
ORDER BY wes.id DESC
LIMIT sqlc.arg(limit_val)::int;

-- name: ListLGASupervisorPerformanceStats :many
SELECT
  les.id,
  les.user_id,
  les.party_id,
  les.election_group_id,
  les.state_id,
  les.lga_id,
  0::int AS ward_id,
  0::int AS polling_unit_id,
  TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::varchar AS user_name,
  COALESCE(u.avatar, '')::varchar AS avatar_url,
  les.role_type,
  100::numeric(5,2) AS readiness_pct,
  COALESCE(TO_CHAR(les.arrived_at, 'HH12:MI AM'), '')::varchar AS arrived_at,
  COALESCE(TO_CHAR(egl.pu_average_election_started_at, 'HH12:MI AM'), '')::varchar AS election_started_at,
  COALESCE(TO_CHAR(egl.pu_average_election_ended_at, 'HH12:MI AM'), '')::varchar AS election_ended_at,
  COALESCE(ae.total_earned_kobo, les.earned_amount_kobo, 0)::bigint AS earnings_kobo,
  CONCAT('₦', TO_CHAR(COALESCE(ae.total_earned_kobo, les.earned_amount_kobo, 0) / 100.0, 'FM999,999,999,990.00'))::varchar AS earnings_formatted,
  (les.completed_at IS NOT NULL)::boolean AS completion_status,
  COALESCE(ae.status = 'requested' OR ae.requested_at IS NOT NULL, false)::boolean AS requested_payout,
  COALESCE(ae.status = 'paid' OR ae.paid_at IS NOT NULL, false)::boolean AS paid,
  COALESCE(l.state_name, '')::varchar AS state_name,
  COALESCE(l.name, '')::varchar AS lga_name
FROM lga_election_supervisors les
JOIN users u ON u.id = les.user_id
LEFT JOIN lgas l ON l.id = les.lga_id
LEFT JOIN agent_earnings ae ON ae.user_id = les.user_id AND ae.election_group_id = les.election_group_id AND ae.role_type = les.role_type
LEFT JOIN election_group_lgas egl ON egl.election_group_id = les.election_group_id AND egl.lga_id = les.lga_id
WHERE
  (sqlc.arg(party_id)::smallint = 0 OR les.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR les.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(state_id)::smallint = 0 OR les.state_id = sqlc.arg(state_id)) AND
  (sqlc.arg(lga_id)::int = 0 OR les.lga_id = sqlc.arg(lga_id)) AND
  (sqlc.arg(search_query)::varchar = '' OR u.first_name ILIKE '%' || sqlc.arg(search_query) || '%' OR u.last_name ILIKE '%' || sqlc.arg(search_query) || '%') AND
  (sqlc.arg(cursor_id)::bigint = 0 OR les.id < sqlc.arg(cursor_id))
ORDER BY les.id DESC
LIMIT sqlc.arg(limit_val)::int;

-- name: ListStateSupervisorPerformanceStats :many
SELECT
  ses.id,
  ses.user_id,
  ses.party_id,
  ses.election_group_id,
  ses.state_id,
  0::int AS lga_id,
  0::int AS ward_id,
  0::int AS polling_unit_id,
  TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::varchar AS user_name,
  COALESCE(u.avatar, '')::varchar AS avatar_url,
  ses.role_type,
  100::numeric(5,2) AS readiness_pct,
  COALESCE(TO_CHAR(ses.arrived_at, 'HH12:MI AM'), '')::varchar AS arrived_at,
  COALESCE(TO_CHAR(egs.pu_average_election_started_at, 'HH12:MI AM'), '')::varchar AS election_started_at,
  COALESCE(TO_CHAR(egs.pu_average_election_ended_at, 'HH12:MI AM'), '')::varchar AS election_ended_at,
  COALESCE(ae.total_earned_kobo, ses.earned_amount_kobo, 0)::bigint AS earnings_kobo,
  CONCAT('₦', TO_CHAR(COALESCE(ae.total_earned_kobo, ses.earned_amount_kobo, 0) / 100.0, 'FM999,999,999,990.00'))::varchar AS earnings_formatted,
  (ses.completed_at IS NOT NULL)::boolean AS completion_status,
  COALESCE(ae.status = 'requested' OR ae.requested_at IS NOT NULL, false)::boolean AS requested_payout,
  COALESCE(ae.status = 'paid' OR ae.paid_at IS NOT NULL, false)::boolean AS paid,
  COALESCE(s.name, '')::varchar AS state_name
FROM state_election_supervisors ses
JOIN users u ON u.id = ses.user_id
LEFT JOIN c_states s ON s.id = ses.state_id
LEFT JOIN agent_earnings ae ON ae.user_id = ses.user_id AND ae.election_group_id = ses.election_group_id AND ae.role_type = ses.role_type
LEFT JOIN election_group_states egs ON egs.election_group_id = ses.election_group_id AND egs.state_id = ses.state_id
WHERE
  (sqlc.arg(party_id)::smallint = 0 OR ses.party_id = sqlc.arg(party_id)) AND
  (sqlc.arg(election_group_id)::bigint = 0 OR ses.election_group_id = sqlc.arg(election_group_id)) AND
  (sqlc.arg(state_id)::smallint = 0 OR ses.state_id = sqlc.arg(state_id)) AND
  (sqlc.arg(search_query)::varchar = '' OR u.first_name ILIKE '%' || sqlc.arg(search_query) || '%' OR u.last_name ILIKE '%' || sqlc.arg(search_query) || '%') AND
  (sqlc.arg(cursor_id)::bigint = 0 OR ses.id < sqlc.arg(cursor_id))
ORDER BY ses.id DESC
LIMIT sqlc.arg(limit_val)::int;

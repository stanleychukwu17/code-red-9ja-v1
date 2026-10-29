-- =====================================================
-- READ QUERIES: Base Polling Unit Stats
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

-- =====================================================
-- DYNAMIC ROLLUP QUERIES: Ward, LGA, State (Base)
-- =====================================================

-- name: GetElectionGroupWardStats :one
SELECT
  egpu.election_group_id,
  egpu.ward_id,
  egpu.lga_id,
  egpu.state_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.ward_id = egpu.ward_id), 0)::int AS ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = sqlc.arg('election_group_id')::int AND egpu.ward_id = sqlc.arg('ward_id')::int
GROUP BY egpu.election_group_id, egpu.ward_id, egpu.lga_id, egpu.state_id;

-- name: ListElectionGroupWardStatsByGroup :many
SELECT
  egpu.election_group_id,
  egpu.ward_id,
  egpu.lga_id,
  egpu.state_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.ward_id = egpu.ward_id), 0)::int AS ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('lga_id')::int IS NULL OR egpu.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR egpu.state_id = sqlc.narg('state_id'))
GROUP BY egpu.election_group_id, egpu.ward_id, egpu.lga_id, egpu.state_id
ORDER BY egpu.ward_id;

-- name: GetElectionGroupLGAStats :one
SELECT
  egpu.election_group_id,
  egpu.lga_id,
  egpu.state_id,
  egpu.senatorial_district_id,
  egpu.federal_constituency_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.lga_id = egpu.lga_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.lga_id = egpu.lga_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.lga_id = egpu.lga_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = sqlc.arg('election_group_id')::int AND egpu.lga_id = sqlc.arg('lga_id')::int
GROUP BY egpu.election_group_id, egpu.lga_id, egpu.state_id, egpu.senatorial_district_id, egpu.federal_constituency_id;

-- name: ListElectionGroupLGAStatsByGroup :many
SELECT
  egpu.election_group_id,
  egpu.lga_id,
  egpu.state_id,
  egpu.senatorial_district_id,
  egpu.federal_constituency_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.lga_id = egpu.lga_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.lga_id = egpu.lga_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.lga_id = egpu.lga_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR egpu.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR egpu.senatorial_district_id = sqlc.narg('senatorial_district_id'))
GROUP BY egpu.election_group_id, egpu.lga_id, egpu.state_id, egpu.senatorial_district_id, egpu.federal_constituency_id
ORDER BY egpu.lga_id;

-- name: GetElectionGroupStateStats :one
SELECT
  egpu.election_group_id,
  egpu.state_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egpu.election_group_id AND ses.state_id = egpu.state_id), 0)::int AS state_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.state_id = egpu.state_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT les.lga_id)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.state_id = egpu.state_id), 0)::int AS unique_lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.state_id = egpu.state_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.state_id = egpu.state_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = sqlc.arg('election_group_id')::int AND egpu.state_id = sqlc.arg('state_id')::smallint
GROUP BY egpu.election_group_id, egpu.state_id;

-- name: ListElectionGroupStateStatsByGroup :many
SELECT
  egpu.election_group_id,
  egpu.state_id,
  COALESCE(SUM(egpu.unique_final_results_expected), 0)::int AS unique_final_results_expected,
  COALESCE(SUM(egpu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egpu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egpu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egpu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egpu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egpu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egpu.polling_unit_id) FILTER (WHERE egpu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egpu.election_group_id AND ses.state_id = egpu.state_id), 0)::int AS state_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.state_id = egpu.state_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT les.lga_id)::int FROM lga_election_supervisors les WHERE les.election_group_id = egpu.election_group_id AND les.state_id = egpu.state_id), 0)::int AS unique_lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.state_id = egpu.state_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egpu.election_group_id AND wes.state_id = egpu.state_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_polling_units egpu
WHERE egpu.election_group_id = $1
GROUP BY egpu.election_group_id, egpu.state_id
ORDER BY egpu.state_id;

-- =====================================================
-- READ QUERIES: Normalized Party Stats Polling Units
-- =====================================================

-- name: GetElectionGroupPartyPollingUnitStats :one
SELECT * FROM election_group_parties_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2 AND party_id = $3;

-- name: ListElectionGroupPartiesPollingUnitsByGroup :many
SELECT * FROM election_group_parties_polling_units
WHERE election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR state_id = sqlc.narg('state_id'))
ORDER BY polling_unit_id, party_id;

-- =====================================================
-- DYNAMIC ROLLUP QUERIES: Ward, LGA, State, National (Party)
-- =====================================================

-- name: GetElectionGroupPartyWardStats :one
SELECT
  egppu.election_group_id,
  egppu.ward_id,
  egppu.party_id,
  egppu.lga_id,
  egppu.state_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.ward_id = egppu.ward_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = sqlc.arg('election_group_id')::int AND egppu.ward_id = sqlc.arg('ward_id')::int AND egppu.party_id = sqlc.arg('party_id')::smallint
GROUP BY egppu.election_group_id, egppu.ward_id, egppu.party_id, egppu.lga_id, egppu.state_id;

-- name: ListElectionGroupPartiesWardsByGroup :many
SELECT
  egppu.election_group_id,
  egppu.ward_id,
  egppu.party_id,
  egppu.lga_id,
  egppu.state_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.ward_id = egppu.ward_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR egppu.party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR egppu.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR egppu.state_id = sqlc.narg('state_id'))
GROUP BY egppu.election_group_id, egppu.ward_id, egppu.party_id, egppu.lga_id, egppu.state_id
ORDER BY egppu.ward_id, egppu.party_id;

-- name: GetElectionGroupPartyLGAStats :one
SELECT
  egppu.election_group_id,
  egppu.lga_id,
  egppu.party_id,
  egppu.state_id,
  egppu.senatorial_district_id,
  egppu.federal_constituency_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.lga_id = egppu.lga_id AND les.party_id = egppu.party_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.lga_id = egppu.lga_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.lga_id = egppu.lga_id AND wes.party_id = egppu.party_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = sqlc.arg('election_group_id')::int AND egppu.lga_id = sqlc.arg('lga_id')::int AND egppu.party_id = sqlc.arg('party_id')::smallint
GROUP BY egppu.election_group_id, egppu.lga_id, egppu.party_id, egppu.state_id, egppu.senatorial_district_id, egppu.federal_constituency_id;

-- name: ListElectionGroupPartiesLGAsByGroup :many
SELECT
  egppu.election_group_id,
  egppu.lga_id,
  egppu.party_id,
  egppu.state_id,
  egppu.senatorial_district_id,
  egppu.federal_constituency_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.lga_id = egppu.lga_id AND les.party_id = egppu.party_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.lga_id = egppu.lga_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.lga_id = egppu.lga_id AND wes.party_id = egppu.party_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = sqlc.arg('election_group_id')
  AND (sqlc.narg('party_id')::smallint IS NULL OR egppu.party_id = sqlc.narg('party_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR egppu.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR egppu.senatorial_district_id = sqlc.narg('senatorial_district_id'))
GROUP BY egppu.election_group_id, egppu.lga_id, egppu.party_id, egppu.state_id, egppu.senatorial_district_id, egppu.federal_constituency_id
ORDER BY egppu.lga_id, egppu.party_id;

-- name: GetElectionGroupPartyStateStats :one
SELECT
  egppu.election_group_id,
  egppu.state_id,
  egppu.party_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egppu.election_group_id AND ses.state_id = egppu.state_id AND ses.party_id = egppu.party_id), 0)::int AS state_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.state_id = egppu.state_id AND les.party_id = egppu.party_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT les.lga_id)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.state_id = egppu.state_id AND les.party_id = egppu.party_id), 0)::int AS unique_lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.state_id = egppu.state_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.state_id = egppu.state_id AND wes.party_id = egppu.party_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = sqlc.arg('election_group_id')::int AND egppu.state_id = sqlc.arg('state_id')::smallint AND egppu.party_id = sqlc.arg('party_id')::smallint
GROUP BY egppu.election_group_id, egppu.state_id, egppu.party_id;

-- name: ListElectionGroupPartiesStatesByGroup :many
SELECT
  egppu.election_group_id,
  egppu.state_id,
  egppu.party_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egppu.election_group_id AND ses.state_id = egppu.state_id AND ses.party_id = egppu.party_id), 0)::int AS state_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.state_id = egppu.state_id AND les.party_id = egppu.party_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT les.lga_id)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.state_id = egppu.state_id AND les.party_id = egppu.party_id), 0)::int AS unique_lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.state_id = egppu.state_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.state_id = egppu.state_id AND wes.party_id = egppu.party_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = $1
  AND ($2::smallint IS NULL OR egppu.party_id = $2)
GROUP BY egppu.election_group_id, egppu.state_id, egppu.party_id
ORDER BY egppu.state_id, egppu.party_id;

-- name: GetElectionGroupPartyNationalStats :one
SELECT
  egppu.election_group_id,
  egppu.party_id,
  COALESCE(SUM(egppu.pu_agents_count), 0)::int AS pu_agents_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_count > 0), 0)::int AS unique_pu_agents_count,
  COALESCE(SUM(egppu.pu_agents_in_attendance_count), 0)::int AS pu_agents_in_attendance_count,
  COALESCE(SUM(egppu.pu_reports_count), 0)::int AS pu_reports_count,
  COALESCE(SUM(egppu.pu_updates_count), 0)::int AS pu_updates_count,
  COALESCE(SUM(egppu.pu_final_results_uploaded_count), 0)::int AS pu_final_results_uploaded_count,
  COALESCE(SUM(egppu.unique_pu_final_results_uploaded_count), 0)::int AS unique_pu_final_results_uploaded_count,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_reports_count > 0), 0)::int AS total_pu_with_reports,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_updates_count > 0), 0)::int AS total_pu_with_updates,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.pu_agents_in_attendance_count > 0), 0)::int AS total_pu_with_agents_in_attendance,
  COALESCE(COUNT(DISTINCT egppu.polling_unit_id) FILTER (WHERE egppu.unique_pu_final_results_uploaded_count > 0), 0)::int AS total_pu_unique_final_results_uploaded,
  COALESCE((SELECT COUNT(*)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egppu.election_group_id AND ses.party_id = egppu.party_id), 0)::int AS state_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT ses.state_id)::int FROM state_election_supervisors ses WHERE ses.election_group_id = egppu.election_group_id AND ses.party_id = egppu.party_id), 0)::int AS unique_state_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.party_id = egppu.party_id), 0)::int AS lga_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT les.lga_id)::int FROM lga_election_supervisors les WHERE les.election_group_id = egppu.election_group_id AND les.party_id = egppu.party_id), 0)::int AS unique_lga_supervisors_count,
  COALESCE((SELECT COUNT(*)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.party_id = egppu.party_id), 0)::int AS ward_supervisors_count,
  COALESCE((SELECT COUNT(DISTINCT wes.ward_id)::int FROM ward_election_supervisors wes WHERE wes.election_group_id = egppu.election_group_id AND wes.party_id = egppu.party_id), 0)::int AS unique_ward_supervisors_count
FROM election_group_parties_polling_units egppu
WHERE egppu.election_group_id = $1 AND egppu.party_id = $2
GROUP BY egppu.election_group_id, egppu.party_id;

-- =====================================================
-- POLLING UNIT PARTY MUTATIONS
-- =====================================================

-- name: UpsertElectionGroupPUPartyEntry :exec
WITH pu_update AS (
  UPDATE election_group_polling_units
  SET
    pu_agents_count = GREATEST(0, pu_agents_count + sqlc.arg(agents_delta)::int),
    updated_at = NOW()
  WHERE election_group_id = sqlc.arg(election_group_id)::integer
    AND polling_unit_id   = sqlc.arg(polling_unit_id)::int
)
INSERT INTO election_group_parties_polling_units (
  election_group_id, party_id, polling_unit_id,
  state_id, lga_id, ward_id,
  state_constituency_id, federal_constituency_id, senatorial_district_id,
  pu_agents_count
) VALUES (
  sqlc.arg(election_group_id)::integer,
  sqlc.arg(party_id)::smallint,
  sqlc.arg(polling_unit_id)::int,
  sqlc.narg(state_id)::smallint,
  sqlc.narg(lga_id)::int,
  sqlc.narg(ward_id)::int,
  sqlc.narg(state_constituency_id)::int,
  sqlc.narg(federal_constituency_id)::int,
  sqlc.narg(senatorial_district_id)::int,
  GREATEST(0, sqlc.arg(agents_delta)::int)
)
ON CONFLICT (election_group_id, party_id, polling_unit_id)
DO UPDATE SET
  pu_agents_count = GREATEST(0, election_group_parties_polling_units.pu_agents_count + sqlc.arg(agents_delta)::int),
  updated_at = NOW();

-- name: GetPUPartyAgentsCount :one
SELECT pu_agents_count
FROM election_group_parties_polling_units
WHERE election_group_id = $1 AND party_id = $2 AND polling_unit_id = $3;

-- =====================================================
-- SUPERVISOR COUNTS FROM SOURCE OF TRUTH
-- =====================================================

-- name: GetWardSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM ward_election_supervisors
WHERE election_group_id = $1 AND ward_id = $2 AND party_id = $3;

-- name: GetLGASupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM lga_election_supervisors
WHERE election_group_id = $1 AND lga_id = $2 AND party_id = $3;

-- name: GetStateSupervisorCount :one
SELECT COUNT(*)::int AS supervisor_count
FROM state_election_supervisors
WHERE election_group_id = $1 AND state_id = $2 AND party_id = $3;

-- =====================================================
-- REFRESH POLING UNIT CACHE
-- =====================================================

-- name: RefreshSingleElectionGroupPollingUnitStats :exec
WITH
pu_assignments AS (
  SELECT
    COUNT(*)::int                                                  AS pu_agents_count,
    COUNT(*) FILTER (WHERE in_attendance = TRUE)::int             AS pu_agents_in_attendance_count
  FROM polling_unit_assignments
  WHERE election_group_id = sqlc.arg('election_group_id')::integer
    AND polling_unit_id   = sqlc.arg('polling_unit_id')::int
),
pu_updates_agg AS (
  SELECT
    COUNT(*) FILTER (WHERE update_type = 'incident_report')::int  AS pu_reports_count,
    COUNT(*) FILTER (WHERE update_type != 'incident_report')::int AS pu_updates_count
  FROM polling_unit_updates
  WHERE election_group_id = sqlc.arg('election_group_id')::integer
    AND polling_unit_id   = sqlc.arg('polling_unit_id')::int
),
pu_results_agg AS (
  SELECT
    COUNT(*)::int                                                 AS pu_final_results_uploaded_count,
    COUNT(DISTINCT election_id)::int                              AS unique_pu_final_results_uploaded_count
  FROM polling_unit_results
  WHERE election_group_id = sqlc.arg('election_group_id')::integer
    AND polling_unit_id   = sqlc.arg('polling_unit_id')::int
),
expected_results AS (
  SELECT COUNT(DISTINCT id)::int AS unique_final_results_expected
  FROM elections
  WHERE election_group_id = sqlc.arg('election_group_id')::integer
)
UPDATE election_group_polling_units
SET
  unique_final_results_expected          = expected_results.unique_final_results_expected,
  pu_agents_count                        = pu_assignments.pu_agents_count,
  pu_agents_in_attendance_count          = pu_assignments.pu_agents_in_attendance_count,
  pu_reports_count                       = pu_updates_agg.pu_reports_count,
  pu_updates_count                       = pu_updates_agg.pu_updates_count,
  pu_final_results_uploaded_count        = pu_results_agg.pu_final_results_uploaded_count,
  unique_pu_final_results_uploaded_count = pu_results_agg.unique_pu_final_results_uploaded_count,
  updated_at                             = NOW()
FROM pu_assignments, pu_updates_agg, pu_results_agg, expected_results
WHERE election_group_id = sqlc.arg('election_group_id')::integer
  AND polling_unit_id   = sqlc.arg('polling_unit_id')::int;

-- name: GetElectionGroupPollingUnitGeoIDs :one
SELECT state_id, lga_id, ward_id,
       state_constituency_id, federal_constituency_id, senatorial_district_id
FROM election_group_polling_units
WHERE election_group_id = $1 AND polling_unit_id = $2;

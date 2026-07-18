const fs = require('fs');
const file = 'c:/Users/danie/Desktop/Repos/free9ja/apps/api/db/query/election_stats.sql';
let content = fs.readFileSync(file, 'utf8');

// Fix AVG on timestamps
content = content.replace(/AVG\(election_started_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM election_started_at)))');
content = content.replace(/AVG\(election_ended_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM election_ended_at)))');
content = content.replace(/AVG\(average_election_started_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM average_election_started_at)))');
content = content.replace(/AVG\(average_election_ended_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM average_election_ended_at)))');
content = content.replace(/AVG\(pu_average_election_started_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_started_at)))');
content = content.replace(/AVG\(pu_average_election_ended_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM pu_average_election_ended_at)))');
content = content.replace(/AVG\(arrived_at\)/g, 'to_timestamp(AVG(EXTRACT(epoch FROM arrived_at)))');

// Fix RefreshAllElectionGroupStateConstituencyStats columns
const find = `    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(pu_agents_count)                       AS pu_agents_count,
    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,
    SUM(pu_agents_in_attendance_count)         AS pu_agents_in_attendance_count,
    SUM(reports_count)                      AS reports_count,
    SUM(updates_count)                      AS updates_count,
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
    SUM(total_pu_where_agents_referred_live_voters)  AS total_pu_where_agents_referred_live_voters`;

const replace = `    SUM(unique_final_results_expected)               AS unique_final_results_expected,
    SUM(total_agents_count)                          AS pu_agents_count,
    COUNT(*) FILTER (WHERE total_agents_count > 0)   AS unique_pu_agents_count,
    SUM(total_agents_in_attendance_count)            AS pu_agents_in_attendance_count,
    SUM(total_reports_count)                         AS reports_count,
    SUM(total_updates_count)                         AS updates_count,
    to_timestamp(AVG(EXTRACT(epoch FROM average_election_started_at)))                 AS pu_average_election_started_at,
    to_timestamp(AVG(EXTRACT(epoch FROM average_election_ended_at)))                   AS pu_average_election_ended_at,
    COALESCE(AVG(election_practice_test_readiness_percentage), 0) AS pu_election_practice_test_readiness_percentage,
    SUM(total_final_results_uploaded_count)          AS pu_final_results_uploaded_count,
    SUM(total_unique_final_results_uploaded_count)   AS unique_pu_final_results_uploaded_count,
    SUM(live_voters_referred_by_agent_count)         AS pu_live_voters_referred_by_agent_count,
    COUNT(*) FILTER (WHERE total_reports_count > 0)               AS total_pu_with_reports,
    COUNT(*) FILTER (WHERE total_updates_count > 0)               AS total_pu_with_updates,
    COUNT(*) FILTER (WHERE total_agents_in_attendance_count > 0)  AS total_pu_with_agents_in_attendance,
    COUNT(*) FILTER (WHERE average_election_started_at IS NOT NULL) AS total_pu_where_election_has_started,
    COUNT(*) FILTER (WHERE average_election_ended_at IS NOT NULL)   AS total_pu_where_election_has_ended,
    COUNT(*) FILTER (WHERE total_unique_final_results_uploaded_count > 0) AS total_pu_unique_final_results_uploaded,
    COUNT(*) FILTER (WHERE live_voters_referred_by_agent_count > 0) AS total_pu_where_agents_referred_live_voters`;

if (content.includes(find)) {
    content = content.replace(find, replace);
    console.log('Fixed RefreshAllElectionGroupStateConstituencyStats columns.');
} else {
    console.log('RefreshAllElectionGroupStateConstituencyStats section not found to replace.');
}

// Write back to file
fs.writeFileSync(file, content);
console.log('Finished updating election_stats.sql.');

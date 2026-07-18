const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps/api/db/query/election_stats.sql');
let content = fs.readFileSync(file, 'utf8');

// 1. epu_agg for election_wards
content = content.replace(/SUM\(total_agents_count\)\s+AS pu_agents_count,/g, 
  'SUM(total_agents_count)                          AS pu_agents_count,\n      COUNT(*) FILTER (WHERE total_agents_count > 0)   AS unique_pu_agents_count,');

// 2. src_agg for others
content = content.replace(/SUM\(pu_agents_count\)\s+AS pu_agents_count,/g, 
  'SUM(pu_agents_count)                       AS pu_agents_count,\n    SUM(unique_pu_agents_count)                AS unique_pu_agents_count,');

// 3. party_expanded for election_wards
content = content.replace(/epu\.live_voters_referred_by_agent_count > 0 AS has_referrals/g,
  "epu.live_voters_referred_by_agent_count > 0 AS has_referrals,\n      (p.value->>'agents_count')::int > 0            AS has_agents");

// 4. party_expanded for others
content = content.replace(/\(p\.value->>'pu_agents_count'\)::int\s+AS agents_count,/g,
  "(p.value->>'pu_agents_count')::int                           AS agents_count,\n    (p.value->>'unique_pu_agents_count')::int                    AS unique_agents_count,");

// 5. party_agg
content = content.replace(/SUM\(agents_count\)\s+AS pu_agents_count,\n\s+SUM\(updates_count\)\s+AS updates_count,/g, (match, offset, string) => {
  // Check if we are inside RefreshAllElectionWardStats
  const substring = string.substring(offset - 1000, offset);
  if (substring.includes("RefreshAllElectionWardStats")) {
    return "SUM(agents_count)                      AS pu_agents_count,\n      COUNT(*) FILTER (WHERE has_agents)     AS unique_pu_agents_count,\n      SUM(updates_count)                     AS updates_count,";
  } else {
    return "SUM(agents_count)                      AS pu_agents_count,\n    SUM(unique_agents_count)               AS unique_pu_agents_count,\n    SUM(updates_count)                     AS updates_count,";
  }
});

// 6. party_json
content = content.replace(/'pu_agents_count',\s+pu_agents_count,/g,
  "'pu_agents_count',                 pu_agents_count,\n        'unique_pu_agents_count', unique_pu_agents_count,");

// 7. INSERT INTO columns
content = content.replace(/pu_agents_count, pu_agents_in_attendance_count,/g,
  "pu_agents_count, unique_pu_agents_count, pu_agents_in_attendance_count,");

// 8. SELECT columns
content = content.replace(/a\.pu_agents_count, a\.pu_agents_in_attendance_count,/g,
  "a.pu_agents_count, a.unique_pu_agents_count, a.pu_agents_in_attendance_count,");

// 9. ON CONFLICT DO UPDATE SET
content = content.replace(/pu_agents_count = EXCLUDED\.pu_agents_count,/g,
  "pu_agents_count = EXCLUDED.pu_agents_count,\n    unique_pu_agents_count = EXCLUDED.unique_pu_agents_count,");

fs.writeFileSync(file, content);
console.log('Successfully updated election_stats.sql query file');

const fs = require("fs");

let original = fs.readFileSync(
  "apps/api/db/query/final_results.sql.bak",
  "utf8",
);

// Strip BOM
if (original.charCodeAt(0) === 0xfeff) {
  original = original.slice(1);
}

const parts = original.split("-- name: RollupWardFinalResults :exec");
const header = parts[0];
const footerIndex = parts[1].indexOf(
  "-- name: UpdateCandidatesFromWardElections :exec",
);
const footer = parts[1].substring(footerIndex);

const newQueries = `
-- name: RollupWardFinalResults :exec
WITH agg AS (
    SELECT 
        election_id, ward_id, lga_id, state_id,
        COALESCE(SUM(accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(votes_cast), 0) as votes_cast,
        COALESCE(SUM(valid_votes), 0) as valid_votes,
        COALESCE(SUM(rejected_votes), 0) as rejected_votes,
        COUNT(polling_unit_id) as polling_units_counted
    FROM polling_unit_final_results
    GROUP BY election_id, ward_id, lga_id, state_id
),
pu_winners AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM polling_unit_final_results p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
pu_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM polling_unit_final_results p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.ward_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM polling_unit_final_results p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, p.ward_id, c.value->>'party_short_name'
),
pu_win_count AS (
    SELECT election_id, ward_id, party_short_name, COUNT(*) as pu_count
    FROM pu_winners
    GROUP BY election_id, ward_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.ward_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', COALESCE(w.pu_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN pu_win_count w ON c.election_id = w.election_id AND c.ward_id = w.ward_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.ward_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, p.ward_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM polling_unit_final_results p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, p.ward_id, c.value->>'party_short_name'
),
pu_live_win_count AS (
    SELECT election_id, ward_id, party_short_name, COUNT(*) as pu_count
    FROM pu_winners_live
    GROUP BY election_id, ward_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.ward_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', COALESCE(w.pu_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN pu_live_win_count w ON c.election_id = w.election_id AND c.ward_id = w.ward_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.ward_id
)
INSERT INTO ward_final_result (
    election_id, ward_id, lga_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    polling_units_counted, total_polling_units,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.ward_id, a.lga_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.polling_units_counted,
    (SELECT COUNT(*) FROM polling_units WHERE ward_id = a.ward_id) as total_polling_units,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.ward_id = cj.ward_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.ward_id = clj.ward_id
ON CONFLICT (election_id, ward_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    polling_units_counted = EXCLUDED.polling_units_counted,
    total_polling_units = EXCLUDED.total_polling_units,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupStateConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, s.id as state_constituency_id, r.state_id, s.senatorial_district_id, s.federal_constituency_id, s.lga_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COALESCE(SUM(r.polling_units_counted), 0) as polling_units_counted,
        COUNT(r.ward_id) as wards_counted
    FROM ward_final_result r
    JOIN wards w ON r.ward_id = w.id
    JOIN state_constituencies s ON w.state_assembly_constituency_id = s.id
    GROUP BY r.election_id, s.id, r.state_id, s.senatorial_district_id, s.federal_constituency_id, s.lga_id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_assembly_constituency_id = s.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_assembly_constituency_id = s.id,
    jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, s.id as state_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_assembly_constituency_id = s.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
ward_win_count AS (
    SELECT election_id, state_constituency_id, party_short_name, COUNT(*) as ward_count
    FROM ward_winners
    GROUP BY election_id, state_constituency_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.state_constituency_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', COALESCE(w.ward_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN ward_win_count w ON c.election_id = w.election_id AND c.state_constituency_id = w.state_constituency_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.state_constituency_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, s.id as state_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_assembly_constituency_id = s.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
ward_live_win_count AS (
    SELECT election_id, state_constituency_id, party_short_name, COUNT(*) as ward_count
    FROM ward_winners_live
    GROUP BY election_id, state_constituency_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.state_constituency_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', COALESCE(w.ward_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN ward_live_win_count w ON c.election_id = w.election_id AND c.state_constituency_id = w.state_constituency_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.state_constituency_id
)
INSERT INTO state_constituency_final_result (
    election_id, state_constituency_id, state_id, senatorial_district_id, federal_constituency_id, lga_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_constituency_id, a.state_id, a.senatorial_district_id, a.federal_constituency_id, a.lga_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards WHERE state_assembly_constituency_id = a.state_constituency_id) as total_wards,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.state_constituency_id = cj.state_constituency_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.state_constituency_id = clj.state_constituency_id
ON CONFLICT (election_id, state_constituency_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    wards_counted = EXCLUDED.wards_counted,
    total_wards = EXCLUDED.total_wards,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupLGAFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, r.lga_id, r.state_id, l.senatorial_district_id, l.federal_constituency_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.ward_id) as wards_counted
    FROM ward_final_result r
    JOIN lgas l ON r.lga_id = l.id
    GROUP BY r.election_id, r.lga_id, r.state_id, l.senatorial_district_id, l.federal_constituency_id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM ward_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM ward_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
sc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM state_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
sc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM state_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM ward_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
ward_win_count AS (
    SELECT election_id, lga_id, party_short_name, COUNT(*) as ward_count
    FROM ward_winners
    GROUP BY election_id, lga_id, party_short_name
),
sc_win_count AS (
    SELECT election_id, lga_id, party_short_name, COUNT(*) as sc_count
    FROM sc_winners
    GROUP BY election_id, lga_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.lga_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', COALESCE(w.ward_count, 0),
                'state_constituency_winning_count', COALESCE(sc.sc_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN ward_win_count w ON c.election_id = w.election_id AND c.lga_id = w.lga_id AND c.party_short_name = w.party_short_name
    LEFT JOIN sc_win_count sc ON c.election_id = sc.election_id AND c.lga_id = sc.lga_id AND c.party_short_name = sc.party_short_name
    GROUP BY c.election_id, c.lga_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM ward_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
ward_live_win_count AS (
    SELECT election_id, lga_id, party_short_name, COUNT(*) as ward_count
    FROM ward_winners_live
    GROUP BY election_id, lga_id, party_short_name
),
sc_live_win_count AS (
    SELECT election_id, lga_id, party_short_name, COUNT(*) as sc_count
    FROM sc_winners_live
    GROUP BY election_id, lga_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.lga_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', COALESCE(w.ward_count, 0),
                'state_constituency_winning_count', COALESCE(sc.sc_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN ward_live_win_count w ON c.election_id = w.election_id AND c.lga_id = w.lga_id AND c.party_short_name = w.party_short_name
    LEFT JOIN sc_live_win_count sc ON c.election_id = sc.election_id AND c.lga_id = sc.lga_id AND c.party_short_name = sc.party_short_name
    GROUP BY c.election_id, c.lga_id
)
INSERT INTO lga_final_result (
    election_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.lga_id, a.state_id, a.senatorial_district_id, a.federal_constituency_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards WHERE lga_id = a.lga_id) as total_wards,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.lga_id = cj.lga_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.lga_id = clj.lga_id
ON CONFLICT (election_id, lga_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    wards_counted = EXCLUDED.wards_counted,
    total_wards = EXCLUDED.total_wards,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupFederalConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, l.federal_constituency_id, r.state_id, l.senatorial_district_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    GROUP BY r.election_id, l.federal_constituency_id, r.state_id, l.senatorial_district_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
    jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, l.federal_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
lga_win_count AS (
    SELECT election_id, federal_constituency_id, party_short_name, COUNT(*) as lga_count
    FROM lga_winners
    GROUP BY election_id, federal_constituency_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.federal_constituency_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', COALESCE(w.lga_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN lga_win_count w ON c.election_id = w.election_id AND c.federal_constituency_id = w.federal_constituency_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.federal_constituency_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, l.federal_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
lga_live_win_count AS (
    SELECT election_id, federal_constituency_id, party_short_name, COUNT(*) as lga_count
    FROM lga_winners_live
    GROUP BY election_id, federal_constituency_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.federal_constituency_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', COALESCE(w.lga_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN lga_live_win_count w ON c.election_id = w.election_id AND c.federal_constituency_id = w.federal_constituency_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.federal_constituency_id
)
INSERT INTO federal_constituency_final_result (
    election_id, federal_constituency_id, state_id, senatorial_district_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.federal_constituency_id, a.state_id, a.senatorial_district_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas WHERE federal_constituency_id = a.federal_constituency_id) as total_lgas,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.federal_constituency_id = cj.federal_constituency_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.federal_constituency_id = clj.federal_constituency_id
ON CONFLICT (election_id, federal_constituency_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    lgas_counted = EXCLUDED.lgas_counted,
    total_lgas = EXCLUDED.total_lgas,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupSenatorialDistrictFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, l.senatorial_district_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    GROUP BY r.election_id, l.senatorial_district_id, r.state_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM lga_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM lga_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
fc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM federal_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.federal_constituency_id, (c.value->>'vote_count')::int DESC
),
fc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM federal_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.federal_constituency_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, l.senatorial_district_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
lga_win_count AS (
    SELECT election_id, senatorial_district_id, party_short_name, COUNT(*) as lga_count
    FROM lga_winners
    GROUP BY election_id, senatorial_district_id, party_short_name
),
fc_win_count AS (
    SELECT election_id, senatorial_district_id, party_short_name, COUNT(*) as fc_count
    FROM fc_winners
    GROUP BY election_id, senatorial_district_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.senatorial_district_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', COALESCE(lga_win.lga_count, 0),
                'federal_constituencies_winning_count', COALESCE(w.fc_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN lga_win_count lga_win ON c.election_id = lga_win.election_id AND c.senatorial_district_id = lga_win.senatorial_district_id AND c.party_short_name = lga_win.party_short_name
    LEFT JOIN fc_win_count w ON c.election_id = w.election_id AND c.senatorial_district_id = w.senatorial_district_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.senatorial_district_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, l.senatorial_district_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
lga_live_win_count AS (
    SELECT election_id, senatorial_district_id, party_short_name, COUNT(*) as lga_count
    FROM lga_winners_live
    GROUP BY election_id, senatorial_district_id, party_short_name
),
fc_live_win_count AS (
    SELECT election_id, senatorial_district_id, party_short_name, COUNT(*) as fc_count
    FROM fc_winners_live
    GROUP BY election_id, senatorial_district_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.senatorial_district_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', COALESCE(lga_live_win.lga_count, 0),
                'federal_constituencies_winning_count', COALESCE(w.fc_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN lga_live_win_count lga_live_win ON c.election_id = lga_live_win.election_id AND c.senatorial_district_id = lga_live_win.senatorial_district_id AND c.party_short_name = lga_live_win.party_short_name
    LEFT JOIN fc_live_win_count w ON c.election_id = w.election_id AND c.senatorial_district_id = w.senatorial_district_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.senatorial_district_id
)
INSERT INTO senatorial_district_final_result (
    election_id, senatorial_district_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.senatorial_district_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas WHERE senatorial_district_id = a.senatorial_district_id) as total_lgas,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.senatorial_district_id = cj.senatorial_district_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.senatorial_district_id = clj.senatorial_district_id
ON CONFLICT (election_id, senatorial_district_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    lgas_counted = EXCLUDED.lgas_counted,
    total_lgas = EXCLUDED.total_lgas,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupStateFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.senatorial_district_id) as senatorial_districts_counted
    FROM senatorial_district_final_result r
    GROUP BY r.election_id, r.state_id
),
sd_winners AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM senatorial_district_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.senatorial_district_id, (c.value->>'vote_count')::int DESC
),
sd_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM senatorial_district_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.senatorial_district_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.state_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count,
        SUM((c.value->>'lgas_winning_count')::int) as lga_count,
        SUM((c.value->>'federal_constituencies_winning_count')::int) as fc_count
    FROM senatorial_district_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
sd_win_count AS (
    SELECT election_id, state_id, party_short_name, COUNT(*) as sd_count
    FROM sd_winners
    GROUP BY election_id, state_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id, c.state_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', c.lga_count,
                'federal_constituencies_winning_count', c.fc_count,
                'senatorial_districts_winning_count', COALESCE(w.sd_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN sd_win_count w ON c.election_id = w.election_id AND c.state_id = w.state_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.state_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, p.state_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count,
        SUM((c.value->>'lgas_winning_count')::int) as lga_count,
        SUM((c.value->>'federal_constituencies_winning_count')::int) as fc_count
    FROM senatorial_district_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
sd_live_win_count AS (
    SELECT election_id, state_id, party_short_name, COUNT(*) as sd_count
    FROM sd_winners_live
    GROUP BY election_id, state_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id, c.state_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', c.lga_count,
                'federal_constituencies_winning_count', c.fc_count,
                'senatorial_districts_winning_count', COALESCE(w.sd_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN sd_live_win_count w ON c.election_id = w.election_id AND c.state_id = w.state_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id, c.state_id
)
INSERT INTO state_final_result (
    election_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    senatorial_districts_counted, total_senatorial_districts,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.senatorial_districts_counted,
    (SELECT COUNT(*) FROM senatorial_districts WHERE state_id = a.state_id) as total_senatorial_districts,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.state_id = cj.state_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.state_id = clj.state_id
ON CONFLICT (election_id, state_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    senatorial_districts_counted = EXCLUDED.senatorial_districts_counted,
    total_senatorial_districts = EXCLUDED.total_senatorial_districts,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupElectionFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.state_id) as states_counted
    FROM state_final_result r
    GROUP BY r.election_id
),
state_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM state_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_id, (c.value->>'vote_count')::int DESC
),
state_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM state_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count,
        SUM((c.value->>'lgas_winning_count')::int) as lga_count,
        SUM((c.value->>'federal_constituencies_winning_count')::int) as fc_count,
        SUM((c.value->>'senatorial_districts_winning_count')::int) as sd_count
    FROM state_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, c.value->>'party_short_name'
),
state_win_count AS (
    SELECT election_id, party_short_name, COUNT(*) as state_count
    FROM state_winners
    GROUP BY election_id, party_short_name
),
cand_json AS (
    SELECT 
        c.election_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', c.lga_count,
                'federal_constituencies_winning_count', c.fc_count,
                'senatorial_districts_winning_count', c.sd_count,
                'states_winning_count', COALESCE(w.state_count, 0)
            )
        ), '[]'::jsonb) as candidate_results
    FROM cand_agg c
    LEFT JOIN state_win_count w ON c.election_id = w.election_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id
),
cand_live_agg AS (
    SELECT 
        p.election_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count,
        SUM((c.value->>'wards_winning_count')::int) as ward_count,
        SUM((c.value->>'state_constituency_winning_count')::int) as sc_count,
        SUM((c.value->>'lgas_winning_count')::int) as lga_count,
        SUM((c.value->>'federal_constituencies_winning_count')::int) as fc_count,
        SUM((c.value->>'senatorial_districts_winning_count')::int) as sd_count
    FROM state_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, c.value->>'party_short_name'
),
state_live_win_count AS (
    SELECT election_id, party_short_name, COUNT(*) as state_count
    FROM state_winners_live
    GROUP BY election_id, party_short_name
),
cand_live_json AS (
    SELECT 
        c.election_id,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'party_short_name', c.party_short_name, 
                'vote_count', c.vote_count,
                'polling_units_winning_count', c.pu_count,
                'wards_winning_count', c.ward_count,
                'state_constituency_winning_count', c.sc_count,
                'lgas_winning_count', c.lga_count,
                'federal_constituencies_winning_count', c.fc_count,
                'senatorial_districts_winning_count', c.sd_count,
                'states_winning_count', COALESCE(w.state_count, 0)
            )
        ), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg c
    LEFT JOIN state_live_win_count w ON c.election_id = w.election_id AND c.party_short_name = w.party_short_name
    GROUP BY c.election_id
)
INSERT INTO election_final_result (
    election_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    states_counted, total_states,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.states_counted,
    (SELECT COUNT(*) FROM c_states) as total_states,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id
ON CONFLICT (election_id)
DO UPDATE SET
    accredited_voters = EXCLUDED.accredited_voters,
    votes_cast = EXCLUDED.votes_cast,
    valid_votes = EXCLUDED.valid_votes,
    rejected_votes = EXCLUDED.rejected_votes,
    states_counted = EXCLUDED.states_counted,
    total_states = EXCLUDED.total_states,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();
`;

fs.writeFileSync(
  "apps/api/db/query/final_results.sql",
  header + newQueries + "\n" + footer,
);
console.log("Success");

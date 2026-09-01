-- name: UpsertPollingUnitFinalResult :one
INSERT INTO election_polling_unit_final_results (
  election_id,
  election_group_id,
  polling_unit_id,
  state_id,
  senatorial_district_id,
  federal_constituency_id,
  state_constituency_id,
  lga_id,
  ward_id,
  polling_unit_result_id,
  accredited_voters,
  votes_cast,
  valid_votes,
  rejected_votes,
  candidate_results,
  candidate_results_live,
  matching_submissions_count,
  total_submissions_count
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '[]'::jsonb, $16, $17
)
ON CONFLICT (election_id, polling_unit_id)
DO UPDATE SET
  state_id = EXCLUDED.state_id,
  senatorial_district_id = EXCLUDED.senatorial_district_id,
  federal_constituency_id = EXCLUDED.federal_constituency_id,
  state_constituency_id = EXCLUDED.state_constituency_id,
  lga_id = EXCLUDED.lga_id,
  ward_id = EXCLUDED.ward_id,
  polling_unit_result_id = EXCLUDED.polling_unit_result_id,
  accredited_voters = EXCLUDED.accredited_voters,
  votes_cast = EXCLUDED.votes_cast,
  valid_votes = EXCLUDED.valid_votes,
  rejected_votes = EXCLUDED.rejected_votes,
  candidate_results = EXCLUDED.candidate_results,
  matching_submissions_count = EXCLUDED.matching_submissions_count,
  total_submissions_count = EXCLUDED.total_submissions_count,
  updated_at = NOW()
RETURNING *;



-- name: GetPollingUnitFinalResult :one
SELECT * FROM election_polling_unit_final_results
WHERE election_id = $1 AND polling_unit_id = $2;


-- name: RollupWardFinalResults :exec
WITH agg AS (
    SELECT 
        election_id, ward_id, lga_id, state_id,
        COALESCE(SUM(accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(votes_cast), 0) as votes_cast,
        COALESCE(SUM(valid_votes), 0) as valid_votes,
        COALESCE(SUM(rejected_votes), 0) as rejected_votes,
        COUNT(polling_unit_id) as polling_units_counted
    FROM election_polling_unit_final_results
    GROUP BY election_id, ward_id, lga_id, state_id
),
pu_winners AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_polling_unit_final_results p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
pu_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_polling_unit_final_results p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.ward_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM election_polling_unit_final_results p, 
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
    FROM election_polling_unit_final_results p, 
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
INSERT INTO election_ward_final_result (
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
        r.election_id, s.id as state_constituency_id, MIN(r.state_id) as state_id, MIN(s.senatorial_district_id) as senatorial_district_id, MIN(s.federal_constituency_id) as federal_constituency_id, MIN(s.lga_id) as lga_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COALESCE(SUM(r.polling_units_counted), 0) as polling_units_counted,
        COUNT(r.ward_id) as wards_counted
    FROM election_ward_final_result r
    JOIN wards w ON r.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id
    GROUP BY r.election_id, s.id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id,
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
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id, 
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
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id, 
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
INSERT INTO election_state_constituency_final_result (
    election_id, state_constituency_id, state_id, senatorial_district_id, federal_constituency_id, lga_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_constituency_id, a.state_id, a.senatorial_district_id, a.federal_constituency_id, a.lga_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards WHERE state_constituency_id = a.state_constituency_id) as total_wards,
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
        r.election_id, r.lga_id, MIN(r.state_id) as state_id, MIN(l.senatorial_district_id) as senatorial_district_id, MIN(l.federal_constituency_id) as federal_constituency_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.ward_id) as wards_counted
    FROM election_ward_final_result r
    JOIN lgas l ON r.lga_id = l.id
    GROUP BY r.election_id, r.lga_id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
sc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
sc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM election_ward_final_result p, 
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
    FROM election_ward_final_result p, 
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
INSERT INTO election_lga_final_result (
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
        r.election_id, l.federal_constituency_id, MIN(r.state_id) as state_id, MIN(l.senatorial_district_id) as senatorial_district_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM election_lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    WHERE l.federal_constituency_id IS NOT NULL
    GROUP BY r.election_id, l.federal_constituency_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p
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
    FROM election_lga_final_result p
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
    FROM election_lga_final_result p
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
INSERT INTO election_federal_constituency_final_result (
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
        r.election_id, l.senatorial_district_id, MIN(r.state_id) as state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM election_lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    WHERE l.senatorial_district_id IS NOT NULL
    GROUP BY r.election_id, l.senatorial_district_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
fc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_federal_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.federal_constituency_id, (c.value->>'vote_count')::int DESC
),
fc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_federal_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
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
    FROM election_lga_final_result p
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
    FROM election_lga_final_result p
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
INSERT INTO election_senatorial_district_final_result (
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
    FROM election_senatorial_district_final_result r
    GROUP BY r.election_id, r.state_id
),
sd_winners AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_senatorial_district_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.senatorial_district_id, (c.value->>'vote_count')::int DESC
),
sd_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_senatorial_district_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
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
    FROM election_senatorial_district_final_result p, 
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
    FROM election_senatorial_district_final_result p, 
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
INSERT INTO election_state_final_result (
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
    FROM election_state_final_result r
    GROUP BY r.election_id
),
state_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_id, (c.value->>'vote_count')::int DESC
),
state_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
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
    FROM election_state_final_result p, 
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
    FROM election_state_final_result p, 
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

-- name: UpdateCandidatesFromWardElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_ward_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'ward'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromLGAElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_lga_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'lga'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromStateConstituencyElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_state_constituency_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'state-constituency'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromFederalConstituencyElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_federal_constituency_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'federal-constituency'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSenatorialDistrictElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_senatorial_district_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'senatorial-district'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromStateElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_state_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'state'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromNationwideElections :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.scope = 'nationwide'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: ListPollingUnitFinalResults :many
SELECT 
  fr.id,
  fr.election_id,
  fr.election_group_id,
  fr.polling_unit_id,
  pu.name AS polling_unit_name,
  fr.state_id,
  s.name AS state_name,
  fr.lga_id,
  l.name AS lga_name,
  fr.ward_id,
  fr.senatorial_district_id,
  fr.federal_constituency_id,
  fr.state_constituency_id,
  fr.polling_unit_result_id,
  r.result_sheet_image_url,
  r.result_sheet_video_url,
  fr.accredited_voters,
  fr.votes_cast,
  fr.valid_votes,
  fr.rejected_votes,
  fr.candidate_results,
  fr.created_at,
  u.first_name AS uploader_first_name,
  u.last_name AS uploader_last_name,
  u.avatar AS uploader_avatar
FROM election_polling_unit_final_results fr
JOIN polling_units pu ON fr.polling_unit_id = pu.id
LEFT JOIN c_states s ON fr.state_id = s.id
LEFT JOIN lgas l ON fr.lga_id = l.id
LEFT JOIN polling_unit_results r ON fr.polling_unit_result_id = r.id
LEFT JOIN users u ON r.submitted_by = u.id
WHERE
  (sqlc.narg('election_group_id')::bigint IS NULL OR fr.election_group_id = sqlc.narg('election_group_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR fr.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('senatorial_district_id')::int IS NULL OR fr.senatorial_district_id = sqlc.narg('senatorial_district_id'))
  AND (sqlc.narg('federal_constituency_id')::int IS NULL OR fr.federal_constituency_id = sqlc.narg('federal_constituency_id'))
  AND (sqlc.narg('state_constituency_id')::int IS NULL OR fr.state_constituency_id = sqlc.narg('state_constituency_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR fr.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR fr.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('has_media')::boolean IS NULL OR (sqlc.narg('has_media') = true AND r.result_sheet_image_url IS NOT NULL) OR (sqlc.narg('has_media') = false))
  AND fr.id < sqlc.arg('cursor')::bigint
ORDER BY fr.id DESC
LIMIT sqlc.arg('limit')::int;

-- name: RefreshPollingUnitLiveResults :exec
WITH live_counts AS (
  SELECT 
    p.short_name AS party_short_name,
    COUNT(ev.id)::int AS vote_count
  FROM election_votes ev
  JOIN parties p ON ev.party_id = p.id
  WHERE ev.election_id = $1 AND ev.polling_unit_id = $2
  GROUP BY p.short_name
),
live_json AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)
    ), '[]'::jsonb
  ) as candidate_results_live
  FROM live_counts
)
INSERT INTO election_polling_unit_final_results (
  election_id, election_group_id, polling_unit_id,
  state_id, senatorial_district_id, federal_constituency_id, state_constituency_id, lga_id, ward_id,
  candidate_results_live, candidate_results
) VALUES (
  $1, $3, $2,
  $4, $5, $6, $7, $8, $9,
  (SELECT candidate_results_live FROM live_json),
  '[]'::jsonb
)
ON CONFLICT (election_id, polling_unit_id) DO UPDATE SET
  candidate_results_live = EXCLUDED.candidate_results_live,
  updated_at = NOW();

-- =========================================================================
-- SCOPED REAL-TIME SINGLE-ENTITY ROLLUPS (EVENT-DRIVEN CASCADE)
-- =========================================================================

-- name: RollupSingleWardFinalResults :exec
WITH agg AS (
    SELECT 
        p.election_id, p.ward_id, p.lga_id, p.state_id,
        COALESCE(SUM(p.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(p.votes_cast), 0) as votes_cast,
        COALESCE(SUM(p.valid_votes), 0) as valid_votes,
        COALESCE(SUM(p.rejected_votes), 0) as rejected_votes,
        COUNT(p.polling_unit_id) as polling_units_counted
    FROM election_polling_unit_final_results p
    WHERE p.election_id = $1 AND p.ward_id = $2
    GROUP BY p.election_id, p.ward_id, p.lga_id, p.state_id
),
pu_winners AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_polling_unit_final_results p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.ward_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
pu_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.polling_unit_id)
        p.election_id, p.ward_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_polling_unit_final_results p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.ward_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.polling_unit_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.ward_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM election_polling_unit_final_results p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.ward_id = $2
    GROUP BY p.election_id, p.ward_id, c.value->>'party_short_name'
),
pu_win_count AS (
    SELECT pw.election_id, pw.ward_id, pw.party_short_name, COUNT(*) as pu_count
    FROM pu_winners pw
    GROUP BY pw.election_id, pw.ward_id, pw.party_short_name
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
    FROM election_polling_unit_final_results p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.ward_id = $2
    GROUP BY p.election_id, p.ward_id, c.value->>'party_short_name'
),
pu_live_win_count AS (
    SELECT pwl.election_id, pwl.ward_id, pwl.party_short_name, COUNT(*) as pu_count
    FROM pu_winners_live pwl
    GROUP BY pwl.election_id, pwl.ward_id, pwl.party_short_name
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
INSERT INTO election_ward_final_result (
    election_id, ward_id, lga_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    polling_units_counted, total_polling_units,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.ward_id, a.lga_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.polling_units_counted,
    (SELECT COUNT(*) FROM polling_units pu WHERE pu.ward_id = a.ward_id) as total_polling_units,
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

-- name: RollupSingleStateConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, s.id as state_constituency_id, MIN(r.state_id) as state_id, MIN(s.senatorial_district_id) as senatorial_district_id, MIN(s.federal_constituency_id) as federal_constituency_id, MIN(s.lga_id) as lga_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COALESCE(SUM(r.polling_units_counted), 0) as polling_units_counted,
        COUNT(r.ward_id) as wards_counted
    FROM election_ward_final_result r
    JOIN wards w ON r.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id
    WHERE r.election_id = $1 AND s.id = $2
    GROUP BY r.election_id, s.id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND s.id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, s.id as state_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id,
    jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND s.id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, s.id as state_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND s.id = $2
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
ward_win_count AS (
    SELECT ww.election_id, ww.state_constituency_id, ww.party_short_name, COUNT(*) as ward_count
    FROM ward_winners ww
    GROUP BY ww.election_id, ww.state_constituency_id, ww.party_short_name
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
    FROM election_ward_final_result p
    JOIN wards w ON p.ward_id = w.id
    JOIN state_constituencies s ON w.state_constituency_id = s.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND s.id = $2
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
ward_live_win_count AS (
    SELECT wwl.election_id, wwl.state_constituency_id, wwl.party_short_name, COUNT(*) as ward_count
    FROM ward_winners_live wwl
    GROUP BY wwl.election_id, wwl.state_constituency_id, wwl.party_short_name
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
INSERT INTO election_state_constituency_final_result (
    election_id, state_constituency_id, state_id, senatorial_district_id, federal_constituency_id, lga_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_constituency_id, a.state_id, a.senatorial_district_id, a.federal_constituency_id, a.lga_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards wd WHERE wd.state_constituency_id = a.state_constituency_id) as total_wards,
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

-- name: RollupSingleLGAFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, r.lga_id, MIN(r.state_id) as state_id, MIN(l.senatorial_district_id) as senatorial_district_id, MIN(l.federal_constituency_id) as federal_constituency_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.ward_id) as wards_counted
    FROM election_ward_final_result r
    JOIN lgas l ON r.lga_id = l.id
    WHERE r.election_id = $1 AND r.lga_id = $2
    GROUP BY r.election_id, r.lga_id
),
ward_winners AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
ward_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.ward_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_ward_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.ward_id, (c.value->>'vote_count')::int DESC
),
sc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
sc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_constituency_id)
        p.election_id, p.lga_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_constituency_id, (c.value->>'vote_count')::int DESC
),
cand_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count,
        SUM((c.value->>'polling_units_winning_count')::int) as pu_count
    FROM election_ward_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
ward_win_count AS (
    SELECT ww.election_id, ww.lga_id, ww.party_short_name, COUNT(*) as ward_count
    FROM ward_winners ww
    GROUP BY ww.election_id, ww.lga_id, ww.party_short_name
),
sc_win_count AS (
    SELECT scw.election_id, scw.lga_id, scw.party_short_name, COUNT(*) as sc_count
    FROM sc_winners scw
    GROUP BY scw.election_id, scw.lga_id, scw.party_short_name
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
    FROM election_ward_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.lga_id = $2
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
ward_live_win_count AS (
    SELECT wwl.election_id, wwl.lga_id, wwl.party_short_name, COUNT(*) as ward_count
    FROM ward_winners_live wwl
    GROUP BY wwl.election_id, wwl.lga_id, wwl.party_short_name
),
sc_live_win_count AS (
    SELECT scwl.election_id, scwl.lga_id, scwl.party_short_name, COUNT(*) as sc_count
    FROM sc_winners_live scwl
    GROUP BY scwl.election_id, scwl.lga_id, scwl.party_short_name
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
INSERT INTO election_lga_final_result (
    election_id, lga_id, state_id, senatorial_district_id, federal_constituency_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.lga_id, a.state_id, a.senatorial_district_id, a.federal_constituency_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards wd WHERE wd.lga_id = a.lga_id) as total_wards,
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

-- name: RollupSingleFederalConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, l.federal_constituency_id, MIN(r.state_id) as state_id, MIN(l.senatorial_district_id) as senatorial_district_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM election_lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    WHERE r.election_id = $1 AND l.federal_constituency_id = $2
    GROUP BY r.election_id, l.federal_constituency_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
    jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND l.federal_constituency_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, l.federal_constituency_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
    jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND l.federal_constituency_id = $2 AND (c.value->>'vote_count')::int > 0
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
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND l.federal_constituency_id = $2
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
lga_win_count AS (
    SELECT lw.election_id, lw.federal_constituency_id, lw.party_short_name, COUNT(*) as lga_count
    FROM lga_winners lw
    GROUP BY lw.election_id, lw.federal_constituency_id, lw.party_short_name
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
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND l.federal_constituency_id = $2
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
lga_live_win_count AS (
    SELECT lwl.election_id, lwl.federal_constituency_id, lwl.party_short_name, COUNT(*) as lga_count
    FROM lga_winners_live lwl
    GROUP BY lwl.election_id, lwl.federal_constituency_id, lwl.party_short_name
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
INSERT INTO election_federal_constituency_final_result (
    election_id, federal_constituency_id, state_id, senatorial_district_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.federal_constituency_id, a.state_id, a.senatorial_district_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas lg WHERE lg.federal_constituency_id = a.federal_constituency_id) as total_lgas,
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

-- name: RollupSingleSenatorialDistrictFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, l.senatorial_district_id, MIN(r.state_id) as state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM election_lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    WHERE r.election_id = $1 AND l.senatorial_district_id = $2
    GROUP BY r.election_id, l.senatorial_district_id
),
lga_winners AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.senatorial_district_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
lga_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.lga_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_lga_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.senatorial_district_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.lga_id, (c.value->>'vote_count')::int DESC
),
fc_winners AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_federal_constituency_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.senatorial_district_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.federal_constituency_id, (c.value->>'vote_count')::int DESC
),
fc_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.federal_constituency_id)
        p.election_id, p.senatorial_district_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_federal_constituency_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.senatorial_district_id = $2 AND (c.value->>'vote_count')::int > 0
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
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND l.senatorial_district_id = $2
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
lga_win_count AS (
    SELECT lw.election_id, lw.senatorial_district_id, lw.party_short_name, COUNT(*) as lga_count
    FROM lga_winners lw
    GROUP BY lw.election_id, lw.senatorial_district_id, lw.party_short_name
),
fc_win_count AS (
    SELECT fcw.election_id, fcw.senatorial_district_id, fcw.party_short_name, COUNT(*) as fc_count
    FROM fc_winners fcw
    GROUP BY fcw.election_id, fcw.senatorial_district_id, fcw.party_short_name
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
    FROM election_lga_final_result p
    JOIN lgas l ON p.lga_id = l.id, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND l.senatorial_district_id = $2
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
lga_live_win_count AS (
    SELECT lwl.election_id, lwl.senatorial_district_id, lwl.party_short_name, COUNT(*) as lga_count
    FROM lga_winners_live lwl
    GROUP BY lwl.election_id, lwl.senatorial_district_id, lwl.party_short_name
),
fc_live_win_count AS (
    SELECT fcwl.election_id, fcwl.senatorial_district_id, fcwl.party_short_name, COUNT(*) as fc_count
    FROM fc_winners_live fcwl
    GROUP BY fcwl.election_id, fcwl.senatorial_district_id, fcwl.party_short_name
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
INSERT INTO election_senatorial_district_final_result (
    election_id, senatorial_district_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.senatorial_district_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas lg WHERE lg.senatorial_district_id = a.senatorial_district_id) as total_lgas,
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

-- name: RollupSingleStateFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.senatorial_district_id) as senatorial_districts_counted
    FROM election_senatorial_district_final_result r
    WHERE r.election_id = $1 AND r.state_id = $2
    GROUP BY r.election_id, r.state_id
),
sd_winners AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_senatorial_district_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.state_id = $2 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.senatorial_district_id, (c.value->>'vote_count')::int DESC
),
sd_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_senatorial_district_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.state_id = $2 AND (c.value->>'vote_count')::int > 0
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
    FROM election_senatorial_district_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND p.state_id = $2
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
sd_win_count AS (
    SELECT sdw.election_id, sdw.state_id, sdw.party_short_name, COUNT(*) as sd_count
    FROM sd_winners sdw
    GROUP BY sdw.election_id, sdw.state_id, sdw.party_short_name
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
    FROM election_senatorial_district_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND p.state_id = $2
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
sd_live_win_count AS (
    SELECT sdwl.election_id, sdwl.state_id, sdwl.party_short_name, COUNT(*) as sd_count
    FROM sd_winners_live sdwl
    GROUP BY sdwl.election_id, sdwl.state_id, sdwl.party_short_name
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
INSERT INTO election_state_final_result (
    election_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    senatorial_districts_counted, total_senatorial_districts,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.senatorial_districts_counted,
    (SELECT COUNT(*) FROM senatorial_districts sd WHERE sd.state_id = a.state_id) as total_senatorial_districts,
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

-- name: RollupSingleElectionFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.state_id) as states_counted
    FROM election_state_final_result r
    WHERE r.election_id = $1
    GROUP BY r.election_id
),
state_winners AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1 AND (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.state_id, (c.value->>'vote_count')::int DESC
),
state_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.state_id)
        p.election_id, (c.value->>'party_short_name')::text as party_short_name
    FROM election_state_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1 AND (c.value->>'vote_count')::int > 0
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
    FROM election_state_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    WHERE p.election_id = $1
    GROUP BY p.election_id, c.value->>'party_short_name'
),
state_win_count AS (
    SELECT sw.election_id, sw.party_short_name, COUNT(*) as state_count
    FROM state_winners sw
    GROUP BY sw.election_id, sw.party_short_name
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
    FROM election_state_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    WHERE p.election_id = $1
    GROUP BY p.election_id, c.value->>'party_short_name'
),
state_live_win_count AS (
    SELECT swl.election_id, swl.party_short_name, COUNT(*) as state_count
    FROM state_winners_live swl
    GROUP BY swl.election_id, swl.party_short_name
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

-- name: UpdateCandidatesFromSingleWardElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_ward_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'ward'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleStateConstituencyElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_state_constituency_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'state-constituency'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleLGAElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_lga_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'lga'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleFederalConstituencyElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_federal_constituency_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'federal-constituency'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleSenatorialDistrictElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_senatorial_district_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'senatorial-district'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleStateElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_state_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'state'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: UpdateCandidatesFromSingleNationwideElection :exec
UPDATE election_candidates ec
SET votes_count = v.votes, updated_at = NOW()
FROM (
  SELECT 
    e.id as election_id,
    (c.value->>'party_short_name')::text as party_short_name,
    SUM((c.value->>'vote_count')::int) as votes
  FROM elections e
  JOIN election_final_result fr ON e.id = fr.election_id
  CROSS JOIN jsonb_array_elements(fr.candidate_results) as c(value)
  WHERE e.id = $1 AND e.scope = 'nationwide'
  GROUP BY e.id, c.value->>'party_short_name'
) v
WHERE ec.election_id = v.election_id 
  AND ec.party_short_name = v.party_short_name;

-- name: GetEligiblePollingUnitsForElection :many
SELECT 
    pu.id,
    pu.state_id,
    pu.senatorial_district_id,
    pu.federal_constituency_id,
    pu.state_constituency_id,
    pu.lga_id,
    pu.ward_id
FROM polling_units pu
JOIN elections e ON e.id = $1
WHERE 
    (e.scope = 'nationwide') OR
    (e.scope = 'state' AND pu.state_id = e.state_id) OR
    (e.scope = 'senatorial-district' AND pu.senatorial_district_id = e.senatorial_district_id) OR
    (e.scope = 'federal-constituency' AND pu.federal_constituency_id = e.federal_constituency_id) OR
    (e.scope = 'state-constituency' AND pu.state_constituency_id = e.state_constituency_id) OR
    (e.scope = 'lga' AND pu.lga_id = e.lga_id) OR
    (e.scope = 'ward' AND pu.ward_id = e.ward_id)
ORDER BY pu.id ASC
LIMIT COALESCE(NULLIF($2::int, 0), 200000);



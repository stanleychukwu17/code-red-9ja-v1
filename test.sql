CREATE TEMP TABLE test_sd_final_result (
    election_id INT,
    senatorial_district_id INT,
    state_id INT,
    accredited_voters INT DEFAULT 0,
    votes_cast INT DEFAULT 0,
    valid_votes INT DEFAULT 0,
    rejected_votes INT DEFAULT 0,
    candidate_results JSONB DEFAULT '[]'::jsonb,
    candidate_results_live JSONB DEFAULT '[]'::jsonb
);
CREATE TEMP TABLE test_state_final_result (
    election_id INT,
    state_id INT,
    accredited_voters INT,
    votes_cast INT,
    valid_votes INT,
    rejected_votes INT,
    candidate_results JSONB,
    candidate_results_live JSONB,
    senatorial_districts_counted INT,
    total_senatorial_districts INT
);
CREATE TEMP TABLE test_senatorial_districts (
    id INT,
    state_id INT
);
INSERT INTO test_senatorial_districts (id, state_id) VALUES (34, 12), (35, 12);
INSERT INTO test_sd_final_result (election_id, senatorial_district_id, state_id, candidate_results, candidate_results_live)
VALUES (19, 34, 12, '[]'::jsonb, '[{"vote_count":1,"party_short_name":"PDP","lgas_winning_count":1,"wards_winning_count":1,"polling_units_winning_count":1,"state_constituency_winning_count":1,"federal_constituencies_winning_count":1}]'::jsonb);
WITH agg AS (
    SELECT 
        r.election_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.senatorial_district_id) as senatorial_districts_counted
    FROM test_sd_final_result r
    GROUP BY r.election_id, r.state_id
),
sd_winners AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM test_sd_final_result p, jsonb_array_elements(p.candidate_results) as c(value)
    WHERE (c.value->>'vote_count')::int > 0
    ORDER BY p.election_id, p.senatorial_district_id, (c.value->>'vote_count')::int DESC
),
sd_winners_live AS (
    SELECT DISTINCT ON (p.election_id, p.senatorial_district_id)
        p.election_id, p.state_id, (c.value->>'party_short_name')::text as party_short_name
    FROM test_sd_final_result p, jsonb_array_elements(p.candidate_results_live) as c(value)
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
    FROM test_sd_final_result p, 
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
    FROM test_sd_final_result p, 
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
INSERT INTO test_state_final_result (
    election_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    senatorial_districts_counted, total_senatorial_districts,
    candidate_results_live, candidate_results
)
SELECT 
    a.election_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.senatorial_districts_counted,
    (SELECT COUNT(*) FROM test_senatorial_districts WHERE state_id = a.state_id) as total_senatorial_districts,
    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,
    COALESCE(cj.candidate_results, '[]'::jsonb) as candidate_results
FROM agg a
LEFT JOIN cand_json cj ON a.election_id = cj.election_id AND a.state_id = cj.state_id
LEFT JOIN cand_live_json clj ON a.election_id = clj.election_id AND a.state_id = clj.state_id;

SELECT * FROM test_state_final_result;

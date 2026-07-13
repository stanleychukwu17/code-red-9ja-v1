-- name: UpsertPollingUnitFinalResult :one
INSERT INTO polling_unit_final_results (
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
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
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
    candidate_results_live = EXCLUDED.candidate_results_live,
  candidate_results_live = EXCLUDED.candidate_results_live,
  matching_submissions_count = EXCLUDED.matching_submissions_count,
  total_submissions_count = EXCLUDED.total_submissions_count,
  updated_at = NOW()
RETURNING *;

-- name: GetPollingUnitFinalResult :one
SELECT * FROM polling_unit_final_results
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
    FROM polling_unit_final_results
    GROUP BY election_id, ward_id, lga_id, state_id
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
cand_json AS (
    SELECT 
        election_id, ward_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, ward_id
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
cand_live_json AS (
    SELECT 
        election_id, ward_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, ward_id
)
INSERT INTO ward_final_result (
    election_id, ward_id, lga_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    polling_units_counted, total_polling_units,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.ward_id, a.lga_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.polling_units_counted,
    (SELECT COUNT(*) FROM polling_units WHERE ward_id = a.ward_id) as total_polling_units,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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

-- name: RollupLGAFinalResults :exec
WITH agg AS (
    SELECT 
        election_id, lga_id, state_id,
        COALESCE(SUM(accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(votes_cast), 0) as votes_cast,
        COALESCE(SUM(valid_votes), 0) as valid_votes,
        COALESCE(SUM(rejected_votes), 0) as rejected_votes,
        COUNT(ward_id) as wards_counted
    FROM ward_final_result
    GROUP BY election_id, lga_id, state_id
),
cand_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM ward_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id, lga_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, lga_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, p.lga_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM ward_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, p.lga_id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id, lga_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, lga_id
)
INSERT INTO lga_final_result (
    election_id, lga_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.lga_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(*) FROM wards WHERE lga_id = a.lga_id) as total_wards,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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

-- name: RollupStateConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, s.id as state_constituency_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COALESCE(SUM(r.wards_counted), 0) as wards_counted
    FROM lga_final_result r
    JOIN state_assembly_constituencies s ON r.lga_id = s.lga_id
    GROUP BY r.election_id, s.id, r.state_id
),
cand_agg AS (
    SELECT 
        p.election_id, s.id as state_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN state_assembly_constituencies s ON p.lga_id = s.lga_id,
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id, state_constituency_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, state_constituency_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, s.id as state_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN state_assembly_constituencies s ON p.lga_id = s.lga_id,
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, s.id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id, state_constituency_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, state_constituency_id
)
INSERT INTO state_constituency_final_result (
    election_id, state_constituency_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    wards_counted, total_wards,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.state_constituency_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.wards_counted,
    (SELECT COUNT(w.id) FROM wards w JOIN state_assembly_constituencies s2 ON w.lga_id = s2.lga_id WHERE s2.id = a.state_constituency_id) as total_wards,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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

-- name: RollupFederalConstituencyFinalResults :exec
WITH agg AS (
    SELECT 
        r.election_id, l.federal_constituency_id, r.state_id,
        COALESCE(SUM(r.accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(r.votes_cast), 0) as votes_cast,
        COALESCE(SUM(r.valid_votes), 0) as valid_votes,
        COALESCE(SUM(r.rejected_votes), 0) as rejected_votes,
        COUNT(r.lga_id) as lgas_counted
    FROM lga_final_result r
    JOIN lgas l ON r.lga_id = l.id
    GROUP BY r.election_id, l.federal_constituency_id, r.state_id
),
cand_agg AS (
    SELECT 
        p.election_id, l.federal_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id, federal_constituency_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, federal_constituency_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, l.federal_constituency_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, l.federal_constituency_id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id, federal_constituency_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, federal_constituency_id
)
INSERT INTO federal_constituency_final_result (
    election_id, federal_constituency_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.federal_constituency_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas WHERE federal_constituency_id = a.federal_constituency_id) as total_lgas,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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
cand_agg AS (
    SELECT 
        p.election_id, l.senatorial_district_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id, senatorial_district_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, senatorial_district_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, l.senatorial_district_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p
    JOIN lgas l ON p.lga_id = l.id,
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, l.senatorial_district_id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id, senatorial_district_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, senatorial_district_id
)
INSERT INTO senatorial_district_final_result (
    election_id, senatorial_district_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.senatorial_district_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas WHERE senatorial_district_id = a.senatorial_district_id) as total_lgas,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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
        election_id, state_id,
        COALESCE(SUM(accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(votes_cast), 0) as votes_cast,
        COALESCE(SUM(valid_votes), 0) as valid_votes,
        COALESCE(SUM(rejected_votes), 0) as rejected_votes,
        COUNT(lga_id) as lgas_counted
    FROM lga_final_result
    GROUP BY election_id, state_id
),
cand_agg AS (
    SELECT 
        p.election_id, p.state_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id, state_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id, state_id
),
cand_live_agg AS (
    SELECT 
        p.election_id, p.state_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM lga_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, p.state_id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id, state_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id, state_id
)
INSERT INTO state_final_result (
    election_id, state_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    lgas_counted, total_lgas,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id, a.state_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.lgas_counted,
    (SELECT COUNT(*) FROM lgas WHERE state_id = a.state_id) as total_lgas,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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
    lgas_counted = EXCLUDED.lgas_counted,
    total_lgas = EXCLUDED.total_lgas,
    candidate_results = EXCLUDED.candidate_results,
    candidate_results_live = EXCLUDED.candidate_results_live,
    updated_at = NOW();

-- name: RollupElectionFinalResults :exec
WITH agg AS (
    SELECT 
        election_id,
        COALESCE(SUM(accredited_voters), 0) as accredited_voters,
        COALESCE(SUM(votes_cast), 0) as votes_cast,
        COALESCE(SUM(valid_votes), 0) as valid_votes,
        COALESCE(SUM(rejected_votes), 0) as rejected_votes,
        COUNT(state_id) as states_counted
    FROM state_final_result
    GROUP BY election_id
),
cand_agg AS (
    SELECT 
        p.election_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM state_final_result p, 
         jsonb_array_elements(p.candidate_results) as c(value)
    GROUP BY p.election_id, c.value->>'party_short_name'
),
cand_json AS (
    SELECT 
        election_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results
    FROM cand_agg
    GROUP BY election_id
),
cand_live_agg AS (
    SELECT 
        p.election_id,
        (c.value->>'party_short_name')::text as party_short_name,
        SUM((c.value->>'vote_count')::int) as vote_count
    FROM state_final_result p, 
         jsonb_array_elements(p.candidate_results_live) as c(value)
    GROUP BY p.election_id, c.value->>'party_short_name'
),
cand_live_json AS (
    SELECT 
        election_id,
        COALESCE(jsonb_agg(jsonb_build_object('party_short_name', party_short_name, 'vote_count', vote_count)), '[]'::jsonb) as candidate_results_live
    FROM cand_live_agg
    GROUP BY election_id
)
INSERT INTO election_final_result (
    election_id,
    accredited_voters, votes_cast, valid_votes, rejected_votes,
    states_counted, total_states,
        candidate_results_live,
candidate_results
)
SELECT 
    a.election_id,
    a.accredited_voters, a.votes_cast, a.valid_votes, a.rejected_votes,
    a.states_counted,
    (SELECT COUNT(*) FROM c_states) as total_states,    COALESCE(clj.candidate_results_live, '[]'::jsonb) as candidate_results_live,

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
  JOIN ward_final_result fr ON e.id = fr.election_id
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
  JOIN lga_final_result fr ON e.id = fr.election_id
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
  JOIN state_constituency_final_result fr ON e.id = fr.election_id
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
  JOIN federal_constituency_final_result fr ON e.id = fr.election_id
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
  JOIN senatorial_district_final_result fr ON e.id = fr.election_id
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
  JOIN state_final_result fr ON e.id = fr.election_id
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
FROM polling_unit_final_results fr
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
INSERT INTO polling_unit_final_results (
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

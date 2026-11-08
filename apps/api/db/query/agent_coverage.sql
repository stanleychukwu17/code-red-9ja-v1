-- =====================================================
-- AGENT COVERAGE BREAKDOWN QUERIES
-- =====================================================

-- name: GetPollingUnitWardID :one
SELECT ward_id FROM polling_units WHERE id = $1;

-- name: GetAgentCoveragePollingUnits :many
SELECT
    pu.id,
    pu.name,
    COALESCE(NULLIF(pu.pu_code, ''), pu.code, '')::text AS code,
    (
        SELECT COUNT(*)::bigint FROM polling_unit_assignments pua
        WHERE pua.polling_unit_id = pu.id
          AND pua.election_group_id = sqlc.arg(election_group_id)
          AND pua.party_id = sqlc.arg(party_id)
    )::bigint AS pu_agents_count,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id', u.id,
            'name', u.full_name,
            'avatar', COALESCE(u.avatar, '')
        )), '[]'::json)
        FROM (
            SELECT u.id, u.first_name, u.last_name, u.avatar
            FROM polling_unit_assignments pua
            JOIN users u ON u.id = pua.user_id
            WHERE pua.polling_unit_id = pu.id
              AND pua.election_group_id = sqlc.arg(election_group_id)
              AND pua.party_id = sqlc.arg(party_id)
            LIMIT 4
        ) u
    )::json AS agents
FROM polling_units pu
WHERE (sqlc.arg(ward_id)::bigint = 0 OR pu.ward_id = sqlc.arg(ward_id))
ORDER BY pu.id ASC;

-- name: GetAgentCoverageWards :many
SELECT
    w.id,
    w.name,
    ''::text AS code,
    COALESCE(egw.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(w.polling_units_count, 0)::bigint AS total_pus,
    (
        SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
        WHERE wes.ward_id = w.id
          AND wes.election_group_id = sqlc.arg(election_group_id)
          AND wes.party_id = sqlc.arg(party_id)
    )::bigint AS ward_supervisors_count,
    1::bigint AS total_wards,
    0::bigint AS lga_supervisors_count,
    0::bigint AS total_lgas,
    0::bigint AS state_supervisors_count,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id', u.id,
            'name', u.full_name,
            'avatar', COALESCE(u.avatar, '')
        )), '[]'::json)
        FROM (
            SELECT u.id, u.first_name, u.last_name, u.avatar
            FROM ward_election_supervisors wes
            JOIN users u ON u.id = wes.user_id
            WHERE wes.ward_id = w.id
              AND wes.election_group_id = sqlc.arg(election_group_id)
              AND wes.party_id = sqlc.arg(party_id)
            LIMIT 4
        ) u
    )::json AS supervisors
FROM wards w
LEFT JOIN (
    SELECT
        pua.ward_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
    GROUP BY pua.ward_id
) egw ON egw.ward_id = w.id
WHERE w.lga_id = sqlc.arg(lga_id)::int
ORDER BY w.name ASC;

-- name: GetAgentCoverageLGAs :many
SELECT
    l.id,
    l.name,
    ''::text AS code,
    COALESCE(egl.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(l.polling_units_count, 0)::bigint AS total_pus,
    (
        SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
        JOIN wards w ON w.id = wes.ward_id
        WHERE w.lga_id = l.id
          AND wes.election_group_id = sqlc.arg(election_group_id)
          AND wes.party_id = sqlc.arg(party_id)
    )::bigint AS ward_supervisors_count,
    COALESCE(l.wards_count, 0)::bigint AS total_wards,
    (
        SELECT COUNT(*)::bigint FROM lga_election_supervisors les
        WHERE les.lga_id = l.id
          AND les.election_group_id = sqlc.arg(election_group_id)
          AND les.party_id = sqlc.arg(party_id)
    )::bigint AS lga_supervisors_count,
    1::bigint AS total_lgas,
    0::bigint AS state_supervisors_count,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id', u.id,
            'name', u.full_name,
            'avatar', COALESCE(u.avatar, '')
        )), '[]'::json)
        FROM (
            SELECT u.id, u.first_name, u.last_name, u.avatar
            FROM lga_election_supervisors les
            JOIN users u ON u.id = les.user_id
            WHERE les.lga_id = l.id
              AND les.election_group_id = sqlc.arg(election_group_id)
              AND les.party_id = sqlc.arg(party_id)
            LIMIT 4
        ) u
    )::json AS supervisors
FROM lgas l
LEFT JOIN (
    SELECT
        pua.lga_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
    GROUP BY pua.lga_id
) egl ON egl.lga_id = l.id
WHERE l.state_id = sqlc.arg(state_id)::int
ORDER BY l.name ASC;

-- name: GetAgentCoverageStates :many
SELECT
    s.id,
    s.name,
    ''::text AS code,
    COALESCE(egs.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(s.polling_units_count, 0)::bigint AS total_pus,
    (
        SELECT COUNT(*)::bigint FROM ward_election_supervisors wes
        JOIN wards w ON w.id = wes.ward_id
        JOIN lgas l ON l.id = w.lga_id
        WHERE l.state_id = s.id
          AND wes.election_group_id = sqlc.arg(election_group_id)
          AND wes.party_id = sqlc.arg(party_id)
    )::bigint AS ward_supervisors_count,
    COALESCE(s.wards_count, 0)::bigint AS total_wards,
    (
        SELECT COUNT(*)::bigint FROM lga_election_supervisors les
        JOIN lgas l ON l.id = les.lga_id
        WHERE l.state_id = s.id
          AND les.election_group_id = sqlc.arg(election_group_id)
          AND les.party_id = sqlc.arg(party_id)
    )::bigint AS lga_supervisors_count,
    COALESCE(s.lgas_count, 0)::bigint AS total_lgas,
    (
        SELECT COUNT(*)::bigint FROM state_election_supervisors ses
        WHERE ses.state_id = s.id
          AND ses.election_group_id = sqlc.arg(election_group_id)
          AND ses.party_id = sqlc.arg(party_id)
    )::bigint AS state_supervisors_count,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id', u.id,
            'name', u.full_name,
            'avatar', COALESCE(u.avatar, '')
        )), '[]'::json)
        FROM (
            SELECT u.id, u.first_name, u.last_name, u.avatar
            FROM state_election_supervisors ses
            JOIN users u ON u.id = ses.user_id
            WHERE ses.state_id = s.id
              AND ses.election_group_id = sqlc.arg(election_group_id)
              AND ses.party_id = sqlc.arg(party_id)
            LIMIT 4
        ) u
    )::json AS supervisors
FROM c_states s
LEFT JOIN (
    SELECT
        pua.state_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
    GROUP BY pua.state_id
) egs ON egs.state_id = s.id
WHERE s.country_id = sqlc.arg(country_id)::int
ORDER BY s.name ASC;

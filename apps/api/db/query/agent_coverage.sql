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
    COALESCE(pua_counts.pu_agents_count, 0)::bigint AS pu_agents_count
FROM polling_units pu
LEFT JOIN (
    SELECT
        pua.polling_unit_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
      AND (sqlc.arg(ward_id)::bigint = 0 OR pua.ward_id = sqlc.arg(ward_id))
    GROUP BY pua.polling_unit_id
) pua_counts ON pua_counts.polling_unit_id = pu.id
WHERE (sqlc.arg(ward_id)::bigint = 0 OR pu.ward_id = sqlc.arg(ward_id))
ORDER BY pu.id ASC;

-- name: GetAgentCoverageWards :many
SELECT
    w.id,
    w.name,
    COALESCE(pua_counts.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(w.polling_units_count, 0)::bigint AS total_pus,
    COALESCE(wes_counts.ward_supervisors_count, 0)::bigint AS ward_supervisors_count,
    1::bigint AS total_wards,
    0::bigint AS lga_supervisors_count,
    0::bigint AS total_lgas,
    0::bigint AS state_supervisors_count
FROM wards w
LEFT JOIN (
    SELECT
        pua.ward_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
      AND pua.lga_id = sqlc.arg(lga_id)::int
    GROUP BY pua.ward_id
) pua_counts ON pua_counts.ward_id = w.id
LEFT JOIN (
    SELECT
        wes.ward_id,
        COUNT(*)::bigint AS ward_supervisors_count
    FROM ward_election_supervisors wes
    WHERE wes.election_group_id = sqlc.arg(election_group_id)
      AND wes.party_id = sqlc.arg(party_id)
      AND wes.lga_id = sqlc.arg(lga_id)::int
    GROUP BY wes.ward_id
) wes_counts ON wes_counts.ward_id = w.id
WHERE w.lga_id = sqlc.arg(lga_id)::int
ORDER BY w.name ASC;

-- name: GetAgentCoverageLGAs :many
SELECT
    l.id,
    l.name,
    COALESCE(pua_counts.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(l.polling_units_count, 0)::bigint AS total_pus,
    COALESCE(wes_counts.ward_supervisors_count, 0)::bigint AS ward_supervisors_count,
    COALESCE(l.wards_count, 0)::bigint AS total_wards,
    COALESCE(les_counts.lga_supervisors_count, 0)::bigint AS lga_supervisors_count,
    1::bigint AS total_lgas,
    0::bigint AS state_supervisors_count
FROM lgas l
LEFT JOIN (
    SELECT
        pua.lga_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
      AND pua.state_id = sqlc.arg(state_id)::int
    GROUP BY pua.lga_id
) pua_counts ON pua_counts.lga_id = l.id
LEFT JOIN (
    SELECT
        wes.lga_id,
        COUNT(*)::bigint AS ward_supervisors_count
    FROM ward_election_supervisors wes
    WHERE wes.election_group_id = sqlc.arg(election_group_id)
      AND wes.party_id = sqlc.arg(party_id)
      AND wes.state_id = sqlc.arg(state_id)::smallint
    GROUP BY wes.lga_id
) wes_counts ON wes_counts.lga_id = l.id
LEFT JOIN (
    SELECT
        les.lga_id,
        COUNT(*)::bigint AS lga_supervisors_count
    FROM lga_election_supervisors les
    WHERE les.election_group_id = sqlc.arg(election_group_id)
      AND les.party_id = sqlc.arg(party_id)
      AND les.state_id = sqlc.arg(state_id)::smallint
    GROUP BY les.lga_id
) les_counts ON les_counts.lga_id = l.id
WHERE l.state_id = sqlc.arg(state_id)::int
ORDER BY l.name ASC;

-- name: GetAgentCoverageStates :many
SELECT
    s.id,
    s.name,
    COALESCE(pua_counts.pu_agents_count, 0)::bigint AS pu_agents_count,
    COALESCE(s.polling_units_count, 0)::bigint AS total_pus,
    COALESCE(wes_counts.ward_supervisors_count, 0)::bigint AS ward_supervisors_count,
    COALESCE(s.wards_count, 0)::bigint AS total_wards,
    COALESCE(les_counts.lga_supervisors_count, 0)::bigint AS lga_supervisors_count,
    COALESCE(s.lgas_count, 0)::bigint AS total_lgas,
    COALESCE(ses_counts.state_supervisors_count, 0)::bigint AS state_supervisors_count
FROM c_states s
LEFT JOIN (
    SELECT
        pua.state_id,
        COUNT(*)::bigint AS pu_agents_count
    FROM polling_unit_assignments pua
    WHERE pua.election_group_id = sqlc.arg(election_group_id)
      AND pua.party_id = sqlc.arg(party_id)
    GROUP BY pua.state_id
) pua_counts ON pua_counts.state_id = s.id
LEFT JOIN (
    SELECT
        wes.state_id,
        COUNT(*)::bigint AS ward_supervisors_count
    FROM ward_election_supervisors wes
    WHERE wes.election_group_id = sqlc.arg(election_group_id)
      AND wes.party_id = sqlc.arg(party_id)
    GROUP BY wes.state_id
) wes_counts ON wes_counts.state_id = s.id
LEFT JOIN (
    SELECT
        les.state_id,
        COUNT(*)::bigint AS lga_supervisors_count
    FROM lga_election_supervisors les
    WHERE les.election_group_id = sqlc.arg(election_group_id)
      AND les.party_id = sqlc.arg(party_id)
    GROUP BY les.state_id
) les_counts ON les_counts.state_id = s.id
LEFT JOIN (
    SELECT
        ses.state_id,
        COUNT(*)::bigint AS state_supervisors_count
    FROM state_election_supervisors ses
    WHERE ses.election_group_id = sqlc.arg(election_group_id)
      AND ses.party_id = sqlc.arg(party_id)
    GROUP BY ses.state_id
) ses_counts ON ses_counts.state_id = s.id
WHERE s.country_id = sqlc.arg(country_id)::int
ORDER BY s.name ASC;

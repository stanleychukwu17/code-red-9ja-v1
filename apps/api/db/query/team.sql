-- name: GetTeamPollingAgentsByPollingUnit :many
SELECT
    pua.id,
    pua.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    pua.role_type,
    COALESCE(pu.state_name, '')::varchar AS state_name,
    COALESCE(pu.lga_name, '')::varchar AS lga_name,
    COALESCE(pu.ward_name, '')::varchar AS ward_name,
    COALESCE(pu.name, '')::varchar AS polling_unit_name,
    COALESCE(pu.pu_code, pu.code, '')::varchar AS polling_unit_code,
    COALESCE(pua.state_id, 0)::smallint AS state_id,
    COALESCE(pua.lga_id, 0)::int AS lga_id,
    COALESCE(pua.ward_id, 0)::int AS ward_id,
    COALESCE(pua.polling_unit_id, 0)::int AS polling_unit_id
FROM polling_unit_assignments pua
JOIN users u ON u.id = pua.user_id
LEFT JOIN polling_units pu ON pu.id = pua.polling_unit_id
WHERE
    pua.election_group_id = sqlc.arg(election_group_id)::integer
    AND pua.party_id = sqlc.arg(party_id)::smallint
    AND pua.polling_unit_id = sqlc.arg(polling_unit_id)::int
ORDER BY pua.id DESC;

-- name: GetTeamPollingAgentsByWard :many
SELECT
    pua.id,
    pua.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    pua.role_type,
    COALESCE(pu.state_name, '')::varchar AS state_name,
    COALESCE(pu.lga_name, '')::varchar AS lga_name,
    COALESCE(pu.ward_name, '')::varchar AS ward_name,
    COALESCE(pu.name, '')::varchar AS polling_unit_name,
    COALESCE(pu.pu_code, pu.code, '')::varchar AS polling_unit_code,
    COALESCE(pua.state_id, 0)::smallint AS state_id,
    COALESCE(pua.lga_id, 0)::int AS lga_id,
    COALESCE(pua.ward_id, 0)::int AS ward_id,
    COALESCE(pua.polling_unit_id, 0)::int AS polling_unit_id
FROM polling_unit_assignments pua
JOIN users u ON u.id = pua.user_id
LEFT JOIN polling_units pu ON pu.id = pua.polling_unit_id
WHERE
    pua.election_group_id = sqlc.arg(election_group_id)::integer
    AND pua.party_id = sqlc.arg(party_id)::smallint
    AND pua.state_id = sqlc.arg(state_id)::smallint
    AND pua.lga_id = sqlc.arg(lga_id)::int
    AND pua.ward_id = sqlc.arg(ward_id)::int
ORDER BY pua.id DESC;

-- name: GetTeamWardSupervisorsByWard :many
SELECT
    wes.id,
    wes.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    wes.role_type,
    COALESCE(w.state_name, '')::varchar AS state_name,
    COALESCE(w.lga_name, '')::varchar AS lga_name,
    COALESCE(w.name, '')::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(wes.state_id, 0)::smallint AS state_id,
    COALESCE(wes.lga_id, 0)::int AS lga_id,
    COALESCE(wes.ward_id, 0)::int AS ward_id,
    0::int AS polling_unit_id
FROM ward_election_supervisors wes
JOIN users u ON u.id = wes.user_id
LEFT JOIN wards w ON w.id = wes.ward_id
WHERE
    wes.election_group_id = sqlc.arg(election_group_id)::integer
    AND wes.party_id = sqlc.arg(party_id)::smallint
    AND wes.ward_id = sqlc.arg(ward_id)::int
ORDER BY wes.id DESC;

-- name: GetTeamWardSupervisorsByLga :many
SELECT
    wes.id,
    wes.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    wes.role_type,
    COALESCE(w.state_name, '')::varchar AS state_name,
    COALESCE(w.lga_name, '')::varchar AS lga_name,
    COALESCE(w.name, '')::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(wes.state_id, 0)::smallint AS state_id,
    COALESCE(wes.lga_id, 0)::int AS lga_id,
    COALESCE(wes.ward_id, 0)::int AS ward_id,
    0::int AS polling_unit_id
FROM ward_election_supervisors wes
JOIN users u ON u.id = wes.user_id
LEFT JOIN wards w ON w.id = wes.ward_id
WHERE
    wes.election_group_id = sqlc.arg(election_group_id)::integer
    AND wes.party_id = sqlc.arg(party_id)::smallint
    AND wes.state_id = sqlc.arg(state_id)::smallint
    AND wes.lga_id = sqlc.arg(lga_id)::int
ORDER BY wes.id DESC;

-- name: GetTeamWardSupervisorsByState :many
SELECT
    wes.id,
    wes.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    wes.role_type,
    COALESCE(w.state_name, '')::varchar AS state_name,
    COALESCE(w.lga_name, '')::varchar AS lga_name,
    COALESCE(w.name, '')::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(wes.state_id, 0)::smallint AS state_id,
    COALESCE(wes.lga_id, 0)::int AS lga_id,
    COALESCE(wes.ward_id, 0)::int AS ward_id,
    0::int AS polling_unit_id
FROM ward_election_supervisors wes
JOIN users u ON u.id = wes.user_id
LEFT JOIN wards w ON w.id = wes.ward_id
WHERE
    wes.election_group_id = sqlc.arg(election_group_id)::integer
    AND wes.party_id = sqlc.arg(party_id)::smallint
    AND wes.state_id = sqlc.arg(state_id)::smallint
ORDER BY wes.id DESC;

-- name: GetTeamLgaSupervisorsByLga :many
SELECT
    les.id,
    les.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    les.role_type,
    COALESCE(l.state_name, '')::varchar AS state_name,
    COALESCE(l.name, '')::varchar AS lga_name,
    ''::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(les.state_id, 0)::smallint AS state_id,
    COALESCE(les.lga_id, 0)::int AS lga_id,
    0::int AS ward_id,
    0::int AS polling_unit_id
FROM lga_election_supervisors les
JOIN users u ON u.id = les.user_id
LEFT JOIN lgas l ON l.id = les.lga_id
WHERE
    les.election_group_id = sqlc.arg(election_group_id)::integer
    AND les.party_id = sqlc.arg(party_id)::smallint
    AND les.lga_id = sqlc.arg(lga_id)::int
ORDER BY les.id DESC;

-- name: GetTeamLgaSupervisorsByState :many
SELECT
    les.id,
    les.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    les.role_type,
    COALESCE(l.state_name, '')::varchar AS state_name,
    COALESCE(l.name, '')::varchar AS lga_name,
    ''::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(les.state_id, 0)::smallint AS state_id,
    COALESCE(les.lga_id, 0)::int AS lga_id,
    0::int AS ward_id,
    0::int AS polling_unit_id
FROM lga_election_supervisors les
JOIN users u ON u.id = les.user_id
LEFT JOIN lgas l ON l.id = les.lga_id
WHERE
    les.election_group_id = sqlc.arg(election_group_id)::integer
    AND les.party_id = sqlc.arg(party_id)::smallint
    AND les.state_id = sqlc.arg(state_id)::smallint
ORDER BY les.id DESC;

-- name: GetTeamStateSupervisorsByState :many
SELECT
    ses.id,
    ses.user_id,
    COALESCE(u.full_name, '')::varchar AS user_name,
    COALESCE(u.avatar, '')::varchar AS avatar_url,
    COALESCE(u.phone, '')::varchar AS phone,
    ses.role_type,
    COALESCE(s.name, '')::varchar AS state_name,
    ''::varchar AS lga_name,
    ''::varchar AS ward_name,
    ''::varchar AS polling_unit_name,
    ''::varchar AS polling_unit_code,
    COALESCE(ses.state_id, 0)::smallint AS state_id,
    0::int AS lga_id,
    0::int AS ward_id,
    0::int AS polling_unit_id
FROM state_election_supervisors ses
JOIN users u ON u.id = ses.user_id
LEFT JOIN c_states s ON s.id = ses.state_id
WHERE
    ses.election_group_id = sqlc.arg(election_group_id)::integer
    AND ses.party_id = sqlc.arg(party_id)::smallint
    AND ses.state_id = sqlc.arg(state_id)::smallint
ORDER BY ses.id DESC;

-- name: ListPartyPositions :many
SELECT * FROM party_positions
WHERE (party_id IS NULL OR party_id = $1)
  AND (sqlc.narg('chapter_type')::varchar IS NULL OR sqlc.narg('chapter_type')::varchar = ANY(allowed_levels))
ORDER BY rank_order ASC, name ASC;

-- name: GetPartyPositionByID :one
SELECT * FROM party_positions
WHERE id = $1 AND (party_id IS NULL OR party_id = $2)
LIMIT 1;

-- name: CreatePartyCustomPosition :one
INSERT INTO party_positions ( party_id, name, code, position_type, description, allowed_levels, rank_order, max_occupants )
VALUES ( $1, $2, $3, 'custom', $4, $5, $6, $7 ) RETURNING *;

-- name: UpdatePartyCustomPosition :one
UPDATE party_positions
SET 
    name = $3,
    code = $4,
    description = $5,
    allowed_levels = $6,
    rank_order = $7,
    max_occupants = $8
WHERE id = $1 AND party_id = $2 AND position_type = 'custom'
RETURNING *;

-- name: DeletePartyCustomPosition :exec
DELETE FROM party_positions
WHERE id = $1 AND party_id = $2 AND position_type = 'custom';

-- name: AssignPartyPosition :one
INSERT INTO party_position_assignments (
    party_id, chapter_id, position_id, user_id, appointment_type, status, tenure_start, tenure_end, appointed_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpdatePositionAssignment :one
UPDATE party_position_assignments
SET 
    appointment_type = COALESCE(sqlc.narg('appointment_type')::varchar, appointment_type),
    status = COALESCE(sqlc.narg('status')::varchar, status),
    tenure_start = COALESCE(sqlc.narg('tenure_start')::date, tenure_start),
    tenure_end = sqlc.narg('tenure_end')::date,
    updated_at = NOW()
WHERE id = $1 AND party_id = $2
RETURNING *;

-- name: VacatePositionAssignment :one
UPDATE party_position_assignments
SET 
    status = 'vacated',
    tenure_end = CURRENT_DATE,
    updated_at = NOW()
WHERE id = $1 AND party_id = $2
RETURNING *;

-- name: CountActivePositionOccupants :one
SELECT COUNT(*) FROM party_position_assignments
WHERE chapter_id = $1 AND position_id = $2 AND status = 'active';

-- name: ListChapterOfficials :many
SELECT 
    pa.id AS assignment_id,
    pa.party_id,
    pa.chapter_id,
    pa.position_id,
    pa.user_id,
    pa.appointment_type,
    pa.status AS assignment_status,
    pa.tenure_start,
    pa.tenure_end,
    pa.appointed_by,
    pa.created_at AS assigned_at,
    
    pos.name AS position_name,
    pos.code AS position_code,
    pos.position_type,
    pos.rank_order,
    pos.max_occupants,
    
    u.first_name,
    u.last_name,
    u.middle_name,
    u.username,
    u.avatar,
    u.email,
    u.phone,

    pc.chapter_type,
    COALESCE(
        c.name,
        z.name,
        s.name,
        l.name,
        w.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        pc.chapter_type,
        COALESCE(c.name, z.name, s.name, l.name, w.name, '')::varchar,
        pos.name,
        pa.appointment_type
    ) AS display_title
FROM party_position_assignments pa
JOIN party_positions pos ON pos.id = pa.position_id
JOIN users u ON u.id = pa.user_id
JOIN party_chapters pc ON pc.id = pa.chapter_id
LEFT JOIN c_countries c ON c.id = pc.country_id AND pc.chapter_type = 'national'
LEFT JOIN c_zones_nigeria z ON z.id = pc.zonal_id AND pc.chapter_type = 'zonal'
LEFT JOIN c_states s ON s.id = pc.state_id AND pc.chapter_type = 'state'
LEFT JOIN lgas l ON l.id = pc.lga_id AND pc.chapter_type = 'lga'
LEFT JOIN wards w ON w.id = pc.ward_id AND pc.chapter_type = 'ward'
WHERE pa.party_id = $1
  AND pa.chapter_id = $2
  AND (sqlc.narg('status')::varchar IS NULL OR pa.status = sqlc.narg('status'))
ORDER BY pos.rank_order ASC, pa.tenure_start DESC;

-- name: ListPartyOfficials :many
SELECT 
    pa.id AS assignment_id,
    pa.party_id,
    pa.chapter_id,
    pa.position_id,
    pa.user_id,
    pa.appointment_type,
    pa.status AS assignment_status,
    pa.tenure_start,
    pa.tenure_end,
    pa.appointed_by,
    pa.created_at AS assigned_at,
    
    pos.name AS position_name,
    pos.code AS position_code,
    pos.position_type,
    pos.rank_order,
    pos.max_occupants,
    
    u.first_name,
    u.last_name,
    u.middle_name,
    u.username,
    u.avatar,
    u.email,
    u.phone,

    pc.chapter_type,
    COALESCE(
        c.name,
        z.name,
        s.name,
        l.name,
        w.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        pc.chapter_type,
        COALESCE(c.name, z.name, s.name, l.name, w.name, '')::varchar,
        pos.name,
        pa.appointment_type
    ) AS display_title
FROM party_position_assignments pa
JOIN party_positions pos ON pos.id = pa.position_id
JOIN users u ON u.id = pa.user_id
JOIN party_chapters pc ON pc.id = pa.chapter_id
LEFT JOIN c_countries c ON c.id = pc.country_id AND pc.chapter_type = 'national'
LEFT JOIN c_zones_nigeria z ON z.id = pc.zonal_id AND pc.chapter_type = 'zonal'
LEFT JOIN c_states s ON s.id = pc.state_id AND pc.chapter_type = 'state'
LEFT JOIN lgas l ON l.id = pc.lga_id AND pc.chapter_type = 'lga'
LEFT JOIN wards w ON w.id = pc.ward_id AND pc.chapter_type = 'ward'
WHERE pa.party_id = $1
  AND (sqlc.narg('chapter_type')::varchar IS NULL OR pc.chapter_type = sqlc.narg('chapter_type'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR pc.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR pc.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR pc.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('status')::varchar IS NULL OR pa.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::varchar IS NULL OR 
       u.first_name ILIKE '%' || sqlc.narg('search') || '%' OR 
       u.last_name ILIKE '%' || sqlc.narg('search') || '%' OR 
       u.username ILIKE '%' || sqlc.narg('search') || '%' OR 
       pos.name ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY pc.chapter_type ASC, pos.rank_order ASC, pa.tenure_start DESC;

-- name: ListMemberPositionAssignments :many
SELECT 
    pa.id AS assignment_id,
    pa.party_id,
    pa.chapter_id,
    pa.position_id,
    pa.user_id,
    pa.appointment_type,
    pa.status AS assignment_status,
    pa.tenure_start,
    pa.tenure_end,
    pa.created_at AS assigned_at,
    
    pos.name AS position_name,
    pos.code AS position_code,
    pos.position_type,
    pos.rank_order,
    
    pc.chapter_type,
    COALESCE(
        c.name,
        z.name,
        s.name,
        l.name,
        w.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        pc.chapter_type,
        COALESCE(c.name, z.name, s.name, l.name, w.name, '')::varchar,
        pos.name,
        pa.appointment_type
    ) AS display_title
FROM party_position_assignments pa
JOIN party_positions pos ON pos.id = pa.position_id
JOIN party_chapters pc ON pc.id = pa.chapter_id
LEFT JOIN c_countries c ON c.id = pc.country_id AND pc.chapter_type = 'national'
LEFT JOIN c_zones_nigeria z ON z.id = pc.zonal_id AND pc.chapter_type = 'zonal'
LEFT JOIN c_states s ON s.id = pc.state_id AND pc.chapter_type = 'state'
LEFT JOIN lgas l ON l.id = pc.lga_id AND pc.chapter_type = 'lga'
LEFT JOIN wards w ON w.id = pc.ward_id AND pc.chapter_type = 'ward'
WHERE pa.party_id = $1 AND pa.user_id = $2
ORDER BY pa.status ASC, pa.tenure_start DESC;

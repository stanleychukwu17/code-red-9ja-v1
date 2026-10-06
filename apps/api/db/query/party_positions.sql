-- name: ListDefaultPartyPositions :many
SELECT * FROM party_positions
WHERE party_id IS NULL
ORDER BY rank_order ASC, name ASC;

-- name: ListCustomPartyPositions :many
SELECT * FROM party_positions
WHERE party_id = $1
ORDER BY rank_order ASC, name ASC;

-- name: GetPartyPositionByID :one
SELECT * FROM party_positions
WHERE id = $1 AND (party_id IS NULL OR party_id = $2)
LIMIT 1;

-- name: CreatePartyCustomPosition :one
INSERT INTO party_positions ( party_id, name, code, position_type, description, allowed_levels, rank_order, max_occupants, is_executive, category )
VALUES ( $1, $2, $3, 'custom', $4, $5, $6, $7, COALESCE(sqlc.narg('is_executive')::boolean, true), COALESCE(sqlc.narg('category')::varchar, 'operations') ) RETURNING *;

-- name: UpdatePartyCustomPosition :one
UPDATE party_positions
SET 
    name = $3,
    code = $4,
    description = $5,
    allowed_levels = $6,
    rank_order = $7,
    max_occupants = $8,
    is_executive = COALESCE(sqlc.narg('is_executive')::boolean, is_executive),
    category = COALESCE(sqlc.narg('category')::varchar, category)
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
    party_position_assignments.id AS assignment_id,
    party_position_assignments.party_id,
    party_position_assignments.chapter_id,
    party_position_assignments.position_id,
    party_position_assignments.user_id,
    party_position_assignments.appointment_type,
    party_position_assignments.status AS assignment_status,
    party_position_assignments.tenure_start,
    party_position_assignments.tenure_end,
    party_position_assignments.created_at AS assigned_at,

    party_positions.name AS position_name,
    party_positions.position_type,
    party_positions.category AS position_category,
    party_positions.rank_order,
    
    users.first_name,
    users.last_name,
    users.username,
    users.avatar,

    party_chapters.chapter_type,
    COALESCE(
        c_countries.name,
        c_zones_nigeria.name,
        c_states.name,
        lgas.name,
        wards.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        party_chapters.chapter_type,
        COALESCE(c_countries.name, c_zones_nigeria.name, c_states.name, lgas.name, wards.name, '')::varchar,
        party_positions.name,
        party_position_assignments.appointment_type
    ) AS display_title
FROM party_position_assignments
JOIN party_positions ON party_positions.id = party_position_assignments.position_id
JOIN users ON users.id = party_position_assignments.user_id
JOIN party_chapters ON party_chapters.id = party_position_assignments.chapter_id
LEFT JOIN c_countries ON c_countries.id = party_chapters.country_id AND party_chapters.chapter_type = 'national'
LEFT JOIN c_zones_nigeria ON c_zones_nigeria.id = party_chapters.zonal_id AND party_chapters.chapter_type = 'zonal'
LEFT JOIN c_states ON c_states.id = party_chapters.state_id AND party_chapters.chapter_type = 'state'
LEFT JOIN lgas ON lgas.id = party_chapters.lga_id AND party_chapters.chapter_type = 'lga'
LEFT JOIN wards ON wards.id = party_chapters.ward_id AND party_chapters.chapter_type = 'ward'
WHERE party_position_assignments.party_id = $1
  AND party_position_assignments.chapter_id = $2
  AND (sqlc.narg('status')::varchar IS NULL OR party_position_assignments.status = sqlc.narg('status'))
ORDER BY party_positions.rank_order ASC, party_position_assignments.tenure_start DESC;

-- name: ListPartyOfficials :many
SELECT 
    party_position_assignments.id AS assignment_id,
    party_position_assignments.party_id,
    party_position_assignments.chapter_id,
    party_position_assignments.position_id,
    party_position_assignments.user_id,
    party_position_assignments.appointment_type,
    party_position_assignments.status AS assignment_status,
    party_position_assignments.tenure_start,
    party_position_assignments.tenure_end,
    party_position_assignments.created_at AS assigned_at,
    
    party_positions.name AS position_name,
    party_positions.position_type,
    party_positions.category AS position_category,
    party_positions.rank_order,
    
    users.first_name,
    users.last_name,
    users.username,
    users.avatar,

    party_chapters.chapter_type,
    COALESCE(
        c_countries.name,
        c_zones_nigeria.name,
        c_states.name,
        lgas.name,
        wards.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        party_chapters.chapter_type,
        COALESCE(c_countries.name, c_zones_nigeria.name, c_states.name, lgas.name, wards.name, '')::varchar,
        party_positions.name,
        party_position_assignments.appointment_type
    ) AS display_title
FROM party_position_assignments
JOIN party_positions ON party_positions.id = party_position_assignments.position_id
JOIN users ON users.id = party_position_assignments.user_id
JOIN party_chapters ON party_chapters.id = party_position_assignments.chapter_id
LEFT JOIN c_countries ON c_countries.id = party_chapters.country_id AND party_chapters.chapter_type = 'national'
LEFT JOIN c_zones_nigeria ON c_zones_nigeria.id = party_chapters.zonal_id AND party_chapters.chapter_type = 'zonal'
LEFT JOIN c_states ON c_states.id = party_chapters.state_id AND party_chapters.chapter_type = 'state'
LEFT JOIN lgas ON lgas.id = party_chapters.lga_id AND party_chapters.chapter_type = 'lga'
LEFT JOIN wards ON wards.id = party_chapters.ward_id AND party_chapters.chapter_type = 'ward'
WHERE party_position_assignments.party_id = $1
  AND (sqlc.narg('chapter_type')::varchar IS NULL OR party_chapters.chapter_type = sqlc.narg('chapter_type'))
  AND (sqlc.narg('zonal_id')::smallint IS NULL OR party_chapters.zonal_id = sqlc.narg('zonal_id'))
  AND (sqlc.narg('state_id')::smallint IS NULL OR party_chapters.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('lga_id')::int IS NULL OR party_chapters.lga_id = sqlc.narg('lga_id'))
  AND (sqlc.narg('ward_id')::int IS NULL OR party_chapters.ward_id = sqlc.narg('ward_id'))
  AND (sqlc.narg('status')::varchar IS NULL OR party_position_assignments.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::varchar IS NULL OR 
       users.first_name ILIKE '%' || sqlc.narg('search') || '%' OR 
       users.last_name ILIKE '%' || sqlc.narg('search') || '%' OR 
       users.username ILIKE '%' || sqlc.narg('search') || '%' OR 
       party_positions.name ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY party_chapters.chapter_type ASC, party_positions.rank_order ASC, party_position_assignments.tenure_start DESC;

-- name: ListMemberPositionAssignments :many
SELECT 
    party_position_assignments.id AS assignment_id,
    party_position_assignments.party_id,
    party_position_assignments.chapter_id,
    party_position_assignments.position_id,
    party_position_assignments.user_id,
    party_position_assignments.appointment_type,
    party_position_assignments.status AS assignment_status,
    party_position_assignments.tenure_start,
    party_position_assignments.tenure_end,
    party_position_assignments.created_at AS assigned_at,
    
    party_positions.name AS position_name,
    party_positions.position_type,
    party_positions.rank_order,
    
    party_chapters.chapter_type,
    COALESCE(
        c_countries.name,
        c_zones_nigeria.name,
        c_states.name,
        lgas.name,
        wards.name,
        ''
    )::varchar AS geo_name,
    format_position_display_title(
        party_chapters.chapter_type,
        COALESCE(c_countries.name, c_zones_nigeria.name, c_states.name, lgas.name, wards.name, '')::varchar,
        party_positions.name,
        party_position_assignments.appointment_type
    ) AS display_title
FROM party_position_assignments
JOIN party_positions ON party_positions.id = party_position_assignments.position_id
JOIN party_chapters ON party_chapters.id = party_position_assignments.chapter_id
LEFT JOIN c_countries ON c_countries.id = party_chapters.country_id AND party_chapters.chapter_type = 'national'
LEFT JOIN c_zones_nigeria ON c_zones_nigeria.id = party_chapters.zonal_id AND party_chapters.chapter_type = 'zonal'
LEFT JOIN c_states ON c_states.id = party_chapters.state_id AND party_chapters.chapter_type = 'state'
LEFT JOIN lgas ON lgas.id = party_chapters.lga_id AND party_chapters.chapter_type = 'lga'
LEFT JOIN wards ON wards.id = party_chapters.ward_id AND party_chapters.chapter_type = 'ward'
WHERE party_position_assignments.party_id = $1 AND party_position_assignments.user_id = $2
ORDER BY party_position_assignments.status ASC, party_position_assignments.tenure_start DESC;

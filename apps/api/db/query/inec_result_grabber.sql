-- name: GetINECResultGrabberByID :one
SELECT g.*, e.scope, e.election_date, e.state_id, e.office_id, o.inec_election_type_id, o.name AS office_name
FROM inec_result_grabber g
JOIN elections e ON g.election_id = e.id
JOIN offices o ON e.office_id = o.id
WHERE g.id = $1;

-- name: GetINECResultGrabberByElectionID :one
SELECT g.*, e.scope, e.election_date, e.state_id, e.office_id, o.inec_election_type_id, o.name AS office_name
FROM inec_result_grabber g
JOIN elections e ON g.election_id = e.id
JOIN offices o ON e.office_id = o.id
WHERE g.election_id = $1;

-- name: FindMatchingGrabberForINECScrape :one
SELECT g.*, e.scope, e.election_date, e.state_id, e.office_id, o.inec_election_type_id, o.name AS office_name
FROM inec_result_grabber g
JOIN elections e ON g.election_id = e.id
JOIN offices o ON e.office_id = o.id
WHERE e.office_id = sqlc.arg('office_id')
  AND (sqlc.narg('state_id')::smallint IS NULL OR e.state_id = sqlc.narg('state_id'))
  AND (sqlc.narg('year')::int IS NULL OR EXTRACT(YEAR FROM e.election_date)::int = sqlc.narg('year'))
ORDER BY e.election_date DESC, g.id DESC
LIMIT 1;

-- name: ListActiveINECResultGrabbers :many
SELECT g.*, e.scope, e.election_date, e.state_id, e.office_id, o.inec_election_type_id, o.name AS office_name
FROM inec_result_grabber g
JOIN elections e ON g.election_id = e.id
JOIN offices o ON e.office_id = o.id
WHERE e.election_date <= NOW()
  AND NOW() <= e.election_date + (sqlc.arg('active_sync_days_limit')::int || ' days')::INTERVAL
  AND g.sync_status NOT IN ('syncing', 'completed', 'paused')
ORDER BY g.id ASC;

-- name: ListINECResultGrabbersPaginated :many
SELECT g.*, e.name AS election_name, e.scope, e.election_date, e.office_id, o.name AS office_name
FROM inec_result_grabber g
JOIN elections e ON g.election_id = e.id
JOIN offices o ON e.office_id = o.id
WHERE (sqlc.narg('cursor')::bigint IS NULL OR g.id < sqlc.narg('cursor')::bigint)
ORDER BY g.id DESC
LIMIT sqlc.arg('limit');

-- name: ToggleINECResultGrabberPause :one
UPDATE inec_result_grabber
SET
  sync_status = CASE 
    WHEN sync_status = 'paused' THEN 'pending'
    ELSE 'paused'
  END,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateINECResultGrabberSyncStatus :one
UPDATE inec_result_grabber
SET
  sync_status = $2,
  sync_error_message = $3,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateINECResultGrabberMetrics :one
UPDATE inec_result_grabber
SET
  uploaded_results_count = $2,
  wards_with_complete_results_count = $3,
  lgas_with_complete_results_count = $4,
  sync_status = $5,
  sync_error_message = $6,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CalculateElectionMetrics :one
WITH election_pu_totals AS (
  SELECT 
    pu.ward_id,
    pu.lga_id,
    COUNT(pu.id) AS total_pus,
    COUNT(DISTINCT pur.polling_unit_id) AS uploaded_pus
  FROM polling_units pu
  LEFT JOIN polling_unit_results pur 
    ON pu.id = pur.polling_unit_id AND pur.election_id = sqlc.arg('election_id')::int
  GROUP BY pu.ward_id, pu.lga_id
),
ward_completion AS (
  SELECT 
    ward_id,
    lga_id,
    (total_pus > 0 AND total_pus = uploaded_pus) AS is_ward_complete
  FROM election_pu_totals
),
lga_completion AS (
  SELECT 
    lga_id,
    BOOL_AND(is_ward_complete) AS is_lga_complete
  FROM ward_completion
  GROUP BY lga_id
)
SELECT 
  (SELECT COUNT(DISTINCT polling_unit_id) FROM polling_unit_results WHERE election_id = sqlc.arg('election_id')::int) AS uploaded_results_count,
  (SELECT COUNT(*) FROM ward_completion WHERE is_ward_complete = true) AS wards_with_complete_results_count,
  (SELECT COUNT(*) FROM lga_completion WHERE is_lga_complete = true) AS lgas_with_complete_results_count,
  (SELECT COUNT(*) FROM ward_completion) AS total_wards_count,
  (SELECT COUNT(*) FROM lga_completion) AS total_lgas_count;

-- name: UpdateLGAMongoID :exec
UPDATE lgas
SET mongo_id = sqlc.arg('mongo_id')
WHERE LOWER(TRIM(name)) = LOWER(TRIM(sqlc.arg('lga_name')))
  AND (sqlc.narg('state_id')::int IS NULL OR state_id = sqlc.narg('state_id'))
  AND (mongo_id IS NULL OR mongo_id = '');

-- name: UpdateWardMongoID :exec
UPDATE wards w
SET mongo_id = sqlc.arg('mongo_id')
FROM lgas l
WHERE w.lga_id = l.id
  AND LOWER(TRIM(l.name)) = LOWER(TRIM(sqlc.arg('lga_name')))
  AND (sqlc.narg('state_id')::int IS NULL OR l.state_id = sqlc.narg('state_id'))
  AND (
    LOWER(TRIM(w.name)) = LOWER(TRIM(sqlc.arg('ward_name')))
    OR (sqlc.narg('ward_code')::text IS NOT NULL AND w.code = sqlc.narg('ward_code'))
  )
  AND (w.mongo_id IS NULL OR w.mongo_id = '');

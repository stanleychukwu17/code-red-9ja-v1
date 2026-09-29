-- ============================================================================
-- USER NOTIFICATIONS
-- ============================================================================

-- name: CreateNotification :one
INSERT INTO notifications (
    recipient_user_id,
    actor_user_id,
    party_id,
    category,
    type,
    priority,
    group_key,
    actor_count,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpsertGroupedNotification :one
INSERT INTO notifications (
    recipient_user_id,
    actor_user_id,
    party_id,
    category,
    type,
    priority,
    group_key,
    actor_count,
    metadata,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, 1, $8, NOW(), NOW()
)
ON CONFLICT (recipient_user_id, group_key) WHERE read_at IS NULL AND group_key IS NOT NULL
DO UPDATE SET
    actor_user_id = EXCLUDED.actor_user_id,
    actor_count = notifications.actor_count + 1,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
RETURNING *;

-- name: GetNotificationByID :one
SELECT * FROM notifications
WHERE id = $1 LIMIT 1;

-- name: ListNotificationsForUser :many
SELECT 
    n.id,
    n.recipient_user_id,
    n.actor_user_id,
    n.party_id,
    n.category,
    n.type,
    n.priority,
    n.group_key,
    n.actor_count,
    n.metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    u.first_name AS actor_first_name,
    u.last_name AS actor_last_name,
    u.username AS actor_username,
    u.avatar AS actor_avatar
FROM notifications n
LEFT JOIN users u ON u.id = n.actor_user_id
WHERE n.recipient_user_id = $1
ORDER BY n.id DESC
LIMIT $2 OFFSET $3;

-- name: GetUnreadNotificationsCount :one
SELECT COUNT(*) FROM notifications
WHERE recipient_user_id = $1 AND read_at IS NULL;

-- name: MarkNotificationAsRead :one
UPDATE notifications
SET read_at = NOW(), updated_at = NOW()
WHERE id = $1 AND recipient_user_id = $2
RETURNING *;

-- name: MarkAllNotificationsAsRead :exec
UPDATE notifications
SET read_at = NOW(), updated_at = NOW()
WHERE recipient_user_id = $1 AND read_at IS NULL;

-- name: DeleteNotification :exec
DELETE FROM notifications
WHERE id = $1 AND recipient_user_id = $2;


-- ============================================================================
-- PARTY NOTIFICATIONS
-- ============================================================================

-- name: CreatePartyNotification :one
INSERT INTO party_notifications (
    party_id,
    actor_user_id,
    chapter_id,
    target_category,
    category,
    type,
    priority,
    group_key,
    event_count,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpsertGroupedPartyNotification :one
INSERT INTO party_notifications (
    party_id,
    actor_user_id,
    chapter_id,
    target_category,
    category,
    type,
    priority,
    group_key,
    event_count,
    metadata,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, 1, $9, NOW(), NOW()
)
ON CONFLICT (party_id, (COALESCE(chapter_id, 0)), group_key) WHERE group_key IS NOT NULL
DO UPDATE SET
    actor_user_id = COALESCE(EXCLUDED.actor_user_id, party_notifications.actor_user_id),
    event_count = party_notifications.event_count + 1,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
RETURNING *;

-- name: ListPartyNotificationsForUser :many
-- Returns party notifications relevant to the user's active chapter positions
SELECT 
    pn.id,
    pn.party_id,
    pn.actor_user_id,
    pn.chapter_id,
    pn.target_category,
    pn.category,
    pn.type,
    pn.priority,
    pn.group_key,
    pn.event_count,
    pn.metadata,
    pn.created_at,
    pn.updated_at,
    u.first_name AS actor_first_name,
    u.last_name AS actor_last_name,
    u.username AS actor_username,
    u.avatar AS actor_avatar,
    (pnr.read_at IS NOT NULL)::boolean AS is_read
FROM party_notifications pn
LEFT JOIN users u ON u.id = pn.actor_user_id
INNER JOIN party_position_assignments ppa 
    ON ppa.party_id = pn.party_id 
    AND ppa.user_id = $1 
    AND ppa.status = 'active'
    AND (pn.chapter_id IS NULL OR pn.chapter_id = ppa.chapter_id)
LEFT JOIN party_notification_reads pnr 
    ON pnr.party_notification_id = pn.id 
    AND pnr.user_id = $1
WHERE pn.party_id = $2
ORDER BY pn.id DESC
LIMIT $3 OFFSET $4;

-- name: GetUnreadPartyNotificationsCountForUser :one
SELECT COUNT(DISTINCT pn.id)
FROM party_notifications pn
INNER JOIN party_position_assignments ppa 
    ON ppa.party_id = pn.party_id 
    AND ppa.user_id = $1 
    AND ppa.status = 'active'
    AND (pn.chapter_id IS NULL OR pn.chapter_id = ppa.chapter_id)
LEFT JOIN party_notification_reads pnr 
    ON pnr.party_notification_id = pn.id 
    AND pnr.user_id = $1
WHERE pn.party_id = $2 AND pnr.read_at IS NULL;

-- name: MarkPartyNotificationAsRead :exec
INSERT INTO party_notification_reads (
    party_notification_id,
    user_id,
    read_at
) VALUES (
    $1, $2, NOW()
)
ON CONFLICT (party_notification_id, user_id) DO NOTHING;


-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

-- name: GetNotificationPreferencesByUserID :one
SELECT * FROM notification_preferences
WHERE user_id = $1 LIMIT 1;

-- name: UpsertNotificationPreferences :one
INSERT INTO notification_preferences (
    user_id,
    in_app_enabled,
    email_enabled,
    sms_enabled,
    category_preferences,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    in_app_enabled = EXCLUDED.in_app_enabled,
    email_enabled = EXCLUDED.email_enabled,
    sms_enabled = EXCLUDED.sms_enabled,
    category_preferences = EXCLUDED.category_preferences,
    updated_at = NOW()
RETURNING *;

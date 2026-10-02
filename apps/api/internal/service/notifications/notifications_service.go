package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/realtime"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// NotificationsService defines business logic for user and party notifications and preferences.
type NotificationsService interface {
	// User Notifications
	CreateNotification(ctx context.Context, params CreateNotificationInput) (*NotificationItemResponse, error)
	CreateNotificationAsync(ctx context.Context, params CreateNotificationInput)
	ListUserNotifications(ctx context.Context, userID int64, page, limit int32) (*PaginatedNotificationsResponse, error)
	GetUnreadCount(ctx context.Context, userID int64) (int64, error)
	MarkAsRead(ctx context.Context, notificationID int64, userID int64) error
	MarkAllAsRead(ctx context.Context, userID int64) error
	DeleteNotification(ctx context.Context, notificationID int64, userID int64) error

	// Party Notifications
	CreatePartyNotification(ctx context.Context, params CreatePartyNotificationInput) (*PartyNotificationItemResponse, error)
	CreatePartyNotificationAsync(ctx context.Context, params CreatePartyNotificationInput)
	ListPartyNotificationsForUser(ctx context.Context, userID int64, partyID int16, page, limit int32) (*PaginatedPartyNotificationsResponse, error)
	GetPartyUnreadCount(ctx context.Context, userID int64, partyID int16) (int64, error)
	MarkPartyNotificationAsRead(ctx context.Context, partyNotificationID int64, userID int64) error

	// Preferences
	GetPreferences(ctx context.Context, userID int64) (*NotificationPreferencesResponse, error)
	UpdatePreferences(ctx context.Context, userID int64, req UpdatePreferencesInput) (*NotificationPreferencesResponse, error)

	// Domain Dispatchers
	NotifyPartyMemberSuspended(ctx context.Context, params NotifyPartyMemberSuspendedParams)
	NotifyPartyMemberReinstated(ctx context.Context, params NotifyPartyMemberReinstatedParams)
	NotifyPartyUserBlocked(ctx context.Context, params NotifyPartyUserBlockedParams)
	NotifyPartyUserUnblocked(ctx context.Context, params NotifyPartyUserUnblockedParams)
	NotifyNewMemberJoined(ctx context.Context, params NotifyNewMemberJoinedParams)
}

type service struct {
	q           *queries.Queries
	rdb         *redis.Client
	broadcaster realtime.Broadcaster
}

// NewService instantiates a new NotificationsService.
func NewService(q *queries.Queries, rdb *redis.Client, broadcaster realtime.Broadcaster) NotificationsService {
	// Initialize and return the notification service instance
	return &service{
		q:           q,
		rdb:         rdb,
		broadcaster: broadcaster,
	}
}

// ----------------------------------------------------------------------------
// DATA TRANSFER OBJECTS (DTOs)
// ----------------------------------------------------------------------------

type CreateNotificationInput struct {
	RecipientUserID int64          `json:"recipient_user_id"`
	ActorUserID     *int64         `json:"actor_user_id,omitempty"`
	PartyID         *int16         `json:"party_id,omitempty"`
	Category        string         `json:"category"` // 'social', 'election', 'party', 'wallet', 'system'
	Type            string         `json:"type"`     // e.g. 'post_comment', 'new_follower'
	Priority        string         `json:"priority"` // 'low', 'normal', 'high', 'urgent'
	GroupKey        *string        `json:"group_key,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

type NotificationItemResponse struct {
	ID              int64          `json:"id"`
	RecipientUserID int64          `json:"recipient_user_id"`
	ActorUserID     *int64         `json:"actor_user_id,omitempty"`
	PartyID         *int16         `json:"party_id,omitempty"`
	Category        string         `json:"category"`
	Type            string         `json:"type"`
	Priority        string         `json:"priority"`
	GroupKey        *string        `json:"group_key,omitempty"`
	ActorCount      int32          `json:"actor_count"`
	Metadata        map[string]any `json:"metadata"`
	ReadAt          *time.Time     `json:"read_at,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`

	// Enriched Actor info (if available)
	ActorFirstName *string `json:"actor_first_name,omitempty"`
	ActorLastName  *string `json:"actor_last_name,omitempty"`
	ActorUsername  *string `json:"actor_username,omitempty"`
	ActorAvatar    *string `json:"actor_avatar,omitempty"`
}

type PaginatedNotificationsResponse struct {
	Data        []NotificationItemResponse `json:"notifications"`
	UnreadCount int64                      `json:"unread_count"`
	Page        int32                      `json:"page"`
	Limit       int32                      `json:"limit"`
}

type CreatePartyNotificationInput struct {
	PartyID        int16          `json:"party_id"`
	ActorUserID    *int64         `json:"actor_user_id,omitempty"`
	ChapterID      *int32         `json:"chapter_id,omitempty"`
	TargetCategory *string        `json:"target_category,omitempty"`
	Category       string         `json:"category"` // 'membership', 'agent_recruitment', 'election_ops', 'finance', 'system'
	Type           string         `json:"type"`
	Priority       string         `json:"priority"`
	GroupKey       *string        `json:"group_key,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type PartyNotificationItemResponse struct {
	ID             int64          `json:"id"`
	PartyID        int16          `json:"party_id"`
	ActorUserID    *int64         `json:"actor_user_id,omitempty"`
	ActorFirstName *string        `json:"actor_first_name,omitempty"`
	ActorLastName  *string        `json:"actor_last_name,omitempty"`
	ActorUsername  *string        `json:"actor_username,omitempty"`
	ActorAvatar    *string        `json:"actor_avatar,omitempty"`
	ChapterID      *int32         `json:"chapter_id,omitempty"`
	TargetCategory *string        `json:"target_category,omitempty"`
	Category       string         `json:"category"`
	Type           string         `json:"type"`
	Priority       string         `json:"priority"`
	GroupKey       *string        `json:"group_key,omitempty"`
	EventCount     int32          `json:"event_count"`
	Metadata       map[string]any `json:"metadata"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	IsRead         bool           `json:"is_read"`
}

type PaginatedPartyNotificationsResponse struct {
	Data        []PartyNotificationItemResponse `json:"notifications"`
	UnreadCount int64                           `json:"unread_count"`
	Page        int32                           `json:"page"`
	Limit       int32                           `json:"limit"`
}

type NotificationPreferencesResponse struct {
	UserID              int64           `json:"user_id"`
	InAppEnabled        bool            `json:"in_app_enabled"`
	EmailEnabled        bool            `json:"email_enabled"`
	SmsEnabled          bool            `json:"sms_enabled"`
	CategoryPreferences map[string]bool `json:"category_preferences"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type UpdatePreferencesInput struct {
	InAppEnabled        *bool           `json:"in_app_enabled,omitempty"`
	EmailEnabled        *bool           `json:"email_enabled,omitempty"`
	SmsEnabled          *bool           `json:"sms_enabled,omitempty"`
	CategoryPreferences map[string]bool `json:"category_preferences,omitempty"`
}

type NotifyPartyMemberSuspendedParams struct {
	PartyID      int16
	TargetUserID int64
	ActorID      *int64
	ChapterID    *int32
	Reason       *string
}

type NotifyPartyMemberReinstatedParams struct {
	PartyID      int16
	TargetUserID int64
	ActorID      *int64
	ChapterID    *int32
	Reason       *string
}

type NotifyNewMemberJoinedParams struct {
	PartyID   int16
	UserID    int64
	ChapterID int32
}

// ----------------------------------------------------------------------------
// USER NOTIFICATIONS IMPLEMENTATION
// ----------------------------------------------------------------------------

func (s *service) CreateNotification(ctx context.Context, in CreateNotificationInput) (*NotificationItemResponse, error) {
	// Fall back to default normal priority if omitted
	if in.Priority == "" {
		in.Priority = "normal"
	}
	// Initialize metadata map if nil to prevent nil pointer issues
	if in.Metadata == nil {
		in.Metadata = make(map[string]any)
	}

	// Serialize metadata map into JSON bytes for postgres jsonb column
	metadataBytes, err := json.Marshal(in.Metadata)
	if err != nil {
		metadataBytes = []byte("{}")
	}

	// Convert pointer inputs into sql/pgtype nullable values
	actorUserID := utils.PgInt8FromPtr(in.ActorUserID)
	partyID := utils.PgInt2FromPtrNullable(in.PartyID)
	groupKey := utils.PgTextFromPtr(in.GroupKey)

	var n queries.Notification
	if in.GroupKey != nil && *in.GroupKey != "" {
		// Grouped notification: upsert and increment actor_count on unread conflict
		n, err = s.q.UpsertGroupedNotification(ctx, queries.UpsertGroupedNotificationParams{
			RecipientUserID: in.RecipientUserID,
			ActorUserID:     actorUserID,
			PartyID:         partyID,
			Category:        in.Category,
			Type:            in.Type,
			Priority:        in.Priority,
			GroupKey:        groupKey,
			Metadata:        metadataBytes,
		})
	} else {
		// Standalone notification: create fresh row with initial actor count 1
		n, err = s.q.CreateNotification(ctx, queries.CreateNotificationParams{
			RecipientUserID: in.RecipientUserID,
			ActorUserID:     actorUserID,
			PartyID:         partyID,
			Category:        in.Category,
			Type:            in.Type,
			Priority:        in.Priority,
			GroupKey:        groupKey,
			ActorCount:      1,
			Metadata:        metadataBytes,
		})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// Convert database entity into response DTO
	resp := mapNotificationToResponse(n)

	// Broadcast in real-time via Pusher to the recipient user's private channel
	if s.broadcaster != nil {
		_ = s.broadcaster.BroadcastNotification(ctx, in.RecipientUserID, resp)
	}

	return resp, nil
}

// CreateNotificationAsync dispatches a user notification asynchronously in a goroutine.
func (s *service) CreateNotificationAsync(ctx context.Context, in CreateNotificationInput) {
	// Launch background goroutine so callers are not blocked by network or DB I/O
	go func(params CreateNotificationInput) {
		// Use a bounded context to prevent hanging operations
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Attempt to persist and broadcast the notification
		if _, err := s.CreateNotification(bgCtx, params); err != nil {
			slog.Error("failed to create async notification", "error", err, "user_id", params.RecipientUserID)
		}
	}(in)
}

func (s *service) ListUserNotifications(ctx context.Context, userID int64, page, limit int32) (*PaginatedNotificationsResponse, error) {
	// Enforce min page boundary
	if page < 1 {
		page = 1
	}
	// Constrain items per page to a safe range (default 20, max 100)
	if limit < 1 || limit > 100 {
		limit = 20
	}
	// Compute query offset from page and limit
	offset := (page - 1) * limit

	// Query paginated notifications joined with actor profile info
	rows, err := s.q.ListNotificationsForUser(ctx, queries.ListNotificationsForUserParams{
		RecipientUserID: userID,
		Limit:           limit,
		Offset:          offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}

	// Fetch current unread badge count for the header
	unreadCount, err := s.q.GetUnreadNotificationsCount(ctx, userID)
	if err != nil {
		slog.Warn("Failed to fetch unread notifications count", "err", err, "user_id", userID)
	}

	// Map database rows to API response items
	items := make([]NotificationItemResponse, 0, len(rows))
	for _, r := range rows {
		// Parse raw JSONB metadata into map
		var meta map[string]any
		if len(r.Metadata) > 0 {
			_ = json.Unmarshal(r.Metadata, &meta)
		}
		if meta == nil {
			meta = make(map[string]any)
		}

		// Initialize response item with core fields
		item := NotificationItemResponse{
			ID:              r.ID,
			RecipientUserID: r.RecipientUserID,
			Category:        r.Category,
			Type:            r.Type,
			Priority:        r.Priority,
			ActorCount:      r.ActorCount,
			Metadata:        meta,
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		}

		// Extract nullable foreign keys and timestamps if valid
		if r.ActorUserID.Valid {
			id := r.ActorUserID.Int64
			item.ActorUserID = &id
		}
		if r.PartyID.Valid {
			pID := r.PartyID.Int16
			item.PartyID = &pID
		}
		if r.GroupKey.Valid {
			gk := r.GroupKey.String
			item.GroupKey = &gk
		}
		if r.ReadAt.Valid {
			rt := r.ReadAt.Time
			item.ReadAt = &rt
		}

		// Extract enriched actor profile info if joined
		if r.ActorFirstName.Valid {
			fn := r.ActorFirstName.String
			item.ActorFirstName = &fn
		}
		if r.ActorLastName.Valid {
			ln := r.ActorLastName.String
			item.ActorLastName = &ln
		}
		if r.ActorUsername.Valid {
			un := r.ActorUsername.String
			item.ActorUsername = &un
		}
		if r.ActorAvatar.Valid {
			av := r.ActorAvatar.String
			item.ActorAvatar = &av
		}

		items = append(items, item)
	}

	// Return paginated response with data and unread count
	return &PaginatedNotificationsResponse{
		Data:        items,
		UnreadCount: unreadCount,
		Page:        page,
		Limit:       limit,
	}, nil
}

func (s *service) GetUnreadCount(ctx context.Context, userID int64) (int64, error) {
	// Query database for the total unread user notifications count
	return s.q.GetUnreadNotificationsCount(ctx, userID)
}

func (s *service) MarkAsRead(ctx context.Context, notificationID int64, userID int64) error {
	// Execute update setting read_at timestamp for this notification and owner
	_, err := s.q.MarkNotificationAsRead(ctx, queries.MarkNotificationAsReadParams{
		ID:              notificationID,
		RecipientUserID: userID,
	})
	// Ignore not found errors if the notification was already read or removed
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	return nil
}

func (s *service) MarkAllAsRead(ctx context.Context, userID int64) error {
	// Mark all unread notifications as read for the user in bulk
	return s.q.MarkAllNotificationsAsRead(ctx, userID)
}

func (s *service) DeleteNotification(ctx context.Context, notificationID int64, userID int64) error {
	// Delete the notification from database ensuring the recipient matches
	return s.q.DeleteNotification(ctx, queries.DeleteNotificationParams{
		ID:              notificationID,
		RecipientUserID: userID,
	})
}

// ----------------------------------------------------------------------------
// PARTY NOTIFICATIONS IMPLEMENTATION
// ----------------------------------------------------------------------------
func (s *service) CreatePartyNotification(ctx context.Context, in CreatePartyNotificationInput) (*PartyNotificationItemResponse, error) {
	// Fall back to default normal priority if omitted
	if in.Priority == "" {
		in.Priority = "normal"
	}
	// Initialize metadata map if nil to prevent nil pointer issues
	if in.Metadata == nil {
		in.Metadata = make(map[string]any)
	}

	// Serialize metadata map to JSON bytes for jsonb column
	metadataBytes, err := json.Marshal(in.Metadata)
	if err != nil {
		metadataBytes = []byte("{}")
	}

	// Convert pointer inputs into sql/pgtype nullable values
	actorUserID := utils.PgInt8FromPtr(in.ActorUserID)

	// Set chapter ID if provided and valid
	var chapterID pgtype.Int4
	if in.ChapterID != nil && *in.ChapterID > 0 {
		chapterID = pgtype.Int4{Int32: *in.ChapterID, Valid: true}
	}

	targetCategory := utils.PgTextFromPtr(in.TargetCategory)
	groupKey := utils.PgTextFromPtr(in.GroupKey)

	var pn queries.PartyNotification
	if in.GroupKey != nil && *in.GroupKey != "" {
		// Grouped notification: upsert and increment event_count on conflict
		pn, err = s.q.UpsertGroupedPartyNotification(ctx, queries.UpsertGroupedPartyNotificationParams{
			PartyID:        in.PartyID,
			ActorUserID:    actorUserID,
			ChapterID:      chapterID,
			TargetCategory: targetCategory,
			Category:       in.Category,
			Type:           in.Type,
			Priority:       in.Priority,
			GroupKey:       groupKey,
			Metadata:       metadataBytes,
		})
	} else {
		// Standalone party notification: insert new row with event count 1
		pn, err = s.q.CreatePartyNotification(ctx, queries.CreatePartyNotificationParams{
			PartyID:        in.PartyID,
			ActorUserID:    actorUserID,
			ChapterID:      chapterID,
			TargetCategory: targetCategory,
			Category:       in.Category,
			Type:           in.Type,
			Priority:       in.Priority,
			GroupKey:       groupKey,
			EventCount:     1,
			Metadata:       metadataBytes,
		})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create party notification: %w", err)
	}

	// Convert DB record to response DTO (defaults isRead to false on creation)
	resp := mapPartyNotificationToResponse(pn, false)

	// Broadcast to party & chapter realtime channels via Pusher
	if s.broadcaster != nil {
		_ = s.broadcaster.BroadcastPartyNotification(ctx, in.PartyID, in.ChapterID, resp)
	}

	return resp, nil
}

// CreatePartyNotificationAsync dispatches a party notification asynchronously in a goroutine.
func (s *service) CreatePartyNotificationAsync(ctx context.Context, in CreatePartyNotificationInput) {
	// Dispatch party notification in background goroutine to prevent request latency
	go func(params CreatePartyNotificationInput) {
		// Enforce timeout for the background task
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Attempt to persist and broadcast to party channels
		if _, err := s.CreatePartyNotification(bgCtx, params); err != nil {
			slog.Error("failed to create async party notification", "error", err, "party_id", params.PartyID)
		}
	}(in)
}

// NotifyPartyMemberSuspended dispatches notifications for member suspension to both the user and party admins.
func (s *service) NotifyPartyMemberSuspended(ctx context.Context, params NotifyPartyMemberSuspendedParams) {
	// 1. Build metadata payload for the suspended member
	userMeta := utils.NewMetadata().
		Set("party_id", params.PartyID).
		SetIfNonEmpty("reason", params.Reason)

	// Send direct personal notification to the suspended user
	s.CreateNotificationAsync(ctx, CreateNotificationInput{
		RecipientUserID: params.TargetUserID,
		ActorUserID:     params.ActorID,
		PartyID:         &params.PartyID,
		Category:        constants.NotificationCategoryParty,
		Type:            constants.NotificationTypePartyMemberSuspended,
		Priority:        constants.NotificationPriorityHigh,
		Metadata:        userMeta,
	})

	// 2. Build metadata payload for party administrators/officials
	partyMeta := utils.NewMetadata().
		Set("suspended_user_id", params.TargetUserID).
		SetIfNonEmpty("reason", params.Reason)

	// Broadcast party notification to relevant party leadership
	s.CreatePartyNotificationAsync(ctx, CreatePartyNotificationInput{
		PartyID:     params.PartyID,
		ActorUserID: params.ActorID,
		ChapterID:   params.ChapterID,
		Category:    constants.PartyNotificationCategoryMembership,
		Type:        constants.NotificationTypePartyMemberSuspended,
		Priority:    constants.NotificationPriorityHigh,
		Metadata:    partyMeta,
	})
}

// NotifyPartyMemberReinstated dispatches notification to the reinstated member and party officials.
func (s *service) NotifyPartyMemberReinstated(ctx context.Context, params NotifyPartyMemberReinstatedParams) {
	// 1. Build metadata payload for the reinstated member
	userMeta := utils.NewMetadata().
		Set("party_id", params.PartyID).
		SetIfNonEmpty("reason", params.Reason)

	// Send direct notification to member welcoming them back
	s.CreateNotificationAsync(ctx, CreateNotificationInput{
		RecipientUserID: params.TargetUserID,
		ActorUserID:     params.ActorID,
		PartyID:         &params.PartyID,
		Category:        constants.NotificationCategoryParty,
		Type:            constants.NotificationTypePartyMemberReinstated,
		Priority:        constants.NotificationPriorityHigh,
		Metadata:        userMeta,
	})

	// 2. Build metadata payload for party leadership
	partyMeta := utils.NewMetadata().
		Set("reinstated_user_id", params.TargetUserID).
		SetIfNonEmpty("reason", params.Reason)

	// Alert party and chapter officials of the member reinstatement
	s.CreatePartyNotificationAsync(ctx, CreatePartyNotificationInput{
		PartyID:     params.PartyID,
		ActorUserID: params.ActorID,
		ChapterID:   params.ChapterID,
		Category:    constants.PartyNotificationCategoryMembership,
		Type:        constants.NotificationTypePartyMemberReinstated,
		Priority:    constants.NotificationPriorityHigh,
		Metadata:    partyMeta,
	})
}

type NotifyPartyUserBlockedParams struct {
	PartyID      int16
	TargetUserID int64
	ActorID      *int64
	ChapterID    *int32
	Reason       *string
}

// NotifyPartyUserBlocked dispatches notification to the blocked user and party administrators/officials.
func (s *service) NotifyPartyUserBlocked(ctx context.Context, params NotifyPartyUserBlockedParams) {
	// Build metadata payload for the blocked user
	userMeta := utils.NewMetadata().
		Set("party_id", params.PartyID).
		SetIfNonEmpty("reason", params.Reason)

	// Send high-priority alert to the blocked user
	s.CreateNotificationAsync(ctx, CreateNotificationInput{
		RecipientUserID: params.TargetUserID,
		ActorUserID:     params.ActorID,
		PartyID:         &params.PartyID,
		Category:        constants.NotificationCategoryParty,
		Type:            constants.NotificationTypePartyUserBlocked,
		Priority:        constants.NotificationPriorityHigh,
		Metadata:        userMeta,
	})

	// Build metadata payload for party leadership
	partyMeta := utils.NewMetadata().
		Set("blocked_user_id", params.TargetUserID).
		SetIfNonEmpty("reason", params.Reason)

	// Alert party and chapter leadership
	s.CreatePartyNotificationAsync(ctx, CreatePartyNotificationInput{
		PartyID:     params.PartyID,
		ActorUserID: params.ActorID,
		ChapterID:   params.ChapterID,
		Category:    constants.PartyNotificationCategoryMembership,
		Type:        constants.NotificationTypePartyUserBlocked,
		Priority:    constants.NotificationPriorityHigh,
		Metadata:    partyMeta,
	})
}

type NotifyPartyUserUnblockedParams struct {
	PartyID      int16
	TargetUserID int64
	ActorID      *int64
	Reason       *string
}

// NotifyPartyUserUnblocked dispatches notification ONLY to the unblocked user.
func (s *service) NotifyPartyUserUnblocked(ctx context.Context, params NotifyPartyUserUnblockedParams) {
	userMeta := utils.NewMetadata().
		Set("party_id", params.PartyID).
		SetIfNonEmpty("reason", params.Reason)

	s.CreateNotificationAsync(ctx, CreateNotificationInput{
		RecipientUserID: params.TargetUserID,
		ActorUserID:     params.ActorID,
		PartyID:         &params.PartyID,
		Category:        constants.NotificationCategoryParty,
		Type:            constants.NotificationTypePartyUserUnblocked,
		Priority:        constants.NotificationPriorityHigh,
		Metadata:        userMeta,
	})
}

// NotifyNewMemberJoined dispatches aggregated notifications to party & chapter officials when a user joins.
func (s *service) NotifyNewMemberJoined(ctx context.Context, params NotifyNewMemberJoinedParams) {
	// Group notifications by party and chapter so joins aggregate into a single batch
	groupKey := constants.GroupKeyPartyNewMembers(params.PartyID, params.ChapterID)

	// Send aggregated party notification
	s.CreatePartyNotificationAsync(ctx, CreatePartyNotificationInput{
		PartyID:     params.PartyID,
		ActorUserID: &params.UserID,
		ChapterID:   &params.ChapterID,
		Category:    constants.PartyNotificationCategoryMembership,
		Type:        constants.NotificationTypeNewMemberJoined,
		Priority:    constants.NotificationPriorityNormal,
		GroupKey:    &groupKey,
		Metadata:    utils.NewMetadata(),
	})
}

func (s *service) ListPartyNotificationsForUser(ctx context.Context, userID int64, partyID int16, page, limit int32) (*PaginatedPartyNotificationsResponse, error) {
	// Normalize pagination parameters
	if page < 1 {
		page = 1
	}
	// Constrain limit to reasonable boundaries
	if limit < 1 || limit > 100 {
		limit = 20
	}
	// Calculate database offset based on page and limit
	offset := (page - 1) * limit

	// Query notifications visible to user based on their active chapter assignment
	rows, err := s.q.ListPartyNotificationsForUser(ctx, queries.ListPartyNotificationsForUserParams{
		UserID:  userID,
		PartyID: partyID,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list party notifications: %w", err)
	}

	// Fetch total unread count for badge indicators
	unreadCount, err := s.q.GetUnreadPartyNotificationsCountForUser(ctx, queries.GetUnreadPartyNotificationsCountForUserParams{
		UserID:  userID,
		PartyID: partyID,
	})
	if err != nil {
		slog.Warn("Failed to fetch unread party notifications count", "err", err, "party_id", partyID)
	}

	// Map database rows and optional actor/chapter fields into response DTOs
	items := make([]PartyNotificationItemResponse, 0, len(rows))
	for _, r := range rows {
		// Deserialize metadata JSON
		var meta map[string]any
		if len(r.Metadata) > 0 {
			_ = json.Unmarshal(r.Metadata, &meta)
		}
		if meta == nil {
			meta = make(map[string]any)
		}

		// Build response item with base properties
		item := PartyNotificationItemResponse{
			ID:         r.ID,
			PartyID:    r.PartyID,
			Category:   r.Category,
			Type:       r.Type,
			Priority:   r.Priority,
			EventCount: r.EventCount,
			Metadata:   meta,
			CreatedAt:  r.CreatedAt.Time,
			UpdatedAt:  r.UpdatedAt.Time,
			IsRead:     r.IsRead,
		}

		// Extract optional actor details
		if r.ActorUserID.Valid {
			aID := r.ActorUserID.Int64
			item.ActorUserID = &aID
		}
		if r.ActorFirstName.Valid {
			fn := r.ActorFirstName.String
			item.ActorFirstName = &fn
		}
		if r.ActorLastName.Valid {
			ln := r.ActorLastName.String
			item.ActorLastName = &ln
		}
		if r.ActorUsername.Valid {
			un := r.ActorUsername.String
			item.ActorUsername = &un
		}
		if r.ActorAvatar.Valid {
			av := r.ActorAvatar.String
			item.ActorAvatar = &av
		}

		// Extract optional chapter, target, and grouping fields
		if r.ChapterID.Valid {
			cID := r.ChapterID.Int32
			item.ChapterID = &cID
		}
		if r.TargetCategory.Valid {
			tc := r.TargetCategory.String
			item.TargetCategory = &tc
		}
		if r.GroupKey.Valid {
			gk := r.GroupKey.String
			item.GroupKey = &gk
		}

		items = append(items, item)
	}

	// Return paginated results along with unread count
	return &PaginatedPartyNotificationsResponse{
		Data:        items,
		UnreadCount: unreadCount,
		Page:        page,
		Limit:       limit,
	}, nil
}

func (s *service) GetPartyUnreadCount(ctx context.Context, userID int64, partyID int16) (int64, error) {
	// Retrieve count of unread notifications matching user's position permissions
	return s.q.GetUnreadPartyNotificationsCountForUser(ctx, queries.GetUnreadPartyNotificationsCountForUserParams{
		UserID:  userID,
		PartyID: partyID,
	})
}

func (s *service) MarkPartyNotificationAsRead(ctx context.Context, partyNotificationID int64, userID int64) error {
	// Record read receipt in party_notification_reads for this user
	return s.q.MarkPartyNotificationAsRead(ctx, queries.MarkPartyNotificationAsReadParams{
		PartyNotificationID: partyNotificationID,
		UserID:              userID,
	})
}

// ----------------------------------------------------------------------------
// PREFERENCES IMPLEMENTATION
// ----------------------------------------------------------------------------
func (s *service) GetPreferences(ctx context.Context, userID int64) (*NotificationPreferencesResponse, error) {
	// Construct the user-specific Redis key
	redisKey := fmt.Sprintf("%s%d", db.RedisNotificationPreferences, userID)

	// 1. Check Redis cache first to avoid database load
	if s.rdb != nil {
		if val, err := s.rdb.Get(ctx, redisKey).Result(); err == nil && val != "" {
			var cached NotificationPreferencesResponse
			if err := json.Unmarshal([]byte(val), &cached); err == nil {
				return &cached, nil
			}
		}
	}

	// 2. Query database if cache miss
	row, err := s.q.GetNotificationPreferencesByUserID(ctx, userID)
	if err != nil {
		// Return sensible default preferences if user has not configured them yet
		if errors.Is(err, pgx.ErrNoRows) {
			def := &NotificationPreferencesResponse{
				UserID:       userID,
				InAppEnabled: true,
				EmailEnabled: true,
				SmsEnabled:   false,
				CategoryPreferences: map[string]bool{
					"social":   true,
					"election": true,
					"party":    true,
					"wallet":   true,
					"system":   true,
				},
				UpdatedAt: time.Now(),
			}
			return def, nil
		}
		return nil, fmt.Errorf("failed to fetch notification preferences: %w", err)
	}

	// Unmarshal category preferences from JSONB column
	var catPrefs map[string]bool
	if len(row.CategoryPreferences) > 0 {
		_ = json.Unmarshal(row.CategoryPreferences, &catPrefs)
	}
	if catPrefs == nil {
		catPrefs = make(map[string]bool)
	}

	// Assemble preference response object
	res := &NotificationPreferencesResponse{
		UserID:              row.UserID,
		InAppEnabled:        row.InAppEnabled,
		EmailEnabled:        row.EmailEnabled,
		SmsEnabled:          row.SmsEnabled,
		CategoryPreferences: catPrefs,
		UpdatedAt:           row.UpdatedAt.Time,
	}

	// 3. Cache populated preferences in Redis with long TTL
	if s.rdb != nil {
		if b, err := json.Marshal(res); err == nil {
			_ = s.rdb.Set(ctx, redisKey, string(b), db.RedisOneEightyDaysTTL).Err()
		}
	}

	return res, nil
}

func (s *service) UpdatePreferences(ctx context.Context, userID int64, req UpdatePreferencesInput) (*NotificationPreferencesResponse, error) {
	// Fetch existing preferences first to merge partial delta updates
	current, err := s.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Apply channel flag overrides if specified in request
	inApp := current.InAppEnabled
	if req.InAppEnabled != nil {
		inApp = *req.InAppEnabled
	}

	email := current.EmailEnabled
	if req.EmailEnabled != nil {
		email = *req.EmailEnabled
	}

	sms := current.SmsEnabled
	if req.SmsEnabled != nil {
		sms = *req.SmsEnabled
	}

	// Merge category preference modifications into current settings
	catPrefs := current.CategoryPreferences
	if catPrefs == nil {
		catPrefs = make(map[string]bool)
	}
	for k, v := range req.CategoryPreferences {
		catPrefs[k] = v
	}

	// Serialize merged category preferences map to JSON
	catBytes, err := json.Marshal(catPrefs)
	if err != nil {
		catBytes = []byte("{}")
	}

	// Persist updated preferences into database via upsert
	row, err := s.q.UpsertNotificationPreferences(ctx, queries.UpsertNotificationPreferencesParams{
		UserID:              userID,
		InAppEnabled:        inApp,
		EmailEnabled:        email,
		SmsEnabled:          sms,
		CategoryPreferences: catBytes,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update notification preferences: %w", err)
	}

	// Construct updated response DTO
	res := &NotificationPreferencesResponse{
		UserID:              row.UserID,
		InAppEnabled:        row.InAppEnabled,
		EmailEnabled:        row.EmailEnabled,
		SmsEnabled:          row.SmsEnabled,
		CategoryPreferences: catPrefs,
		UpdatedAt:           row.UpdatedAt.Time,
	}

	// Refresh Redis cache with updated preferences
	if s.rdb != nil {
		redisKey := fmt.Sprintf("%s%d", db.RedisNotificationPreferences, userID)
		if b, err := json.Marshal(res); err == nil {
			_ = s.rdb.Set(ctx, redisKey, string(b), db.RedisOneEightyDaysTTL).Err()
		}
	}

	return res, nil
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
func mapNotificationToResponse(n queries.Notification) *NotificationItemResponse {
	// Safely unmarshal JSONB metadata into generic map
	var meta map[string]any
	if len(n.Metadata) > 0 {
		_ = json.Unmarshal(n.Metadata, &meta)
	}
	if meta == nil {
		meta = make(map[string]any)
	}

	// Build response DTO with core fields
	resp := &NotificationItemResponse{
		ID:              n.ID,
		RecipientUserID: n.RecipientUserID,
		Category:        n.Category,
		Type:            n.Type,
		Priority:        n.Priority,
		ActorCount:      n.ActorCount,
		Metadata:        meta,
		CreatedAt:       n.CreatedAt.Time,
		UpdatedAt:       n.UpdatedAt.Time,
	}

	// Extract optional nullable actor, party, group key, and read timestamp
	if n.ActorUserID.Valid {
		id := n.ActorUserID.Int64
		resp.ActorUserID = &id
	}
	if n.PartyID.Valid {
		pID := n.PartyID.Int16
		resp.PartyID = &pID
	}
	if n.GroupKey.Valid {
		gk := n.GroupKey.String
		resp.GroupKey = &gk
	}
	if n.ReadAt.Valid {
		rt := n.ReadAt.Time
		resp.ReadAt = &rt
	}

	return resp
}

func mapPartyNotificationToResponse(pn queries.PartyNotification, isRead bool) *PartyNotificationItemResponse {
	// Safely unmarshal JSONB metadata into generic map
	var meta map[string]any
	if len(pn.Metadata) > 0 {
		_ = json.Unmarshal(pn.Metadata, &meta)
	}
	if meta == nil {
		meta = make(map[string]any)
	}

	// Build response DTO with core fields and per-official read state
	resp := &PartyNotificationItemResponse{
		ID:         pn.ID,
		PartyID:    pn.PartyID,
		Category:   pn.Category,
		Type:       pn.Type,
		Priority:   pn.Priority,
		EventCount: pn.EventCount,
		Metadata:   meta,
		CreatedAt:  pn.CreatedAt.Time,
		UpdatedAt:  pn.UpdatedAt.Time,
		IsRead:     isRead,
	}

	// Extract optional nullable actor, chapter, target, and group key
	if pn.ActorUserID.Valid {
		aID := pn.ActorUserID.Int64
		resp.ActorUserID = &aID
	}
	if pn.ChapterID.Valid {
		cID := pn.ChapterID.Int32
		resp.ChapterID = &cID
	}
	if pn.TargetCategory.Valid {
		tc := pn.TargetCategory.String
		resp.TargetCategory = &tc
	}
	if pn.GroupKey.Valid {
		gk := pn.GroupKey.String
		resp.GroupKey = &gk
	}

	return resp
}

package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/realtime"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// NotificationsService defines business logic for user and party notifications and preferences.
type NotificationsService interface {
	// User Notifications
	CreateNotification(ctx context.Context, params CreateNotificationInput) (*NotificationItemResponse, error)
	ListUserNotifications(ctx context.Context, userID int64, page, limit int32) (*PaginatedNotificationsResponse, error)
	GetUnreadCount(ctx context.Context, userID int64) (int64, error)
	MarkAsRead(ctx context.Context, notificationID int64, userID int64) error
	MarkAllAsRead(ctx context.Context, userID int64) error
	DeleteNotification(ctx context.Context, notificationID int64, userID int64) error

	// Party Notifications
	CreatePartyNotification(ctx context.Context, params CreatePartyNotificationInput) (*PartyNotificationItemResponse, error)
	ListPartyNotificationsForUser(ctx context.Context, userID int64, partyID int16, page, limit int32) (*PaginatedPartyNotificationsResponse, error)
	GetPartyUnreadCount(ctx context.Context, userID int64, partyID int16) (int64, error)
	MarkPartyNotificationAsRead(ctx context.Context, partyNotificationID int64, userID int64) error

	// Preferences
	GetPreferences(ctx context.Context, userID int64) (*NotificationPreferencesResponse, error)
	UpdatePreferences(ctx context.Context, userID int64, req UpdatePreferencesInput) (*NotificationPreferencesResponse, error)
}

type service struct {
	q           *queries.Queries
	rdb         *redis.Client
	broadcaster realtime.Broadcaster
}

// NewService instantiates a new NotificationsService.
func NewService(q *queries.Queries, rdb *redis.Client, broadcaster realtime.Broadcaster) NotificationsService {
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
	Title           *string        `json:"title,omitempty"`
	Body            *string        `json:"body,omitempty"`
	ActionURL       *string        `json:"action_url,omitempty"`
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
	Title           *string        `json:"title,omitempty"`
	Body            *string        `json:"body,omitempty"`
	ActionURL       *string        `json:"action_url,omitempty"`
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
	ChapterID      *int32         `json:"chapter_id,omitempty"`
	TargetCategory *string        `json:"target_category,omitempty"`
	Category       string         `json:"category"` // 'membership', 'agent_recruitment', 'election_ops', 'finance', 'system'
	Type           string         `json:"type"`
	Priority       string         `json:"priority"`
	GroupKey       *string        `json:"group_key,omitempty"`
	Title          *string        `json:"title,omitempty"`
	Body           *string        `json:"body,omitempty"`
	ActionURL      *string        `json:"action_url,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type PartyNotificationItemResponse struct {
	ID             int64          `json:"id"`
	PartyID        int16          `json:"party_id"`
	ChapterID      *int32         `json:"chapter_id,omitempty"`
	TargetCategory *string        `json:"target_category,omitempty"`
	Category       string         `json:"category"`
	Type           string         `json:"type"`
	Priority       string         `json:"priority"`
	GroupKey       *string        `json:"group_key,omitempty"`
	EventCount     int32          `json:"event_count"`
	Title          *string        `json:"title,omitempty"`
	Body           *string        `json:"body,omitempty"`
	ActionURL      *string        `json:"action_url,omitempty"`
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

// ----------------------------------------------------------------------------
// USER NOTIFICATIONS IMPLEMENTATION
// ----------------------------------------------------------------------------

func (s *service) CreateNotification(ctx context.Context, in CreateNotificationInput) (*NotificationItemResponse, error) {
	if in.Priority == "" {
		in.Priority = "normal"
	}
	if in.Metadata == nil {
		in.Metadata = make(map[string]any)
	}

	metadataBytes, err := json.Marshal(in.Metadata)
	if err != nil {
		metadataBytes = []byte("{}")
	}

	var actorUserID pgtype.Int8
	if in.ActorUserID != nil {
		actorUserID = pgtype.Int8{Int64: *in.ActorUserID, Valid: true}
	}

	var partyID pgtype.Int2
	if in.PartyID != nil {
		partyID = pgtype.Int2{Int16: *in.PartyID, Valid: true}
	}

	var groupKey pgtype.Text
	if in.GroupKey != nil && *in.GroupKey != "" {
		groupKey = pgtype.Text{String: *in.GroupKey, Valid: true}
	}

	var title pgtype.Text
	if in.Title != nil {
		title = pgtype.Text{String: *in.Title, Valid: true}
	}

	var body pgtype.Text
	if in.Body != nil {
		body = pgtype.Text{String: *in.Body, Valid: true}
	}

	var actionURL pgtype.Text
	if in.ActionURL != nil {
		actionURL = pgtype.Text{String: *in.ActionURL, Valid: true}
	}

	var n queries.Notification
	if in.GroupKey != nil && *in.GroupKey != "" {
		// Use upsert rollup
		n, err = s.q.UpsertGroupedNotification(ctx, queries.UpsertGroupedNotificationParams{
			RecipientUserID: in.RecipientUserID,
			ActorUserID:     actorUserID,
			PartyID:         partyID,
			Category:        in.Category,
			Type:            in.Type,
			Priority:        in.Priority,
			GroupKey:        groupKey,
			Title:           title,
			Body:            body,
			ActionUrl:       actionURL,
			Metadata:        metadataBytes,
		})
	} else {
		n, err = s.q.CreateNotification(ctx, queries.CreateNotificationParams{
			RecipientUserID: in.RecipientUserID,
			ActorUserID:     actorUserID,
			PartyID:         partyID,
			Category:        in.Category,
			Type:            in.Type,
			Priority:        in.Priority,
			GroupKey:        groupKey,
			ActorCount:      1,
			Title:           title,
			Body:            body,
			ActionUrl:       actionURL,
			Metadata:        metadataBytes,
		})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	resp := mapNotificationToResponse(n)

	// Broadcast live in-app notification via Pusher
	if s.broadcaster != nil {
		_ = s.broadcaster.BroadcastNotification(ctx, in.RecipientUserID, resp)
	}

	return resp, nil
}

func (s *service) ListUserNotifications(ctx context.Context, userID int64, page, limit int32) (*PaginatedNotificationsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := s.q.ListNotificationsForUser(ctx, queries.ListNotificationsForUserParams{
		RecipientUserID: userID,
		Limit:           limit,
		Offset:          offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}

	unreadCount, err := s.q.GetUnreadNotificationsCount(ctx, userID)
	if err != nil {
		slog.Warn("Failed to fetch unread notifications count", "err", err, "user_id", userID)
	}

	items := make([]NotificationItemResponse, 0, len(rows))
	for _, r := range rows {
		var meta map[string]any
		if len(r.Metadata) > 0 {
			_ = json.Unmarshal(r.Metadata, &meta)
		}
		if meta == nil {
			meta = make(map[string]any)
		}

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
		if r.Title.Valid {
			t := r.Title.String
			item.Title = &t
		}
		if r.Body.Valid {
			b := r.Body.String
			item.Body = &b
		}
		if r.ActionUrl.Valid {
			u := r.ActionUrl.String
			item.ActionURL = &u
		}
		if r.ReadAt.Valid {
			rt := r.ReadAt.Time
			item.ReadAt = &rt
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

		items = append(items, item)
	}

	return &PaginatedNotificationsResponse{
		Data:        items,
		UnreadCount: unreadCount,
		Page:        page,
		Limit:       limit,
	}, nil
}

func (s *service) GetUnreadCount(ctx context.Context, userID int64) (int64, error) {
	return s.q.GetUnreadNotificationsCount(ctx, userID)
}

func (s *service) MarkAsRead(ctx context.Context, notificationID int64, userID int64) error {
	_, err := s.q.MarkNotificationAsRead(ctx, queries.MarkNotificationAsReadParams{
		ID:              notificationID,
		RecipientUserID: userID,
	})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	return nil
}

func (s *service) MarkAllAsRead(ctx context.Context, userID int64) error {
	return s.q.MarkAllNotificationsAsRead(ctx, userID)
}

func (s *service) DeleteNotification(ctx context.Context, notificationID int64, userID int64) error {
	return s.q.DeleteNotification(ctx, queries.DeleteNotificationParams{
		ID:              notificationID,
		RecipientUserID: userID,
	})
}

// ----------------------------------------------------------------------------
// PARTY NOTIFICATIONS IMPLEMENTATION
// ----------------------------------------------------------------------------

func (s *service) CreatePartyNotification(ctx context.Context, in CreatePartyNotificationInput) (*PartyNotificationItemResponse, error) {
	if in.Priority == "" {
		in.Priority = "normal"
	}
	if in.Metadata == nil {
		in.Metadata = make(map[string]any)
	}

	metadataBytes, err := json.Marshal(in.Metadata)
	if err != nil {
		metadataBytes = []byte("{}")
	}

	var chapterID pgtype.Int4
	if in.ChapterID != nil && *in.ChapterID > 0 {
		chapterID = pgtype.Int4{Int32: *in.ChapterID, Valid: true}
	}

	var targetCategory pgtype.Text
	if in.TargetCategory != nil && *in.TargetCategory != "" {
		targetCategory = pgtype.Text{String: *in.TargetCategory, Valid: true}
	}

	var groupKey pgtype.Text
	if in.GroupKey != nil && *in.GroupKey != "" {
		groupKey = pgtype.Text{String: *in.GroupKey, Valid: true}
	}

	var title pgtype.Text
	if in.Title != nil {
		title = pgtype.Text{String: *in.Title, Valid: true}
	}

	var body pgtype.Text
	if in.Body != nil {
		body = pgtype.Text{String: *in.Body, Valid: true}
	}

	var actionURL pgtype.Text
	if in.ActionURL != nil {
		actionURL = pgtype.Text{String: *in.ActionURL, Valid: true}
	}

	var pn queries.PartyNotification
	if in.GroupKey != nil && *in.GroupKey != "" {
		pn, err = s.q.UpsertGroupedPartyNotification(ctx, queries.UpsertGroupedPartyNotificationParams{
			PartyID:        in.PartyID,
			ChapterID:      chapterID,
			TargetCategory: targetCategory,
			Category:       in.Category,
			Type:           in.Type,
			Priority:       in.Priority,
			GroupKey:       groupKey,
			Title:          title,
			Body:           body,
			ActionUrl:      actionURL,
			Metadata:       metadataBytes,
		})
	} else {
		pn, err = s.q.CreatePartyNotification(ctx, queries.CreatePartyNotificationParams{
			PartyID:        in.PartyID,
			ChapterID:      chapterID,
			TargetCategory: targetCategory,
			Category:       in.Category,
			Type:           in.Type,
			Priority:       in.Priority,
			GroupKey:       groupKey,
			EventCount:     1,
			Title:          title,
			Body:           body,
			ActionUrl:      actionURL,
			Metadata:       metadataBytes,
		})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create party notification: %w", err)
	}

	resp := mapPartyNotificationToResponse(pn, false)

	// Broadcast to party & chapter realtime channels
	if s.broadcaster != nil {
		_ = s.broadcaster.BroadcastPartyNotification(ctx, in.PartyID, in.ChapterID, resp)
	}

	return resp, nil
}

func (s *service) ListPartyNotificationsForUser(ctx context.Context, userID int64, partyID int16, page, limit int32) (*PaginatedPartyNotificationsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := s.q.ListPartyNotificationsForUser(ctx, queries.ListPartyNotificationsForUserParams{
		UserID:  userID,
		PartyID: partyID,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list party notifications: %w", err)
	}

	unreadCount, err := s.q.GetUnreadPartyNotificationsCountForUser(ctx, queries.GetUnreadPartyNotificationsCountForUserParams{
		UserID:  userID,
		PartyID: partyID,
	})
	if err != nil {
		slog.Warn("Failed to fetch unread party notifications count", "err", err, "party_id", partyID)
	}

	items := make([]PartyNotificationItemResponse, 0, len(rows))
	for _, r := range rows {
		var meta map[string]any
		if len(r.Metadata) > 0 {
			_ = json.Unmarshal(r.Metadata, &meta)
		}
		if meta == nil {
			meta = make(map[string]any)
		}

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
		if r.Title.Valid {
			t := r.Title.String
			item.Title = &t
		}
		if r.Body.Valid {
			b := r.Body.String
			item.Body = &b
		}
		if r.ActionUrl.Valid {
			u := r.ActionUrl.String
			item.ActionURL = &u
		}

		items = append(items, item)
	}

	return &PaginatedPartyNotificationsResponse{
		Data:        items,
		UnreadCount: unreadCount,
		Page:        page,
		Limit:       limit,
	}, nil
}

func (s *service) GetPartyUnreadCount(ctx context.Context, userID int64, partyID int16) (int64, error) {
	return s.q.GetUnreadPartyNotificationsCountForUser(ctx, queries.GetUnreadPartyNotificationsCountForUserParams{
		UserID:  userID,
		PartyID: partyID,
	})
}

func (s *service) MarkPartyNotificationAsRead(ctx context.Context, partyNotificationID int64, userID int64) error {
	return s.q.MarkPartyNotificationAsRead(ctx, queries.MarkPartyNotificationAsReadParams{
		PartyNotificationID: partyNotificationID,
		UserID:              userID,
	})
}

// ----------------------------------------------------------------------------
// PREFERENCES IMPLEMENTATION
// ----------------------------------------------------------------------------

func (s *service) GetPreferences(ctx context.Context, userID int64) (*NotificationPreferencesResponse, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisNotificationPreferences, userID)

	// 1. Check Redis cache
	if s.rdb != nil {
		if val, err := s.rdb.Get(ctx, redisKey).Result(); err == nil && val != "" {
			var cached NotificationPreferencesResponse
			if err := json.Unmarshal([]byte(val), &cached); err == nil {
				return &cached, nil
			}
		}
	}

	// 2. Query DB
	row, err := s.q.GetNotificationPreferencesByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return default preferences
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

	var catPrefs map[string]bool
	if len(row.CategoryPreferences) > 0 {
		_ = json.Unmarshal(row.CategoryPreferences, &catPrefs)
	}
	if catPrefs == nil {
		catPrefs = make(map[string]bool)
	}

	res := &NotificationPreferencesResponse{
		UserID:              row.UserID,
		InAppEnabled:        row.InAppEnabled,
		EmailEnabled:        row.EmailEnabled,
		SmsEnabled:          row.SmsEnabled,
		CategoryPreferences: catPrefs,
		UpdatedAt:           row.UpdatedAt.Time,
	}

	// Cache in Redis for 24h
	if s.rdb != nil {
		if b, err := json.Marshal(res); err == nil {
			_ = s.rdb.Set(ctx, redisKey, string(b), db.RedisOneDayTTL).Err()
		}
	}

	return res, nil
}

func (s *service) UpdatePreferences(ctx context.Context, userID int64, req UpdatePreferencesInput) (*NotificationPreferencesResponse, error) {
	current, err := s.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

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

	catPrefs := current.CategoryPreferences
	if catPrefs == nil {
		catPrefs = make(map[string]bool)
	}
	for k, v := range req.CategoryPreferences {
		catPrefs[k] = v
	}

	catBytes, err := json.Marshal(catPrefs)
	if err != nil {
		catBytes = []byte("{}")
	}

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

	res := &NotificationPreferencesResponse{
		UserID:              row.UserID,
		InAppEnabled:        row.InAppEnabled,
		EmailEnabled:        row.EmailEnabled,
		SmsEnabled:          row.SmsEnabled,
		CategoryPreferences: catPrefs,
		UpdatedAt:           row.UpdatedAt.Time,
	}

	// Invalidate/refresh Redis cache
	if s.rdb != nil {
		redisKey := fmt.Sprintf("%s%d", db.RedisNotificationPreferences, userID)
		if b, err := json.Marshal(res); err == nil {
			_ = s.rdb.Set(ctx, redisKey, string(b), db.RedisOneDayTTL).Err()
		}
	}

	return res, nil
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

func mapNotificationToResponse(n queries.Notification) *NotificationItemResponse {
	var meta map[string]any
	if len(n.Metadata) > 0 {
		_ = json.Unmarshal(n.Metadata, &meta)
	}
	if meta == nil {
		meta = make(map[string]any)
	}

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
	if n.Title.Valid {
		t := n.Title.String
		resp.Title = &t
	}
	if n.Body.Valid {
		b := n.Body.String
		resp.Body = &b
	}
	if n.ActionUrl.Valid {
		u := n.ActionUrl.String
		resp.ActionURL = &u
	}
	if n.ReadAt.Valid {
		rt := n.ReadAt.Time
		resp.ReadAt = &rt
	}

	return resp
}

func mapPartyNotificationToResponse(pn queries.PartyNotification, isRead bool) *PartyNotificationItemResponse {
	var meta map[string]any
	if len(pn.Metadata) > 0 {
		_ = json.Unmarshal(pn.Metadata, &meta)
	}
	if meta == nil {
		meta = make(map[string]any)
	}

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
	if pn.Title.Valid {
		t := pn.Title.String
		resp.Title = &t
	}
	if pn.Body.Valid {
		b := pn.Body.String
		resp.Body = &b
	}
	if pn.ActionUrl.Valid {
		u := pn.ActionUrl.String
		resp.ActionURL = &u
	}

	return resp
}

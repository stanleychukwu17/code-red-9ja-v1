package usersservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// UserPreferencesResponse represents the client-facing user preferences data structure.
type UserPreferencesResponse struct {
	SidebarState      string              `json:"sidebar_state"`
	PinnedLinks       map[string][]string `json:"pinned_links"`
	Theme             string              `json:"theme"`
	PreferenceVersion int64               `json:"preference_version"`
}

// UpdateUserPreferencesParams contains input for updating user preferences.
type UpdateUserPreferencesParams struct {
	SidebarState *string             `json:"sidebar_state"`
	PinnedLinks  map[string][]string `json:"pinned_links"`
	Theme        *string             `json:"theme"`
}

// GetUserPreferences retrieves preferences for a user, checking Redis cache first before querying DB.
func (s *UsersService) GetUserPreferences(ctx context.Context, userID int64) (UserPreferencesResponse, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisUserPreferences, userID)

	// 1. Check Redis cache first
	cachedJSON, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil && cachedJSON != "" {
		var cachedPref UserPreferencesResponse
		if err := json.Unmarshal([]byte(cachedJSON), &cachedPref); err == nil {
			if cachedPref.PinnedLinks == nil {
				cachedPref.PinnedLinks = make(map[string][]string)
			}
			return cachedPref, nil
		}
	}

	// 2. Query database on cache miss
	pref, err := s.queries.GetUserPreferencesByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			defaultPref := UserPreferencesResponse{
				SidebarState:      "expanded",
				PinnedLinks:       make(map[string][]string),
				Theme:             "auto",
				PreferenceVersion: 0,
			}
			// Cache default preferences for 24 hours to prevent repeated DB misses
			if s.rdb != nil {
				if jsonBytes, err := json.Marshal(defaultPref); err == nil {
					s.rdb.Set(ctx, redisKey, jsonBytes, 24*time.Hour)
				}
			}
			return defaultPref, nil
		}
		return UserPreferencesResponse{}, err
	}

	sidebarState := "expanded"
	if pref.SidebarState.Valid && pref.SidebarState.String != "" {
		sidebarState = pref.SidebarState.String
	}

	theme := "auto"
	if pref.Theme.Valid && pref.Theme.String != "" {
		theme = pref.Theme.String
	}

	pinnedLinks := make(map[string][]string)
	if len(pref.PinnedLinks) > 0 {
		_ = json.Unmarshal(pref.PinnedLinks, &pinnedLinks)
	}

	// Assign to response
	res := UserPreferencesResponse{
		SidebarState:      sidebarState,
		PinnedLinks:       pinnedLinks,
		Theme:             theme,
		PreferenceVersion: pref.PreferenceVersion,
	}

	// Cache the retrieved preferences in Redis
	jsonBytes, err := json.Marshal(res)
	if err == nil {
		s.rdb.Set(ctx, redisKey, jsonBytes, db.RedisFiveYearsTTL)
	}

	return res, nil
}

// UpdateUserPreferences updates preferences for a user in the database and refreshes Redis cache.
func (s *UsersService) UpdateUserPreferences(ctx context.Context, userID int64, params UpdateUserPreferencesParams) (UserPreferencesResponse, error) {
	// Retrieve current preferences (checks Redis cache first, falling back to DB on miss)
	existing, err := s.GetUserPreferences(ctx, userID)
	if err != nil {
		return UserPreferencesResponse{}, err
	}

	// Merge sidebar state with existing value or fall back to default
	sidebarState := existing.SidebarState
	if params.SidebarState != nil && *params.SidebarState != "" {
		sidebarState = *params.SidebarState
	}

	// Merge theme with existing value or fall back to default
	theme := existing.Theme
	if params.Theme != nil && *params.Theme != "" {
		theme = *params.Theme
	}

	// Merge pinned links per app key so updates from one app preserve pinned links in other apps
	pinnedLinks := make(map[string][]string)
	if existing.PinnedLinks != nil {
		for k, v := range existing.PinnedLinks {
			pinnedLinks[k] = v
		}
	}
	if params.PinnedLinks != nil {
		for k, v := range params.PinnedLinks {
			pinnedLinks[k] = v
		}
	}

	pinnedLinksBytes, err := json.Marshal(pinnedLinks)
	if err != nil {
		pinnedLinksBytes = []byte("{}")
	}

	// Generate new preference version using GenerateFakeID
	newVersion := utils.GenerateFakeID(userID)

	// Persist changes using UPSERT (handles insert on new, update on conflict)
	res, err := s.queries.UpsertUserPreferences(ctx, queries.UpsertUserPreferencesParams{
		UserID:            userID,
		SidebarState:      pgtype.Text{String: sidebarState, Valid: true},
		PinnedLinks:       pinnedLinksBytes,
		Theme:             pgtype.Text{String: theme, Valid: true},
		PreferenceVersion: newVersion,
	})
	if err != nil {
		return UserPreferencesResponse{}, err
	}

	// Format response values with safe defaults
	resSidebarState := "expanded"
	if res.SidebarState.Valid && res.SidebarState.String != "" {
		resSidebarState = res.SidebarState.String
	}

	resTheme := "auto"
	if res.Theme.Valid && res.Theme.String != "" {
		resTheme = res.Theme.String
	}

	resPinnedLinks := make(map[string][]string)
	if len(res.PinnedLinks) > 0 {
		_ = json.Unmarshal(res.PinnedLinks, &resPinnedLinks)
	}

	finalResponse := UserPreferencesResponse{
		SidebarState:      resSidebarState,
		PinnedLinks:       resPinnedLinks,
		Theme:             resTheme,
		PreferenceVersion: res.PreferenceVersion,
	}

	// Update Redis cache immediately with fresh updated values
	redisKey := fmt.Sprintf("%s%d", db.RedisUserPreferences, userID)
	jsonBytes, err := json.Marshal(finalResponse)
	if err == nil {
		s.rdb.Set(ctx, redisKey, jsonBytes, db.RedisFiveYearsTTL)
	}

	return finalResponse, nil
}

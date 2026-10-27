package followsservice

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/notifications"

	"github.com/redis/go-redis/v9"
)

type PartiesService interface {
	GetPartyChapterByID(ctx context.Context, chapterID int32) (queries.PartyChapter, error)
}

type NotificationsService interface {
	CreatePartyNotificationAsync(ctx context.Context, params notifications.CreatePartyNotificationInput)
}

// FollowsService manages user follows and party chapter follows.
type FollowsService struct {
	queries              *queries.Queries
	rdb                  *redis.Client
	partiesService       PartiesService
	notificationsService NotificationsService
}

func NewFollowsService(q *queries.Queries, rdb *redis.Client, partiesService PartiesService, notificationsService NotificationsService) *FollowsService {
	return &FollowsService{
		queries:              q,
		rdb:                  rdb,
		partiesService:       partiesService,
		notificationsService: notificationsService,
	}
}

// FollowUser follows another user without duplicating an existing follow.
func (s *FollowsService) FollowUser(ctx context.Context, followerID, followingID int64) error {
	if followerID <= 0 || followingID <= 0 {
		return fmt.Errorf("user IDs must be greater than zero")
	}
	if followerID == followingID {
		return fmt.Errorf("you cannot follow yourself")
	}
	if err := s.queries.FollowUser(ctx, queries.FollowUserParams{
		FollowerID:  followerID,
		FollowingID: followingID,
	}); err != nil {
		return fmt.Errorf("failed to follow user: %w", err)
	}

	// Update Redis cache with 14-day TTL
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserFollower, followerID, followingID)
	_ = s.rdb.Set(ctx, cacheKey, true, db.RedisFourteenDaysTTL).Err()

	// Invalidate user follower/following counts
	s.InvalidateUserFollowersCountCache(ctx, followingID)
	s.InvalidateUserFollowingCountCache(ctx, followerID)

	return nil
}

// UnfollowUser removes a user follow if it exists.
func (s *FollowsService) UnfollowUser(ctx context.Context, followerID, followingID int64) error {
	if followerID <= 0 || followingID <= 0 {
		return fmt.Errorf("user IDs must be greater than zero")
	}
	if err := s.queries.UnfollowUser(ctx, queries.UnfollowUserParams{
		FollowerID:  followerID,
		FollowingID: followingID,
	}); err != nil {
		return fmt.Errorf("failed to unfollow user: %w", err)
	}

	// Update Redis cache with 14-day TTL
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserFollower, followerID, followingID)
	_ = s.rdb.Set(ctx, cacheKey, false, db.RedisFourteenDaysTTL).Err()

	// Invalidate user follower/following counts
	s.InvalidateUserFollowersCountCache(ctx, followingID)
	s.InvalidateUserFollowingCountCache(ctx, followerID)

	return nil
}

// FollowParty follows a party chapter without duplicating an existing follow.
func (s *FollowsService) FollowParty(ctx context.Context, userID int64, partyID int16, chapterID int32) error {
	if userID <= 0 || partyID <= 0 || chapterID <= 0 {
		return fmt.Errorf("user, party, and chapter IDs must be greater than zero")
	}

	chapter, err := s.partiesService.GetPartyChapterByID(ctx, chapterID)
	if err != nil {
		return fmt.Errorf("failed to fetch party chapter: %w", err)
	}
	if chapter.PartyID != partyID {
		return fmt.Errorf("chapter does not belong to this party")
	}

	rowsAffected, err := s.queries.FollowParty(ctx, queries.FollowPartyParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return fmt.Errorf("failed to follow party chapter: %w", err)
	}

	// Update Redis cache with 14-day TTL
	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterFollower, partyID, chapterID, userID)
	_ = s.rdb.Set(ctx, cacheKey, true, db.RedisFourteenDaysTTL).Err()

	if rowsAffected > 0 {
		// invalidate followers cache
		s.InvalidatePartyFollowersCountCache(ctx, partyID, chapterID)

		groupKey := constants.DailyGroupKey(fmt.Sprintf("new_followers:%d:%d", partyID, chapterID))
		s.notificationsService.CreatePartyNotificationAsync(ctx, notifications.CreatePartyNotificationInput{
			PartyID:     partyID,
			ActorUserID: &userID,
			ChapterID:   &chapterID,
			Category:    constants.PartyNotificationCategoryMembership,
			Type:        constants.NotificationTypeNewFollower,
			Priority:    constants.NotificationPriorityNormal,
			GroupKey:    &groupKey,
		})
	}

	return nil
}

// UnfollowParty removes a party chapter follow if it exists.
func (s *FollowsService) UnfollowParty(ctx context.Context, userID int64, partyID int16, chapterID int32) error {
	if userID <= 0 || partyID <= 0 || chapterID <= 0 {
		return fmt.Errorf("user, party, and chapter IDs must be greater than zero")
	}
	if err := s.queries.UnfollowParty(ctx, queries.UnfollowPartyParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: chapterID,
	}); err != nil {
		return fmt.Errorf("failed to unfollow party chapter: %w", err)
	}

	// Update Redis cache with 14-day TTL
	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterFollower, partyID, chapterID, userID)
	_ = s.rdb.Set(ctx, cacheKey, false, db.RedisFourteenDaysTTL).Err()

	// invalidate followers cache
	s.InvalidatePartyFollowersCountCache(ctx, partyID, chapterID)

	return nil
}

// IsFollowingParty checks if a user is following a specific party chapter, cached in Redis for 14 days.
func (s *FollowsService) IsFollowingParty(ctx context.Context, userID int64, partyID int16, chapterID int32) (bool, error) {
	if userID <= 0 || partyID <= 0 || chapterID <= 0 {
		return false, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterFollower, partyID, chapterID, userID)
	if cached, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if isFollowing, err := strconv.ParseBool(cached); err == nil {
			return isFollowing, nil
		}
	}

	isFollowing, err := s.queries.IsFollowingParty(ctx, queries.IsFollowingPartyParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check party chapter follow: %w", err)
	}

	// update cache with 14-day TTL
	_ = s.rdb.Set(ctx, cacheKey, isFollowing, db.RedisFourteenDaysTTL).Err()

	return isFollowing, nil
}

// GetPartyFollowersCount retrieves the total number of followers for a party chapter.
// It checks Redis first and falls back to the database if not found.
func (s *FollowsService) GetPartyFollowersCount(ctx context.Context, partyID int16, chapterID int32) (int64, error) {
	// Early return for invalid IDs
	if partyID <= 0 || chapterID <= 0 {
		return 0, nil
	}

	// Check Redis cache first
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyChapterFollowersCount, partyID, chapterID)
	if cachedStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if count, parseErr := strconv.ParseInt(cachedStr, 10, 64); parseErr == nil {
			return count, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		slog.Error("Failed to fetch party chapter followers count from redis", "error", err, "partyID", partyID, "chapterID", chapterID)
	}

	// Fallback to database query on cache miss
	count, err := s.queries.GetPartyFollowersCount(ctx, queries.GetPartyFollowersCountParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get party chapter followers count from db: %w", err)
	}

	// Update Redis cache with 14-day TTL
	_ = s.rdb.Set(ctx, cacheKey, count, db.RedisFourteenDaysTTL).Err()
	return count, nil
}

// InvalidatePartyFollowCache removes the cached follow boolean from Redis.
func (s *FollowsService) InvalidatePartyFollowCache(ctx context.Context, userID int64, partyID int16, chapterID int32) {
	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterFollower, partyID, chapterID, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// InvalidatePartyFollowersCountCache removes the cached followers count for a party chapter from Redis.
func (s *FollowsService) InvalidatePartyFollowersCountCache(ctx context.Context, partyID int16, chapterID int32) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyChapterFollowersCount, partyID, chapterID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// IsFollowingUser checks if followerID is following followingID, cached in Redis for 14 days.
func (s *FollowsService) IsFollowingUser(ctx context.Context, followerID, followingID int64) (bool, error) {
	if followerID <= 0 || followingID <= 0 || followerID == followingID {
		return false, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserFollower, followerID, followingID)
	if cached, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if isFollowing, err := strconv.ParseBool(cached); err == nil {
			return isFollowing, nil
		}
	}

	isFollowing, err := s.queries.IsFollowingUser(ctx, queries.IsFollowingUserParams{
		FollowerID:  followerID,
		FollowingID: followingID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check user follow: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, isFollowing, db.RedisFourteenDaysTTL).Err()
	return isFollowing, nil
}

// GetUserFollowersCount retrieves the total number of followers for a user.
// It checks Redis first and falls back to PostgreSQL on cache miss.
func (s *FollowsService) GetUserFollowersCount(ctx context.Context, userID int64) (int64, error) {
	if userID <= 0 {
		return 0, nil
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisUserFollowersCount, userID)
	if cachedStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if count, parseErr := strconv.ParseInt(cachedStr, 10, 64); parseErr == nil {
			return count, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		slog.Error("Failed to fetch user followers count from redis", "error", err, "userID", userID)
	}

	count, err := s.queries.GetUserFollowersCount(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get user followers count: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, count, db.RedisFourteenDaysTTL).Err()
	return count, nil
}

// GetUserFollowingCount retrieves the total number of users a user is following.
// It checks Redis first and falls back to PostgreSQL on cache miss.
func (s *FollowsService) GetUserFollowingCount(ctx context.Context, userID int64) (int64, error) {
	if userID <= 0 {
		return 0, nil
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisUserFollowingCount, userID)
	if cachedStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if count, parseErr := strconv.ParseInt(cachedStr, 10, 64); parseErr == nil {
			return count, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		slog.Error("Failed to fetch user following count from redis", "error", err, "userID", userID)
	}

	count, err := s.queries.GetUserFollowingCount(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get user following count: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, count, db.RedisFourteenDaysTTL).Err()
	return count, nil
}

// InvalidateUserFollowCache removes the cached follow boolean from Redis.
func (s *FollowsService) InvalidateUserFollowCache(ctx context.Context, followerID, followingID int64) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserFollower, followerID, followingID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// InvalidateUserFollowersCountCache removes the cached followers count for a user from Redis.
func (s *FollowsService) InvalidateUserFollowersCountCache(ctx context.Context, userID int64) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserFollowersCount, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// InvalidateUserFollowingCountCache removes the cached following count for a user from Redis.
func (s *FollowsService) InvalidateUserFollowingCountCache(ctx context.Context, userID int64) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserFollowingCount, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

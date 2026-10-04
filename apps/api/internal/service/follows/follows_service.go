package followsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/notifications"
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
	partiesService       PartiesService
	notificationsService NotificationsService
}

func NewFollowsService(q *queries.Queries, partiesService PartiesService, notificationsService NotificationsService) *FollowsService {
	return &FollowsService{
		queries:              q,
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

	if rowsAffected > 0 {
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
	return nil
}

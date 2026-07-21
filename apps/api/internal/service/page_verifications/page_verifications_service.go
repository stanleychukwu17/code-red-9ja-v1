package pageverificationsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/audit"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type UsersService interface {
	UpdateUserIsVerified(ctx context.Context, userID int64, fakeID int64, isVerified bool) error
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
}

type PartiesService interface {
	UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error
	GetPartyInfo(ctx context.Context, partyID pgtype.Int8) *queries.Party
}

type PageVerificationsService struct {
	queries        *queries.Queries
	rdb            *redis.Client
	usersService   UsersService
	partiesService PartiesService
	auditService   audit.AuditService
}

func NewPageVerificationsService(
	q *queries.Queries,
	rdb *redis.Client,
	usersService UsersService,
	partiesService PartiesService,
	auditService audit.AuditService,
) *PageVerificationsService {
	return &PageVerificationsService{
		queries:        q,
		rdb:            rdb,
		usersService:   usersService,
		partiesService: partiesService,
		auditService:   auditService,
	}
}

// VerifyPage assigns a verification badge to a page (user or party) and updates the is_verified flag.
func (s *PageVerificationsService) VerifyPage(ctx context.Context, forWho string, pageID int64, verificationTypeID int16, actorID int64) (queries.PagesVerified, error) {
	var userDetails *queries.UserWithPlaces
	switch forWho {
	case db.PageTypeUser:
		user, err := s.usersService.GetUserByFakeID(ctx, pageID)
		if err != nil {
			return queries.PagesVerified{}, fmt.Errorf("user not found: %w", err)
		}
		userDetails = &user
		pageID = user.ID
	case db.PageTypeParty:
		if party := s.partiesService.GetPartyInfo(ctx, pgtype.Int8{Int64: pageID, Valid: true}); party == nil {
			return queries.PagesVerified{}, fmt.Errorf("party not found")
		}
	default:
		return queries.PagesVerified{}, fmt.Errorf("invalid page type: %s", forWho)
	}

	// check if the verification type exist in the db
	if _, err := s.GetVerificationTypeInfo(ctx, verificationTypeID); err != nil {
		return queries.PagesVerified{}, fmt.Errorf("verification type not found: %w", err)
	}

	// make sure verification type is for user
	if forWho == db.PageTypeUser && (verificationTypeID == 3 || verificationTypeID == 5 || verificationTypeID == 6) {
		return queries.PagesVerified{}, fmt.Errorf("invalid verification type for user")
	}

	// make sure verification type is for party
	if forWho == db.PageTypeParty && verificationTypeID != 3 {
		return queries.PagesVerified{}, fmt.Errorf("invalid verification type for party")
	}

	// get all the page verifications
	pageVerifications, err := s.GetPageVerifications(ctx, forWho, pageID)
	if err != nil {
		return queries.PagesVerified{}, fmt.Errorf("failed to get page verifications: %w", err)
	}

	// check if the verification type already exists
	for _, pv := range pageVerifications {
		if pv.VerificationTypeID == verificationTypeID {
			return queries.PagesVerified{}, fmt.Errorf("verification type already exists")
		}
	}

	// Assign verification in pages_verified table
	pv, err := s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
		PageType:           forWho,
		PageID:             pageID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return queries.PagesVerified{}, fmt.Errorf("failed to add page verification: %w", err)
	}

	// Update the parent table's is_verified flag
	if err := s.updateParentIsVerifiedFlag(ctx, forWho, pageID, true, userDetails); err != nil {
		return pv, fmt.Errorf("failed to update is_verified flag: %w", err)
	}

	// Invalidate cache for the list of this page verification
	redisKey := fmt.Sprintf("%s%s:%d", db.RedisPageVerifications, forWho, pageID)
	s.rdb.Del(ctx, redisKey)

	// prepares old and new data to be saved in the audit_log
	oldValuesData, _ := json.Marshal(pageVerifications)
	newPageVerifications, _ := s.GetPageVerifications(ctx, forWho, pageID)
	newValuesData, _ := json.Marshal(newPageVerifications)

	// Log the action
	err = s.auditService.LogAction(
		ctx,
		queries.InsertAuditLogParams{
			Module:     pgtype.Text{String: db.ModuleAdmin, Valid: true},
			ActorID:    actorID,
			ActorRole:  pgtype.Text{String: db.ActorRoleAdmin, Valid: true},
			Action:     db.ActionAssignPageVerification,
			EntityType: forWho,
			EntityID:   fmt.Sprintf("%d", pageID),
			OldValues:  oldValuesData,
			NewValues:  newValuesData,
		},
	)
	if err != nil {
		return pv, fmt.Errorf("failed to save audit log: %w", err)
	}

	return pv, nil
}

// RemoveVerification removes a verification badge. If no badges remain, sets is_verified to false.
func (s *PageVerificationsService) RemoveVerification(ctx context.Context, pageType string, pageID int64, verificationTypeID int16, actorID int64) error {
	var userDetails *queries.UserWithPlaces
	if pageType == db.PageTypeUser {
		user, err := s.usersService.GetUserByFakeID(ctx, pageID)
		if err != nil {
			return fmt.Errorf("user not found: %w", err)
		}
		userDetails = &user
		pageID = user.ID
	}

	// get all the page verifications before removal
	oldPageVerifications, err := s.GetPageVerifications(ctx, pageType, pageID)
	if err != nil {
		return fmt.Errorf("failed to get page verifications: %w", err)
	}
	oldValuesData, _ := json.Marshal(oldPageVerifications)

	// 1. Remove verification from pages_verified table
	err = s.queries.RemovePageVerification(ctx, queries.RemovePageVerificationParams{
		PageType:           pageType,
		PageID:             pageID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return fmt.Errorf("failed to remove page verification: %w", err)
	}

	// 2. Check if the page has any other verifications left
	hasOtherVerifications, err := s.queries.CheckIfPageHasAnyVerification(ctx, queries.CheckIfPageHasAnyVerificationParams{
		PageType: pageType,
		PageID:   pageID,
	})
	if err != nil {
		return fmt.Errorf("failed to check remaining verifications: %w", err)
	}

	// 3. If no verifications left, set is_verified to false
	if !hasOtherVerifications {
		if err := s.updateParentIsVerifiedFlag(ctx, pageType, pageID, false, userDetails); err != nil {
			return fmt.Errorf("failed to unset is_verified flag: %w", err)
		}
	}

	// 4. Invalidate cache
	redisKey := fmt.Sprintf("%s%s:%d", db.RedisPageVerifications, pageType, pageID)
	s.rdb.Del(ctx, redisKey)

	// Get new page verifications after removal
	newPageVerifications, _ := s.GetPageVerifications(ctx, pageType, pageID)
	newValuesData, _ := json.Marshal(newPageVerifications)

	// 5. Log the action
	err = s.auditService.LogAction(
		ctx,
		queries.InsertAuditLogParams{
			Module:     pgtype.Text{String: db.ModuleAdmin, Valid: true},
			ActorID:    actorID,
			ActorRole:  pgtype.Text{String: db.ActorRoleAdmin, Valid: true},
			Action:     db.ActionRemovePageVerification,
			EntityType: pageType,
			EntityID:   fmt.Sprintf("%d", pageID),
			OldValues:  oldValuesData,
			NewValues:  newValuesData,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to save audit log: %w", err)
	}

	return nil
}

// GetPageVerifications returns all verifications for a specific page.
func (s *PageVerificationsService) GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error) {
	redisKey := fmt.Sprintf("%s%s:%d", db.RedisPageVerifications, pageType, pageID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var verifications []queries.GetPageVerificationsRow
		if err := json.Unmarshal([]byte(cachedData), &verifications); err == nil {
			return verifications, nil
		}
	}

	// Fetch from DB
	verifications, err := s.queries.GetPageVerifications(ctx, queries.GetPageVerificationsParams{
		PageType: pageType,
		PageID:   pageID,
	})
	if err != nil {
		return nil, err
	}

	// Save to Redis
	if verificationsData, err := json.Marshal(verifications); err == nil {
		s.rdb.Set(ctx, redisKey, verificationsData, 24*time.Hour)
	}

	return verifications, nil
}

// GetVerificationTypeInfo retrieves page verification type info, optimized with Redis caching.
func (s *PageVerificationsService) GetVerificationTypeInfo(ctx context.Context, verificationTypeID int16) (*queries.PageVerificationType, error) {
	redisKey := fmt.Sprintf("%s%d", db.RedisPageVerificationTypeInfo, verificationTypeID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var vt queries.PageVerificationType
		if err := json.Unmarshal([]byte(cachedData), &vt); err == nil {
			return &vt, nil
		}
	}

	// Fetch from DB
	vt, err := s.queries.GetPageVerificationType(ctx, verificationTypeID)
	if err != nil {
		return nil, err
	}

	// Save to Redis
	if vtData, err := json.Marshal(vt); err == nil {
		s.rdb.Set(ctx, redisKey, vtData, 24*time.Hour)
	}

	return &vt, nil
}

// ListVerificationTypes returns all available verification types.
func (s *PageVerificationsService) ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error) {
	return s.queries.ListVerificationTypes(ctx)
}

// updateParentIsVerifiedFlag calls the appropriate service to update the `is_verified` flag on the entity.
func (s *PageVerificationsService) updateParentIsVerifiedFlag(ctx context.Context, forWho string, pageID int64, isVerified bool, userDetails *queries.UserWithPlaces) error {
	switch forWho {
	case db.PageTypeUser:
		if userDetails == nil {
			return fmt.Errorf("user details not provided")
		}
		return s.usersService.UpdateUserIsVerified(ctx, userDetails.ID, userDetails.FakeID.Int64, isVerified)
	case db.PageTypeParty:
		return s.partiesService.UpdatePartyIsVerified(ctx, int16(pageID), isVerified)
	default:
		// Other types (e.g., party_member) could be added here
		return nil
	}
}

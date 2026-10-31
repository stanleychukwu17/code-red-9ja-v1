package pageverificationsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/audit"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

// Page Verification Type IDs matching database seed in 20260718184500_pages_verification.sql
const (
	VerificationTypeVIP              int16 = 1
	VerificationTypeCelebrity        int16 = 2
	VerificationTypePoliticalParty   int16 = 3
	VerificationTypePolitician       int16 = 4
	VerificationTypeOrganization     int16 = 5
	VerificationTypeBusiness         int16 = 6
	VerificationTypeNationalOfficial int16 = 7
	VerificationTypeZonalOfficial    int16 = 8
	VerificationTypeStateOfficial    int16 = 9
	VerificationTypeLgaOfficial      int16 = 10
	VerificationTypeWardOfficial     int16 = 11
)

type UsersService interface {
	UpdateUserIsVerified(ctx context.Context, userID int64, fakeID int64, isVerified bool) error
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
}

type PartiesService interface {
	UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error
	GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications
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

// CacheKey returns the Redis cache key for page verifications of a given page entity.
func (s *PageVerificationsService) CacheKey(pageType string, pageID int64) string {
	return fmt.Sprintf("%s%s:%d", db.RedisPageVerifications, pageType, pageID)
}

// InvalidateCache deletes the Redis cache entry for page verifications of a given page entity.
func (s *PageVerificationsService) InvalidateCache(ctx context.Context, pageType string, pageID int64) {
	s.rdb.Del(ctx, s.CacheKey(pageType, pageID))
}

// VerifyPage assigns a verification badge to a page (user or party) and updates the is_verified flag.
func (s *PageVerificationsService) VerifyPage(ctx context.Context, forWho string, pageID int64, verificationTypeID int16, actorID int64) (queries.PagesVerified, error) {
	var userDetails *queries.UserWithPlaces
	var party *queries.PartyWithVerifications

	switch forWho {
	case db.PageTypeUser:
		user, err := s.usersService.GetUserByFakeID(ctx, pageID)
		if err != nil {
			return queries.PagesVerified{}, fmt.Errorf("user not found: %w", err)
		}
		userDetails = &user
		pageID = user.ID
	case db.PageTypeParty:
		party = s.partiesService.GetPartyInfo(ctx, int16(pageID))
		if party == nil {
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
	if forWho == db.PageTypeUser && (verificationTypeID == VerificationTypePoliticalParty || verificationTypeID == VerificationTypeOrganization || verificationTypeID == VerificationTypeBusiness) {
		return queries.PagesVerified{}, fmt.Errorf("invalid verification type for user")
	}

	// ID 4 = politician_verified (system assigned when fielding candidates)

	// make sure verification type is for party
	if forWho == db.PageTypeParty && verificationTypeID != VerificationTypePoliticalParty {
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

	// Invalidate redis cache
	s.InvalidateCache(ctx, forWho, pageID)

	// marshal the old data
	oldValuesData, _ := json.Marshal(pageVerifications)

	// marshal the new data
	newPageVerifications, _ := s.GetPageVerifications(ctx, forWho, pageID)
	newValuesData, _ := json.Marshal(newPageVerifications)

	// save the old and new data as we log the action of this admin
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     pgtype.Text{String: db.ModuleAdmin, Valid: true},
		ActorID:    actorID,
		ActorRole:  pgtype.Text{String: db.ActorRoleAdmin, Valid: true},
		Action:     db.ActionAssignPageVerification,
		EntityType: forWho,
		EntityID:   fmt.Sprintf("%d", pageID),
		OldValues:  oldValuesData,
		NewValues:  newValuesData,
	})

	return pv, nil
}

type RemoveVerificationParams struct {
	PageType           string
	PageID             int64
	VerificationTypeID int16
	ActorID            int64
	ActiveVrfId        int64
}

// RemoveVerification removes a verification badge. If no badges remain, sets is_verified to false.
func (s *PageVerificationsService) RemoveVerification(ctx context.Context, params RemoveVerificationParams) (interface{}, error) {
	var userDetails *queries.UserWithPlaces
	var fakeID int64

	// get the userDetails
	if params.PageType == db.PageTypeUser {
		fakeID = params.PageID
		user, err := s.usersService.GetUserByFakeID(ctx, params.PageID)
		if err != nil {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		userDetails = &user
		params.PageID = user.ID
	}

	// get all the page verifications before removal
	oldPageVerifications, err := s.GetPageVerifications(ctx, params.PageType, params.PageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get page verifications: %w", err)
	}
	oldValuesData, _ := json.Marshal(oldPageVerifications)

	// 1. Remove verification from pages_verified table
	err = s.queries.RemovePageVerification(ctx, queries.RemovePageVerificationParams{
		ID:                 params.ActiveVrfId,
		PageType:           params.PageType,
		PageID:             params.PageID,
		VerificationTypeID: params.VerificationTypeID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to remove page verification: %w", err)
	}

	// 2. Check if the page has any other verifications left
	hasOtherVerifications, err := s.queries.CheckIfPageHasAnyVerification(ctx, queries.CheckIfPageHasAnyVerificationParams{
		PageType: params.PageType,
		PageID:   params.PageID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to check remaining verifications: %w", err)
	}

	// 3. Update the parent table's is_verified flag based on whether any verifications remain
	if err := s.updateParentIsVerifiedFlag(ctx, params.PageType, params.PageID, hasOtherVerifications, userDetails); err != nil {
		return nil, fmt.Errorf("failed to unset is_verified flag: %w", err)
	}

	// 4. Invalidate cache
	s.InvalidateCache(ctx, params.PageType, params.PageID)

	// get all the page verifications after removal
	newPageVerifications, _ := s.GetPageVerifications(ctx, params.PageType, params.PageID)
	newValuesData, _ := json.Marshal(newPageVerifications)

	// save the old and new data as we log the action of this admin
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     pgtype.Text{String: db.ModuleAdmin, Valid: true},
		ActorID:    params.ActorID,
		ActorRole:  pgtype.Text{String: db.ActorRoleAdmin, Valid: true},
		Action:     db.ActionRemovePageVerification,
		EntityType: params.PageType,
		EntityID:   fmt.Sprintf("%d", params.PageID),
		OldValues:  oldValuesData,
		NewValues:  newValuesData,
	})

	var pageDetails interface{}
	switch params.PageType {
	case db.PageTypeUser:
		pageDetails, _ = s.GetUserDetails(ctx, fakeID)
	case db.PageTypeParty:
		pageDetails, _ = s.GetPartyDetails(ctx, params.PageID)
	}

	return pageDetails, nil
}

// GetUserDetails retrieves a user's details by their fake ID
func (s *PageVerificationsService) GetUserDetails(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error) {
	return s.usersService.GetUserByFakeID(ctx, fakeID)
}

// GetPartyDetails retrieves a party's details by their ID
func (s *PageVerificationsService) GetPartyDetails(ctx context.Context, partyID int64) (*queries.PartyWithVerifications, error) {
	party := s.partiesService.GetPartyInfo(ctx, int16(partyID))
	if party == nil {
		return nil, fmt.Errorf("party not found")
	}
	return party, nil
}

// GetPageVerifications returns all verifications for a specific page.
func (s *PageVerificationsService) GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error) {
	redisKey := s.CacheKey(pageType, pageID)

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
		s.rdb.Set(ctx, redisKey, verificationsData, db.RedisOneYearTTL)
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
		s.rdb.Set(ctx, redisKey, vtData, db.RedisOneYearTTL)
	}

	return &vt, nil
}

// ListVerificationTypes returns all available verification types.
func (s *PageVerificationsService) ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error) {
	// Try to get from Redis
	val, err := s.rdb.Get(ctx, db.RedisPageVerificationTypesList).Result()
	if err == nil {
		var vt []queries.PageVerificationType
		if jsonErr := json.Unmarshal([]byte(val), &vt); jsonErr == nil {
			return vt, nil
		}
	}

	// If not in Redis or error, get from DB
	vt, err := s.queries.ListVerificationTypes(ctx)
	if err != nil {
		return nil, err
	}

	// Cache in Redis
	if data, jsonErr := json.Marshal(vt); jsonErr == nil {
		s.rdb.Set(ctx, db.RedisPageVerificationTypesList, data, db.RedisOneYearTTL)
	}

	return vt, nil
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

// addUserVerificationByType assigns a verification badge to a user, sets is_verified=true on the user, and invalidates cache.
func (s *PageVerificationsService) addUserVerificationByType(ctx context.Context, userID int64, verificationTypeID int16) error {
	fakeID, err := s.queries.GetUserFakeIDByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	_, err = s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
		PageType:           db.PageTypeUser,
		PageID:             userID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return fmt.Errorf("failed to add verification: %w", err)
	}

	if err := s.usersService.UpdateUserIsVerified(ctx, userID, fakeID.Int64, true); err != nil {
		return fmt.Errorf("failed to update user verified flag: %w", err)
	}

	s.InvalidateCache(ctx, db.PageTypeUser, userID)
	return nil
}

// removeUserVerificationByType removes a verification badge from a user, updates is_verified based on remaining badges, and invalidates cache.
func (s *PageVerificationsService) removeUserVerificationByType(ctx context.Context, userID int64, verificationTypeID int16) error {
	fakeID, err := s.queries.GetUserFakeIDByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	err = s.queries.RemovePageVerificationByType(ctx, queries.RemovePageVerificationByTypeParams{
		PageType:           db.PageTypeUser,
		PageID:             userID,
		VerificationTypeID: verificationTypeID,
	})
	if err != nil {
		return fmt.Errorf("failed to remove verification: %w", err)
	}

	hasOtherVerifications, err := s.queries.CheckIfPageHasAnyVerification(ctx, queries.CheckIfPageHasAnyVerificationParams{
		PageType: db.PageTypeUser,
		PageID:   userID,
	})
	if err != nil {
		return fmt.Errorf("failed to check remaining verifications: %w", err)
	}

	if err := s.usersService.UpdateUserIsVerified(ctx, userID, fakeID.Int64, hasOtherVerifications); err != nil {
		return fmt.Errorf("failed to update user verified flag: %w", err)
	}

	s.InvalidateCache(ctx, db.PageTypeUser, userID)
	return nil
}

// EnsurePoliticianVerification grants the 'politician_verified' badge to a user
// if they don't already have it, and marks them verified in the users table.
func (s *PageVerificationsService) EnsurePoliticianVerification(ctx context.Context, userID int64) error {
	// Fast path: check Redis cache first — if already verified, exit with 0 DB hits
	existing, err := s.GetPageVerifications(ctx, db.PageTypeUser, userID)
	if err != nil {
		return fmt.Errorf("failed to get page verifications: %w", err)
	}
	for _, v := range existing {
		if v.VerificationTypeID == VerificationTypePolitician {
			return nil
		}
	}

	return s.addUserVerificationByType(ctx, userID, VerificationTypePolitician)
}

// RevokePoliticianVerificationIfNoCandidacy removes the 'politician_verified' badge
// if the user has no remaining contested elections across the platform.
func (s *PageVerificationsService) RevokePoliticianVerificationIfNoCandidacy(ctx context.Context, userID int64) error {
	// Fast path: if the user doesn't even hold the politician badge, exit with 0 DB hits
	existing, err := s.GetPageVerifications(ctx, db.PageTypeUser, userID)
	if err != nil {
		return fmt.Errorf("failed to get page verifications: %w", err)
	}
	hasBadge := false
	for _, v := range existing {
		if v.VerificationTypeID == VerificationTypePolitician {
			hasBadge = true
			break
		}
	}
	if !hasBadge {
		return nil
	}

	// checks if a user ever contested any office in the past
	hasContested, err := s.queries.CheckIfUserEverContested(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check user candidacy: %w", err)
	}
	if hasContested {
		// Still has at least one candidacy elsewhere, do not revoke
		return nil
	}

	return s.removeUserVerificationByType(ctx, userID, VerificationTypePolitician)
}

// ChapterTypeToOfficialVerificationType maps a party chapter_type ('national', 'zonal', 'state', 'lga', 'ward')
// to its corresponding page_verification_types ID.
func ChapterTypeToOfficialVerificationType(chapterType string) (int16, error) {
	switch chapterType {
	case "national":
		return VerificationTypeNationalOfficial, nil
	case "zonal":
		return VerificationTypeZonalOfficial, nil
	case "state":
		return VerificationTypeStateOfficial, nil
	case "lga":
		return VerificationTypeLgaOfficial, nil
	case "ward":
		return VerificationTypeWardOfficial, nil
	default:
		return 0, fmt.Errorf("unknown chapter type %q", chapterType)
	}
}

// EnsureOfficialVerification grants an official verification badge (IDs 7 to 11) to a user
// if they don't already have it, and marks them verified in the users table.
func (s *PageVerificationsService) EnsureOfficialVerification(ctx context.Context, userID int64, verificationTypeID int16) error {
	// Fast path: check Redis cache first — if already verified, exit with 0 DB hits
	existing, err := s.GetPageVerifications(ctx, db.PageTypeUser, userID)
	if err != nil {
		return fmt.Errorf("failed to get page verifications: %w", err)
	}
	for _, v := range existing {
		if v.VerificationTypeID == verificationTypeID {
			return nil
		}
	}

	return s.addUserVerificationByType(ctx, userID, verificationTypeID)
}

// RevokeOfficialVerificationIfNoActivePosition removes an official verification badge (IDs 7 to 11)
// if the user has no remaining active position assignments at that chapter level across any party.
func (s *PageVerificationsService) RevokeOfficialVerificationIfNoActivePosition(ctx context.Context, userID int64, chapterType string, verificationTypeID int16) error {
	// Fast path: if the user doesn't even hold this official badge, exit with 0 DB hits
	existing, err := s.GetPageVerifications(ctx, db.PageTypeUser, userID)
	if err != nil {
		return fmt.Errorf("failed to get page verifications: %w", err)
	}
	hasBadge := false
	for _, v := range existing {
		if v.VerificationTypeID == verificationTypeID {
			hasBadge = true
			break
		}
	}
	if !hasBadge {
		return nil
	}

	hasPosition, err := s.queries.CheckIfUserHasActivePositionByChapterType(ctx, queries.CheckIfUserHasActivePositionByChapterTypeParams{
		UserID:      userID,
		ChapterType: chapterType,
	})
	if err != nil {
		return fmt.Errorf("failed to check active user positions for %s: %w", chapterType, err)
	}
	if hasPosition {
		// User still holds at least one active position at this chapter level
		return nil
	}

	return s.removeUserVerificationByType(ctx, userID, verificationTypeID)
}

// RevokeAllOfficialVerificationsIfNoActivePosition checks official levels (national, zonal, state, lga, ward)
// and revokes any official badges where the user no longer has any active position.
func (s *PageVerificationsService) RevokeAllOfficialVerificationsIfNoActivePosition(ctx context.Context, userID int64) error {
	// Fast path: read user verifications (Redis cached). If user holds no official badges, exit with 0 DB hits.
	existing, err := s.GetPageVerifications(ctx, db.PageTypeUser, userID)
	if err != nil {
		return err
	}

	badgeLevelMap := map[int16]string{
		VerificationTypeNationalOfficial: "national",
		VerificationTypeZonalOfficial:    "zonal",
		VerificationTypeStateOfficial:    "state",
		VerificationTypeLgaOfficial:      "lga",
		VerificationTypeWardOfficial:     "ward",
	}

	for _, v := range existing {
		if chapterType, ok := badgeLevelMap[v.VerificationTypeID]; ok {
			_ = s.RevokeOfficialVerificationIfNoActivePosition(ctx, userID, chapterType, v.VerificationTypeID)
		}
	}
	return nil
}

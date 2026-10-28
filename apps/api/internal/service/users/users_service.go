package usersservice

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"math/big"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

// BodiesService interface defines the methods needed from the bodies service
type BodiesService interface {
	GetLocationNames(ctx context.Context, countryID, stateID int16, cityID int32) (string, string, string)
}

// PageVerificationsService interface defines the methods needed from the page verifications service
type PageVerificationsService interface {
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
	ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error)
}

// PartyService interface defines the methods needed from the party service
type PartyService interface {
	GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications
	GetUserPartyChapters(ctx context.Context, userID int64, partyID int16) ([]queries.GetUserPartyChaptersRow, error)
}

// ElectionsService interface defines the methods needed from the elections service
type ElectionsService interface {
	GetUserActiveCandidacies(ctx context.Context, candidateID int64) ([]queries.UserActiveCandidacy, error)
}

// FollowsService interface defines the methods needed from the follows service
type FollowsService interface {
	GetUserFollowersCount(ctx context.Context, userID int64) (int64, error)
	GetUserFollowingCount(ctx context.Context, userID int64) (int64, error)
	IsFollowingUser(ctx context.Context, followerID, followingID int64) (bool, error)
}

// Bank represents a Nigerian commercial or digital bank
type Bank struct {
	Name                 string `json:"name"`
	Code                 string `json:"code"`
	UssdTemplate         string `json:"ussdTemplate,omitempty"`
	BaseUssdCode         string `json:"baseUssdCode,omitempty"`
	TransferUssdTemplate string `json:"transferUssdTemplate,omitempty"`
}

// NigerianBanks provides a default directory of registered Nigerian banks
var NigerianBanks = []Bank{
	{Name: "Access Bank", Code: "044"},
	{Name: "Citibank Nigeria", Code: "023"},
	{Name: "Ecobank Nigeria", Code: "050"},
	{Name: "Fidelity Bank", Code: "070"},
	{Name: "First Bank of Nigeria", Code: "011"},
	{Name: "First City Monument Bank (FCMB)", Code: "214"},
	{Name: "Globus Bank", Code: "00103"},
	{Name: "Guaranty Trust Bank (GTBank)", Code: "058"},
	{Name: "Heritage Bank", Code: "030"},
	{Name: "Jaiz Bank", Code: "301"},
	{Name: "Keystone Bank", Code: "082"},
	{Name: "Kuda Bank", Code: "50211"},
	{Name: "Moniepoint MFB", Code: "50515"},
	{Name: "OPay", Code: "999992"},
	{Name: "PalmPay", Code: "999991"},
	{Name: "Polaris Bank", Code: "076"},
	{Name: "Providus Bank", Code: "101"},
	{Name: "Stanbic IBTC Bank", Code: "221"},
	{Name: "Standard Chartered Bank", Code: "068"},
	{Name: "Sterling Bank", Code: "232"},
	{Name: "SunTrust Bank", Code: "100"},
	{Name: "TAJ Bank", Code: "302"},
	{Name: "Titan Trust Bank", Code: "102"},
	{Name: "Union Bank of Nigeria", Code: "032"},
	{Name: "United Bank for Africa (UBA)", Code: "033"},
	{Name: "Unity Bank", Code: "215"},
	{Name: "Wema Bank", Code: "035"},
	{Name: "Zenith Bank", Code: "057"},
}

// UsersService provides operations for managing user data, roles, and related services.
type UsersService struct {
	queries                  *queries.Queries
	rdb                      *redis.Client
	bodiesService            BodiesService
	pageVerificationsService PageVerificationsService
	partyService             PartyService
	electionsService         ElectionsService
	followsService           FollowsService
}

// CachedReferralCodeInfo represents the cached referrer details stored in Redis.
type CachedReferralCodeInfo struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// NewUsersService initializes and returns a new UsersService.
func NewUsersService(q *queries.Queries, rdb *redis.Client, bodiesService BodiesService, electionsService ElectionsService) *UsersService {
	return &UsersService{
		queries:          q,
		rdb:              rdb,
		bodiesService:    bodiesService,
		electionsService: electionsService,
	}
}

// SetPageVerificationsService sets the PageVerificationsService to avoid circular dependency in constructor.
func (s *UsersService) SetPageVerificationsService(pvs PageVerificationsService) {
	s.pageVerificationsService = pvs
}

// SetPartyService sets the PartyService to avoid circular dependency in constructor.
func (s *UsersService) SetPartyService(ps PartyService) {
	s.partyService = ps
}

// SetFollowsService sets the FollowsService to avoid circular dependency in constructor.
func (s *UsersService) SetFollowsService(fs FollowsService) {
	s.followsService = fs
}

// GetUserPageVerifications retrieves the page verifications for a specific user ID.
func (s *UsersService) GetUserPageVerifications(ctx context.Context, userID int64) ([]queries.GetPageVerificationsRow, error) {
	if s.pageVerificationsService == nil {
		return nil, fmt.Errorf("page verifications service not configured")
	}
	return s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeUser, userID)
}

// ListVerificationTypes retrieves the list of available verification types.
func (s *UsersService) ListVerificationTypes(ctx context.Context) ([]queries.PageVerificationType, error) {
	return s.pageVerificationsService.ListVerificationTypes(ctx)
}

// GetBanks retrieves a list of available banks.
func (s *UsersService) GetBanks(ctx context.Context) ([]Bank, error) {
	return NigerianBanks, nil
}

// ValidateBankAccount checks if a given account number is structurally valid.
func (s *UsersService) ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error) {
	if len(accountNumber) != 10 {
		return "", fmt.Errorf("account number must be 10 digits")
	}
	return "Verified Account", nil
}

// GetUserOptions is an alias for queries.GetUserOptions.
type GetUserOptions = queries.GetUserOptions

func resolveGetUserOptions(opts []GetUserOptions) GetUserOptions {
	if len(opts) > 0 {
		return opts[0]
	}
	return GetUserOptions{}
}

// GetUserByFakeID retrieves a user's details including their location names (Country, State, City).
// It implements a cache-aside pattern using Redis to improve performance.
func (s *UsersService) GetUserByFakeID(ctx context.Context, fakeID int64, opts ...GetUserOptions) (queries.UserWithPlaces, error) {
	opt := resolveGetUserOptions(opts)

	// Check Redis cache first
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	userInfoJSON, err := s.rdb.Get(ctx, userInfoKey).Result()
	if err == nil {
		var user queries.UserWithPlaces
		if err := json.Unmarshal([]byte(userInfoJSON), &user); err == nil {
			users := []queries.UserWithPlaces{user}
			if err := s.hydrateUserRelationships(ctx, users, opt); err != nil {
				return queries.UserWithPlaces{}, err
			}
			return users[0], nil
		}
	}

	user, err := s.fetchAndCacheUserByFakeID(ctx, fakeID, userInfoKey)
	if err != nil {
		return user, err
	}
	users := []queries.UserWithPlaces{user}
	if err := s.hydrateUserRelationships(ctx, users, opt); err != nil {
		return queries.UserWithPlaces{}, err
	}
	return users[0], nil
}

// fetchAndCacheUserByFakeID fetches the full user profile from the database,
// builds the UserWithPlaces struct, writes it to Redis, and returns the result.
func (s *UsersService) fetchAndCacheUserByFakeID(ctx context.Context, fakeID int64, userInfoKey string) (queries.UserWithPlaces, error) {
	// Fetch user info from DB
	user, err := s.queries.GetUserByFakeID(ctx, utils.PgInt8FromInt64(fakeID))
	if err != nil {
		return queries.UserWithPlaces{}, fmt.Errorf("user not found: %w", err)
	}

	// fetch the user roles
	var roles queries.CachedUserRoles
	if user.HasRole.Valid && user.HasRole.Bool {
		if r, err := s.GetUserRoles(ctx, user.ID); err == nil {
			roles = r
		}
	}

	// check if the user is verified, then fetches all the verification types of the user
	var verifications []queries.GetPageVerificationsRow
	if user.IsVerified.Valid && user.IsVerified.Bool {
		if v, err := s.GetUserPageVerifications(ctx, user.ID); err == nil {
			verifications = v
		}
	}

	// attach the user countryName, stateName, cityName to the user info that will be cached in redis
	countryName, stateName, cityName := s.bodiesService.GetLocationNames(ctx, user.CurrentCountry, user.CurrentState, user.CurrentCity.Int32)

	// Create a copy of the user and obscure sensitive fields for caching
	userForCache := user
	userForCache.PasswordHash = "---"
	userForCache.VotersCardImage.String = "---"
	userForCache.Phone.String = "---"
	userForCache.Email.String = "---"

	// Cache it in Redis
	userWithPlacesForCache := queries.UserWithPlaces{
		GetUserByFakeIDRow: userForCache,
		CountryName:        countryName,
		StateName:          stateName,
		CityName:           cityName,
		Verifications:      verifications,
		Roles:              roles,
	}

	// cache the user data in redis
	userJSON, err := json.Marshal(coreProfile(userWithPlacesForCache))
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, db.RedisThirtyDaysTTL)
	}

	return userWithPlacesForCache, nil
}

// GetUsersByFakeIDs retrieves multiple users optimally.
// It uses Redis MGET to fetch cached users in a single round-trip,
// and uses an errgroup to concurrently fetch any cache misses from the database.
func (s *UsersService) GetUsersByFakeIDs(ctx context.Context, fakeIDs []int64, opts ...GetUserOptions) ([]queries.UserWithPlaces, error) {
	if len(fakeIDs) == 0 {
		return []queries.UserWithPlaces{}, nil
	}

	// put the keys of the users in a slice
	keys := make([]string, len(fakeIDs))
	for i, id := range fakeIDs {
		keys[i] = fmt.Sprintf("%s%d", db.RedisUserInfo, id)
	}

	// Fetch from Redis via MGET
	// MGet returns interface{} slice. If a key is missed, the value is nil.
	cachedUsers, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil && err != redis.Nil {
		return nil, fmt.Errorf("failed to mget users from redis: %w", err)
	}

	// init the results and missed indices slice
	results := make([]queries.UserWithPlaces, len(fakeIDs))
	var missedIndices []int // slice for missed results

	// loop through the cached values
	for i, cachedUser := range cachedUsers {
		if cachedUser != nil {
			userValue, ok := cachedUser.(string)
			if ok {
				var user queries.UserWithPlaces
				if err := json.Unmarshal([]byte(userValue), &user); err == nil {
					results[i] = user
					continue // skip the missedIndices below
				}
			}
		}

		// If we reach here, it's a cache miss or invalid JSON
		missedIndices = append(missedIndices, i)
	}

	if len(missedIndices) > 0 {
		var g errgroup.Group // errgroup will run in a separate goroutine for each missed index
		// Unleash full concurrency! RDS Proxy will handle the DB connections.
		var mu sync.Mutex // mutex to protect the results slice from race conditions

		for _, idx := range missedIndices {
			fakeID := fakeIDs[idx]
			key := keys[idx]
			g.Go(func() error {
				// Bypass redundant Redis GET since MGET already confirmed this key was a miss;
				// fetch directly from DB and cache back into Redis.
				user, err := s.fetchAndCacheUserByFakeID(ctx, fakeID, key)
				if err != nil {
					// Return error to short-circuit if a critical failure occurs
					return err
				}

				// The Mutex doesn't "know" it's protecting the 'results' slice.
				// Instead, it locks this exact path of code execution.
				// If Goroutine A is between Lock() and Unlock(), Goroutine B will be paused at Lock()
				// waiting for the door to open, guaranteeing that only one goroutine modifies the slice at a time.
				// what ever is in-between mu.Lock() and mu.Unlock() can only be accessed by one Goroutine at a time
				mu.Lock()
				results[idx] = user
				mu.Unlock() // allows other Goroutine to continue from mu.Lock()

				return nil
			})
		}

		if err := g.Wait(); err != nil {
			return nil, err
		}
	}

	opt := resolveGetUserOptions(opts)
	if err := s.hydrateUserRelationships(ctx, results, opt); err != nil {
		return nil, err
	}
	return results, nil
}

// InvalidateCachedUserInfo invalidates the cached user information in Redis.
// This function should be called anytime a user's details changes
func (s *UsersService) InvalidateCachedUserInfo(ctx context.Context, fakeID int64) error {
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	return s.rdb.Del(ctx, userInfoKey).Err()
}

// InvalidateCachedUserRoles invalidates the cached user roles in Redis.
// This function should be called anytime a user's roles change.
func (s *UsersService) InvalidateCachedUserRoles(ctx context.Context, userID int64) error {
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)
	return s.rdb.Del(ctx, userRolesKey).Err()
}

// InvalidateUserAuth invalidates cached roles, user info, and revokes all active sessions across devices.
func (s *UsersService) InvalidateUserAuth(ctx context.Context, userID int64, fakeID int64) {
	_ = s.InvalidateCachedUserRoles(ctx, userID)
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	_ = s.RevokeAllUserSessions(ctx, fakeID)
}

// RevokeAllUserSessions revokes all active refresh tokens and sessions for a user across all devices.
//
// Redis Key Hierarchy:
//  1. User-to-Sessions Set   (`db.RedisUserLoginSessions` + fakeID):
//     Stores the set of all active session IDs belonging to this user.
//  2. Session-to-Tokens Set  (`db.RedisSessionTokens` + sessionID):
//     Stores the set of active refresh token identifiers associated with each session.
//  3. Refresh Token Payload  (`db.RedisJwtRefreshToken` + token):
//     Stores the actual refresh token record used during token renewals.
func (s *UsersService) RevokeAllUserSessions(ctx context.Context, fakeID int64) error {
	userSessionsRedisKey := fmt.Sprintf("%s%d", db.RedisUserLoginSessions, fakeID)
	sessions, err := s.rdb.SMembers(ctx, userSessionsRedisKey).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil
		}
		return err
	}
	if len(sessions) == 0 {
		return nil
	}

	// Use a transactional pipeline to execute all deletion commands in a single round-trip
	pipe := s.rdb.TxPipeline()

	// loop through all the session ids and delete the tokens
	for _, sessionID := range sessions {
		sessionTokensRedisKey := fmt.Sprintf("%s%s", db.RedisSessionTokens, sessionID)
		tokens, _ := s.rdb.SMembers(ctx, sessionTokensRedisKey).Result()

		// a) Revoke every refresh token under this session
		for _, token := range tokens {
			refreshTokenRedisKey := fmt.Sprintf("%s%s", db.RedisJwtRefreshToken, token)
			pipe.Del(ctx, refreshTokenRedisKey)
		}

		// b) Delete the session's token set
		pipe.Del(ctx, sessionTokensRedisKey)
	}

	// c) Delete the user's overall active session tracking set
	pipe.Del(ctx, userSessionsRedisKey)

	// Execute all queued Redis deletion commands atomically
	_, err = pipe.Exec(ctx)
	return err
}

// GetUserRoles fetches the roles assigned to a specific user, utilizing Redis caching.
func (s *UsersService) GetUserRoles(ctx context.Context, userID int64) (queries.CachedUserRoles, error) {
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)

	// first redis to see if the roles have been cached
	rolesJSON, err := s.rdb.Get(ctx, userRolesKey).Result()
	if err == nil {
		var cachedRoles queries.CachedUserRoles
		if err := json.Unmarshal([]byte(rolesJSON), &cachedRoles); err == nil {
			return cachedRoles, nil
		}
	}

	// Fetch from DB if not in Redis
	roles, err := s.queries.GetUserRoles(ctx, userID)
	if err != nil {
		return queries.CachedUserRoles{}, err
	}

	var rolesCode []string
	for _, r := range roles {
		rolesCode = append(rolesCode, r.Code)
	}

	cachedRoles := queries.CachedUserRoles{
		Roles:     roles,
		RolesCode: rolesCode,
	}

	// Cache it in Redis
	rolesJSONBytes, err := json.Marshal(cachedRoles)
	if err == nil {
		s.rdb.Set(ctx, userRolesKey, rolesJSONBytes, db.RedisOneEightyDaysTTL)
	}

	return cachedRoles, nil
}

// updateUserHasRole updates the has_role status flag for a user in the database.
func (s *UsersService) updateUserHasRole(ctx context.Context, userID int64, hasRole bool) error {
	return s.queries.UpdateUserHasRole(ctx, queries.UpdateUserHasRoleParams{
		ID:      userID,
		HasRole: pgtype.Bool{Bool: hasRole, Valid: true},
	})
}

// syncUserHasRole checks whether the user still has any roles in the database and updates their has_role flag accordingly.
func (s *UsersService) syncUserHasRole(ctx context.Context, userID int64) error {
	hasRole, err := s.queries.CheckUserHasAnyRole(ctx, userID)
	if err != nil {
		return err
	}

	return s.updateUserHasRole(ctx, userID, hasRole)
}

// AssignUserRole assigns a specific role to a user and invalidates the user's role cache.
func (s *UsersService) AssignUserRole(ctx context.Context, userID int64, fakeID int64, code string, whoAssigned int64) error {
	role, err := s.queries.GetRoleByCode(ctx, code)
	if err != nil {
		return err
	}
	err = s.queries.AssignUserRole(ctx, queries.AssignUserRoleParams{
		UserID:            userID,
		RoleID:            role.ID,
		RoleCode:          role.Code,
		WhoAssignedUserID: whoAssigned,
	})
	if err != nil {
		return err
	}

	// Update the user_table, updates has_role to true
	_ = s.updateUserHasRole(ctx, userID, true)

	s.InvalidateUserAuth(ctx, userID, fakeID)

	return nil
}

// RemoveUserRole removes a specific role from a user and updates has_role if needed.
func (s *UsersService) RemoveUserRole(ctx context.Context, userID int64, fakeID int64, code string) error {
	err := s.queries.RemoveUserRole(ctx, queries.RemoveUserRoleParams{
		UserID:   userID,
		RoleCode: code,
	})
	if err != nil {
		return err
	}

	// Check if user has any roles left and update has_role accordingly
	if err := s.syncUserHasRole(ctx, userID); err != nil {
		return err
	}

	// Invalidate cached roles, user info, and revoke all active sessions across devices
	s.InvalidateUserAuth(ctx, userID, fakeID)

	return nil
}

// UpdateUserProfile updates basic user profile details and invalidates the user info cache.
func (s *UsersService) UpdateUserProfile(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, avatarFileId *int64, countryID, stateID int16, cityID int32) error {
	avatarFileIdPg := utils.PgInt8FromPtr(avatarFileId)

	err := s.queries.UpdateUserProfile(ctx, queries.UpdateUserProfileParams{
		ID:             id,
		FirstName:      utils.PgTextFromString(firstName),
		LastName:       utils.PgTextFromString(lastName),
		MiddleName:     utils.PgTextFromString(middleName),
		Gender:         utils.PgTextFromString(gender),
		Avatar:         utils.PgTextFromString(avatar),
		AvatarFileID:   avatarFileIdPg,
		CurrentCountry: countryID,
		CurrentState:   stateID,
		CurrentCity:    pgtype.Int4{Int32: cityID, Valid: cityID != 0},
	})
	if err != nil {
		return err
	}

	// Invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// ListUsers retrieves a paginated list of users based on provided parameters.
func (s *UsersService) ListUsers(ctx context.Context, arg queries.ListUsersParams) ([]queries.ListUsersRow, error) {
	return s.queries.ListUsers(ctx, arg)
}

// SearchUsers retrieves active users matching citizen search and filter criteria.
func (s *UsersService) SearchUsers(ctx context.Context, arg queries.SearchUsersParams) ([]queries.SearchUsersRow, error) {
	return s.queries.SearchUsers(ctx, arg)
}

// DeleteUserAccount removes a user by ID and invalidates their user info cache.
func (s *UsersService) DeleteUserAccount(ctx context.Context, id int64, fakeID int64) error {
	err := s.queries.DeleteUser(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// GetMoreInfoAboutThisUser fetches extended profile details for a user, using Redis cache.
func (s *UsersService) GetMoreInfoAboutThisUser(ctx context.Context, userID int64) (queries.UserMoreInfo, error) {
	// Check Redis
	userProfileKey := fmt.Sprintf("%s%d", db.RedisUserMoreInfo, userID)
	profileJSON, err := s.rdb.Get(ctx, userProfileKey).Result()
	if err == nil {
		var profile queries.UserMoreInfo
		if err := json.Unmarshal([]byte(profileJSON), &profile); err == nil {
			return profile, nil
		}
	}

	// Fetch from DB if not in Redis
	profile, err := s.queries.GetMoreInfoAboutThisUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return empty profile for new users instead of failing
			return queries.UserMoreInfo{UserID: userID}, nil
		}
		return queries.UserMoreInfo{}, fmt.Errorf("user profile not found: %w", err)
	}

	// Cache it in Redis
	profileJSONBytes, err := json.Marshal(profile)
	if err == nil {
		s.rdb.Set(ctx, userProfileKey, profileJSONBytes, db.RedisNinetyDaysTTL)
	}

	return profile, nil
}

// GetUserPrimaryBankAccount fetches the primary bank account for a given user
func (s *UsersService) GetUserPrimaryBankAccount(ctx context.Context, userID int64) (queries.UserBankAccount, error) {
	return s.queries.GetUserPrimaryBankAccount(ctx, userID)
}

// AdminUpdateUser allows admins to perform a comprehensive update of user details.
func (s *UsersService) AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, username, gender, avatar string, avatarFileId *int64, countryID, stateID int16, cityID int32, stateOfOrigin int16) error {
	avatarFileIdPg := utils.PgInt8FromPtr(avatarFileId)

	err := s.queries.AdminUpdateUser(ctx, queries.AdminUpdateUserParams{
		ID:             id,
		FirstName:      utils.PgTextFromString(firstName),
		LastName:       utils.PgTextFromString(lastName),
		MiddleName:     utils.PgTextFromString(middleName),
		Username:       utils.PgTextFromString(username),
		Gender:         utils.PgTextFromString(gender),
		Avatar:         utils.PgTextFromString(avatar),
		AvatarFileID:   avatarFileIdPg,
		CurrentCountry: countryID,
		CurrentState:   stateID,
		CurrentCity:    pgtype.Int4{Int32: cityID, Valid: cityID != 0},
		StateOfOrigin:  pgtype.Int2{Int16: stateOfOrigin, Valid: stateOfOrigin != 0},
	})
	if err != nil {
		return err
	}

	// Invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// ResetUserAvatar clears the user's avatar and invalidates their cached user info.
func (s *UsersService) ResetUserAvatar(ctx context.Context, userID int64, fakeID int64) error {
	err := s.queries.UpdateUserAvatar(ctx, queries.UpdateUserAvatarParams{
		ID:           userID,
		Avatar:       pgtype.Text{Valid: false},
		AvatarFileID: pgtype.Int8{Valid: false},
	})
	if err != nil {
		return err
	}

	// invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// UpdateUserProfileDetails updates extended educational and demographic information for a user.
func (s *UsersService) UpdateUserProfileDetails(ctx context.Context, userID int64, occupationID *int16, educationalStatus, highestDegree, graduationYear, schoolName, religion, maritalStatus, address string) error {
	pgOccupationID := utils.PgInt2FromPtrNullable(occupationID)

	err := s.queries.UpdateMoreInfoAboutThisUser(ctx, queries.UpdateMoreInfoAboutThisUserParams{
		UserID:            userID,
		OccupationID:      pgOccupationID,
		EducationalStatus: utils.PgTextFromString(educationalStatus),
		HighestDegree:     utils.PgTextFromString(highestDegree),
		GraduationYear:    utils.PgTextFromString(graduationYear),
		SchoolName:        utils.PgTextFromString(schoolName),
		Religion:          utils.PgTextFromString(religion),
		MaritalStatus:     utils.PgTextFromString(maritalStatus),
		Address:           utils.PgTextFromString(address),
	})
	if err != nil {
		return err
	}

	// Invalidate cache
	userProfileKey := fmt.Sprintf("%s%d", db.RedisUserMoreInfo, userID)
	s.rdb.Del(ctx, userProfileKey)
	return nil
}

// GetUserPhoneNumbersByUserID retrieves a user's phone numbers directly from the database.
func (s *UsersService) GetUserPhoneNumbersByUserID(ctx context.Context, userID int64) ([]queries.UsersPhoneNumber, error) {
	return s.queries.GetUserPhoneNumbersByUserID(ctx, userID)
}

// PhonePayload represents the incoming data structure for updating phone numbers.
type PhonePayload struct {
	ID         int64  `json:"id"`
	Phone      string `json:"phone"`
	Phonecode  string `json:"phonecode"`
	RawInput   string `json:"raw_input"`
	OnWhatsapp string `json:"on_whatsapp"`
	IsDefault  bool   `json:"is_default"`
}

// UpdateUserPhoneNumbers creates or updates multiple phone numbers for a user.
func (s *UsersService) UpdateUserPhoneNumbers(ctx context.Context, userID int64, fakeID int64, phones []PhonePayload) error {
	// Count how many new phone numbers (where ID is 0) the user is attempting to add
	// and ensure no more than 1 phone number is set as default
	newPhonesCount := 0
	defaultPhonesCount := 0

	for _, p := range phones {
		if p.IsDefault {
			defaultPhonesCount++
		}
		if p.ID == 0 {
			// checks if the phone-number already exists for another user
			if exists, _ := s.CheckPhone(ctx, p.Phone, fakeID); exists {
				return fmt.Errorf("phone number already exists")
			}
			newPhonesCount++
		}

	}

	if defaultPhonesCount <= 0 {
		return fmt.Errorf("at least one phone number must be set as default")
	}
	if defaultPhonesCount > 1 {
		return fmt.Errorf("only one phone number can be set as default")
	}

	// If there are new phone numbers, ensure that adding them doesn't exceed the max limit of 5
	if newPhonesCount > 0 {
		// Fetch the total count of both active and inactive phone numbers for this user
		currentCount, err := s.queries.CountAllUserPhoneNumbers(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to check current phone numbers: %w", err)
		}

		// Reject the request if the total would exceed the 5 phone number limit
		if int(currentCount)+newPhonesCount > 5 {
			return fmt.Errorf("maximum of 5 phone numbers reached, if you'd like to add more, please contact the customer support")
		}
	}

	// Update or create phone numbers
	for _, p := range phones {
		whatsappVal := false
		if p.OnWhatsapp == "yes" {
			whatsappVal = true
		}
		onWhatsapp := pgtype.Bool{Bool: whatsappVal, Valid: true}
		isDefault := pgtype.Bool{Bool: p.IsDefault, Valid: true}

		// if p.ID == 0, it means the phone number is new, so create it
		if p.ID == 0 {
			if p.Phone == "" {
				return fmt.Errorf("phone number cannot be empty")
			}

			// create the phone-number in the postgres db
			_, err := s.queries.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
				UserID:     userID,
				Phone:      p.Phone, // Should be fully formatted E.164
				Phonecode:  p.Phonecode,
				RawInput:   p.RawInput,
				OnWhatsapp: onWhatsapp,
				IsDefault:  isDefault,
			})
			if err != nil {
				return err
			}

		} else {
			// update the user's phone-number in the postgres db
			err := s.queries.UpdatePhoneNumber(ctx, queries.UpdatePhoneNumberParams{
				ID:         p.ID,
				UserID:     userID,
				OnWhatsapp: onWhatsapp,
				IsDefault:  isDefault,
			})
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// DeleteUserPhoneNumber removes a specific phone number record by its ID.
func (s *UsersService) DeleteUserPhoneNumber(ctx context.Context, id int64, userID int64) error {
	return s.queries.DeleteUserPhoneNumber(ctx, queries.DeleteUserPhoneNumberParams{
		ID:     id,
		UserID: userID,
	})
}

// UpdateUserIsVerified updates the verified status of a user and invalidates their cache.
func (s *UsersService) UpdateUserIsVerified(ctx context.Context, userID int64, fakeID int64, isVerified bool) error {
	err := s.queries.UpdateUserIsVerified(ctx, queries.UpdateUserIsVerifiedParams{
		ID:         userID,
		IsVerified: pgtype.Bool{Bool: isVerified, Valid: true},
	})
	if err != nil {
		return err
	}

	err = s.queries.UpdateUserPhoneNumberIsVerified(ctx, queries.UpdateUserPhoneNumberIsVerifiedParams{
		UserID:          userID,
		OwnerIsVerified: pgtype.Bool{Bool: isVerified, Valid: true},
	})
	if err != nil {
		return err
	}

	// Invalidate the user info cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// UpdateUserParty updates the party_id of a user and invalidates their cache.
// Pass nil for partyID to remove the user from any party.
func (s *UsersService) UpdateUserParty(ctx context.Context, userID int64, partyID *int16, fakeID int64) error {
	previous, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to load previous party affiliation: %w", err)
	}
	// prepare party ID for database update (NULL if nil)
	pID := utils.PgInt2FromPtrNullable(partyID)

	// update user party in the database
	err = s.queries.UpdateUserParty(ctx, queries.UpdateUserPartyParams{
		ID:      userID,
		PartyID: pID,
	})
	if err != nil {
		return fmt.Errorf("failed to update user party: %w", err)
	}

	// Only revoke party-scoped admin roles if the user is leaving the party completely
	if partyID == nil {
		_ = s.StripPartyAdminRoles(ctx, userID, fakeID)
	}

	// invalidate the user cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	keys := []string{fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, userID)}
	if previous.PartyID.Valid {
		keys = append(keys, fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, previous.PartyID.Int16, userID))
	}
	if partyID != nil {
		keys = append(keys, fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, *partyID, userID))
	}
	_ = s.rdb.Del(ctx, keys...).Err()

	return nil
}

// StripPartyAdminRoles removes any party-scoped administrative roles (party_admin, super_party_admin)
// from a user, updates has_role, invalidates caches, and revokes all active sessions across devices.
func (s *UsersService) StripPartyAdminRoles(ctx context.Context, userID int64, fakeID int64) error {
	// Check user roles first (cached in Redis) to avoid unnecessary DB writes and session revocations
	rolesData, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return err
	}

	// Check if the user holds any party admin roles
	hasPartyRole := false
	for _, code := range rolesData.RolesCode {
		if code == "party_admin" || code == "super_party_admin" {
			hasPartyRole = true
			break
		}
	}

	// Exit early if the user has no party admin roles to strip
	if !hasPartyRole {
		return nil
	}

	partyRoles := []string{"party_admin", "super_party_admin"}
	for _, roleCode := range partyRoles {
		_ = s.queries.RemoveUserRole(ctx, queries.RemoveUserRoleParams{
			UserID:   userID,
			RoleCode: roleCode,
		})
	}

	// Check if user has any roles left and update has_role accordingly
	_ = s.syncUserHasRole(ctx, userID)

	// Invalidate cached roles, user info, and revoke all active sessions across devices
	s.InvalidateUserAuth(ctx, userID, fakeID)

	return nil
}

// MakeUserSuperAdmin promotes a specific user to the superadmin role.
func (s *UsersService) MakeUserSuperAdmin(ctx context.Context, username string) error {
	allowed := map[string]bool{
		"stanley": true, "stanley_chukwu": true, "stanleychukwu": true,
		"daniel": true, "daniel_chukwu": true, "danielchukwu": true,
	}

	if !allowed[username] {
		return fmt.Errorf("username not authorized for superadmin promotion")
	}

	fakeID, err := s.queries.GetFakeIDByUsername(ctx, utils.PgTextFromString(username))
	if err != nil || !fakeID.Valid {
		return fmt.Errorf("user not found in database: %w", err)
	}

	user, err := s.GetUserByFakeID(ctx, fakeID.Int64)
	if err != nil {
		return fmt.Errorf("failed to fetch user details: %w", err)
	}

	// 1. Get user roles
	rolesData, err := s.GetUserRoles(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("failed to fetch user roles: %w", err)
	}

	// 2. Check if the user already has the super_admin role
	for _, r := range rolesData.RolesCode {
		if r == "super_admin" {
			// Already has the role, no need to assign again
			return nil
		}
	}

	// 3. Assign the role in DB
	err = s.AssignUserRole(ctx, user.ID, fakeID.Int64, "super_admin", 0)
	if err != nil {
		return fmt.Errorf("failed to assign super_admin role: %w", err)
	}

	return nil
}

// UpdateUserRoles replaces a user's roles.
func (s *UsersService) UpdateUserRoles(ctx context.Context, userID int64, fakeID int64, roles []string, whoAssigned int64) error {
	// Get existing roles
	currentRolesData, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to fetch current roles: %w", err)
	}

	// Create a map of current roles for quick lookup
	currentRolesMap := make(map[string]bool)
	for _, rCode := range currentRolesData.RolesCode {
		currentRolesMap[rCode] = true
	}

	// Create a map of new roles for quick lookup
	newRolesMap := make(map[string]bool)
	for _, roleCode := range roles {
		newRolesMap[roleCode] = true
	}

	hasChanged := false

	// Identify and assign roles to ADD
	for roleCode := range newRolesMap {
		if !currentRolesMap[roleCode] {
			role, err := s.queries.GetRoleByCode(ctx, roleCode)
			if err != nil {
				return fmt.Errorf("failed to get role %s: %w", roleCode, err)
			}
			err = s.queries.AssignUserRole(ctx, queries.AssignUserRoleParams{
				UserID:            userID,
				RoleID:            role.ID,
				RoleCode:          role.Code,
				WhoAssignedUserID: whoAssigned,
			})
			if err != nil {
				return fmt.Errorf("failed to add role %s: %w", roleCode, err)
			}
			hasChanged = true
		}
	}

	// 3. Identify and remove roles to DELETE
	for roleCode := range currentRolesMap {
		if !newRolesMap[roleCode] {
			err = s.queries.RemoveUserRole(ctx, queries.RemoveUserRoleParams{
				UserID:   userID,
				RoleCode: roleCode,
			})
			if err != nil {
				return fmt.Errorf("failed to remove role %s: %w", roleCode, err)
			}
			hasChanged = true
		}
	}

	// If roles changed, sync has_role flag and invalidate all caches once
	if hasChanged {
		_ = s.syncUserHasRole(ctx, userID)
		s.InvalidateUserAuth(ctx, userID, fakeID)
	}

	return nil
}

// function: check if the username already exists in the postgres db
func (s *UsersService) CheckUsername(ctx context.Context, username string) bool {
	fakeID, err := s.queries.GetFakeIDByUsername(ctx, utils.PgTextFromString(username))
	return err == nil && fakeID.Valid
}

// GetFakeIDByUsername resolves a user's fake ID by username using a Redis cache-aside pattern.
func (s *UsersService) GetFakeIDByUsername(ctx context.Context, username string) (int64, error) {
	clean := strings.TrimPrefix(strings.TrimSpace(username), "@")
	if clean == "" {
		return 0, fmt.Errorf("username cannot be empty")
	}

	cacheKey := fmt.Sprintf("%s%s", db.RedisUsernameFakeID, strings.ToLower(clean))

	// Check Redis cache first
	if val, err := s.rdb.Get(ctx, cacheKey).Int64(); err == nil && val > 0 {
		return val, nil
	}

	// Fetch from PostgreSQL
	fakeID, err := s.queries.GetFakeIDByUsername(ctx, utils.PgTextFromString(clean))
	if err != nil || !fakeID.Valid {
		return 0, fmt.Errorf("user not found: %s", clean)
	}

	// Cache in Redis for 7 days
	_ = s.rdb.Set(ctx, cacheKey, fakeID.Int64, db.RedisSevenDaysTTL).Err()

	return fakeID.Int64, nil
}

// InvalidateUsernameCache removes the cached fake ID for a username.
func (s *UsersService) InvalidateUsernameCache(ctx context.Context, username string) {
	clean := strings.TrimPrefix(strings.TrimSpace(username), "@")
	if clean != "" {
		cacheKey := fmt.Sprintf("%s%s", db.RedisUsernameFakeID, strings.ToLower(clean))
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}
}

// function: checks if the email already exists in the postgres db
func (s *UsersService) CheckEmail(ctx context.Context, email string) (bool, int64) {
	fakeID, err := s.queries.GetFakeIDByEmail(ctx, utils.PgTextFromString(email))
	if err == nil && fakeID.Valid {
		return true, fakeID.Int64
	}
	return false, 0
}

// function: checks if the phone exists in the postgres db
func (s *UsersService) CheckPhone(ctx context.Context, phone string, userFakeID int64) (bool, int64) {
	fakeID, err := s.queries.GetFakeIDByPhone(ctx, utils.PgTextFromString(phone))
	if err == nil && fakeID.Valid {
		if userFakeID == 0 || fakeID.Int64 != userFakeID {
			return true, fakeID.Int64
		}
	}

	// fallback: check the users_phone_numbers table
	fakeID, err = s.queries.GetFakeIDByAdditionalPhone(ctx, phone)
	if err == nil && fakeID.Valid {
		if userFakeID == 0 || fakeID.Int64 != userFakeID {
			return true, fakeID.Int64
		}
	}

	return false, 0
}

// CheckNIN function checks if the nin already exists in the database
func (s *UsersService) CheckNIN(ctx context.Context, nin string) bool {
	// checks the users table directly (nin has a unique B-tree index in Postgres)
	userID, err := s.queries.GetUserIDByNIN(ctx, nin)
	return err == nil && userID > 0
}

// GetReferralCodeInfo retrieves referral code details from Redis or DB.
func (s *UsersService) GetReferralCodeInfo(ctx context.Context, code string) (*CachedReferralCodeInfo, error) {
	cacheKey := db.RedisReferralCode + code
	var info CachedReferralCodeInfo

	// Check Redis cache first
	cachedData, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		if err := json.Unmarshal([]byte(cachedData), &info); err == nil && info.ID > 0 {
			return &info, nil
		}
	} else if err != nil && !errors.Is(err, redis.Nil) {
		return nil, err
	}

	// Fetch from database if cache miss
	user, err := s.queries.GetReferrerNameByCode(ctx, utils.PgTextFromString(code))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &CachedReferralCodeInfo{}, nil // Not taken
		}
		return nil, err
	}

	// Caches the result and formats it
	return s.cacheReferralCodeInfo(ctx, code, user.ID, user.FirstName.String, user.LastName.String), nil
}

// cacheReferralCodeInfo helper function to format and cache referral code details in Redis
func (s *UsersService) cacheReferralCodeInfo(ctx context.Context, code string, userID int64, firstName, lastName string) *CachedReferralCodeInfo {
	name := strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	info := CachedReferralCodeInfo{
		ID:   userID,
		Name: name,
	}

	if data, err := json.Marshal(info); err == nil {
		cacheKey := db.RedisReferralCode + code
		s.rdb.Set(ctx, cacheKey, string(data), db.RedisOneEightyDaysTTL)
	}
	return &info
}

// IsReferralCodeTaken checks if a referral code already exists in the database, using Redis for caching.
func (s *UsersService) IsReferralCodeTaken(ctx context.Context, code string) (bool, error) {
	info, err := s.GetReferralCodeInfo(ctx, code)
	if err != nil {
		return false, err
	}
	return info != nil, nil
}

// GenerateUniqueReferralCode generates a unique referral code based on the user's first name.
// Format: {FIRST_NAME}{3-digit random/sequential suffix} e.g. "DANIEL402"
func (s *UsersService) GenerateUniqueReferralCode(ctx context.Context, firstName string) (string, error) {
	firstName = strings.TrimSpace(firstName)

	// Clean string to alphanumeric characters only
	var clean strings.Builder
	for _, r := range firstName {
		// In Go, characters (runes) are represented by their Unicode/ASCII integer values.
		// This means we can compare them directly using math operators like >= and <=.
		// For example, 'a' is 97 and 'z' is 122. Checking (r >= 'a' && r <= 'z')
		// efficiently verifies if the character is a lowercase letter.
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			clean.WriteRune(r)
		}
	}

	// Convert the cleaned string to uppercase
	base := strings.ToUpper(clean.String())

	// If the cleaned string is empty (e.g., the original name was empty or contained only symbols),
	// use "AGENT" as the base for the referral code.
	if base == "" {
		base = "AGENT"
	}

	// Generate a random 3-digit suffix (100-999) for the referral code.
	n, _ := rand.Int(rand.Reader, big.NewInt(900))
	startOffset := int(n.Int64()) + 100

	// Try random 3-digit suffix first for entropy, fallback sequentially if collisions
	for i := range 900 {
		suffix := ((startOffset + i - 100) % 900) + 100
		code := fmt.Sprintf("%s%d", base, suffix)
		exists, err := s.IsReferralCodeTaken(ctx, code)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}

	// Fallback to timestamp suffix if 3-digit combinations are exhausted
	timeSuffix := time.Now().UnixNano() % 1000000
	return fmt.Sprintf("%s%d", base, timeSuffix), nil
}

// GenerateAndAssignReferralCode generates and assigns a referral code to a user.
func (s *UsersService) GenerateAndAssignReferralCode(ctx context.Context, userID int64, fakeID int64, firstName string) (string, error) {
	user, err := s.GetUserByFakeID(ctx, fakeID)
	if err != nil {
		return "", err
	}
	if user.ReferralCode.Valid && user.ReferralCode.String != "" {
		return user.ReferralCode.String, nil
	}

	code, err := s.GenerateUniqueReferralCode(ctx, firstName)
	if err != nil {
		return "", err
	}

	err = s.queries.UpdateUserReferralCode(ctx, queries.UpdateUserReferralCodeParams{
		ID:           userID,
		ReferralCode: utils.PgTextFromString(code),
	})
	if err != nil {
		return "", err
	}

	// Cache the newly assigned referral code with user info in Redis
	s.cacheReferralCodeInfo(ctx, code, userID, user.FirstName.String, user.LastName.String)

	// Invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return code, nil
}

type UserTimelineBranch struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type UserTimelineEvent struct {
	ID       string               `json:"id"`
	Year     string               `json:"year"`
	Title    string               `json:"title"`
	Branches []UserTimelineBranch `json:"branches,omitempty"`
}

type UserPublicParty struct {
	ID        int16  `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	Since     string `json:"since"`
	Color     string `json:"color"`
	Logo      string `json:"logo"`
}

type UserPublicRole struct {
	Title   string `json:"title"`
	Chapter string `json:"chapter"`
}

type UserPublicProfile struct {
	ID             int64               `json:"id"`
	FakeID         int64               `json:"fake_id"`
	Username       string              `json:"username"`
	Name           string              `json:"name"`
	FirstName      string              `json:"first_name"`
	LastName       string              `json:"last_name"`
	Avatar         string              `json:"avatar"`
	Party          *UserPublicParty    `json:"party,omitempty"`
	Role           *UserPublicRole     `json:"role,omitempty"`
	FollowersCount int64               `json:"followers_count"`
	FollowingCount int64               `json:"following_count"`
	IsFollowing    bool                `json:"is_following"`
	IsAccountOwner bool                `json:"is_account_owner"`
	IsPolitician   bool                `json:"is_politician"`
	IsVerified     bool                `json:"is_verified"`
	Location       string              `json:"location,omitempty"`
	Timeline       []UserTimelineEvent `json:"timeline"`
}

// GetUserPublicProfile fetches and hydrates the public profile for a username.
func (s *UsersService) GetUserPublicProfile(ctx context.Context, username string, viewerUserID int64) (*UserPublicProfile, error) {
	// Normalize username (strip leading @)
	cleanUsername := strings.TrimPrefix(strings.TrimSpace(username), "@")
	if cleanUsername == "" {
		return nil, fmt.Errorf("username cannot be empty")
	}

	// Resolve user's fake ID from username (cached in Redis)
	fakeID, err := s.GetFakeIDByUsername(ctx, cleanUsername)
	if err != nil {
		return nil, err
	}

	// Fetch full user record and relational info from cache/DB
	user, err := s.GetUserByFakeID(ctx, fakeID, GetUserOptions{
		WithChapters:    true,
		WithCandidacies: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user details: %w", err)
	}

	// Fetch follower and following metrics
	followersCount, _ := s.followsService.GetUserFollowersCount(ctx, user.ID)
	followingCount, _ := s.followsService.GetUserFollowingCount(ctx, user.ID)

	// Check if viewing user is currently following this profile
	isFollowing := false
	if viewerUserID > 0 && viewerUserID != user.ID {
		isFollowing, _ = s.followsService.IsFollowingUser(ctx, viewerUserID, user.ID)
	}

	// Check if the viewer is the owner of the account
	isAccountOwner := viewerUserID > 0 && viewerUserID == user.ID
	// NOTE: save the edited frontend info before you continue this review

	// Map political party affiliation if member
	var party *UserPublicParty
	if user.PartyBasicInfo != nil {
		since := ""
		if user.CreatedAt.Valid {
			since = fmt.Sprintf("since %d", user.CreatedAt.Time.Year())
		}
		party = &UserPublicParty{
			ID:        user.PartyBasicInfo.ID,
			Name:      user.PartyBasicInfo.Name,
			ShortName: user.PartyBasicInfo.ShortName,
			Since:     since,
			Color:     user.PartyBasicInfo.ColorHex.String,
			Logo:      user.PartyBasicInfo.Logo,
		}
	}

	// Resolve user's party role title and chapter scope
	roleTitle := "Member"
	chapterName := ""
	if user.PartyBasicInfo != nil {
		chapterName = user.PartyBasicInfo.ShortName + " National"
	} else {
		roleTitle = "Citizen"
	}

	if len(user.Chapters) > 0 {
		ch := user.Chapters[0]
		if ch.ZoneName != "" && user.PartyBasicInfo != nil {
			chapterName = fmt.Sprintf("%s %s", user.PartyBasicInfo.ShortName, ch.ZoneName)
		} else if user.StateName != "" && user.PartyBasicInfo != nil {
			chapterName = fmt.Sprintf("%s %s", user.PartyBasicInfo.ShortName, user.StateName)
		}
	} else if user.StateName != "" {
		chapterName = fmt.Sprintf("%s, %s", user.StateName, user.CountryName)
	}

	if len(user.Roles.Roles) > 0 && user.Roles.Roles[0].Code != "" {
		code := user.Roles.Roles[0].Code
		roleTitle = strings.Title(strings.ReplaceAll(code, "_", " "))
	}

	role := &UserPublicRole{
		Title:   roleTitle,
		Chapter: chapterName,
	}

	// Build political history timeline from party milestones
	milestones, _ := s.queries.ListUserPartyMilestones(ctx, user.ID)
	var timeline []UserTimelineEvent
	for _, m := range milestones {
		evYear := strconv.Itoa(m.CreatedAt.Time.Year())
		title := ""
		switch m.MilestoneType {
		case "joined":
			title = fmt.Sprintf("Joined %s", m.PartyShortName)
		case "left":
			title = fmt.Sprintf("Left %s", m.PartyShortName)
		case "appointed":
			title = fmt.Sprintf("Appointed in %s", m.PartyShortName)
		case "promoted":
			title = fmt.Sprintf("Promoted in %s", m.PartyShortName)
		default:
			title = fmt.Sprintf("%s - %s", m.MilestoneType, m.PartyShortName)
		}
		timeline = append(timeline, UserTimelineEvent{
			ID:    fmt.Sprintf("milestone-%d", m.ID),
			Year:  evYear,
			Title: title,
		})
	}

	// Fallback timeline event if no explicit party milestones exist
	if len(timeline) == 0 {
		evYear := "2024"
		if user.CreatedAt.Valid && user.CreatedAt.Time.Year() > 2000 {
			evYear = strconv.Itoa(user.CreatedAt.Time.Year())
		}
		evTitle := "Joined Free9ja"
		if party != nil {
			evTitle = fmt.Sprintf("Joined %s", party.ShortName)
		}

		var branches []UserTimelineBranch
		for i, c := range user.Candidacies {
			branches = append(branches, UserTimelineBranch{
				ID:    fmt.Sprintf("cand-%d", c.ID),
				Title: fmt.Sprintf("Contested %s", c.OfficeName),
			})
			if i >= 2 {
				break
			}
		}

		timeline = append(timeline, UserTimelineEvent{
			ID:       "join-event",
			Year:     evYear,
			Title:    evTitle,
			Branches: branches,
		})
	}

	// Format display name and geographic location string
	fullName := strings.TrimSpace(user.FirstName.String + " " + user.LastName.String)
	if fullName == "" {
		fullName = cleanUsername
	}

	location := ""
	if user.CityName != "" && user.StateName != "" {
		location = fmt.Sprintf("%s, %s", user.CityName, user.StateName)
	} else if user.StateName != "" {
		location = user.StateName
	}

	// Assemble and return hydrated public profile
	return &UserPublicProfile{
		ID:             user.ID,
		FakeID:         user.FakeID.Int64,
		Username:       cleanUsername,
		Name:           fullName,
		FirstName:      user.FirstName.String,
		LastName:       user.LastName.String,
		Avatar:         user.Avatar.String,
		Party:          party,
		Role:           role,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		IsFollowing:    isFollowing,
		IsAccountOwner: isAccountOwner,
		IsPolitician:   user.IsPolitician.Bool,
		IsVerified:     user.IsVerified.Bool,
		Location:       location,
		Timeline:       timeline,
	}, nil
}

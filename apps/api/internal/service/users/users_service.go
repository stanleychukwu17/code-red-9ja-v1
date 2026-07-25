package usersservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"

	"sync"

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
}

// PartyService interface defines the methods needed from the party service
type PartyService interface {
	GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications
}

// UsersService provides operations for managing user data, roles, and related services.
type UsersService struct {
	queries                  *queries.Queries
	rdb                      *redis.Client
	monnify                  *monnifyclient.Client
	bodiesService            BodiesService
	pageVerificationsService PageVerificationsService
	partyService             PartyService
}

// NewUsersService initializes and returns a new UsersService.
func NewUsersService(q *queries.Queries, rdb *redis.Client, monnify *monnifyclient.Client, bodiesService BodiesService) *UsersService {
	return &UsersService{
		queries:       q,
		rdb:           rdb,
		monnify:       monnify,
		bodiesService: bodiesService,
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

// GetUserPageVerifications retrieves the page verifications for a specific user ID.
func (s *UsersService) GetUserPageVerifications(ctx context.Context, userID int64) ([]queries.GetPageVerificationsRow, error) {
	if s.pageVerificationsService == nil {
		return nil, fmt.Errorf("page verifications service not configured")
	}
	return s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeUser, userID)
}

// GetBanks retrieves a list of available banks via the Monnify client.
func (s *UsersService) GetBanks(ctx context.Context) ([]monnifyclient.Bank, error) {
	if s.monnify == nil {
		return nil, fmt.Errorf("monnify client is not configured")
	}
	return s.monnify.GetBanks(ctx)
}

// ValidateBankAccount checks if a given account number and bank code are valid via Monnify.
func (s *UsersService) ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error) {
	if s.monnify == nil {
		return "", fmt.Errorf("monnify client is not configured")
	}
	return s.monnify.ValidateBankAccount(ctx, accountNumber, bankCode)
}

// GetUserByFakeID retrieves a user's details including their location names (Country, State, City).
// It implements a cache-aside pattern using Redis to improve performance.
func (s *UsersService) GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error) {
	// Check Redis cache first
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	userInfoJSON, err := s.rdb.Get(ctx, userInfoKey).Result()
	if err == nil {
		var user queries.UserWithPlaces
		if err := json.Unmarshal([]byte(userInfoJSON), &user); err == nil {
			return user, nil
		}
	}

	// Fetch user info from DB
	user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return queries.UserWithPlaces{}, fmt.Errorf("user not found: %w", err)
	}

	// fetch the user roles
	var roles []queries.GetUserRolesRow
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

	// Fetch party basic info if user belongs to a party
	var partyBasicInfo *queries.PartyBasicInfoWithVerifications
	if user.PartyID.Valid && user.PartyID.Int16 > 0 && s.partyService != nil {
		partyBasicInfo = s.partyService.GetPartyBasicInfo(ctx, user.PartyID.Int16)
	}

	// Create a copy of the user and obscure sensitive fields for caching
	userForCache := user
	userForCache.PasswordHash = "---"
	userForCache.VotersCardImage.String = "---"
	userForCache.Phone.String = "---"
	userForCache.Email.String = "---"

	// Cache it in Redis
	userWithPlacesForCache := queries.UserWithPlaces{
		User:           userForCache,
		CountryName:    countryName,
		StateName:      stateName,
		CityName:       cityName,
		Verifications:  verifications,
		PartyBasicInfo: partyBasicInfo,
		Roles:          roles,
	}

	// cache the user data in redis
	userJSON, err := json.Marshal(userWithPlacesForCache)
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, db.RedisFiveYearsTTL) // 5 years expires
	}

	return userWithPlacesForCache, nil
}

// GetUsersByFakeIDs retrieves multiple users optimally.
// It uses Redis MGET to fetch cached users in a single round-trip,
// and uses an errgroup to concurrently fetch any cache misses from the database.
func (s *UsersService) GetUsersByFakeIDs(ctx context.Context, fakeIDs []int64) ([]queries.UserWithPlaces, error) {
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
		var g errgroup.Group // errgroup will run the GetUserByFakeID in a separate goroutine for each missed index
		// Unleash full concurrency! RDS Proxy will handle the DB connections.
		var mu sync.Mutex // mutex to protect the results slice from race conditions

		for _, idx := range missedIndices {
			fakeID := fakeIDs[idx]
			g.Go(func() error {
				// s.GetUserByFakeID handles fetching from DB and caching it in Redis
				user, err := s.GetUserByFakeID(ctx, fakeID)
				if err != nil {
					// Return error to short-circuit if a critical failure occurs
					return err
				}

				// The Mutex doesn't "know" it's protecting the 'results' slice.
				// Instead, it locks this exact path of code execution.
				// If Goroutine A is between Lock() and Unlock(), Goroutine B will be paused at Lock()
				// waiting for the door to open, guaranteeing that only one goroutine modifies the slice at a time.
				// what ever is inbetween mu.Lock() and mu.Unlock() can only be accessed by one Goroutine at a time
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

	return results, nil
}

// InvalidateCachedUserInfo invalidates the cached user information in Redis.
// This function should be called anytime a user's details changes
func (s *UsersService) InvalidateCachedUserInfo(ctx context.Context, fakeID int64) error {
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	return s.rdb.Del(ctx, userInfoKey).Err()
}

// GetUserRoles fetches the roles assigned to a specific user, utilizing Redis caching.
func (s *UsersService) GetUserRoles(ctx context.Context, userID int64) ([]queries.GetUserRolesRow, error) {
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)

	// first redis to see if the roles have been cached
	rolesJSON, err := s.rdb.Get(ctx, userRolesKey).Result()
	if err == nil {
		var roles []queries.GetUserRolesRow
		if err := json.Unmarshal([]byte(rolesJSON), &roles); err == nil {
			return roles, nil
		}
	}

	// Fetch from DB if not in Redis
	roles, err := s.queries.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache it in Redis
	rolesJSONBytes, err := json.Marshal(roles)
	if err == nil {
		s.rdb.Set(ctx, userRolesKey, rolesJSONBytes, db.RedisFiveYearsTTL) // expires in 5years
	}

	return roles, nil
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

	// Invalidate the user-roles cache
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)
	s.rdb.Del(ctx, userRolesKey)

	// Update the user_table, updates has_role to true
	_ = s.queries.UpdateUserHasRole(ctx, queries.UpdateUserHasRoleParams{
		ID:      userID,
		HasRole: pgtype.Bool{Bool: true, Valid: true},
	})

	// Invalidate user info cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)

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

	// Invalidate the cache
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)
	s.rdb.Del(ctx, userRolesKey)

	// Check if user has any roles left
	hasRole, err := s.queries.CheckUserHasAnyRole(ctx, userID)
	if err != nil {
		return err
	}
	_ = s.queries.UpdateUserHasRole(ctx, queries.UpdateUserHasRoleParams{
		ID:      userID,
		HasRole: pgtype.Bool{Bool: hasRole, Valid: true},
	})

	// Invalidate user info cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)

	return nil
}

// UpdateUserProfile updates basic user profile details and invalidates the user info cache.
func (s *UsersService) UpdateUserProfile(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32) error {
	err := s.queries.UpdateUserProfile(ctx, queries.UpdateUserProfileParams{
		ID:             id,
		FirstName:      pgtype.Text{String: firstName, Valid: firstName != ""},
		LastName:       pgtype.Text{String: lastName, Valid: lastName != ""},
		MiddleName:     pgtype.Text{String: middleName, Valid: middleName != ""},
		Gender:         pgtype.Text{String: gender, Valid: gender != ""},
		Avatar:         pgtype.Text{String: avatar, Valid: avatar != ""},
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

// GetUserVerification fetches the verification status/details for a specific user.
func (s *UsersService) GetUserVerification(ctx context.Context, userID int64) (queries.UserVerification, error) {
	return s.queries.GetUserVerification(ctx, userID)
}

// DeleteUser removes a user by ID and invalidates their user info cache.
func (s *UsersService) DeleteUser(ctx context.Context, id int64, fakeID int64) error {
	// err := s.queries.DeleteUser(ctx, id)
	// if err != nil {
	// 	return err
	// }

	// Invalidate the cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

// AdminUpdateUser allows admins to perform a comprehensive update of user details.
func (s *UsersService) AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32, stateOfOrigin int16, partyID int16, email string) error {
	err := s.queries.AdminUpdateUser(ctx, queries.AdminUpdateUserParams{
		ID:             id,
		FirstName:      pgtype.Text{String: firstName, Valid: firstName != ""},
		LastName:       pgtype.Text{String: lastName, Valid: lastName != ""},
		MiddleName:     pgtype.Text{String: middleName, Valid: middleName != ""},
		Gender:         pgtype.Text{String: gender, Valid: gender != ""},
		Avatar:         pgtype.Text{String: avatar, Valid: avatar != ""},
		CurrentCountry: countryID,
		CurrentState:   stateID,
		CurrentCity:    pgtype.Int4{Int32: cityID, Valid: cityID != 0},
		PartyID:        pgtype.Int2{Int16: int16(partyID), Valid: partyID != 0},
		Email:          pgtype.Text{String: email, Valid: email != ""},
		StateOfOrigin:  pgtype.Int2{Int16: stateOfOrigin, Valid: stateOfOrigin != 0},
	})
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
		s.rdb.Set(ctx, userProfileKey, profileJSONBytes, db.RedisFiveYearsTTL)
	}

	return profile, nil
}

// UpdateUserProfileDetails updates extended educational and demographic information for a user.
func (s *UsersService) UpdateUserProfileDetails(ctx context.Context, userID int64, educationalStatus, highestDegree, graduationYear, schoolName, religion, maritalStatus, educationLevel string) error {
	err := s.queries.UpdateMoreInfoAboutThisUser(ctx, queries.UpdateMoreInfoAboutThisUserParams{
		UserID:            userID,
		EducationalStatus: pgtype.Text{String: educationalStatus, Valid: educationalStatus != ""},
		HighestDegree:     pgtype.Text{String: highestDegree, Valid: highestDegree != ""},
		GraduationYear:    pgtype.Text{String: graduationYear, Valid: graduationYear != ""},
		SchoolName:        pgtype.Text{String: schoolName, Valid: schoolName != ""},
		Religion:          pgtype.Text{String: religion, Valid: religion != ""},
		MaritalStatus:     pgtype.Text{String: maritalStatus, Valid: maritalStatus != ""},
		EducationLevel:    pgtype.Text{String: educationLevel, Valid: educationLevel != ""},
	})
	if err != nil {
		return err
	}

	// Invalidate cache
	userProfileKey := fmt.Sprintf("%s%d", db.RedisUserMoreInfo, userID)
	s.rdb.Del(ctx, userProfileKey)
	return nil
}

// GetUserPhoneNumbersByUserID retrieves a user's phone numbers, prioritizing Redis cache.
func (s *UsersService) GetUserPhoneNumbersByUserID(ctx context.Context, userID int64) ([]queries.UsersPhoneNumber, error) {
	// Check Redis
	userPhoneNumbersKey := fmt.Sprintf("%s%d", db.RedisUserPhoneNumbers, userID)
	phoneNumbersJSON, err := s.rdb.Get(ctx, userPhoneNumbersKey).Result()
	if err == nil {
		var phoneNumbers []queries.UsersPhoneNumber
		if err := json.Unmarshal([]byte(phoneNumbersJSON), &phoneNumbers); err == nil {
			return phoneNumbers, nil
		}
	}

	// Fetch from DB if not in Redis
	phoneNumbers, err := s.queries.GetUserPhoneNumbersByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache it in Redis
	phoneNumbersJSONBytes, err := json.Marshal(phoneNumbers)
	if err == nil {
		s.rdb.Set(ctx, userPhoneNumbersKey, phoneNumbersJSONBytes, db.RedisFiveYearsTTL) // 5years TTL
	}

	return phoneNumbers, nil
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
func (s *UsersService) UpdateUserPhoneNumbers(ctx context.Context, userID int64, phones []PhonePayload) error {
	for _, p := range phones {
		onWhatsapp := pgtype.Text{String: p.OnWhatsapp, Valid: p.OnWhatsapp != ""}
		isDefault := pgtype.Bool{Bool: p.IsDefault, Valid: true}

		if p.ID == 0 {
			_, err := s.queries.CreatePhoneNumber(ctx, queries.CreatePhoneNumberParams{
				UserID:    userID,
				Phone:     fmt.Sprintf("+%s%s", p.Phonecode, p.RawInput),
				Phonecode: p.Phonecode,
				RawInput:  p.RawInput,
				IsDefault: isDefault,
			})
			if err != nil {
				return err
			}
		} else {
			err := s.queries.UpdatePhoneNumber(ctx, queries.UpdatePhoneNumberParams{
				ID:         p.ID,
				OnWhatsapp: onWhatsapp,
				IsDefault:  isDefault,
			})
			if err != nil {
				return err
			}
		}
	}

	// Invalidate cache
	userPhoneNumbersKey := fmt.Sprintf("%s%d", db.RedisUserPhoneNumbers, userID)
	s.rdb.Del(ctx, userPhoneNumbersKey)

	return nil
}

// DeleteUserPhoneNumber removes a specific phone number record by its ID.
func (s *UsersService) DeleteUserPhoneNumber(ctx context.Context, id int64) error {
	return s.queries.DeleteUserPhoneNumber(ctx, id)
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

	// Invalidate the user info cache
	_ = s.InvalidateCachedUserInfo(ctx, fakeID)
	return nil
}

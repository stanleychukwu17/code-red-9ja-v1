package usersservice

import (
	"context"
	"encoding/json"
	"fmt"
	"errors"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type UsersService struct {
	queries *queries.Queries
	rdb     *redis.Client
	monnify *monnifyclient.Client
}

func NewUsersService(q *queries.Queries, rdb *redis.Client, monnify *monnifyclient.Client) *UsersService {
	return &UsersService{
		queries: q,
		rdb:     rdb,
		monnify: monnify,
	}
}

func (s *UsersService) GetBanks(ctx context.Context) ([]monnifyclient.Bank, error) {
	if s.monnify == nil {
		return nil, fmt.Errorf("monnify client is not configured")
	}
	return s.monnify.GetBanks(ctx)
}

func (s *UsersService) ValidateBankAccount(ctx context.Context, accountNumber string, bankCode string) (string, error) {
	if s.monnify == nil {
		return "", fmt.Errorf("monnify client is not configured")
	}
	return s.monnify.ValidateBankAccount(ctx, accountNumber, bankCode)
}

func (s *UsersService) GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error) {
	// Check Redis
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	userInfoJSON, err := s.rdb.Get(ctx, userInfoKey).Result()
	if err == nil {
		var user queries.User
		if err := json.Unmarshal([]byte(userInfoJSON), &user); err == nil {
			return user, nil
		}
	}

	// Fetch from DB if not in Redis
	user, err := s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
	if err != nil {
		return queries.User{}, fmt.Errorf("user not found: %w", err)
	}

	// Cache it in Redis
	userJSON, err := json.Marshal(user)
	if err == nil {
		s.rdb.Set(ctx, userInfoKey, userJSON, 5*365*24*time.Hour) // 5 years expires
	}

	return user, nil
}

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
		s.rdb.Set(ctx, userRolesKey, rolesJSONBytes, 5*365*24*time.Hour) // expires in 5years
	}

	return roles, nil
}

func (s *UsersService) AssignUserRole(ctx context.Context, userID int64, code string, whoAssigned int64) error {
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

	// Invalidate the cache
	userRolesKey := fmt.Sprintf("%s%d", db.RedisUserRoles, userID)
	s.rdb.Del(ctx, userRolesKey)
	
	return nil
}

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
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	s.rdb.Del(ctx, userInfoKey)
	return nil
}

func (s *UsersService) ListUsers(ctx context.Context) ([]queries.User, error) {
	return s.queries.ListUsers(ctx)
}

func (s *UsersService) GetUserVerification(ctx context.Context, userID int64) (queries.UserVerification, error) {
	return s.queries.GetUserVerification(ctx, userID)
}

func (s *UsersService) DeleteUser(ctx context.Context, id int64, fakeID int64) error {
	err := s.queries.DeleteUser(ctx, id)
	if err != nil {
		return err
	}

	// Invalidate the cache
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	s.rdb.Del(ctx, userInfoKey)
	return nil
}

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
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	s.rdb.Del(ctx, userInfoKey)
	return nil
}

func (s *UsersService) GetUserProfile(ctx context.Context, userID int64) (queries.UserProfile, error) {
	// Check Redis
	userProfileKey := fmt.Sprintf("%s%d", db.RedisUserProfile, userID)
	profileJSON, err := s.rdb.Get(ctx, userProfileKey).Result()
	if err == nil {
		var profile queries.UserProfile
		if err := json.Unmarshal([]byte(profileJSON), &profile); err == nil {
			return profile, nil
		}
	}

	// Fetch from DB if not in Redis
	profile, err := s.queries.GetUserProfile(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return empty profile for new users instead of failing
			return queries.UserProfile{UserID: userID}, nil
		}
		return queries.UserProfile{}, fmt.Errorf("user profile not found: %w", err)
	}

	// Cache it in Redis
	profileJSONBytes, err := json.Marshal(profile)
	if err == nil {
		s.rdb.Set(ctx, userProfileKey, profileJSONBytes, 5*365*24*time.Hour)
	}

	return profile, nil
}

func (s *UsersService) UpdateUserProfileDetails(ctx context.Context, userID int64, educationalStatus, highestDegree, graduationYear, schoolName, religion, maritalStatus, educationLevel string) error {
	err := s.queries.UpdateUserProfileDetails(ctx, queries.UpdateUserProfileDetailsParams{
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
	userProfileKey := fmt.Sprintf("%s%d", db.RedisUserProfile, userID)
	s.rdb.Del(ctx, userProfileKey)
	return nil
}

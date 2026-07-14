package usersservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"

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

func (s *UsersService) GetUserByID(ctx context.Context, id int64) (queries.User, error) {
	return s.queries.GetUserByID(ctx, id)
}

func (s *UsersService) GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error) {
	return s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
}

func (s *UsersService) GetUserRoles(ctx context.Context, userID int64) ([]queries.GetUserRolesRow, error) {
	return s.queries.GetUserRoles(ctx, userID)
}

func (s *UsersService) AssignUserRole(ctx context.Context, userID int64, code string, whoAssigned int64) error {
	role, err := s.queries.GetRoleByCode(ctx, code)
	if err != nil {
		return err
	}
	return s.queries.AssignUserRole(ctx, queries.AssignUserRoleParams{
		UserID:            userID,
		RoleID:            role.ID,
		RoleCode:          role.Code,
		WhoAssignedUserID: whoAssigned,
	})
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

func (s *UsersService) AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32, stateOfOrigin int16, partyID int64, email string) error {
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
		PartyID:        pgtype.Int8{Int64: partyID, Valid: partyID != 0},
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

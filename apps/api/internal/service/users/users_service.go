package usersservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
)

type UsersService struct {
	queries *queries.Queries
	rdb     *redis.Client
}

func NewUsersService(q *queries.Queries, rdb *redis.Client) *UsersService {
	return &UsersService{
		queries: q,
		rdb:     rdb,
	}
}

func (s *UsersService) GetUserByID(ctx context.Context, id int64) (queries.User, error) {
	return s.queries.GetUserByID(ctx, id)
}

func (s *UsersService) GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error) {
	return s.queries.GetUserByFakeID(ctx, pgtype.Int8{Int64: fakeID, Valid: true})
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

func (s *UsersService) AdminUpdateUser(ctx context.Context, id int64, fakeID int64, firstName, lastName, middleName, gender, avatar string, countryID, stateID int16, cityID int32, role, roleLevel string, partyID int64, email string) error {
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
		Role:           pgtype.Text{String: role, Valid: role != ""},
		RoleLevel:      pgtype.Text{String: roleLevel, Valid: roleLevel != ""},
		PartyID:        pgtype.Int8{Int64: partyID, Valid: partyID != 0},
		Email:          pgtype.Text{String: email, Valid: email != ""},
	})
	if err != nil {
		return err
	}

	// Invalidate the cache
	userInfoKey := fmt.Sprintf("%s%d", db.RedisUserInfo, fakeID)
	s.rdb.Del(ctx, userInfoKey)
	return nil
}

package service

import (
	"context"
	"free9ja/api/internal/db/queries"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	queries *queries.Queries
}

func NewAuthService(q *queries.Queries) *AuthService {
	return &AuthService{queries: q}
}

func (s *AuthService) Register(ctx context.Context, params queries.CreateUserParams) (int64, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(params.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}
	params.PasswordHash = string(hashedPassword)

	return s.queries.CreateUser(ctx, params)
}

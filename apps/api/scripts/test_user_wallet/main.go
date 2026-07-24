package main

import (
	"context"
	"log/slog"
	"os"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	bodiesservice "free9ja/api/internal/service/bodies"
	monnifyservice "free9ja/api/internal/service/monnify"
	usersservice "free9ja/api/internal/service/users"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	// Load config
	cfg := config.Load()

	// Connect to database
	pool, err := pgxpool.New(ctx, cfg.Database.URL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	q := queries.New(pool)

	// Initialise Monnify client
	monnifyClient := monnifyservice.New(monnifyservice.Config{
		BaseURL:      cfg.Monnify.BaseURL,
		APIKey:       cfg.Monnify.APIKey,
		SecretKey:    cfg.Monnify.SecretKey,
		ContractCode: cfg.Monnify.ContractCode,
	})

	// Build a bodies service
	bodiesSvc := bodiesservice.NewBodiesService(q, nil)

	// Build a users service
	usersSvc := usersservice.NewUsersService(q, nil, monnifyClient, bodiesSvc)

	// Fetch all users that don't yet have a wallet
	unwalletedUsers, err := q.ListUsersWithoutWallet(ctx)
	if err != nil {
		slog.Error("failed to fetch users without wallets", "err", err)
		os.Exit(1)
	}

	slog.Info("users to wallet", "count", len(unwalletedUsers))

	for _, user := range unwalletedUsers {
		wallet, err := usersSvc.CreateUserWallet(ctx, user)
		if err != nil {
			slog.Error("failed to create user wallet",
				"user_id", user.ID,
				"username", user.Username.String,
				"err", err)
			continue
		}
		slog.Info("wallet created",
			"user_id", user.ID,
			"wallet_id", wallet.ID,
			"account_reference", wallet.AccountReference,
		)
	}
}

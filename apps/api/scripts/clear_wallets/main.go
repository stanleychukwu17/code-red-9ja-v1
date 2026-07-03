package main

import (
	"context"
	"log/slog"
	"os"

	"free9ja/api/internal/config"

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

	// Truncate user_wallets and party_wallets
	_, err = pool.Exec(ctx, "TRUNCATE user_wallets CASCADE; TRUNCATE party_wallets CASCADE;")
	if err != nil {
		slog.Error("failed to truncate wallets tables", "err", err)
		os.Exit(1)
	}

	slog.Info("Successfully cleared wallets and transactions tables!")
}

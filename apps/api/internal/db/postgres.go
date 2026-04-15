package db

import (
	"context"
	"fmt"
	"free9ja/api/internal/config"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgresPool(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	dbConfig, err := pgxpool.ParseConfig(connString)

	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	dbConfig.MaxConns = 20
	dbConfig.MinConns = 2
	dbConfig.MaxConnLifetime = 30 * time.Minute
	dbConfig.MaxConnIdleTime = 15 * time.Minute

	// Initialize the pool
	pool, err := pgxpool.NewWithConfig(ctx, dbConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify the connection is active
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	if config.GetEnv("ENV", "development") == "development" {
		slog.Info("Successfully connected to the database")
	}

	return pool, nil
}

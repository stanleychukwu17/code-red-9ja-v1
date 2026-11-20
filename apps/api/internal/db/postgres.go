package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgresPool(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	dbConfig, err := pgxpool.ParseConfig(connString)

	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	maxConns := int32(25)
	if envMax := os.Getenv("DATABASE_MAX_CONNS"); envMax != "" {
		if n, err := strconv.Atoi(envMax); err == nil && n > 0 {
			maxConns = int32(n)
		}
	} else if dbConfig.MaxConns > 0 && dbConfig.MaxConns <= 30 {
		maxConns = dbConfig.MaxConns
	}

	minConns := int32(5)
	if envMin := os.Getenv("DATABASE_MIN_CONNS"); envMin != "" {
		if n, err := strconv.Atoi(envMin); err == nil && n >= 0 {
			minConns = int32(n)
		}
	}
	if minConns > maxConns {
		minConns = maxConns
	}

	dbConfig.MaxConns = maxConns
	dbConfig.MinConns = minConns
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

	slog.Info("Successfully connected to the postgres database", "max_conns", maxConns, "min_conns", minConns)

	return pool, nil
}

package db

import (
	"context"
	"fmt"
	"free9ja/api/internal/config"
	"log/slog"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates a new Redis client with the provided configuration.
// It verifies the connection by pinging the server before returning.
func NewRedisClient(cfg config.RedisConfig) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// Verify connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("unable to ping redis: %w", err)
	}

	if config.GetEnv("ENV", "development") == "development" {
		slog.Info("Successfully connected to Redis", "addr", cfg.Addr, "db", cfg.DB)
	}

	return rdb, nil
}

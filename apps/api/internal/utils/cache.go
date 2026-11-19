package utils

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// GetCachedJSON retrieves and un-marshals JSON value from Redis into type T
func GetCachedJSON[T any](ctx context.Context, rdb *redis.Client, key string) (T, bool) {
	var zero T
	if rdb == nil {
		return zero, false
	}
	val, err := rdb.Get(ctx, key).Result()
	if err != nil {
		return zero, false
	}

	var data T
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return zero, false
	}

	return data, true
}

// SetCachedJSON marshals data into JSON and caches it in Redis with TTL
func SetCachedJSON[T any](ctx context.Context, rdb *redis.Client, key string, data T, ttl time.Duration) error {
	if rdb == nil {
		return nil
	}
	bytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return rdb.Set(ctx, key, bytes, ttl).Err()
}

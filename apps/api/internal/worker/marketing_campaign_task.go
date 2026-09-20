package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"free9ja/api/internal/db"
)

// marketingDeductionsLockKey returns the unique Redis lock key for the specified UTC date.
func marketingDeductionsLockKey(t time.Time) string {
	return fmt.Sprintf("%s%s", db.RedisCronLockMarketingDeductionsPrefix, t.UTC().Format("2006-01-02"))
}

// ProcessDailyMarketingCampaignDeductions runs daily at 00:05 AM to deduct daily agent allowances
// from campaign balances and auto-complete campaigns when their budget is exhausted.
// It uses a distributed Redis lock and database-level last_deducted_date tracking to guarantee idempotency.
func (redisTaskProcessor *RedisTaskProcessor) ProcessDailyMarketingCampaignDeductions() {
	ctx := context.Background()
	lockKey := marketingDeductionsLockKey(time.Now())

	// 1. Guard against duplicate execution across multiple server instances using a distributed lock
	// Lock for 24 hours using SetArgs with NX mode so this instance or other replicas don't re-run today
	err := redisTaskProcessor.rdb.SetArgs(ctx, lockKey, "locked", redis.SetArgs{
		Mode: "NX",
		TTL:  24 * time.Hour,
	}).Err()
	if errors.Is(err, redis.Nil) {
		slog.Info("daily marketing campaign deductions already acquired or executed on another instance, skipping", "key", lockKey)
		return
	}
	if err != nil {
		slog.Error("failed to acquire distributed lock for daily marketing campaign deductions", "key", lockKey, "error", err)
		return
	}

	// 2. Execute idempotent deduction query
	updated, err := redisTaskProcessor.queries.ProcessDailyMarketingCampaignDeductions(ctx)
	if err != nil {
		slog.Error("failed to process daily marketing campaign deductions", "error", err)
		// Release the lock on failure so a retry or manual rerun can succeed
		_ = redisTaskProcessor.rdb.Del(ctx, lockKey).Err()
		return
	}

	slog.Info("processed daily marketing campaign deductions", "count", len(updated))
}


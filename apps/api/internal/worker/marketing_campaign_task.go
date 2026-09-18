package worker

import (
	"context"
	"log/slog"
)

// ProcessDailyMarketingCampaignDeductions runs daily at 00:05 AM to deduct daily agent allowances
// from campaign balances and auto-complete campaigns when their budget is exhausted.
func (redisTaskProcessor *RedisTaskProcessor) ProcessDailyMarketingCampaignDeductions() {
	updated, err := redisTaskProcessor.queries.ProcessDailyMarketingCampaignDeductions(context.Background())
	if err != nil {
		slog.Error("failed to process daily marketing campaign deductions", "error", err)
	} else {
		slog.Info("processed daily marketing campaign deductions", "count", len(updated))
	}
}

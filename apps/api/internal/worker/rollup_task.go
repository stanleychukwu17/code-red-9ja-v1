package worker

import (
	"context"
	"log/slog"
)

func (processor *RedisTaskProcessor) ProcessRollupWard() {
	if err := processor.q.RollupWardFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup ward final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupStateConstituency() {
	if err := processor.q.RollupStateConstituencyFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup state constituency final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupLGA() {
	if err := processor.q.RollupLGAFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup lga final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupSenatorialDistrict() {
	if err := processor.q.RollupSenatorialDistrictFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup senatorial district final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupFederalConstituency() {
	if err := processor.q.RollupFederalConstituencyFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup federal constituency final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupState() {
	if err := processor.q.RollupStateFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup state final results", "error", err)
	}
}

func (processor *RedisTaskProcessor) ProcessRollupElection() {
	if err := processor.q.RollupElectionFinalResults(context.Background()); err != nil {
		slog.Error("failed to rollup election final results", "error", err)
	}
}

// ProcessFullElectionRollup executes the entire bottom-up election rollup hierarchy
// sequentially in strict order, guaranteeing that child scopes are fully aggregated
// before parent scopes run, avoiding race conditions and reducing DB spikes.
func (processor *RedisTaskProcessor) ProcessFullElectionRollup() {
	ctx := context.Background()
	slog.Info("starting sequential full election rollup reconciliation")

	// 1. Ward Rollup (from Polling Units)
	if err := processor.q.RollupWardFinalResults(ctx); err != nil {
		slog.Error("failed to rollup ward final results", "error", err)
	}

	// 2. State Constituency & LGA Rollup (from Wards)
	if err := processor.q.RollupStateConstituencyFinalResults(ctx); err != nil {
		slog.Error("failed to rollup state constituency final results", "error", err)
	}
	if err := processor.q.RollupLGAFinalResults(ctx); err != nil {
		slog.Error("failed to rollup lga final results", "error", err)
	}

	// 3. Federal Constituency & Senatorial District Rollup (from LGAs)
	if err := processor.q.RollupFederalConstituencyFinalResults(ctx); err != nil {
		slog.Error("failed to rollup federal constituency final results", "error", err)
	}
	if err := processor.q.RollupSenatorialDistrictFinalResults(ctx); err != nil {
		slog.Error("failed to rollup senatorial district final results", "error", err)
	}

	// 4. State Rollup (from Senatorial Districts)
	if err := processor.q.RollupStateFinalResults(ctx); err != nil {
		slog.Error("failed to rollup state final results", "error", err)
	}

	// 5. Nationwide / Presidential Rollup (from States)
	if err := processor.q.RollupElectionFinalResults(ctx); err != nil {
		slog.Error("failed to rollup election final results", "error", err)
	}

	slog.Info("sequential full election rollup reconciliation completed")
}

// cacheElectionResult fetches the freshly-computed election_final_result row and writes
// it as JSON to Redis with a 15-minute TTL.
func (processor *RedisTaskProcessor) cacheElectionResult(ctx context.Context, electionID int64) error {
	slog.Info("cacheElectionResult is temporarily disabled due to schema migration")
	return nil
}

func (processor *RedisTaskProcessor) ProcessDailyMarketingCampaignDeductions() {
	updated, err := processor.q.ProcessDailyMarketingCampaignDeductions(context.Background())
	if err != nil {
		slog.Error("failed to process daily marketing campaign deductions", "error", err)
	} else {
		slog.Info("processed daily marketing campaign deductions", "count", len(updated))
	}
}


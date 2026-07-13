package worker

import (
	"context"
	"log/slog"
)

// ProcessRefreshElectionPollingUnitStats refreshes the base-level election stats
// for every (election_group_id, polling_unit_id) that has agent assignments.
// Must run FIRST in the stats refresh chain.
func (processor *RedisTaskProcessor) ProcessRefreshElectionPollingUnitStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionPollingUnitStats(ctx); err != nil {
		slog.Error("failed to refresh election polling unit stats", "error", err)
	} else {
		slog.Info("successfully refreshed election polling unit stats")
	}
}

// ProcessRefreshElectionWardStats rolls up PU stats to ward level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionWardStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionWardStats(ctx); err != nil {
		slog.Error("failed to refresh election ward stats", "error", err)
	} else {
		slog.Info("successfully refreshed election ward stats")
	}
}

// ProcessRefreshElectionLGAStats rolls up ward stats to LGA level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionLGAStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionLGAStats(ctx); err != nil {
		slog.Error("failed to refresh election lga stats", "error", err)
	} else {
		slog.Info("successfully refreshed election lga stats")
	}
}

// ProcessRefreshElectionStateConstituencyStats rolls up PU stats by state constituency.
// Runs in parallel with LGA (both read from election_polling_units).
func (processor *RedisTaskProcessor) ProcessRefreshElectionStateConstituencyStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionStateConstituencyStats(ctx); err != nil {
		slog.Error("failed to refresh election state constituency stats", "error", err)
	} else {
		slog.Info("successfully refreshed election state constituency stats")
	}
}

// ProcessRefreshElectionFederalConstituencyStats rolls up LGA stats by federal constituency.
func (processor *RedisTaskProcessor) ProcessRefreshElectionFederalConstituencyStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionFederalConstituencyStats(ctx); err != nil {
		slog.Error("failed to refresh election federal constituency stats", "error", err)
	} else {
		slog.Info("successfully refreshed election federal constituency stats")
	}
}

// ProcessRefreshElectionSenatorialDistrictStats rolls up LGA stats by senatorial district.
func (processor *RedisTaskProcessor) ProcessRefreshElectionSenatorialDistrictStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionSenatorialDistrictStats(ctx); err != nil {
		slog.Error("failed to refresh election senatorial district stats", "error", err)
	} else {
		slog.Info("successfully refreshed election senatorial district stats")
	}
}

// ProcessRefreshElectionStateStats rolls up LGA stats to state level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionStateStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionStateStats(ctx); err != nil {
		slog.Error("failed to refresh election state stats", "error", err)
	} else {
		slog.Info("successfully refreshed election state stats")
	}
}

// ProcessRefreshAllElectionStats runs the complete geographic stats refresh pipeline
// in the correct bottom-up dependency order. Designed to be called by a cron scheduler.
func (processor *RedisTaskProcessor) ProcessRefreshAllElectionStats() {
	slog.Info("starting full election stats refresh pipeline")
	processor.ProcessRefreshElectionPollingUnitStats()
	processor.ProcessRefreshElectionWardStats()
	processor.ProcessRefreshElectionLGAStats()
	processor.ProcessRefreshElectionStateConstituencyStats()
	processor.ProcessRefreshElectionFederalConstituencyStats()
	processor.ProcessRefreshElectionSenatorialDistrictStats()
	processor.ProcessRefreshElectionStateStats()
	slog.Info("completed full election stats refresh pipeline")
}

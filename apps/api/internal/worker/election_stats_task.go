package worker

import (
	"context"
	"log/slog"
)

// ProcessRefreshElectionGroupPollingUnitStats refreshes the base-level election stats
// for every (election_group_id, polling_unit_id) that has agent assignments.
// Must run FIRST in the stats refresh chain.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupPollingUnitStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupPollingUnitStats(ctx); err != nil {
		slog.Error("failed to refresh election polling unit stats", "error", err)
	} else {
		slog.Info("successfully refreshed election polling unit stats")
	}
}

// ProcessRefreshElectionGroupWardStats rolls up PU stats to ward level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupWardStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupWardStats(ctx); err != nil {
		slog.Error("failed to refresh election ward stats", "error", err)
	} else {
		slog.Info("successfully refreshed election ward stats")
	}
}

// ProcessRefreshElectionLGAStats rolls up ward stats to LGA level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionLGAStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupLGAStats(ctx); err != nil {
		slog.Error("failed to refresh election lga stats", "error", err)
	} else {
		slog.Info("successfully refreshed election lga stats")
	}
}

// ProcessRefreshElectionGroupStateConstituencyStats rolls up PU stats by state constituency.
// Runs in parallel with LGA (both read from election_group_polling_units).
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupStateConstituencyStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupStateConstituencyStats(ctx); err != nil {
		slog.Error("failed to refresh election state constituency stats", "error", err)
	} else {
		slog.Info("successfully refreshed election state constituency stats")
	}
}

// ProcessRefreshElectionGroupFederalConstituencyStats rolls up LGA stats by federal constituency.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupFederalConstituencyStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupFederalConstituencyStats(ctx); err != nil {
		slog.Error("failed to refresh election federal constituency stats", "error", err)
	} else {
		slog.Info("successfully refreshed election federal constituency stats")
	}
}

// ProcessRefreshElectionGroupSenatorialDistrictStats rolls up LGA stats by senatorial district.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupSenatorialDistrictStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupSenatorialDistrictStats(ctx); err != nil {
		slog.Error("failed to refresh election senatorial district stats", "error", err)
	} else {
		slog.Info("successfully refreshed election senatorial district stats")
	}
}

// ProcessRefreshElectionGroupStateStats rolls up LGA stats to state level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupStateStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupStateStats(ctx); err != nil {
		slog.Error("failed to refresh election state stats", "error", err)
	} else {
		slog.Info("successfully refreshed election state stats")
	}
}

// ProcessRefreshElectionGroupGlobalStats rolls up state stats to the global election group level.
func (processor *RedisTaskProcessor) ProcessRefreshElectionGroupGlobalStats() {
	ctx := context.Background()
	if err := processor.q.RefreshAllElectionGroupGlobalStats(ctx); err != nil {
		slog.Error("failed to refresh election global stats", "error", err)
	} else {
		slog.Info("successfully refreshed election global stats")
	}
}

// ProcessRefreshAllElectionStats runs the complete geographic stats refresh pipeline
// in the correct bottom-up dependency order. Designed to be called by a cron scheduler.
func (processor *RedisTaskProcessor) ProcessRefreshAllElectionStats() {
	slog.Info("starting full election stats refresh pipeline")
	// Polling units are now updated continuously by event-driven workers.
	// This cron only handles the rollups (Wards -> LGA -> State -> Global).
	processor.ProcessRefreshElectionGroupWardStats()
	processor.ProcessRefreshElectionLGAStats()
	processor.ProcessRefreshElectionGroupStateConstituencyStats()
	processor.ProcessRefreshElectionGroupFederalConstituencyStats()
	processor.ProcessRefreshElectionGroupSenatorialDistrictStats()
	processor.ProcessRefreshElectionGroupStateStats()
	processor.ProcessRefreshElectionGroupGlobalStats()
	slog.Info("completed full election stats refresh pipeline")
}

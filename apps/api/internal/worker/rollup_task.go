package worker

import (
	"context"
	"log/slog"
)

// updateCandidateVoteCounts inspects the election's scope and calls the matching
// UPDATE query to sync election_candidates.votes_count from the zenith rollup table.
func (processor *RedisTaskProcessor) updateCandidateVoteCounts(ctx context.Context, electionID int64) error {
	slog.Info("updateCandidateVoteCounts is temporarily disabled due to schema migration")
	return nil
}

// ProcessRollupWard aggregates all polling_unit_final_result rows into ward_final_result
func (processor *RedisTaskProcessor) ProcessRollupWard() {
	slog.Info("ProcessRollupWard is temporarily disabled due to schema migration")
}

// ProcessRollupStateConstituency aggregates ward_final_result into state_constituency_final_result.
func (processor *RedisTaskProcessor) ProcessRollupStateConstituency() {
	slog.Info("ProcessRollupStateConstituency is temporarily disabled due to schema migration")
}

// ProcessRollupLGA aggregates ward_final_result into lga_final_result.
func (processor *RedisTaskProcessor) ProcessRollupLGA() {
	slog.Info("ProcessRollupLGA is temporarily disabled due to schema migration")
}

// ProcessRollupSenatorialDistrict aggregates lga_final_result into senatorial_district_final_result.
func (processor *RedisTaskProcessor) ProcessRollupSenatorialDistrict() {
	slog.Info("ProcessRollupSenatorialDistrict is temporarily disabled due to schema migration")
}

// ProcessRollupFederalConstituency aggregates lga_final_result into federal_constituency_final_result.
func (processor *RedisTaskProcessor) ProcessRollupFederalConstituency() {
	slog.Info("ProcessRollupFederalConstituency is temporarily disabled due to schema migration")
}

// ProcessRollupState aggregates lga_final_result into state_final_result.
func (processor *RedisTaskProcessor) ProcessRollupState() {
	slog.Info("ProcessRollupState is temporarily disabled due to schema migration")
}

// ProcessRollupElection aggregates state_final_result into election_final_result
func (processor *RedisTaskProcessor) ProcessRollupElection() {
	slog.Info("ProcessRollupElection is temporarily disabled due to schema migration")
}

// cacheElectionResult fetches the freshly-computed election_final_result row and writes
// it as JSON to Redis with a 15-minute TTL.
func (processor *RedisTaskProcessor) cacheElectionResult(ctx context.Context, electionID int64) error {
	slog.Info("cacheElectionResult is temporarily disabled due to schema migration")
	return nil
}

package worker

import (
	"context"
	"log/slog"
)

func (processor *RedisTaskProcessor) ProcessRollupWard() {
	if err := processor.q.RollupWardFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup ward final results", "error", err)
	} else {
		// slog.Info("successfully rolled up ward final results")
		if err := processor.q.UpdateCandidatesFromWardElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from ward final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupStateConstituency() {
	if err := processor.q.RollupStateConstituencyFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup state constituency final results", "error", err)
	} else {
		// slog.Info("successfully rolled up state constituency final results")
		if err := processor.q.UpdateCandidatesFromStateConstituencyElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from state constituency final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupLGA() {
	if err := processor.q.RollupLGAFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup lga final results", "error", err)
	} else {
		// slog.Info("successfully rolled up lga final results")
		if err := processor.q.UpdateCandidatesFromLGAElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from lga final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupSenatorialDistrict() {
	if err := processor.q.RollupSenatorialDistrictFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup senatorial district final results", "error", err)
	} else {
		// slog.Info("successfully rolled up senatorial district final results")
		if err := processor.q.UpdateCandidatesFromSenatorialDistrictElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from senatorial district final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupFederalConstituency() {
	if err := processor.q.RollupFederalConstituencyFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup federal constituency final results", "error", err)
	} else {
		// slog.Info("successfully rolled up federal constituency final results")
		if err := processor.q.UpdateCandidatesFromFederalConstituencyElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from federal constituency final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupState() {
	if err := processor.q.RollupStateFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup state final results", "error", err)
	} else {
		// slog.Info("successfully rolled up state final results")
		if err := processor.q.UpdateCandidatesFromStateElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from state final results", "error", err)
		}
	}
}

func (processor *RedisTaskProcessor) ProcessRollupElection() {
	if err := processor.q.RollupElectionFinalResults(context.Background()); err != nil {
		// slog.Error("failed to rollup election final results", "error", err)
	} else {
		// slog.Info("successfully rolled up election final results")
		if err := processor.q.UpdateCandidatesFromNationwideElections(context.Background()); err != nil {
			// slog.Error("failed to update election_candidates from nationwide final results", "error", err)
		}
	}
}

// cacheElectionResult fetches the freshly-computed election_final_result row and writes
// it as JSON to Redis with a 15-minute TTL.
func (processor *RedisTaskProcessor) cacheElectionResult(ctx context.Context, electionID int64) error {
	slog.Info("cacheElectionResult is temporarily disabled due to schema migration")
	return nil
}

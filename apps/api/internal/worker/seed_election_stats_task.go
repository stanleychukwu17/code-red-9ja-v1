package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
)

const TaskSeedElectionGroupStats = "election_group:seed_stats"

// SeedElectionGroupStatsPayload carries the election group ID to seed.
type SeedElectionGroupStatsPayload struct {
	ElectionGroupID int64 `json:"election_group_id"`
}

// DistributeTaskSeedElectionGroupStats enqueues a background job to seed
// zeroed geography stat rows for the given election group. It is idempotent
// (uses ON CONFLICT DO NOTHING queries), so it is safe to call multiple times.
func (distributor *RedisTaskDistributor) DistributeTaskSeedElectionGroupStats(ctx context.Context, payload *SeedElectionGroupStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal seed payload: %w", err)
	}

	uniqueKey := fmt.Sprintf("election_group:seed_stats:%d", payload.ElectionGroupID)

	defaults := []asynq.Option{
		asynq.ProcessIn(5 * time.Second),  // short delay so elections are created first
		asynq.Unique(10 * time.Minute),    // deduplicate within 10 minutes
		asynq.MaxRetry(5),
		asynq.Timeout(5 * time.Minute),    // seeding 9k+ wards can take a moment
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskSeedElectionGroupStats, jsonPayload, opts...)
	info, err := distributor.client.EnqueueContext(ctx, task)
	if err != nil && err != asynq.ErrTaskIDConflict {
		return fmt.Errorf("failed to enqueue seed task: %w", err)
	}
	if err == asynq.ErrTaskIDConflict {
		slog.Debug("seed election group stats task already queued, skipping duplicate",
			"election_group_id", payload.ElectionGroupID)
		return nil
	}

	slog.Info("enqueued seed election group stats task",
		"type", task.Type(), "queue", info.Queue, "election_group_id", payload.ElectionGroupID)
	return nil
}

// ProcessTaskSeedElectionGroupStats seeds zeroed geography stat rows for the
// given election group. Called by the asynq worker on behalf of the distributor.
// Runs in bottom-up order so foreign-key inserts work correctly.
// Polling units are excluded — they are seeded lazily by the refresh cron.
func (processor *RedisTaskProcessor) ProcessTaskSeedElectionGroupStats(ctx context.Context, task *asynq.Task) error {
	var payload SeedElectionGroupStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal seed payload: %w", err)
	}

	egID := payload.ElectionGroupID
	slog.Info("seeding election group stats", "election_group_id", egID)

	steps := []struct {
		name string
		fn   func() error
	}{
		{"states", func() error { return processor.q.SeedElectionGroupStateStats(ctx, egID) }},
		{"senatorial_districts", func() error { return processor.q.SeedElectionGroupSenatorialDistrictStats(ctx, egID) }},
		{"federal_constituencies", func() error { return processor.q.SeedElectionGroupFederalConstituencyStats(ctx, egID) }},
		{"lgas", func() error { return processor.q.SeedElectionGroupLGAStats(ctx, egID) }},
		{"state_constituencies", func() error { return processor.q.SeedElectionGroupStateConstituencyStats(ctx, egID) }},
		{"wards", func() error { return processor.q.SeedElectionGroupWardStats(ctx, egID) }},
	}

	for _, step := range steps {
		if err := step.fn(); err != nil {
			slog.Error("failed to seed election group stats",
				"step", step.name, "election_group_id", egID, "error", err)
			return fmt.Errorf("seed %s failed: %w", step.name, err)
		}
		slog.Info("seeded election group stats step", "step", step.name, "election_group_id", egID)
	}

	slog.Info("completed seeding election group stats", "election_group_id", egID)
	return nil
}

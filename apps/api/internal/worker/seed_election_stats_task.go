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
	ElectionGroupID int32 `json:"election_group_id"`
}

// DistributeTaskSeedElectionGroupStats enqueues a background job to seed
// zeroed geography stat rows for the given election group. It is idempotent
// (uses ON CONFLICT DO NOTHING queries), so it is safe to call multiple times.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskSeedElectionGroupStats(ctx context.Context, payload *SeedElectionGroupStatsPayload, opts ...asynq.Option) error {
	// 1. Serialize the payload (election_group_id) to JSON for Redis storage
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal seed payload: %w", err)
	}

	// 2. Configure task options:
	defaults := []asynq.Option{
		// Delay execution by 3 seconds so any bulk child election inserts can settle first
		asynq.ProcessIn(3 * time.Second),
		// Retry up to 5 times if database or Redis errors occur
		asynq.MaxRetry(5),
		// Set a 5-minute timeout window because inserting skeleton rows down to 8,800+ wards can take time
		asynq.Timeout(5 * time.Minute),
	}
	opts = append(defaults, opts...)

	// 3. Create the Asynq task with type TaskSeedElectionGroupStats and enqueue to Redis
	task := asynq.NewTask(TaskSeedElectionGroupStats, jsonPayload, opts...)

	// Enqueues the task with Redis using the provided options
	// The task will be available for processing after the delay specified in opts
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue seed task: %w", err)
	}

	slog.Info("enqueued seed election group stats task", "type", task.Type(), "queue", info.Queue, "election_group_id", payload.ElectionGroupID)
	return nil
}

// ProcessTaskSeedElectionGroupStats seeds zeroed geography stat rows for the
// given election group. Called by the asynq worker on behalf of the distributor.
// Runs in top-down order (States -> Senatorial Districts -> Federal Constituencies -> LGAs -> State Constituencies -> Wards).
// Polling units (~176k) are intentionally excluded here and seeded lazily on-demand.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskSeedElectionGroupStats(ctx context.Context, task *asynq.Task) error {
	var payload SeedElectionGroupStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal seed payload: %w", err)
	}

	egID := payload.ElectionGroupID
	slog.Info("seed election group stats (no-op: stats are computed dynamically from polling units)", "election_group_id", egID)
	return nil
}

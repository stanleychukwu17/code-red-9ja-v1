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
func (distributor *RedisTaskDistributor) DistributeTaskSeedElectionGroupStats(ctx context.Context, payload *SeedElectionGroupStatsPayload, opts ...asynq.Option) error {
	// 1. Serialize the payload (election_group_id) to JSON for Redis storage
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal seed payload: %w", err)
	}

	// 2. Build a unique task key so we don't accidentally run multiple seed jobs for the same election group concurrently
	uniqueKey := fmt.Sprintf("election_group:seed_stats:%d", payload.ElectionGroupID)

	// 3. Configure task options:
	defaults := []asynq.Option{
		// Delay execution by 5 seconds so any child elections for this group can finish inserting first
		asynq.ProcessIn(5 * time.Second),
		// Prevent scheduling another seed job for this same group within 10 minutes
		asynq.Unique(10 * time.Minute),
		// Retry up to 5 times if database or Redis errors occur
		asynq.MaxRetry(5),
		// Set a 5-minute timeout window because inserting skeleton rows down to 8,800+ wards can take time
		asynq.Timeout(5 * time.Minute),
		// Dedup identifier tied to this election group ID
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)

	// 4. Create the Asynq task with type TaskSeedElectionGroupStats and enqueue to Redis
	task := asynq.NewTask(TaskSeedElectionGroupStats, jsonPayload, opts...)

	// Enqueues the task with Redis using the provided options
	// The task will be available for processing after the delay specified in opts
	// This is the actual operation that puts the job onto the Redis queue
	info, err := distributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil && err != asynq.ErrTaskIDConflict {
		return fmt.Errorf("failed to enqueue seed task: %w", err)
	}

	// 5. If another worker or request already enqueued this task, ignore the conflict safely (idempotent)
	if err == asynq.ErrTaskIDConflict {
		slog.Debug("seed election group stats task already queued, skipping duplicate", "election_group_id", payload.ElectionGroupID)
		return nil
	}

	slog.Info("enqueued seed election group stats task", "type", task.Type(), "queue", info.Queue, "election_group_id", payload.ElectionGroupID)
	return nil
}

// ProcessTaskSeedElectionGroupStats seeds zeroed geography stat rows for the
// given election group. Called by the asynq worker on behalf of the distributor.
// Runs in top-down order (States -> Senatorial Districts -> Federal Constituencies -> LGAs -> State Constituencies -> Wards).
// Polling units (~176k) are intentionally excluded here and seeded lazily on-demand.
func (processor *RedisTaskProcessor) ProcessTaskSeedElectionGroupStats(ctx context.Context, task *asynq.Task) error {
	// 1. Unmarshal payload from Redis to retrieve the target election group ID
	var payload SeedElectionGroupStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal seed payload: %w", err)
	}

	egID := payload.ElectionGroupID
	slog.Info("seeding election group stats", "election_group_id", egID)

	// 2. Define the geographic hierarchy steps to initialize with zeroed rows:
	// Each step executes an idempotent SQL query (`ON CONFLICT DO NOTHING`)
	// inserting only the regions in-scope for this election group and copying static count baselines.
	steps := []struct {
		name string
		fn   func() error
	}{
		// Step A: Seed States (up to 37 states: 36 states + FCT)
		{"states", func() error { return processor.q.SeedElectionGroupStateStats(ctx, egID) }},

		// Step B: Seed Senatorial Districts (up to 109 districts across Nigeria)
		{"senatorial_districts", func() error { return processor.q.SeedElectionGroupSenatorialDistrictStats(ctx, egID) }},

		// Step C: Seed Federal Constituencies (up to 360 House of Reps seats)
		{"federal_constituencies", func() error { return processor.q.SeedElectionGroupFederalConstituencyStats(ctx, egID) }},

		// Step D: Seed Local Government Areas (up to 774 LGAs)
		{"lgas", func() error { return processor.q.SeedElectionGroupLGAStats(ctx, egID) }},

		// Step E: Seed State Constituencies (up to 993 State House of Assembly seats)
		{"state_constituencies", func() error { return processor.q.SeedElectionGroupStateConstituencyStats(ctx, egID) }},

		// Step F: Seed Electoral Wards (up to ~8,809 wards / registration areas)
		{"wards", func() error { return processor.q.SeedElectionGroupWardStats(ctx, egID) }},
	}

	// 3. Sequentially run each seed query and log progress; bail early if any query fails
	for _, step := range steps {
		if err := step.fn(); err != nil {
			slog.Error("failed to seed election group stats", "step", step.name, "election_group_id", egID, "error", err)
			return fmt.Errorf("seed %s failed: %w", step.name, err)
		}
		slog.Info("seeded election group stats step", "step", step.name, "election_group_id", egID)
	}

	// 4. Seeding successfully completed
	slog.Info("completed seeding election group stats", "election_group_id", egID)
	return nil
}

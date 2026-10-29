package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
)

// Task name constants for the cascading stats refresh chain.
const (
	TaskRefreshWardStats               = "stats:refresh_ward"
	TaskRefreshLGAStats                = "stats:refresh_lga"
	TaskRefreshStateStats              = "stats:refresh_state"
	TaskRefreshGlobalStats             = "stats:refresh_global"
)

// ─── Payload types ────────────────────────────────────────────────────────────

type RefreshWardStatsPayload struct {
	ElectionGroupID int32 `json:"election_group_id"`
	WardID          int32 `json:"ward_id"`
	// Carry LGA/State IDs forward so we can enqueue the next level without an extra DB round-trip.
	LGAID   int32 `json:"lga_id"`
	StateID int16 `json:"state_id"`
}

type RefreshLGAStatsPayload struct {
	ElectionGroupID int32 `json:"election_group_id"`
	LGAID           int32 `json:"lga_id"`
	StateID         int16 `json:"state_id"`
}

type RefreshStateStatsPayload struct {
	ElectionGroupID int32 `json:"election_group_id"`
	StateID         int16 `json:"state_id"`
}

type RefreshGlobalStatsPayload struct {
	ElectionGroupID int32 `json:"election_group_id"`
}

// ─── Distributors ─────────────────────────────────────────────────────────────

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRefreshWardStats(ctx context.Context, payload *RefreshWardStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal ward stats payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("stats_ward:%d:%d", payload.ElectionGroupID, payload.WardID)
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),
		asynq.Unique(2 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRefreshWardStats, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("ward stats refresh already queued", "election_group_id", payload.ElectionGroupID, "ward_id", payload.WardID)
			return nil
		}
		return fmt.Errorf("failed to enqueue ward stats task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRefreshLGAStats(ctx context.Context, payload *RefreshLGAStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal lga stats payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("stats_lga:%d:%d", payload.ElectionGroupID, payload.LGAID)
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),
		asynq.Unique(2 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRefreshLGAStats, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("lga stats refresh already queued", "election_group_id", payload.ElectionGroupID, "lga_id", payload.LGAID)
			return nil
		}
		return fmt.Errorf("failed to enqueue lga stats task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRefreshStateStats(ctx context.Context, payload *RefreshStateStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal state stats payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("stats_state:%d:%d", payload.ElectionGroupID, payload.StateID)
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),
		asynq.Unique(2 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRefreshStateStats, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("state stats refresh already queued", "election_group_id", payload.ElectionGroupID, "state_id", payload.StateID)
			return nil
		}
		return fmt.Errorf("failed to enqueue state stats task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRefreshGlobalStats(ctx context.Context, payload *RefreshGlobalStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal global stats payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("stats_global:%d", payload.ElectionGroupID)
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),
		asynq.Unique(2 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRefreshGlobalStats, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("global stats refresh already queued", "election_group_id", payload.ElectionGroupID)
			return nil
		}
		return fmt.Errorf("failed to enqueue global stats task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

// ─── Processors ───────────────────────────────────────────────────────────────

// ProcessTaskRefreshWardStats is a no-op; Ward stats are aggregated dynamically from polling units.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRefreshWardStats(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRefreshLGAStats is a no-op; LGA stats are aggregated dynamically from polling units.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRefreshLGAStats(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRefreshStateStats is a no-op; State stats are aggregated dynamically from polling units.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRefreshStateStats(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRefreshGlobalStats aggregates States→ElectionGroup. Terminal node in the cascade.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRefreshGlobalStats(ctx context.Context, task *asynq.Task) error {
	return nil
}

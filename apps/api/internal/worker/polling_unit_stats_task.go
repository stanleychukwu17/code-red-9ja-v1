package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/db/queries"

	"github.com/hibiken/asynq"
)

const TaskRefreshPollingUnitStats = "polling_unit:refresh_stats"

type RefreshPollingUnitStatsPayload struct {
	Params queries.RefreshSingleElectionGroupPollingUnitStatsParams `json:"params"`
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRefreshPollingUnitStats(ctx context.Context, payload *RefreshPollingUnitStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	uniqueKey := fmt.Sprintf("polling_unit_stats:%d:%d", payload.Params.ElectionGroupID, payload.Params.PollingUnitID)

	defaults := []asynq.Option{
		asynq.ProcessIn(1 * time.Minute),
		asynq.Unique(1 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(30 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskRefreshPollingUnitStats, jsonPayload, opts...)

	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("polling unit stats refresh task already queued, skipping duplicate",
				"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID)
			return nil
		}
		return fmt.Errorf("failed to enqueue polling unit stats task: %w", err)
	}

	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue, "max_retry", info.MaxRetry)
	return nil
}

func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRefreshPollingUnitStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshPollingUnitStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	slog.Info("refreshing polling unit stats",
		"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID)

	if err := redisTaskProcessor.queries.RefreshSingleElectionGroupPollingUnitStats(ctx, payload.Params); err != nil {
		slog.Error("failed to refresh polling unit stats",
			"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID, "error", err)
		return fmt.Errorf("failed to refresh polling unit stats: %w", err)
	}

	return nil
}

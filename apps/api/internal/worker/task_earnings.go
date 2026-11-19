package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"

	earningsservice "free9ja/api/internal/service/earnings"
)

// Task name constants
const (
	TaskCalculateAgentEarnings = "agent_earnings:calculate"
)

// EarningsService defines the interface needed by the worker to recalculate and credit agent earnings.
type EarningsService interface {
	ProcessTaskEarnings(ctx context.Context, params earningsservice.ProcessTaskEarningsParams) (int64, error)
}

// CalculateAgentEarningsPayload contains the parameters to calculate and credit task milestone earnings.
type CalculateAgentEarningsPayload struct {
	AssignmentID    int64  `json:"assignment_id"`
	TaskType        string `json:"task_type"`
	CustomNarration string `json:"custom_narration,omitempty"`
}

// DistributeTaskCalculateAgentEarnings enqueues a background job to recalculate and credit agent milestone earnings.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskCalculateAgentEarnings(
	ctx context.Context,
	payload *CalculateAgentEarningsPayload,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal calculate agent earnings payload: %w", err)
	}

	defaults := []asynq.Option{
		asynq.MaxRetry(5),
		asynq.Timeout(60 * time.Second),
		asynq.Queue("default"),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskCalculateAgentEarnings, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue calculate agent earnings task: %w", err)
	}

	slog.Info("enqueued calculate agent earnings task", "type", task.Type(), "queue", info.Queue, "assignment_id", payload.AssignmentID, "task_type", payload.TaskType)
	return nil
}

// ProcessTaskCalculateAgentEarnings processes the background task to recalculate earnings and credit the agent's wallet.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskCalculateAgentEarnings(ctx context.Context, task *asynq.Task) error {
	var payload CalculateAgentEarningsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal calculate agent earnings payload: %w", err)
	}

	if redisTaskProcessor.earningsService == nil {
		return fmt.Errorf("earnings service is not configured in task processor")
	}

	credited, err := redisTaskProcessor.earningsService.ProcessTaskEarnings(ctx, earningsservice.ProcessTaskEarningsParams{
		AssignmentID:    payload.AssignmentID,
		TaskType:        payload.TaskType,
		CustomNarration: payload.CustomNarration,
	})
	if err != nil {
		slog.Error("failed to calculate agent earnings", "assignment_id", payload.AssignmentID, "task_type", payload.TaskType, "error", err)
		return fmt.Errorf("failed to calculate agent earnings: %w", err)
	}

	slog.Info("successfully calculated and credited agent earnings", "assignment_id", payload.AssignmentID, "task_type", payload.TaskType, "credited_kobo", credited)
	return nil
}

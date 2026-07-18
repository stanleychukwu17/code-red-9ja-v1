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

const TaskAggregateLiveVotes = "live_votes:aggregate"

type AggregateLiveVotesPayload struct {
	Params queries.RefreshPollingUnitLiveResultsParams `json:"params"`
}

func (distributor *RedisTaskDistributor) DistributeTaskAggregateLiveVotes(ctx context.Context, payload *AggregateLiveVotesPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	uniqueKey := fmt.Sprintf("live_votes:%d:%d", payload.Params.ElectionID, payload.Params.PollingUnitID)

	defaults := []asynq.Option{
		asynq.ProcessIn(30 * time.Second),
		asynq.Unique(30 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(15 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskAggregateLiveVotes, jsonPayload, opts...)

	info, err := distributor.client.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("live vote aggregation task already queued, skipping duplicate",
				"election_id", payload.Params.ElectionID, "polling_unit_id", payload.Params.PollingUnitID)
			return nil
		}
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue, "max_retry", info.MaxRetry)
	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskAggregateLiveVotes(ctx context.Context, task *asynq.Task) error {
	var payload AggregateLiveVotesPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	slog.Debug("processing live vote aggregation task", "election_id", payload.Params.ElectionID, "polling_unit_id", payload.Params.PollingUnitID)

	err := processor.q.RefreshPollingUnitLiveResults(ctx, payload.Params)
	if err != nil {
		return fmt.Errorf("failed to upsert live vote aggregation: %w", err)
	}

	slog.Info("aggregated live votes for PU",
		"election_id", payload.Params.ElectionID,
		"polling_unit_id", payload.Params.PollingUnitID)

	return nil
}

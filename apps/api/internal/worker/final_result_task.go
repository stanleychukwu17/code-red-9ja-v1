package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/hibiken/asynq"
)

type CalculateFinalResultPayload struct {
	ElectionID    int64 `json:"election_id"`
	PollingUnitID int32 `json:"polling_unit_id"`
}

// CandidateResult represents a simplified view of the vote counts
type CandidateResult struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
}

// hashCandidateResults normalizes candidate results array so we can group them exactly
func hashCandidateResults(rawJSON []byte) string {
	var candidates []CandidateResult
	if err := json.Unmarshal(rawJSON, &candidates); err != nil {
		return ""
	}
	// Sort by party name
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].PartyShortName < candidates[j].PartyShortName
	})

	var builder strings.Builder
	for _, c := range candidates {
		builder.WriteString(fmt.Sprintf("%s:%d;", c.PartyShortName, c.VoteCount))
	}
	return builder.String()
}

func (processor *RedisTaskProcessor) ProcessTaskCalculateFinalResult(ctx context.Context, task *asynq.Task) error {
	// TODO: Re-implement final result calculation based on the new election_results schema
	slog.Info("ProcessTaskCalculateFinalResult is temporarily disabled due to schema migration")
	return nil
}

// TaskDistributor defines the interface for enqueueing tasks
type TaskDistributor interface {
	DistributeTaskCalculateFinalResult(ctx context.Context, payload *CalculateFinalResultPayload, opts ...asynq.Option) error
}

type RedisTaskDistributor struct {
	client *asynq.Client
}

func NewRedisTaskDistributor(redisOpt asynq.RedisClientOpt) TaskDistributor {
	client := asynq.NewClient(redisOpt)
	return &RedisTaskDistributor{
		client: client,
	}
}

func (distributor *RedisTaskDistributor) DistributeTaskCalculateFinalResult(ctx context.Context, payload *CalculateFinalResultPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	// Build a unique key per (election, polling_unit) pair so duplicate uploads
	// within the debounce window are collapsed into a single task.
	uniqueKey := fmt.Sprintf("final_result:%d:%d", payload.ElectionID, payload.PollingUnitID)

	// Prepend our standard options so callers can still append their own overrides.
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),    // debounce: wait 2 min before executing
		asynq.Unique(2 * time.Minute),       // deduplicate within the debounce window
		asynq.MaxRetry(3),                    // retry up to 3 times on failure
		asynq.Timeout(30 * time.Second),      // fail fast if the worker stalls
		asynq.TaskID(uniqueKey),              // deterministic ID aids deduplication
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskCalculateFinalResult, jsonPayload, opts...)

	info, err := distributor.client.EnqueueContext(ctx, task)
	if err != nil && err != asynq.ErrTaskIDConflict {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}
	if err == asynq.ErrTaskIDConflict {
		// A task for this PU is already queued — debounce is working as expected.
		slog.Debug("final result task already queued, skipping duplicate",
			"election_id", payload.ElectionID, "polling_unit_id", payload.PollingUnitID)
		return nil
	}

	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue, "max_retry", info.MaxRetry)
	return nil
}

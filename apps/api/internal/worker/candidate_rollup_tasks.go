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

// Task name constants for single-entity real-time candidate rollup cascades.
const (
	TaskRollupSingleWard                = "rollup:single_ward"
	TaskRollupSingleStateConstituency   = "rollup:single_state_constituency"
	TaskRollupSingleLGA                 = "rollup:single_lga"
	TaskRollupSingleFederalConstituency = "rollup:single_federal_constituency"
	TaskRollupSingleSenatorialDistrict  = "rollup:single_senatorial_district"
	TaskRollupSingleState               = "rollup:single_state"
	TaskRollupSingleElection            = "rollup:single_election"
)

// ─── Payload types ────────────────────────────────────────────────────────────

type RollupSingleWardPayload struct {
	ElectionID            int32 `json:"election_id"`
	WardID                int32 `json:"ward_id"`
	LGAID                 int32 `json:"lga_id"`
	StateID               int16 `json:"state_id"`
	StateConstituencyID   int32 `json:"state_constituency_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
	SenatorialDistrictID  int32 `json:"senatorial_district_id"`
}

type RollupSingleStateConstituencyPayload struct {
	ElectionID          int32 `json:"election_id"`
	StateConstituencyID int32 `json:"state_constituency_id"`
}

type RollupSingleLGAPayload struct {
	ElectionID            int32 `json:"election_id"`
	LGAID                 int32 `json:"lga_id"`
	StateID               int16 `json:"state_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
	SenatorialDistrictID  int32 `json:"senatorial_district_id"`
}

type RollupSingleFederalConstituencyPayload struct {
	ElectionID            int32 `json:"election_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
}

type RollupSingleSenatorialDistrictPayload struct {
	ElectionID           int32 `json:"election_id"`
	SenatorialDistrictID int32 `json:"senatorial_district_id"`
	StateID              int16 `json:"state_id,omitempty"`
}

type RollupSingleStatePayload struct {
	ElectionID int32 `json:"election_id"`
	StateID    int16 `json:"state_id"`
}

type RollupSingleElectionPayload struct {
	ElectionID int32 `json:"election_id"`
}

// ─── Distributors ─────────────────────────────────────────────────────────────

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleWard(ctx context.Context, payload *RollupSingleWardPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single ward payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_ward:%d:%d", payload.ElectionID, payload.WardID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleWard, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single ward rollup already queued", "election_id", payload.ElectionID, "ward_id", payload.WardID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single ward rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleStateConstituency(ctx context.Context, payload *RollupSingleStateConstituencyPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single state constituency payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_sc:%d:%d", payload.ElectionID, payload.StateConstituencyID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleStateConstituency, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single state constituency rollup already queued", "election_id", payload.ElectionID, "state_constituency_id", payload.StateConstituencyID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single state constituency rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleLGA(ctx context.Context, payload *RollupSingleLGAPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single lga payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_lga:%d:%d", payload.ElectionID, payload.LGAID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleLGA, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single lga rollup already queued", "election_id", payload.ElectionID, "lga_id", payload.LGAID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single lga rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleFederalConstituency(ctx context.Context, payload *RollupSingleFederalConstituencyPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single federal constituency payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_fc:%d:%d", payload.ElectionID, payload.FederalConstituencyID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleFederalConstituency, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single federal constituency rollup already queued", "election_id", payload.ElectionID, "federal_constituency_id", payload.FederalConstituencyID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single federal constituency rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleSenatorialDistrict(ctx context.Context, payload *RollupSingleSenatorialDistrictPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single senatorial district payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_sd:%d:%d", payload.ElectionID, payload.SenatorialDistrictID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleSenatorialDistrict, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single senatorial district rollup already queued", "election_id", payload.ElectionID, "senatorial_district_id", payload.SenatorialDistrictID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single senatorial district rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleState(ctx context.Context, payload *RollupSingleStatePayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single state payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_state:%d:%d", payload.ElectionID, payload.StateID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleState, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single state rollup already queued", "election_id", payload.ElectionID, "state_id", payload.StateID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single state rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskRollupSingleElection(ctx context.Context, payload *RollupSingleElectionPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal rollup single election payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("rollup_election:%d", payload.ElectionID)
	defaults := []asynq.Option{
		asynq.ProcessIn(15 * time.Second),
		asynq.Unique(15 * time.Second),
		asynq.MaxRetry(3),
		asynq.Timeout(45 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRollupSingleElection, jsonPayload, opts...)
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("single election rollup already queued", "election_id", payload.ElectionID)
			return nil
		}
		return fmt.Errorf("failed to enqueue single election rollup task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

// ─── Processors ───────────────────────────────────────────────────────────────

// ProcessTaskRollupSingleWard is a no-op: final results are aggregated dynamically from election_polling_unit_final_results.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleWard(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleStateConstituency is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleStateConstituency(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleLGA is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleLGA(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleFederalConstituency is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleFederalConstituency(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleSenatorialDistrict is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleSenatorialDistrict(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleState is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleState(ctx context.Context, task *asynq.Task) error {
	return nil
}

// ProcessTaskRollupSingleElection is a no-op.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskRollupSingleElection(ctx context.Context, task *asynq.Task) error {
	return nil
}

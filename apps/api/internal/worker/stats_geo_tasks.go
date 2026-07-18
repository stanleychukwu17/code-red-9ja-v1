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

// Task name constants for the cascading stats refresh chain.
const (
	TaskRefreshWardStats               = "stats:refresh_ward"
	TaskRefreshLGAStats                = "stats:refresh_lga"
	TaskRefreshStateConstituencyStats  = "stats:refresh_state_constituency"
	TaskRefreshStateStats              = "stats:refresh_state"
	TaskRefreshGlobalStats             = "stats:refresh_global"
)

// ─── Payload types ────────────────────────────────────────────────────────────

type RefreshWardStatsPayload struct {
	ElectionGroupID int64 `json:"election_group_id"`
	WardID          int32 `json:"ward_id"`
	// Carry LGA/State IDs forward so we can enqueue the next level without an extra DB round-trip.
	LGAID   int32 `json:"lga_id"`
	StateID int16 `json:"state_id"`
}

type RefreshLGAStatsPayload struct {
	ElectionGroupID int64 `json:"election_group_id"`
	LGAID           int32 `json:"lga_id"`
	StateID         int16 `json:"state_id"`
}

type RefreshStateConstituencyStatsPayload struct {
	ElectionGroupID     int64 `json:"election_group_id"`
	StateConstituencyID int32 `json:"state_constituency_id"`
}

type RefreshStateStatsPayload struct {
	ElectionGroupID int64 `json:"election_group_id"`
	StateID         int16 `json:"state_id"`
}

type RefreshGlobalStatsPayload struct {
	ElectionGroupID int64 `json:"election_group_id"`
}

// ─── Distributors ─────────────────────────────────────────────────────────────

func (d *RedisTaskDistributor) DistributeTaskRefreshWardStats(ctx context.Context, payload *RefreshWardStatsPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRefreshLGAStats(ctx context.Context, payload *RefreshLGAStatsPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRefreshStateConstituencyStats(ctx context.Context, payload *RefreshStateConstituencyStatsPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal state constituency stats payload: %w", err)
	}
	uniqueKey := fmt.Sprintf("stats_sc:%d:%d", payload.ElectionGroupID, payload.StateConstituencyID)
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute),
		asynq.Unique(2 * time.Minute),
		asynq.MaxRetry(3),
		asynq.Timeout(60 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)
	task := asynq.NewTask(TaskRefreshStateConstituencyStats, jsonPayload, opts...)
	info, err := d.client.EnqueueContext(ctx, task)
	if err != nil {
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("state constituency stats refresh already queued", "election_group_id", payload.ElectionGroupID, "state_constituency_id", payload.StateConstituencyID)
			return nil
		}
		return fmt.Errorf("failed to enqueue state constituency stats task: %w", err)
	}
	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue)
	return nil
}

func (d *RedisTaskDistributor) DistributeTaskRefreshStateStats(ctx context.Context, payload *RefreshStateStatsPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRefreshGlobalStats(ctx context.Context, payload *RefreshGlobalStatsPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

// ProcessTaskRefreshWardStats aggregates PU→Ward and then enqueues the LGA task.
func (processor *RedisTaskProcessor) ProcessTaskRefreshWardStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshWardStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal ward stats payload: %w", err)
	}
	slog.Info("refreshing ward stats", "election_group_id", payload.ElectionGroupID, "ward_id", payload.WardID)

	if err := processor.q.RefreshSingleElectionGroupWardStats(ctx, queries.RefreshSingleElectionGroupWardStatsParams{
		ElectionGroupID: payload.ElectionGroupID,
		WardID:          payload.WardID,
	}); err != nil {
		return fmt.Errorf("failed to refresh ward stats: %w", err)
	}

	// Cascade → LGA (carry state_id from payload)
	if payload.LGAID > 0 {
		_ = processor.taskDistributor.DistributeTaskRefreshLGAStats(ctx, &RefreshLGAStatsPayload{
			ElectionGroupID: payload.ElectionGroupID,
			LGAID:           payload.LGAID,
			StateID:         payload.StateID,
		})
	}

	slog.Info("ward stats refreshed", "election_group_id", payload.ElectionGroupID, "ward_id", payload.WardID)
	return nil
}

// ProcessTaskRefreshLGAStats aggregates Wards→LGA and then enqueues the State task.
func (processor *RedisTaskProcessor) ProcessTaskRefreshLGAStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshLGAStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal lga stats payload: %w", err)
	}
	slog.Info("refreshing lga stats", "election_group_id", payload.ElectionGroupID, "lga_id", payload.LGAID)

	if err := processor.q.RefreshSingleElectionGroupLGAStats(ctx, queries.RefreshSingleElectionGroupLGAStatsParams{
		ElectionGroupID: payload.ElectionGroupID,
		LgaID:           payload.LGAID,
	}); err != nil {
		return fmt.Errorf("failed to refresh lga stats: %w", err)
	}

	// Cascade → State
	if payload.StateID > 0 {
		_ = processor.taskDistributor.DistributeTaskRefreshStateStats(ctx, &RefreshStateStatsPayload{
			ElectionGroupID: payload.ElectionGroupID,
			StateID:         payload.StateID,
		})
	}

	slog.Info("lga stats refreshed", "election_group_id", payload.ElectionGroupID, "lga_id", payload.LGAID)
	return nil
}

// ProcessTaskRefreshStateConstituencyStats aggregates PU→StateConstituency (independent branch, no further cascade needed in stats chain).
func (processor *RedisTaskProcessor) ProcessTaskRefreshStateConstituencyStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshStateConstituencyStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal state constituency stats payload: %w", err)
	}
	slog.Info("refreshing state constituency stats", "election_group_id", payload.ElectionGroupID, "state_constituency_id", payload.StateConstituencyID)

	if err := processor.q.RefreshSingleElectionGroupStateConstituencyStats(ctx, queries.RefreshSingleElectionGroupStateConstituencyStatsParams{
		ElectionGroupID:     payload.ElectionGroupID,
		StateConstituencyID: payload.StateConstituencyID,
	}); err != nil {
		return fmt.Errorf("failed to refresh state constituency stats: %w", err)
	}

	slog.Info("state constituency stats refreshed", "election_group_id", payload.ElectionGroupID, "state_constituency_id", payload.StateConstituencyID)
	return nil
}

// ProcessTaskRefreshStateStats aggregates LGAs→State and then enqueues the Global task.
func (processor *RedisTaskProcessor) ProcessTaskRefreshStateStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshStateStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal state stats payload: %w", err)
	}
	slog.Info("refreshing state stats", "election_group_id", payload.ElectionGroupID, "state_id", payload.StateID)

	if err := processor.q.RefreshSingleElectionGroupStateStats(ctx, queries.RefreshSingleElectionGroupStateStatsParams{
		ElectionGroupID: payload.ElectionGroupID,
		StateID:         payload.StateID,
	}); err != nil {
		return fmt.Errorf("failed to refresh state stats: %w", err)
	}

	// Cascade → Global
	_ = processor.taskDistributor.DistributeTaskRefreshGlobalStats(ctx, &RefreshGlobalStatsPayload{
		ElectionGroupID: payload.ElectionGroupID,
	})

	slog.Info("state stats refreshed", "election_group_id", payload.ElectionGroupID, "state_id", payload.StateID)
	return nil
}

// ProcessTaskRefreshGlobalStats aggregates States→ElectionGroup. Terminal node in the cascade.
func (processor *RedisTaskProcessor) ProcessTaskRefreshGlobalStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshGlobalStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal global stats payload: %w", err)
	}
	slog.Info("refreshing global stats", "election_group_id", payload.ElectionGroupID)

	if err := processor.q.RefreshSingleElectionGroupGlobalStats(ctx, payload.ElectionGroupID); err != nil {
		return fmt.Errorf("failed to refresh global stats: %w", err)
	}

	slog.Info("global stats refreshed", "election_group_id", payload.ElectionGroupID)
	return nil
}

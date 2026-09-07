package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/realtime"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
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
	ElectionID            int64 `json:"election_id"`
	WardID                int32 `json:"ward_id"`
	LGAID                 int32 `json:"lga_id"`
	StateID               int16 `json:"state_id"`
	StateConstituencyID   int32 `json:"state_constituency_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
	SenatorialDistrictID  int32 `json:"senatorial_district_id"`
}

type RollupSingleStateConstituencyPayload struct {
	ElectionID          int64 `json:"election_id"`
	StateConstituencyID int32 `json:"state_constituency_id"`
}

type RollupSingleLGAPayload struct {
	ElectionID            int64 `json:"election_id"`
	LGAID                 int32 `json:"lga_id"`
	StateID               int16 `json:"state_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
	SenatorialDistrictID  int32 `json:"senatorial_district_id"`
}

type RollupSingleFederalConstituencyPayload struct {
	ElectionID            int64 `json:"election_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
}

type RollupSingleSenatorialDistrictPayload struct {
	ElectionID           int64 `json:"election_id"`
	SenatorialDistrictID int32 `json:"senatorial_district_id"`
	StateID              int16 `json:"state_id,omitempty"`
}

type RollupSingleStatePayload struct {
	ElectionID int64 `json:"election_id"`
	StateID    int16 `json:"state_id"`
}

type RollupSingleElectionPayload struct {
	ElectionID int64 `json:"election_id"`
}

// ─── Distributors ─────────────────────────────────────────────────────────────

func (d *RedisTaskDistributor) DistributeTaskRollupSingleWard(ctx context.Context, payload *RollupSingleWardPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleStateConstituency(ctx context.Context, payload *RollupSingleStateConstituencyPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleLGA(ctx context.Context, payload *RollupSingleLGAPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleFederalConstituency(ctx context.Context, payload *RollupSingleFederalConstituencyPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleSenatorialDistrict(ctx context.Context, payload *RollupSingleSenatorialDistrictPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleState(ctx context.Context, payload *RollupSingleStatePayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (d *RedisTaskDistributor) DistributeTaskRollupSingleElection(ctx context.Context, payload *RollupSingleElectionPayload, opts ...asynq.Option) error {
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
	info, err := d.client.EnqueueContext(ctx, task)
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

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleWard(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleWardPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single ward payload: %w", err)
	}

	err := processor.q.RollupSingleWardFinalResults(ctx, queries.RollupSingleWardFinalResultsParams{
		ElectionID: payload.ElectionID,
		WardID:     pgtype.Int4{Int32: payload.WardID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single ward results: %w", err)
	}

	slog.Info("rolled up single ward final result", "election_id", payload.ElectionID, "ward_id", payload.WardID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID:            payload.ElectionID,
			Scope:                 "ward",
			WardID:                &payload.WardID,
			LGAID:                 &payload.LGAID,
			StateID:               &payload.StateID,
			StateConstituencyID:   &payload.StateConstituencyID,
			FederalConstituencyID: &payload.FederalConstituencyID,
			SenatorialDistrictID:  &payload.SenatorialDistrictID,
			Timestamp:             time.Now().UTC(),
		})
	}

	// Cascade up to LGA
	if processor.taskDistributor != nil && payload.LGAID > 0 {
		_ = processor.taskDistributor.DistributeTaskRollupSingleLGA(ctx, &RollupSingleLGAPayload{
			ElectionID:            payload.ElectionID,
			LGAID:                 payload.LGAID,
			StateID:               payload.StateID,
			FederalConstituencyID: payload.FederalConstituencyID,
			SenatorialDistrictID:  payload.SenatorialDistrictID,
		})
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleStateConstituency(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleStateConstituencyPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single state constituency payload: %w", err)
	}

	err := processor.q.RollupSingleStateConstituencyFinalResults(ctx, queries.RollupSingleStateConstituencyFinalResultsParams{
		ElectionID: payload.ElectionID,
		ID:         payload.StateConstituencyID,
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single state constituency results: %w", err)
	}

	slog.Info("rolled up single state constituency final result", "election_id", payload.ElectionID, "state_constituency_id", payload.StateConstituencyID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID:          payload.ElectionID,
			Scope:               "state_constituency",
			StateConstituencyID: &payload.StateConstituencyID,
			Timestamp:           time.Now().UTC(),
		})
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleLGA(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleLGAPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single lga payload: %w", err)
	}

	err := processor.q.RollupSingleLGAFinalResults(ctx, queries.RollupSingleLGAFinalResultsParams{
		ElectionID: payload.ElectionID,
		LgaID:      pgtype.Int4{Int32: payload.LGAID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single lga results: %w", err)
	}

	slog.Info("rolled up single lga final result", "election_id", payload.ElectionID, "lga_id", payload.LGAID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID:            payload.ElectionID,
			Scope:                 "lga",
			LGAID:                 &payload.LGAID,
			StateID:               &payload.StateID,
			FederalConstituencyID: &payload.FederalConstituencyID,
			SenatorialDistrictID:  &payload.SenatorialDistrictID,
			Timestamp:             time.Now().UTC(),
		})
	}

	if processor.taskDistributor != nil {
		// Cascade to Federal Constituency if LGA belongs to one
		if payload.FederalConstituencyID > 0 {
			_ = processor.taskDistributor.DistributeTaskRollupSingleFederalConstituency(ctx, &RollupSingleFederalConstituencyPayload{
				ElectionID:            payload.ElectionID,
				FederalConstituencyID: payload.FederalConstituencyID,
			})
		}

		// Cascade to Senatorial District if LGA belongs to one (which will then cascade to State)
		if payload.SenatorialDistrictID > 0 {
			_ = processor.taskDistributor.DistributeTaskRollupSingleSenatorialDistrict(ctx, &RollupSingleSenatorialDistrictPayload{
				ElectionID:           payload.ElectionID,
				SenatorialDistrictID: payload.SenatorialDistrictID,
				StateID:              payload.StateID,
			})
		} else if payload.StateID > 0 {
			// Fallback cascade directly to State if LGA does not belong to a senatorial district
			_ = processor.taskDistributor.DistributeTaskRollupSingleState(ctx, &RollupSingleStatePayload{
				ElectionID: payload.ElectionID,
				StateID:    payload.StateID,
			})
		}
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleFederalConstituency(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleFederalConstituencyPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single federal constituency payload: %w", err)
	}

	err := processor.q.RollupSingleFederalConstituencyFinalResults(ctx, queries.RollupSingleFederalConstituencyFinalResultsParams{
		ElectionID:            payload.ElectionID,
		FederalConstituencyID: pgtype.Int4{Int32: payload.FederalConstituencyID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single federal constituency results: %w", err)
	}

	slog.Info("rolled up single federal constituency final result", "election_id", payload.ElectionID, "federal_constituency_id", payload.FederalConstituencyID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID:            payload.ElectionID,
			Scope:                 "federal_constituency",
			FederalConstituencyID: &payload.FederalConstituencyID,
			Timestamp:             time.Now().UTC(),
		})
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleSenatorialDistrict(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleSenatorialDistrictPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single senatorial district payload: %w", err)
	}

	err := processor.q.RollupSingleSenatorialDistrictFinalResults(ctx, queries.RollupSingleSenatorialDistrictFinalResultsParams{
		ElectionID:           payload.ElectionID,
		SenatorialDistrictID: pgtype.Int4{Int32: payload.SenatorialDistrictID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single senatorial district results: %w", err)
	}

	slog.Info("rolled up single senatorial district final result", "election_id", payload.ElectionID, "senatorial_district_id", payload.SenatorialDistrictID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID:           payload.ElectionID,
			Scope:                "senatorial_district",
			SenatorialDistrictID: &payload.SenatorialDistrictID,
			Timestamp:            time.Now().UTC(),
		})
	}

	// Cascade up to State
	stateID := payload.StateID
	if stateID == 0 {
		sd, err := processor.q.GetSenatorialDistrictByID(ctx, payload.SenatorialDistrictID)
		if err == nil {
			stateID = int16(sd.StateID)
		}
	}

	if processor.taskDistributor != nil && stateID > 0 {
		_ = processor.taskDistributor.DistributeTaskRollupSingleState(ctx, &RollupSingleStatePayload{
			ElectionID: payload.ElectionID,
			StateID:    stateID,
		})
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleState(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleStatePayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single state payload: %w", err)
	}

	err := processor.q.RollupSingleStateFinalResults(ctx, queries.RollupSingleStateFinalResultsParams{
		ElectionID: payload.ElectionID,
		StateID:    pgtype.Int2{Int16: payload.StateID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to rollup single state results: %w", err)
	}

	slog.Info("rolled up single state final result", "election_id", payload.ElectionID, "state_id", payload.StateID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID: payload.ElectionID,
			Scope:      "state",
			StateID:    &payload.StateID,
			Timestamp:  time.Now().UTC(),
		})
	}

	// Cascade up to Nationwide Election
	if processor.taskDistributor != nil {
		_ = processor.taskDistributor.DistributeTaskRollupSingleElection(ctx, &RollupSingleElectionPayload{
			ElectionID: payload.ElectionID,
		})
	}

	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRollupSingleElection(ctx context.Context, task *asynq.Task) error {
	var payload RollupSingleElectionPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal single election payload: %w", err)
	}

	err := processor.q.RollupSingleElectionFinalResults(ctx, payload.ElectionID)
	if err != nil {
		return fmt.Errorf("failed to rollup single election results: %w", err)
	}

	slog.Info("rolled up single nationwide election final result", "election_id", payload.ElectionID)

	// Broadcast real-time results-updated event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastResultsUpdated(ctx, realtime.ResultsUpdatedEvent{
			ElectionID: payload.ElectionID,
			Scope:      "nationwide",
			Timestamp:  time.Now().UTC(),
		})
	}

	return nil
}

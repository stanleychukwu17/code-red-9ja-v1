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

func (distributor *RedisTaskDistributor) DistributeTaskRefreshPollingUnitStats(ctx context.Context, payload *RefreshPollingUnitStatsPayload, opts ...asynq.Option) error {
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

	info, err := distributor.client.EnqueueContext(ctx, task)
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

func (processor *RedisTaskProcessor) ProcessTaskRefreshPollingUnitStats(ctx context.Context, task *asynq.Task) error {
	var payload RefreshPollingUnitStatsPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	slog.Info("refreshing polling unit stats",
		"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID)

	if err := processor.q.RefreshSingleElectionGroupPollingUnitStats(ctx, payload.Params); err != nil {
		slog.Error("failed to refresh polling unit stats",
			"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID, "error", err)
		return fmt.Errorf("failed to refresh polling unit stats: %w", err)
	}

	// ── Cascade: enqueue Ward + StateConstituency refreshes ──────────────────
	// Query the geo IDs stored on the PU row so we know what to enqueue next.
	geoIDs, err := processor.q.GetElectionGroupPollingUnitGeoIDs(ctx, queries.GetElectionGroupPollingUnitGeoIDsParams{
		ElectionGroupID: payload.Params.ElectionGroupID,
		PollingUnitID:   payload.Params.PollingUnitID,
	})
	if err != nil {
		// Non-fatal: log and skip the cascade. The 30-min cron safety net will catch it.
		slog.Warn("could not fetch geo IDs for cascade enqueue; cascade skipped",
			"election_group_id", payload.Params.ElectionGroupID,
			"polling_unit_id", payload.Params.PollingUnitID,
			"error", err)
	} else {
		// Ward → LGA → State → Global chain
		if geoIDs.WardID.Valid {
			lgaID := int32(0)
			if geoIDs.LgaID.Valid {
				lgaID = geoIDs.LgaID.Int32
			}
			stateID := int16(0)
			if geoIDs.StateID.Valid {
				stateID = geoIDs.StateID.Int16
			}
			_ = processor.taskDistributor.DistributeTaskRefreshWardStats(ctx, &RefreshWardStatsPayload{
				ElectionGroupID: payload.Params.ElectionGroupID,
				WardID:          geoIDs.WardID.Int32,
				LGAID:           lgaID,
				StateID:         stateID,
			})
		}

		// StateConstituency branch (independent of the Ward→LGA→State chain)
		if geoIDs.StateConstituencyID.Valid {
			_ = processor.taskDistributor.DistributeTaskRefreshStateConstituencyStats(ctx, &RefreshStateConstituencyStatsPayload{
				ElectionGroupID:     payload.Params.ElectionGroupID,
				StateConstituencyID: geoIDs.StateConstituencyID.Int32,
			})
		}
	}

	slog.Info("successfully refreshed polling unit stats",
		"election_group_id", payload.Params.ElectionGroupID, "polling_unit_id", payload.Params.PollingUnitID)
	return nil
}


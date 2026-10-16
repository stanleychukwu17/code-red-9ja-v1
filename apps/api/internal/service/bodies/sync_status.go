package bodiesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"free9ja/api/internal/db"

	"github.com/redis/go-redis/v9"
)

// SyncStatusResponse represents the real-time lifecycle and progress of electoral units synchronization.
type SyncStatusResponse struct {
	IsRunning       bool        `json:"is_running"`
	CurrentStep     string      `json:"current_step"`
	FlowType        string      `json:"flow_type,omitempty"` // "presidential" or "state_flow"
	StartedAt       *time.Time  `json:"started_at,omitempty"`
	CompletedAt     *time.Time  `json:"completed_at,omitempty"`
	DurationSeconds float64     `json:"duration_seconds,omitempty"`
	Error           string      `json:"error,omitempty"`
	LastReport      *SyncReport `json:"last_report,omitempty"`
	RemainingLock   string      `json:"remaining_lock,omitempty"`
	CanRunAgainAt   *time.Time  `json:"can_run_again_at,omitempty"`
}

// GetSyncStatus retrieves the current or last known synchronization status from Redis.
func (s *BodiesService) GetSyncStatus(ctx context.Context) (*SyncStatusResponse, error) {
	val, err := s.rdb.Get(ctx, db.RedisElectoralUnitsSyncStatus).Result()
	if err == redis.Nil {
		return &SyncStatusResponse{
			IsRunning:   false,
			CurrentStep: "Idle",
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sync status from Redis: %w", err)
	}

	var status SyncStatusResponse
	if err := json.Unmarshal([]byte(val), &status); err != nil {
		return nil, fmt.Errorf("failed to parse sync status JSON: %w", err)
	}

	// Compute remaining lock TTL
	ttl, err := s.rdb.TTL(ctx, db.RedisLockElectoralUnitsSync).Result()
	if err == nil && ttl > 0 {
		status.RemainingLock = ttl.Round(time.Minute).String()
		canRun := time.Now().Add(ttl)
		status.CanRunAgainAt = &canRun
	}

	return &status, nil
}

// updateSyncStatus serializes and stores the synchronization status in Redis.
func (s *BodiesService) updateSyncStatus(ctx context.Context, status SyncStatusResponse) {
	data, err := json.Marshal(status)
	if err == nil {
		s.rdb.Set(ctx, db.RedisElectoralUnitsSyncStatus, data, 48*time.Hour)
	}
}

// acquireSyncLock checks and acquires the distributed lock (24h in production, 30m in dev).
func (s *BodiesService) acquireSyncLock(ctx context.Context) error {
	lockTTL := 30 * time.Minute
	if os.Getenv("ENV") == "production" {
		lockTTL = 24 * time.Hour
	}

	ok, err := s.rdb.SetNX(ctx, db.RedisLockElectoralUnitsSync, "locked", lockTTL).Result()
	if err != nil {
		return fmt.Errorf("failed to check sync lock: %w", err)
	}
	if !ok {
		ttl, _ := s.rdb.TTL(ctx, db.RedisLockElectoralUnitsSync).Result()
		remaining := ttl.Round(time.Minute).String()
		if ttl <= 0 {
			remaining = "a few moments"
		}
		return fmt.Errorf("electoral units synchronization is currently running or was recently completed; please wait %s before retrying", remaining)
	}
	return nil
}

// releaseSyncLock deletes the lock from Redis, called upon failure so retries are immediately permitted.
func (s *BodiesService) releaseSyncLock(ctx context.Context) {
	s.rdb.Del(ctx, db.RedisLockElectoralUnitsSync)
}

// StartSyncElectoralUnits starts the sync in a background goroutine and immediately returns initial status.
func (s *BodiesService) StartSyncElectoralUnits(ctx context.Context, stateFlow bool) (*SyncStatusResponse, error) {
	if err := s.acquireSyncLock(ctx); err != nil {
		return nil, err
	}

	flowName := "presidential"
	if stateFlow {
		flowName = "state_flow"
	}

	now := time.Now()
	status := SyncStatusResponse{
		IsRunning:   true,
		CurrentStep: "Initializing synchronization...",
		FlowType:    flowName,
		StartedAt:   &now,
	}
	s.updateSyncStatus(ctx, status)

	// Launch execution in the background with a detached context
	go func() {
		bgCtx := context.Background()
		var report *SyncReport
		var err error

		if stateFlow {
			report, err = s.runSyncElectoralUnitsStateFlow(bgCtx, &status)
		} else {
			report, err = s.runSyncElectoralUnits(bgCtx, &status)
		}

		completedAt := time.Now()
		status.IsRunning = false
		status.CompletedAt = &completedAt
		status.DurationSeconds = completedAt.Sub(now).Seconds()

		if err != nil {
			slog.Error("Electoral units synchronization failed", "error", err, "flow", flowName)
			status.Error = err.Error()
			status.CurrentStep = "Failed: " + err.Error()
			// Release the lock on failure so the admin can retry
			s.releaseSyncLock(bgCtx)
		} else {
			status.LastReport = report
			status.CurrentStep = "Completed"
		}

		s.updateSyncStatus(bgCtx, status)
	}()

	return &status, nil
}

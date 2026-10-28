package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
)

// TaskCheckOrphanFile identifies tasks for inspecting confirmed uploads and cleaning up unlinked/abandoned files.
const TaskCheckOrphanFile = "file:check_orphan"

// CheckOrphanFilePayload contains the file ID of the uploaded asset to verify.
type CheckOrphanFilePayload struct {
	FileID int64 `json:"file_id"`
}

// DistributeTaskCheckOrphanFile enqueues a delayed task into Redis to check if an uploaded file is in active use.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskCheckOrphanFile(
	ctx context.Context,
	payload *CheckOrphanFilePayload,
	opts ...asynq.Option,
) error {
	// 1. Guard check: avoid queuing if payload is missing or file ID is invalid
	if payload == nil || payload.FileID <= 0 {
		return nil
	}

	// 2. Serialize payload to JSON for Redis wire transmission
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal check orphan file payload: %w", err)
	}

	// 3. Configure default task options and merge with caller options (e.g. asynq.ProcessIn delay)
	defaultOpts := []asynq.Option{
		asynq.MaxRetry(3),
		asynq.Timeout(2 * time.Minute),
	}
	mergedOpts := append(defaultOpts, opts...)

	// 4. Create the new Asynq task with type and payload
	task := asynq.NewTask(TaskCheckOrphanFile, jsonPayload, mergedOpts...)

	// 5. Enqueue the task into Redis for future background processing
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue check orphan file task: %w", err)
	}

	// 6. Log successful task scheduling
	slog.Info("enqueued check orphan file task", "type", task.Type(), "file_id", payload.FileID, "queue", info.Queue)
	return nil
}

// ProcessTaskCheckOrphanFile executes the orphan verification after the grace period.
// If the file is still unreferenced (e.g., abandoned application/wizard), it deletes the file from R2 and DB.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskCheckOrphanFile(ctx context.Context, task *asynq.Task) error {
	var payload CheckOrphanFilePayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal check orphan file payload: %w", err)
	}

	if payload.FileID <= 0 {
		return nil
	}

	// 1. Fetch file record from DB
	file, err := redisTaskProcessor.queries.GetFileByID(ctx, payload.FileID)
	if err != nil {
		// If file is already deleted or not found, nothing to do
		slog.Debug("file already removed or not found for orphan check", "file_id", payload.FileID)
		return nil
	}

	// If the file is not in 'uploaded' status (e.g. deleted or failed), skip
	if file.Status != "uploaded" {
		return nil
	}

	// 2. Check if file is in active use across domain tables:
	// - users.avatar_file_id
	// - parties.logo_file_id
	// - parties.cover_image_file_id
	var inUse bool
	query := `
		SELECT EXISTS (
			SELECT 1 FROM users WHERE avatar_file_id = $1
			UNION ALL
			SELECT 1 FROM parties WHERE logo_file_id = $1
			UNION ALL
			SELECT 1 FROM parties WHERE cover_image_file_id = $1
		)
	`
	if err := redisTaskProcessor.pool.QueryRow(ctx, query, payload.FileID).Scan(&inUse); err != nil {
		return fmt.Errorf("failed to check if file %d is in use: %w", payload.FileID, err)
	}

	if inUse {
		slog.Info("file is in active use, retaining", "file_id", payload.FileID, "folder", file.Folder)
		return nil
	}

	// 3. File is confirmed orphaned/abandoned. Delete from Cloudflare R2 and purge CDN cache
	if redisTaskProcessor.r2Svc == nil {
		slog.Warn("r2Svc is nil on worker processor; skipping Cloudflare R2 deletion and DB record removal", "file_id", file.ID, "key", file.FileKey)
		return nil
	}

	slog.Info("cleaning up abandoned orphan file", "file_id", file.ID, "key", file.FileKey)
	if file.FileKey != "" {
		// Delete from Cloudflare R2
		if delErr := redisTaskProcessor.r2Svc.DeleteObject(ctx, file.FileKey); delErr != nil {
			slog.Error("failed to delete orphan object from R2", "key", file.FileKey, "err", delErr)
		} else {
			slog.Info("successfully deleted orphan object from Cloudflare R2", "key", file.FileKey)
		}

		// Remove from Cloudflare CDN Cache
		if purgeErr := redisTaskProcessor.r2Svc.PurgeCloudflareCache(ctx, file.FileKey); purgeErr != nil {
			slog.Warn("failed to purge cloudflare cache for orphan asset", "key", file.FileKey, "err", purgeErr)
		} else {
			slog.Info("successfully purged Cloudflare CDN cache for orphan asset", "key", file.FileKey)
		}
	}

	// 4. Hard-delete file record from PostgreSQL
	if err := redisTaskProcessor.queries.HardDeleteFile(ctx, file.ID); err != nil {
		return fmt.Errorf("failed to hard delete orphaned file record %d: %w", file.ID, err)
	}

	slog.Info("successfully removed abandoned orphan file", "file_id", file.ID, "key", file.FileKey)
	return nil
}

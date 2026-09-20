package worker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/hibiken/asynq"
)

// TaskDeleteAsset identifies tasks for asynchronously deleting assets from storage and database.
const TaskDeleteAsset = "asset:delete"

// DeleteAssetPayload contains the target raw URL and/or DB file ID of the asset to clean up.
type DeleteAssetPayload struct {
	RawURL string `json:"raw_url,omitempty"`
	FileID int64  `json:"file_id,omitempty"`
}

// extractR2KeyFromURL extracts the relative R2 bucket object key from a public or worker CDN URL.
// returns the raw url for the image so it can be deleted from cloudflare
func extractR2KeyFromURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// If already a relative storage key without scheme
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return strings.TrimPrefix(rawURL, "/")
	}

	// Parse full URL and strip host/scheme to get the clean relative path
	if u, err := url.Parse(rawURL); err == nil && u.Path != "" {
		return strings.TrimPrefix(u.Path, "/")
	}

	return ""
}

// DistributeTaskDeleteAsset enqueues an asset deletion task into Redis.
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskDeleteAsset(
	ctx context.Context,
	payload *DeleteAssetPayload,
	opts ...asynq.Option,
) error {
	// 1. Guard check: avoid queuing a no-op if there's no URL and no DB file ID
	if payload == nil || (payload.RawURL == "" && payload.FileID <= 0) {
		return nil
	}

	// 2. Serialize payload to JSON for Redis wire transmission
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal delete asset payload: %w", err)
	}

	// 3. Construct a deterministic task ID for deduplication:
	// - If FileID is present, lock against duplicate deletions of that DB record.
	// - If only RawURL is given, hash it to produce a compact, collision-resistant key.
	var uniqueKey string
	if payload.FileID > 0 {
		uniqueKey = fmt.Sprintf("asset:delete:file:%d", payload.FileID)
	} else {
		hash := sha256.Sum256([]byte(payload.RawURL))
		uniqueKey = fmt.Sprintf("asset:delete:url:%s", hex.EncodeToString(hash[:8]))
	}

	// 4. Configure task behavior:
	// - Unique: drop duplicate deletion requests within a 1-minute window
	// - MaxRetry: retry up to 5 times on network or DB transient hiccups
	// - Timeout: fail fast after 30 seconds if Cloudflare or DB stalls
	defaults := []asynq.Option{
		asynq.Unique(1 * time.Minute),
		asynq.MaxRetry(5),
		asynq.Timeout(30 * time.Second),
		asynq.TaskID(uniqueKey),
	}
	opts = append(defaults, opts...)

	// 5. Creates the task
	task := asynq.NewTask(TaskDeleteAsset, jsonPayload, opts...)

	// 6. Enqueue the task into Redis
	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		// If an identical task is already scheduled or in flight, safely skip without error
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("asset deletion task already queued, skipping duplicate",
				"file_id", payload.FileID, "raw_url", payload.RawURL)
			return nil
		}
		return fmt.Errorf("failed to enqueue asset deletion task: %w", err)
	}

	slog.Info("enqueued asset deletion task", "type", task.Type(), "queue", info.Queue, "file_id", payload.FileID)
	return nil
}

// ProcessTaskDeleteAsset processes an asset deletion task by removing the object from R2,
// purging the Cloudflare CDN cache, and hard-deleting the corresponding file record in the DB.
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskDeleteAsset(ctx context.Context, task *asynq.Task) error {
	// 1. Parse the incoming JSON task payload
	var payload DeleteAssetPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal delete asset payload: %w", err)
	}

	slog.Debug("processing asset deletion task", "file_id", payload.FileID, "raw_url", payload.RawURL)

	// 2. Extract the relative R2 storage key from the raw URL (strips scheme, host, and leading slash)
	key := extractR2KeyFromURL(payload.RawURL)

	// If key couldn't be parsed from rawURL but FileID was provided, look up the fileKey from the DB
	if key == "" && payload.FileID > 0 {
		if file, err := redisTaskProcessor.queries.GetFileByID(ctx, payload.FileID); err == nil {
			key = file.FileKey
		}
	}

	// 3. Guard check: avoid processing a no-op if there's no storage key and no DB file ID
	if key == "" && payload.FileID <= 0 {
		slog.Debug("nothing to delete for asset task", "payload", payload)
		return nil
	}

	// 4. Delete object from Cloudflare R2 storage bucket and purge Edge CDN cache
	if key != "" && redisTaskProcessor.r2Svc != nil {
		// S3 SDK DeleteObject permanently removes the blob from R2
		if delErr := redisTaskProcessor.r2Svc.DeleteObject(ctx, key); delErr != nil {
			slog.Error("failed to delete object from R2", "key", key, "err", delErr)
			return fmt.Errorf("failed to delete object from R2: %w", delErr)
		}

		// Invalidate Cloudflare CDN edge cache so users don't see stale cached avatars/logos
		if purgeErr := redisTaskProcessor.r2Svc.PurgeCloudflareCache(ctx, key); purgeErr != nil {
			slog.Warn("failed to purge cloudflare cache for asset", "key", key, "err", purgeErr)
		}
	}

	// 5. Clean up the database record from the `files` table:
	// Two possible paths:
	// - Primary path (by ID): If the caller passed an explicit fileID, delete directly by primary key.
	// - Fallback path (by Key): If caller only passed a URL (e.g. legacy avatars), look up the row by file_key
	//   and delete it. If lookup fails or row doesn't exist, it's a no-op.
	if payload.FileID > 0 {
		// Hard-delete by known primary key ID
		if err := redisTaskProcessor.queries.HardDeleteFile(ctx, payload.FileID); err != nil {
			slog.Error("failed to hard delete file record from DB", "file_id", payload.FileID, "err", err)
			return fmt.Errorf("failed to hard delete file record: %w", err)
		}
	} else if key != "" {
		// Fallback: lookup by unique fileKey first to retrieve its row ID, then hard-delete
		if oldFile, err := redisTaskProcessor.queries.GetFileByKey(ctx, key); err == nil && oldFile.ID > 0 {
			if err := redisTaskProcessor.queries.HardDeleteFile(ctx, oldFile.ID); err != nil {
				slog.Error("failed to hard delete file record by key from DB", "key", key, "file_id", oldFile.ID, "err", err)
				return fmt.Errorf("failed to hard delete file record by key: %w", err)
			}
		}
	}

	slog.Info("successfully processed asset deletion", "file_id", payload.FileID, "key", key)
	return nil
}

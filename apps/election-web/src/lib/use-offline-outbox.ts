import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getOutboxCount,
  getPendingUpdates,
  removeFromOutbox,
  updateOutboxItemStatus,
  type OutboxUpdateItem,
} from "./outbox-db";
import { confirmFileUpload, getPresignedUploadURL } from "./server/parties";
import {
  createPollingUnitUpdate,
  type PollingUnitUpdateMediaInput,
} from "./server/polling_unit_updates";
import { toast } from "sonner";

// Background sync worker flag to prevent concurrent runs
let isSyncInProgress = false;

// Process a single outbox item through Cloudflare R2 / S3 upload and API creation
async function syncSingleItem(item: OutboxUpdateItem): Promise<boolean> {
  // Mark item as syncing in IndexedDB so retries/UI know it's in flight
  await updateOutboxItemStatus(item.id, "syncing");

  try {
    const uploadedMedia: PollingUnitUpdateMediaInput[] = [];

    // Upload each binary blob to storage
    for (const media of item.mediaFiles) {
      const ext = media.name.split(".").pop()?.toLowerCase();
      const fallbackMime =
        ext === "mp4" ? "video/mp4" :
          ext === "m4a" ? "audio/mp4" :
            ext === "mp3" ? "audio/mpeg" :
              ext === "wav" ? "audio/wav" :
                ext === "webm" ? (media.type === "audio" ? "audio/webm" : "video/webm") :
                  ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
                    ext === "png" ? "image/png" :
                      ext === "webp" ? "image/webp" : "application/octet-stream";

      // Resolve MIME type and target subfolder based on media kind
      const resolvedMime = media.blob.type || fallbackMime;
      const mediaSubfolder =
        media.type === "image" ? "photos" : media.type === "video" ? "videos" : "audio";

      // 1. Request presigned upload ticket from API
      const presignedRes = await getPresignedUploadURL({
        data: {
          original_name: media.name,
          mime_type: resolvedMime,
          file_size: media.blob.size,
          folder: `situation-updates/${mediaSubfolder}`,
          is_public: true,
        },
      });

      if (!presignedRes.success || !presignedRes.data) {
        throw new Error("Failed to get presigned upload URL");
      }

      const { upload_url, public_url, file_id } = presignedRes.data;

      // 2. Direct binary upload to Cloudflare R2
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": resolvedMime },
        body: media.blob,
      });

      if (!putRes.ok) {
        // Mark upload as failed in backend
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload binary asset");
      }

      // 3. Confirm successful upload and collect CDN public URL and media metadata
      await confirmFileUpload({ data: { id: file_id, success: true } });
      uploadedMedia.push({
        file_id,
        url: public_url,
        media_type: media.type,
        file_size_bytes: media.blob.size,
        duration_seconds: media.durationSeconds,
      });
    }

    // Create situation update record on API server
    const apiRes = await createPollingUnitUpdate({
      data: {
        polling_unit_id: item.pollingUnitId ?? 0,
        election_group_id: item.electionGroupId,
        assignment_id: item.assignmentId,
        status_category_id: item.statusCategoryId,
        status_option_id: item.statusOptionId,
        has_issues: item.hasIssues,
        issue_action: item.issueAction,
        existing_issue_ids: item.existingIssueIds,
        new_issue_option_ids: item.newIssueOptionIds,
        title: item.title,
        message: item.message.trim(),
        media: uploadedMedia,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy_meters: item.accuracyMeters,
        created_at: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      },
    });

    if (!apiRes.success) {
      throw new Error(apiRes.message || "Failed to create polling unit update");
    }

    // Successfully synced, remove from IndexedDB outbox
    await removeFromOutbox(item.id);
    return true;
  } catch (error: any) {
    await updateOutboxItemStatus(item.id, "failed", error.message);
    return false;
  }
}

// Flush all pending outbox updates sequentially
export async function flushOutboxQueue(): Promise<number> {
  // Prevent concurrent flushes and skip syncing while offline
  if (isSyncInProgress || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return 0;
  }

  isSyncInProgress = true;
  let syncedCount = 0;

  try {
    // Retrieve and process queued updates one by one
    const pending = await getPendingUpdates();
    for (const item of pending) {
      const ok = await syncSingleItem(item);
      if (ok) {
        syncedCount += 1;
      }
    }
  } catch {
    // Ignore unexpected database errors during sync run
  } finally {
    isSyncInProgress = false;
  }

  return syncedCount;
}

// React hook to monitor outbox count and bind network online listeners
export function useOfflineOutbox() {
  const queryClient = useQueryClient();
  // Track count of unsynced items in IndexedDB
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Track browser connectivity status (optimistically defaults to true for SSR)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Re-fetch pending count from IndexedDB
  const refreshCount = async () => {
    try {
      const count = await getOutboxCount();
      setPendingCount(count);
    } catch {
      // Ignore count retrieval error during unmount
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    refreshCount();

    // Trigger auto-sync when network connection is restored
    const handleOnline = async () => {
      setIsOnline(true);
      toast.info("Network restored. Syncing offline updates...");
      const synced = await flushOutboxQueue();
      if (synced > 0) {
        toast.success(`Synced ${synced} update${synced > 1 ? "s" : ""}!`);
        queryClient.invalidateQueries({ queryKey: ["MyLatestUpdateTime"] });
      }
      refreshCount();
    };

    // Alert user when offline
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are currently offline. Updates will be queued locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic background sync attempt every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        flushOutboxQueue().then((synced) => {
          if (synced > 0) {
            queryClient.invalidateQueries({ queryKey: ["MyLatestUpdateTime"] });
          }
          refreshCount();
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [queryClient]);

  return {
    pendingCount,
    isOnline,
    refreshCount,
    // Manually trigger flush (e.g. from user click on banner)
    triggerSync: async () => {
      const synced = await flushOutboxQueue();
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ["MyLatestUpdateTime"] });
      }
      await refreshCount();
      return synced;
    },
  };
}

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPendingResults, removeResultFromOutbox, updateResultOutboxItemStatus, type OutboxResultItem } from "./outbox-db";
import { uploadOutboxMediaBlob } from "./outbox-media";
import { submitPollingUnitResult } from "./server/polling_unit_results";
import { QUERY_KEYS } from "./config";
import { toast } from "sonner";

// Background sync worker flag to prevent concurrent result flushes
let isResultSyncInProgress = false;

// Process a single queued result item through R2 upload and API submission
async function syncSingleResultItem(item: OutboxResultItem): Promise<boolean> {
  await updateResultOutboxItemStatus(item.id, "syncing");

  try {
    // Upload required result sheet image to R2
    const { public_url: imageUrl } = await uploadOutboxMediaBlob({
      blob: item.image.blob,
      name: item.image.name,
      folder: "results/images",
      mediaType: "image",
    });

    // Upload optional verification video to R2 if attached
    const videoUrl = item.video ? (
      await uploadOutboxMediaBlob({
        blob: item.video.blob,
        name: item.video.name,
        folder: "results/videos",
        mediaType: "video",
      })
    ).public_url : undefined;

    // Submit result record to API with uploaded media URLs
    const payload: Parameters<typeof submitPollingUnitResult>[0]["data"] = {
      assignment_id: item.assignmentId,
      election_id: item.electionId,
      election_group_id: item.electionGroupId,
      polling_unit_id: item.pollingUnitId,
      result_sheet_image_url: imageUrl,
    };

    if (videoUrl) {
      payload.result_sheet_video_url = videoUrl;
    }

    // Record submission on the API server
    const res = await submitPollingUnitResult({ data: payload });
    if (!res.success) {
      throw new Error(res.message || "Failed to submit result");
    }

    // Remove synced item from IndexedDB outbox
    await removeResultFromOutbox(item.id);
    return true;
  } catch (error: any) {
    // Mark as failed with error message so it retries on next sync
    await updateResultOutboxItemStatus(item.id, "failed", error.message);
    return false;
  }
}

// Flush all pending result outbox items sequentially
export async function flushResultOutboxQueue(): Promise<number> {
  if (isResultSyncInProgress || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return 0;
  }

  isResultSyncInProgress = true;
  let syncedCount = 0;

  try {
    const pending = await getPendingResults();
    for (const item of pending) {
      const ok = await syncSingleResultItem(item);
      if (ok) {
        syncedCount += 1;
      }
    }
  } catch {
    // Ignore unexpected IndexedDB errors during sync run
  } finally {
    isResultSyncInProgress = false;
  }

  return syncedCount;
}

// React hook to monitor pending offline result uploads and bind network listeners
export function useOfflineResultOutbox() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingElectionIds, setPendingElectionIds] = useState<Set<number>>(new Set());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Sync pending count and queued election IDs from IndexedDB
  const refreshCount = async () => {
    try {
      const items = await getPendingResults(true);
      setPendingCount(items.length);
      setPendingElectionIds(new Set(items.map((item) => item.electionId)));
    } catch {
      // Ignore retrieval errors during unmount
    }
  };

  useEffect(() => {
    refreshCount();

    // Auto-flush queued results when connection is restored
    const handleOnline = async () => {
      setIsOnline(true);
      toast.info("Network restored. Syncing offline results...");
      const synced = await flushResultOutboxQueue();

      if (synced > 0) {
        toast.success(`Synced ${synced} result${synced > 1 ? "s" : ""}!`);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pollingUnitResults() });
      }

      refreshCount();
    };

    // Update online state and notify user when connection drops
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Results will be saved locally and synced later.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic background sync attempt every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        flushResultOutboxQueue().then((synced) => {
          if (synced > 0) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pollingUnitResults() });
          }
          refreshCount();
        });
      }
    }, 30000);

    // Clean up network listeners and background sync timer on unmount
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [queryClient]);

  return {
    pendingCount,
    pendingElectionIds,
    isOnline,
    refreshCount,

    triggerSync: async () => {
      const synced = await flushResultOutboxQueue();
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pollingUnitResults() });
      }
      await refreshCount();
      return synced;
    },
  };
}

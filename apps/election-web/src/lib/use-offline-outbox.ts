import { useEffect, useState } from "react";
import {
  getOutboxCount,
  getPendingUpdates,
  removeFromOutbox,
  updateOutboxItemStatus,
  type OutboxUpdateItem,
} from "./outbox-db";
import { confirmFileUpload, getPresignedUploadURL } from "./server/parties";
import { createPollingUnitUpdate } from "./server/polling_unit_updates";
import { STATIC_ISSUE_CATEGORIES, STATIC_STATUS_CATEGORIES } from "./constants/update-options";
import { toast } from "sonner";

// Background sync worker flag to prevent concurrent runs
let isSyncInProgress = false;

// Process a single outbox item through Cloudflare R2 / S3 upload and API creation
async function syncSingleItem(item: OutboxUpdateItem): Promise<boolean> {
  await updateOutboxItemStatus(item.id, "syncing");

  try {
    const uploadedUrls: string[] = [];

    // Upload each binary blob to storage
    for (const media of item.mediaFiles) {
      const presignedRes = await getPresignedUploadURL({
        data: {
          original_name: media.name,
          mime_type: media.blob.type || "application/octet-stream",
          file_size: media.blob.size,
          folder: "updates",
          is_public: true,
        },
      });

      if (!presignedRes.success || !presignedRes.data) {
        throw new Error("Failed to get presigned upload URL");
      }

      const { upload_url, public_url, file_id } = presignedRes.data;

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": media.blob.type || "application/octet-stream" },
        body: media.blob,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload binary asset");
      }

      await confirmFileUpload({ data: { id: file_id, success: true } });
      uploadedUrls.push(public_url);
    }

    // Lookup human labels for backward-compatible enriched text
    const statusCat = STATIC_STATUS_CATEGORIES.find((c) => c.id === item.statusCategoryId);
    const statusOpt = statusCat?.options.find((o) => o.id === item.statusOptionId);

    // Find all issue names for multi-issue reports
    const issueNames: string[] = [];
    if (item.newIssueOptionIds && item.newIssueOptionIds.length > 0) {
      for (const optId of item.newIssueOptionIds) {
        for (const cat of STATIC_ISSUE_CATEGORIES) {
          const found = cat.options.find((o) => o.id === optId);
          if (found) issueNames.push(found.name);
        }
      }
    }

    const prefixParts: string[] = [];
    if (statusCat) {
      prefixParts.push(statusOpt ? `${statusCat.name} - ${statusOpt.name}` : statusCat.name);
    }
    if (item.hasIssues && issueNames.length > 0) {
      prefixParts.push(`Issues: ${issueNames.join(", ")}`);
    }

    const prefix = prefixParts.length > 0 ? `[${prefixParts.join(" | ")}] ` : "";
    const compiledMessage = `${prefix}${item.message.trim()}`.trim();

    // Create situation update record on API server
    const apiRes = await createPollingUnitUpdate({
      data: {
        polling_unit_id: item.pollingUnitId,
        election_group_id: item.electionGroupId,
        assignment_id: item.assignmentId,
        party_id: item.partyId,
        message: compiledMessage,
        media_urls: uploadedUrls,
        is_report: item.hasIssues,
        report_types: issueNames,
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
  if (isSyncInProgress || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return 0;
  }

  isSyncInProgress = true;
  let syncedCount = 0;

  try {
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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const refreshCount = async () => {
    try {
      const count = await getOutboxCount();
      setPendingCount(count);
    } catch {
      // Ignore count retrieval error during unmount
    }
  };

  useEffect(() => {
    refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      toast.info("Network restored. Syncing offline updates...");
      const synced = await flushOutboxQueue();
      if (synced > 0) {
        toast.success(`Synced ${synced} update${synced > 1 ? "s" : ""}!`);
      }
      refreshCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are currently offline. Updates will be queued locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic sync check every thirty seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        flushOutboxQueue().then(() => refreshCount());
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    pendingCount,
    isOnline,
    refreshCount,
    triggerSync: async () => {
      const synced = await flushOutboxQueue();
      await refreshCount();
      return synced;
    },
  };
}

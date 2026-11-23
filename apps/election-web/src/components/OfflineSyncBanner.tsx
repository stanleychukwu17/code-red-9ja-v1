import { CloudUpload, WifiOff } from "lucide-react";

interface OfflineSyncBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onSync: () => void;
  /** Singular noun for queued items, e.g. "update" or "result". */
  itemLabel?: string;
}

/**
 * Banner displayed when the user is offline or has pending outbox items to sync.
 */
export function OfflineSyncBanner({
  isOnline,
  pendingCount,
  onSync,
  itemLabel = "update",
}: OfflineSyncBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="size-4 shrink-0 text-amber-600" />
            <span>
              Offline mode. All {itemLabel}s are stored safely on your phone.
            </span>
          </>
        ) : (
          <>
            <CloudUpload className="size-4 shrink-0 text-amber-600 animate-bounce" />
            <span>
              {pendingCount} {itemLabel}
              {pendingCount > 1 ? "s" : ""} waiting to sync...
            </span>
          </>
        )}
      </div>
      {isOnline && (
        <button
          type="button"
          onClick={onSync}
          className="font-semibold underline hover:text-amber-950 cursor-pointer"
        >
          Sync now
        </button>
      )}
    </div>
  );
}

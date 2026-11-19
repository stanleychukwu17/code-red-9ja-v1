import { FolderKanban, Upload, FolderPlus, RefreshCw } from "lucide-react";

export type EmptyAssetFolderProps = {
  onUpload: () => void;
  onCreateFolder: () => void;
  onSync: () => void;
  isSyncing?: boolean;
};

export function EmptyAssetFolder({
  onUpload,
  onCreateFolder,
  onSync,
  isSyncing = false,
}: EmptyAssetFolderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-90 rounded-xl bg-sidebar-softer/30 p-8 text-center border border-dashed border-border/60">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
        <FolderKanban className="size-6" />
      </div>
      <h3 className="text-base font-semibold">This folder is empty</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">
        No subfolders or assets found here. You can sync from Cloudflare R2 or add items.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition cursor-pointer shadow-xs"
        >
          <Upload className="size-4" />
          <span>Upload Assets</span>
        </button>
        <button
          type="button"
          onClick={onCreateFolder}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sidebar-softer text-c-90 text-sm font-medium hover:bg-sidebar-softer/80 transition cursor-pointer border border-border/50"
        >
          <FolderPlus className="size-4" />
          <span>New Folder</span>
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sidebar-softer text-muted-foreground text-sm font-medium hover:text-c-100 hover:bg-sidebar-softer/80 transition cursor-pointer border border-border/40 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${isSyncing ? "animate-spin text-primary" : ""}`} />
          <span>{isSyncing ? "Syncing R2..." : "Sync R2"}</span>
        </button>
      </div>
    </div>
  );
}

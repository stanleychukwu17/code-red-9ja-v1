import { Folder as FolderIcon, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu";
import type { AssetFolder } from "#/lib/server/assets";

export type AssetFolderSectionProps = {
  folders: AssetFolder[];
  onOpenFolder: (folder: AssetFolder) => void;
  onDeleteFolder: (folder: AssetFolder) => void;
};

export function AssetFolderSection({
  folders,
  onOpenFolder,
  onDeleteFolder,
}: AssetFolderSectionProps) {
  if (folders.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Folders ({folders.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="group relative flex items-center justify-between p-3 rounded-xl bg-sidebar-softer/50 border border-border/50 hover:bg-sidebar-softer hover:border-border transition select-none"
          >
            <div
              onClick={() => onOpenFolder(folder)}
              className="flex items-center gap-3 min-w-0 flex-1 mr-2 cursor-pointer"
            >
              <div className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition">
                <FolderIcon className="size-5 fill-amber-500/20" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-c-90 truncate group-hover:text-c-100">
                  {folder.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {folder.r2_prefix}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-c-100 hover:bg-background/80 transition opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  title="Folder options"
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => onOpenFolder(folder)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FolderIcon className="size-4" />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete folder "${folder.name}" and its subfolders?`)) {
                      onDeleteFolder(folder);
                    }
                  }}
                  className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}

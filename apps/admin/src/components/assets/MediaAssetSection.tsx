import { MoreVertical, Copy, ExternalLink, Download, Trash2, FileCode2, FileImage, FileVideo, FileText, FileBox, File as GenericFileIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu";
import type { MediaAsset } from "#/lib/server/assets";

export function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileBadgeIcon(fileType: string, extension: string) {
  const ext = extension.toLowerCase().replace(".", "");
  if (ext === "ai" || ext === "eps" || ext === "svg") {
    return <FileCode2 className="size-5 text-amber-500" />;
  }
  if (ext === "blend" || ext === "obj" || ext === "fbx" || ext === "glb" || ext === "gltf") {
    return <FileBox className="size-5 text-orange-500" />;
  }
  if (fileType === "image") {
    return <FileImage className="size-5 text-emerald-500" />;
  }
  if (fileType === "video") {
    return <FileVideo className="size-5 text-sky-500" />;
  }
  if (fileType === "document") {
    return <FileText className="size-5 text-blue-500" />;
  }
  return <GenericFileIcon className="size-5 text-muted-foreground" />;
}

export type MediaAssetSectionProps = {
  assets: MediaAsset[];
  onCopyUrl: (url: string) => void;
  onDownload: (url: string, filename: string) => void;
  onDeleteAsset: (asset: MediaAsset) => void;
};

export function MediaAssetSection({
  assets,
  onCopyUrl,
  onDownload,
  onDeleteAsset,
}: MediaAssetSectionProps) {
  if (assets.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Files ({assets.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group relative flex flex-col p-3 rounded-xl bg-sidebar-softer/40 border border-border/50 hover:bg-sidebar-softer hover:border-border transition"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-background flex items-center justify-center shrink-0 border border-border/40">
                {getFileBadgeIcon(asset.file_type, asset.extension)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-sm font-medium text-c-90 truncate group-hover:text-c-100"
                  title={asset.name}
                >
                  {asset.name}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatBytes(asset.file_size_bytes)}</span>
                  {asset.extension && (
                    <span className="uppercase font-semibold text-[10px] px-1 py-0.2 bg-muted rounded">
                      {asset.extension.replace(".", "")}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-c-100 hover:bg-background/80 transition opacity-80 group-hover:opacity-100 cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    title="Asset options"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onCopyUrl(asset.public_url)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="size-4" />
                    <span>Copy Public URL</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <a
                      href={asset.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      <span>Open in New Tab</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDownload(asset.public_url, asset.name)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="size-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm(`Delete asset "${asset.name}"?`)) {
                        onDeleteAsset(asset);
                      }
                    }}
                    className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    <span>Delete Asset</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

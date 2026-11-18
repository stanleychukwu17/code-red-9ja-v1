import { Fragment, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssetFolders,
  getMediaAssets,
  syncR2Assets,
  type AssetFolder,
} from "#/lib/server/assets";
import { QUERY_KEYS } from "#/lib/config";
import {
  FolderKanban,
  Folder as FolderIcon,
  ChevronRight,
  RefreshCw,
  Home,
  FileCode2,
  FileImage,
  FileVideo,
  FileText,
  FileBox,
  File as GenericFileIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => getPageHeader({ title: "Media Assets" }),
  component: RouteComponent,
});

interface BreadcrumbItem {
  id: number;
  name: string;
}

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

function RouteComponent() {
  const queryClient = useQueryClient();

  // Active folder & breadcrumb state
  // id: 0 represents the root prefix ("assets/")
  const [currentFolderId, setCurrentFolderId] = useState<number>(0);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 0, name: "Root" },
  ]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeParentId = currentFolderId > 0 ? currentFolderId : undefined;

  // 1. Fetch subfolders for current folder
  const { data: foldersData, isLoading: isLoadingFolders, isRefetching: isRefetchingFolders } = useQuery({
    queryKey: QUERY_KEYS.assets.folders(activeParentId),
    queryFn: async () => {
      const res = await getAssetFolders({ data: activeParentId });
      if (res && res.success) {
        return res.folders;
      }
      throw new Error(res?.message || "Failed to load folders");
    },
    staleTime: Infinity,
  });

  // 2. Fetch media assets for current folder
  const { data: assetsData, isLoading: isLoadingAssets, isRefetching: isRefetchingAssets } = useQuery({
    queryKey: QUERY_KEYS.assets.list(activeParentId, undefined, searchQuery || undefined),
    queryFn: async () => {
      const res = await getMediaAssets({
        data: {
          folderId: activeParentId,
          search: searchQuery || undefined,
        },
      });
      if (res && res.success) {
        return res;
      }
      throw new Error(res?.message || "Failed to load assets");
    },
    staleTime: Infinity,
  });

  // 3. Sync R2 mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await syncR2Assets();
      if (!res || !res.success) {
        throw new Error(res?.message || "Sync failed");
      }
      return res;
    },
    onSuccess: (data) => {
      toast.success(
        `Cloudflare R2 sync complete: ${data.stats?.folders_created ?? 0} folders, ${data.stats?.assets_created ?? 0} assets indexed.`,
      );
      // Invalidate asset and folder queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to sync with Cloudflare R2");
    },
  });

  // Folder navigation click
  const handleOpenFolder = (folder: AssetFolder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Breadcrumb segment click
  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    if (!target) return;
    setCurrentFolderId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const folders = foldersData || [];
  const assets = assetsData?.items || [];
  const isLoading = isLoadingFolders || isLoadingAssets;
  const isRefreshing = isRefetchingFolders || isRefetchingAssets;

  return (
    <Layout>
      <PageHeader
        title="Media Assets"
        activeTab=""
        rightComponent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex h-10 items-center gap-2 rounded-xl bg-sidebar-softer px-4 text-sm font-medium text-c-80 transition hover:bg-sidebar-softer/80 hover:text-c-100 disabled:opacity-50 cursor-pointer"
              title="Scan and sync Cloudflare R2 bucket"
            >
              <RefreshCw
                className={`size-4 ${syncMutation.isPending ? "animate-spin text-primary" : ""}`}
              />
              <span>{syncMutation.isPending ? "Syncing R2..." : "Sync with R2"}</span>
            </button>
            <AddButton onClick={() => { }} />
          </div>
        }
      />

      <PageSearchLayer
        placeholder="Search folders and assets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ==================================================================== */}
      {/* BREADCRUMB NAVIGATION BAR                                             */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between rounded-xl bg-sidebar-softer/40 px-4 py-3 border border-border/40">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const isRoot = idx === 0;

            return (
              <Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${isLast
                    ? "font-semibold text-c-100 bg-sidebar-softer"
                    : "text-muted-foreground hover:text-c-100 hover:bg-sidebar-softer/60"
                    }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isRoot && <Home className="size-3.5" />}
                  <span>{crumb.name}</span>
                </button>
              </Fragment>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {isRefreshing && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="size-3 animate-spin" />
              Updating...
            </span>
          )}
          <span>
            {folders.length} {folders.length === 1 ? "folder" : "folders"}
          </span>
          <span>•</span>
          <span>
            {assets.length} {assets.length === 1 ? "asset" : "assets"}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CONTENT LISTING: FOLDERS & ASSETS                                    */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-xl bg-sidebar-softer/30 p-8 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading folders and assets...</p>
        </div>
      ) : folders.length === 0 && assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] rounded-xl bg-sidebar-softer/30 p-8 text-center border border-dashed border-border/60">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <FolderKanban className="size-6" />
          </div>
          <h3 className="text-base font-semibold">This folder is empty</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            No subfolders or assets found here. You can sync from Cloudflare R2 or add items.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition cursor-pointer"
            >
              <RefreshCw className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              <span>Sync with R2</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Subfolders Section */}
          {folders.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Folders ({folders.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleOpenFolder(folder)}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-sidebar-softer/50 border border-border/50 hover:bg-sidebar-softer hover:border-border transition cursor-pointer select-none"
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
                ))}
              </div>
            </div>
          )}

          {/* Media Assets Section */}
          {assets.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Files ({assets.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group flex flex-col p-3 rounded-xl bg-sidebar-softer/40 border border-border/50 hover:bg-sidebar-softer hover:border-border transition"
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { Layout, PageHeader, PageSearchLayer, AddButton } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssetFolders, getMediaAssets, syncR2Assets, deleteMediaAsset, deleteAssetFolder, type AssetFolder } from "#/lib/server/assets";
import { QUERY_KEYS } from "#/lib/config";
import { Folder as FolderIcon, RefreshCw, FileCode2, FileImage, FileVideo, FileText, FileBox, File as GenericFileIcon, Loader2, Upload, MoreVertical, Copy, ExternalLink, Download, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu";
import { CreateAssetFolderDialog } from "#/components/dialogs/CreateAssetFolderDialog";
import { UploadAssetsDialog } from "#/components/dialogs/UploadAssetsDialog";
import { AssetBreadcrumbs, type BreadcrumbItem } from "#/components/assets/AssetBreadcrumbs";
import { EmptyAssetFolder } from "#/components/assets/EmptyAssetFolder";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => getPageHeader({ title: "Media Assets" }),
  component: RouteComponent,
});

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
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const activeParentId = currentFolderId > 0 ? currentFolderId : undefined;
  const currentPath = breadcrumbs.map((b) => b.name).join(" / ");

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

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteAssetFolder({ data: id });
      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to delete folder");
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Folder deleted successfully");
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.assets.folders(activeParentId),
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete folder");
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteMediaAsset({ data: id });
      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to delete asset");
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.assets.list(activeParentId),
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete asset");
    },
  });

  // Copy public CDN URL to clipboard
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public CDN URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  // Download asset directly
  const handleDownloadAsset = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <button
              type="button"
              onClick={() => setUploadDialogOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
              title="Upload new media assets"
            >
              <Upload className="size-4" />
              <span>Upload</span>
            </button>
            <AddButton onClick={() => setCreateFolderOpen(true)} />
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
      <AssetBreadcrumbs
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
        isRefreshing={isRefreshing}
        folderCount={folders.length}
        assetCount={assets.length}
      />

      {/* ==================================================================== */}
      {/* CONTENT LISTING: FOLDERS & ASSETS                                    */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-75 rounded-xl bg-sidebar-softer/30 p-8 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading folders and assets...</p>
        </div>
      ) : folders.length === 0 && assets.length === 0 ? (
        // Empty directory state with quick actions to upload files, create folders, or sync R2
        <EmptyAssetFolder
          onUpload={() => setUploadDialogOpen(true)}
          onCreateFolder={() => setCreateFolderOpen(true)}
          onSync={() => syncMutation.mutate()}
          isSyncing={syncMutation.isPending}
        />
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
                    className="group relative flex items-center justify-between p-3 rounded-xl bg-sidebar-softer/50 border border-border/50 hover:bg-sidebar-softer hover:border-border transition select-none"
                  >
                    <div
                      onClick={() => handleOpenFolder(folder)}
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
                          onClick={() => handleOpenFolder(folder)}
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
                              deleteFolderMutation.mutate(folder.id);
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
                            onClick={() => handleCopyUrl(asset.public_url)}
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
                            onClick={() => handleDownloadAsset(asset.public_url, asset.name)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Download className="size-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (window.confirm(`Delete asset "${asset.name}"?`)) {
                                deleteAssetMutation.mutate(asset.id);
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
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <CreateAssetFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        parentId={activeParentId}
        currentPath={currentPath}
      />

      {/* Upload Media Assets Modal & Dropzone */}
      <UploadAssetsDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        parentId={activeParentId}
        currentPath={currentPath}
      />
    </Layout>
  );
}

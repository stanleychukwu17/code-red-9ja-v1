import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { Layout, PageHeader, PageSearchLayer, AddButton } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAssetFolders, getMediaAssets, syncR2Assets, deleteMediaAsset, deleteAssetFolder, type AssetFolder } from "#/lib/server/assets";
import { QUERY_KEYS } from "#/lib/config";
import { RefreshCw, Loader2, Upload } from "lucide-react";
import { CreateAssetFolderDialog } from "#/components/dialogs/CreateAssetFolderDialog";
import { UploadAssetsDialog } from "#/components/dialogs/UploadAssetsDialog";
import { AssetBreadcrumbs, type BreadcrumbItem } from "#/components/assets/AssetBreadcrumbs";
import { EmptyAssetFolder } from "#/components/assets/EmptyAssetFolder";
import { AssetFolderSection } from "#/components/assets/AssetFolderSection";
import { MediaAssetSection, formatBytes, getFileBadgeIcon } from "#/components/assets/MediaAssetSection";
import { toast } from "sonner";

export { formatBytes, getFileBadgeIcon };

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => getPageHeader({ title: "Media Assets" }),
  component: RouteComponent,
});

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
    queryKey: QUERY_KEYS.assets.list({ folderId: activeParentId, search: searchQuery || undefined }),
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
        queryKey: QUERY_KEYS.assets.list({ folderId: activeParentId }),
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
          {/* Subfolders: child directories within the current active folder */}
          <AssetFolderSection
            folders={folders}
            onOpenFolder={handleOpenFolder}
            onDeleteFolder={(folder) => deleteFolderMutation.mutate(folder.id)}
          />

          {/* Media Assets Section */}
          <MediaAssetSection
            assets={assets}
            onCopyUrl={handleCopyUrl}
            onDownload={handleDownloadAsset}
            onDeleteAsset={(asset) => deleteAssetMutation.mutate(asset.id)}
          />
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

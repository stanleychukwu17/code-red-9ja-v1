import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export type AssetFolder = {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  r2_prefix: string;
  description?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: number;
  folder_id?: number | null;
  name: string;
  r2_key: string;
  public_url: string;
  file_type: string;
  extension: string;
  mime_type: string;
  file_size_bytes: number;
  dimensions?: string | null;
  duration_seconds?: number | null;
  tags: string[];
  uploaded_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type PaginatedAssetsResponse = {
  items: MediaAsset[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type SyncStats = {
  folders_created: number;
  assets_created: number;
  assets_updated: number;
};

// ----------------------------------------------------------------------------
// FOLDER ACTIONS
// ----------------------------------------------------------------------------

export const getAssetFolders = createServerFn({ method: "GET" })
  .inputValidator((parentId?: number) => parentId)
  .handler(async ({ data: parentId }) => {
    try {
      const res = await apiFetchJson<{ folders: AssetFolder[] }>(
        API_URL.assets.folders(parentId),
      );
      return { success: true, folders: res?.folders || [] };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to load folders",
        folders: [],
      };
    }
  });

export const getAssetFolderById = createServerFn({ method: "GET" })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await apiFetchJson<AssetFolder>(API_URL.assets.folderById(id));
      return { success: true, folder: res };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to load folder",
      };
    }
  });

export const createAssetFolder = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { name: string; parent_id?: number; description?: string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<AssetFolder>(API_URL.assets.createFolder, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { success: true, folder: res };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create folder",
      };
    }
  });

export const deleteAssetFolder = createServerFn({ method: "POST" })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await apiFetchJson<{ message: string }>(
        API_URL.assets.deleteFolder(id),
        { method: "DELETE" },
      );
      return { success: true, message: res?.message };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete folder",
      };
    }
  });

// ----------------------------------------------------------------------------
// ASSET ACTIONS
// ----------------------------------------------------------------------------

export const getMediaAssets = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data?: {
        folderId?: number;
        fileType?: string;
        search?: string;
        page?: number;
        limit?: number;
      },
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<PaginatedAssetsResponse>(
        API_URL.assets.listAssets(data),
      );
      return {
        success: true,
        items: res?.items || [],
        totalCount: res?.total_count || 0,
        page: res?.page || 1,
        limit: res?.limit || 30,
        totalPages: res?.total_pages || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch assets",
        items: [],
        totalCount: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      };
    }
  });

export const deleteMediaAsset = createServerFn({ method: "POST" })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await apiFetchJson<{ message: string }>(
        API_URL.assets.deleteAsset(id),
        { method: "DELETE" },
      );
      return { success: true, message: res?.message };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete asset",
      };
    }
  });

export type PresignUploadResponse = {
  upload_url: string;
  r2_key: string;
  public_url: string;
  file_name: string;
  file_type: string;
  mime_type: string;
};

export const getAssetUploadPresignedURL = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      folder_id?: number;
      file_name: string;
      content_type?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<PresignUploadResponse>(
        API_URL.assets.uploadUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return { success: true, data: res };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to generate presigned upload URL",
      };
    }
  });

export type ConfirmAssetUploadInput = {
  folder_id?: number;
  name: string;
  r2_key: string;
  public_url?: string;
  file_type?: string;
  extension?: string;
  mime_type?: string;
  file_size_bytes: number;
  dimensions?: string;
  duration_seconds?: number;
  tags?: string[];
};

export const confirmAssetUpload = createServerFn({ method: "POST" })
  .inputValidator((data: ConfirmAssetUploadInput) => data)
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<MediaAsset>(
        API_URL.assets.confirmUpload,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return { success: true, asset: res };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to confirm asset upload",
      };
    }
  });

// ----------------------------------------------------------------------------
// CLOUDFLARE R2 RECONCILIATION SYNC
// ----------------------------------------------------------------------------

export const syncR2Assets = createServerFn({ method: "POST" })
  .inputValidator((data?: { prefix?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<{ message: string; stats: SyncStats }>(
        API_URL.assets.syncR2,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefix: data?.prefix ?? "" }),
        },
      );

      return {
        success: true,
        message: res?.message || "Sync completed successfully",
        stats: res?.stats,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to sync with Cloudflare R2",
      };
    }
  });

import { v } from "convex/values";
import { mutation, query } from "./_server";
import { api } from "./_generated/api";
import { R2FileService } from "../lib/file-service";
import { createId } from "@paralleldrive/cuid2";

// Initialize R2 service
const r2 = new R2FileService({
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucketName: process.env.R2_BUCKET_NAME || "",
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  publicUrl: process.env.R2_PUBLIC_URL || undefined,
});

// Generate a presigned URL for file upload to R2
export const generateUploadUrl = mutation({
  args: {
    originalName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    folder: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { originalName, mimeType, folder = "uploads" } = args;

    // Generate file key using the same logic as Hono version
    const today = new Date().toISOString().slice(0, 10);
    const baseName = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50);
    const extension = originalName.includes(".")
      ? `.${originalName.split(".").pop()}`
      : "";
    const key = `${folder}/${today}/${baseName}-${createId()}${extension}`;

    // Generate presigned URL and public URL
    const uploadUrl = await r2.getPresignedUploadUrl(key, mimeType);
    const publicUrl = r2.getPublicUrl(key);

    // Store file metadata in Convex database
    const fileId = await ctx.db.insert("files", {
      originalName: args.originalName,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      fileKey: key,
      publicUrl,
      folder: args.folder || "uploads",
      isPublic: args.isPublic ?? true,
      status: "uploading",
    });

    return {
      uploadUrl,
      fileKey: key,
      publicUrl,
      fileId,
    };
  },
});

// Store file metadata after successful upload
export const confirmUpload = mutation({
  args: {
    fileId: v.id("files"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.success) {
      await ctx.db.patch(args.fileId, {
        status: "uploaded",
        uploadedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.fileId, {
        status: "failed",
      });
    }
  },
});

// Get file by ID
export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

// List files by folder
export const listFiles = query({
  args: {
    folder: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("files");

    if (args.folder) {
      query = query.filter((q) => q.eq(q.field("folder"), args.folder));
    }

    return await query.order("desc").take(args.limit || 50);
  },
});

// Delete file
export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.fileId);
  },
});

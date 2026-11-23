import { confirmFileUpload, getPresignedUploadURL } from "./server/parties";

function resolveMediaMimeType(
  blob: Blob,
  name: string,
  mediaType?: "image" | "video" | "audio",
): string {
  if (blob.type) return blob.type;

  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "webm") return mediaType === "audio" ? "audio/webm" : "video/webm";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";

  return "application/octet-stream";
}

type UploadOutboxMediaParams = {
  blob: Blob;
  name: string;
  folder: string;
  mediaType?: "image" | "video" | "audio";
};

/**
 * Uploads a queued media blob to R2 via presigned URL and confirms the upload.
 */
export async function uploadOutboxMediaBlob({ blob, name, folder, mediaType }: UploadOutboxMediaParams): Promise<{ file_id: number; public_url: string }> {
  const resolvedMime = resolveMediaMimeType(blob, name, mediaType);

  // 1. Request presigned upload URL from API (is_public: true for direct CDN/OCR access)
  const presignedRes = await getPresignedUploadURL({
    data: {
      original_name: name,
      mime_type: resolvedMime,
      file_size: blob.size,
      folder,
      is_public: true,
    },
  });

  if (!presignedRes.success || !presignedRes.data) {
    throw new Error("Failed to initiate file upload");
  }

  // Extract presigned PUT URL, final public CDN URL, and file ID
  const { upload_url, public_url, file_id } = presignedRes.data;

  // 2. Upload binary blob directly to R2 storage
  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": resolvedMime },
    body: blob,
  });

  if (!putRes.ok) {
    // Mark upload as failed so backend can clean up the file record
    await confirmFileUpload({ data: { id: file_id, success: false } });
    throw new Error("Failed to upload file to storage");
  }

  // 3. Confirm upload completion and return file metadata
  await confirmFileUpload({ data: { id: file_id, success: true } });

  return { file_id, public_url };
}

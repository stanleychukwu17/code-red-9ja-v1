import { useState, useRef, useCallback } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCode2,
  FileBox,
  FileImage,
  FileVideo,
  FileText,
} from "lucide-react";
import {
  getAssetUploadPresignedURL,
  confirmAssetUpload,
} from "#/lib/server/assets";
import { QUERY_KEYS } from "#/lib/config";
import { toast } from "sonner";
import { formatBytes } from "#/routes/_authenticated/assets";

export type UploadAssetsDialogProps = {
  open: boolean;
  onClose: () => void;
  parentId?: number;
  currentPath?: string;
  onSuccess?: () => void;
};

type FileUploadStatus = "pending" | "uploading" | "confirming" | "success" | "error";

type QueuedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: FileUploadStatus;
  errorMessage?: string;
};

function getUploadFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "ai" || ext === "eps" || ext === "svg") {
    return <FileCode2 className="size-5 text-amber-500 shrink-0" />;
  }
  if (
    ext === "blend" ||
    ext === "obj" ||
    ext === "fbx" ||
    ext === "glb" ||
    ext === "gltf"
  ) {
    return <FileBox className="size-5 text-orange-500 shrink-0" />;
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) {
    return <FileImage className="size-5 text-emerald-500 shrink-0" />;
  }
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) {
    return <FileVideo className="size-5 text-sky-500 shrink-0" />;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText className="size-5 text-blue-500 shrink-0" />;
  }
  return <FileIcon className="size-5 text-muted-foreground shrink-0" />;
}

export function UploadAssetsDialog({
  open,
  onClose,
  parentId,
  currentPath = "Root",
  onSuccess,
}: UploadAssetsDialogProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const newItems: QueuedFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "pending",
    }));

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeQueuedFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadSingleFile = async (item: QueuedFile): Promise<boolean> => {
    try {
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "uploading", progress: 5 } : f,
        ),
      );

      // 1. Request presigned upload URL from backend
      const presignRes = await getAssetUploadPresignedURL({
        data: {
          folder_id: parentId,
          file_name: item.name,
          content_type: item.file.type || undefined,
        },
      });

      if (!presignRes.success || !presignRes.data) {
        throw new Error(
          presignRes.message || "Failed to generate presigned upload URL",
        );
      }

      const { upload_url, r2_key, public_url, file_type, mime_type } =
        presignRes.data;

      // 2. Perform direct PUT upload to Cloudflare R2 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url, true);
        if (mime_type) {
          xhr.setRequestHeader("Content-Type", mime_type);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.max(
              10,
              Math.min(95, Math.round((e.loaded / e.total) * 100)),
            );
            setQueue((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, progress: percent } : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(
              new Error(`R2 upload rejected with status ${xhr.status}`),
            );
          }
        };

        xhr.onerror = () =>
          reject(new Error("Network connection error during R2 upload"));
        xhr.send(item.file);
      });

      // 3. Confirm upload with API backend
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "confirming", progress: 98 } : f,
        ),
      );

      const ext = item.name.includes(".")
        ? `.${item.name.split(".").pop()}`
        : "";

      const confirmRes = await confirmAssetUpload({
        data: {
          folder_id: parentId,
          name: item.name,
          r2_key,
          public_url,
          file_type,
          extension: ext,
          mime_type,
          file_size_bytes: item.size,
        },
      });

      if (!confirmRes.success) {
        throw new Error(confirmRes.message || "Failed to confirm upload");
      }

      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "success", progress: 100 } : f,
        ),
      );

      return true;
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: "error",
                errorMessage: err?.message || "Upload failed",
              }
            : f,
        ),
      );
      return false;
    }
  };

  const handleStartUpload = async () => {
    const pendingItems = queue.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    let successCount = 0;
    // Process files sequentially (or small batches) to avoid browser socket exhaustion
    for (const item of pendingItems) {
      const ok = await uploadSingleFile(item);
      if (ok) successCount++;
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(
        `Successfully uploaded ${successCount} ${successCount === 1 ? "asset" : "assets"}`,
      );
      // Invalidate assets queries so newly uploaded assets show up immediately
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.assets.list({ folderId: parentId }),
      });
      onSuccess?.();
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setQueue([]);
    onClose();
  };

  const hasPending = queue.some(
    (item) => item.status === "pending" || item.status === "error",
  );
  const allSuccessful =
    queue.length > 0 && queue.every((item) => item.status === "success");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="max-w-lg p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          if (isUploading) e.preventDefault();
        }}
      >
        <DialogHeader
          title="Upload Media Assets"
          description={`Target folder: ${currentPath}`}
        />

        <div className="flex flex-col flex-1 min-h-0">
          <DialogPadding className="space-y-4 pt-2">
            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border/80 bg-sidebar-softer/40 hover:bg-sidebar-softer/80 hover:border-border"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFilesToQueue(e.target.files);
                    // Reset input so same file can be chosen again if needed
                    e.target.value = "";
                  }
                }}
              />
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <UploadCloud className="size-6" />
              </div>
              <p className="text-sm font-medium text-c-90">
                Click to browse or drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .ai, .blend, .svg, .png, .jpg, .mp4, 3D models, docs, etc.
              </p>
            </div>

            {/* Queued Files List */}
            {queue.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Selected Files ({queue.length})</span>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => setQueue([])}
                      className="text-xs text-muted-foreground hover:text-red-500 transition cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-sidebar-softer/60 border border-border/40 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getUploadFileIcon(item.name)}
                        <span className="font-medium text-c-90 truncate" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          ({formatBytes(item.size)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === "pending" && (
                          <span className="text-[11px] text-muted-foreground">Ready</span>
                        )}
                        {item.status === "uploading" && (
                          <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                            <Loader2 className="size-3 animate-spin" />
                            {item.progress}%
                          </span>
                        )}
                        {item.status === "confirming" && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                            <Loader2 className="size-3 animate-spin" />
                            Saving...
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                            <CheckCircle2 className="size-3.5" />
                            Done
                          </span>
                        )}
                        {item.status === "error" && (
                          <span
                            className="flex items-center gap-1 text-[11px] text-red-500 font-medium"
                            title={item.errorMessage}
                          >
                            <AlertCircle className="size-3.5" />
                            Failed
                          </span>
                        )}

                        {!isUploading && item.status !== "success" && (
                          <button
                            type="button"
                            onClick={() => removeQueuedFile(item.id)}
                            className="text-muted-foreground hover:text-red-500 p-0.5 rounded cursor-pointer transition"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(item.status === "uploading" || item.status === "confirming") && (
                      <div className="w-full h-1.5 bg-sidebar-softer rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === "error" && item.errorMessage && (
                      <p className="text-[10px] text-red-500 truncate">{item.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogPadding>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClose}
              disabled={isUploading}
            >
              {allSuccessful ? "Done" : "Cancel"}
            </Button>
            {hasPending && (
              <Button
                type="button"
                onClick={handleStartUpload}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />
                    <span>Upload {queue.length > 0 ? `(${queue.length})` : ""}</span>
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useRef } from "react";
import { Button } from "@repo/ui/components/button";
import PenIcon from "@repo/ui/icons/pen-icon";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { confirmFileUpload, getPresignedUploadURL, deleteFile } from "#/lib/server/parties";
import { QUERY_KEYS } from "#/lib/config";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 4 / Step 12: Clear passport photograph upload */
export const Step4 = () => {
  // form state derived from ApplyContext
  const {
    avatarUrl,
    setAvatarUrl,
    avatarFileId,
    setAvatarFileId,
    isUploading,
    setIsUploading,
    user,
    setSubmitError,
  } = useApplyContext();
  const queryClient = useQueryClient();

  // handle deleting previous or existing avatar image to prevent orphaned files
  const handleDeleteExistingAvatar = async () => {
    if (avatarFileId && avatarFileId > 0) {
      try {
        const res = await deleteFile({
          data: {
            id: avatarFileId,
            user_fake_id: user?.fake_id,
            type: "user_avatar",
          },
        });

        if (!res?.success) {
          throw new Error(res?.message || "Failed to delete file from server");
        }

        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userMeDetails });
      } catch (err: any) {
        console.warn("Failed to delete previous avatar file:", err);
      }
    }

    setAvatarUrl("");
    setAvatarFileId(null);
  };

  // hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // programmatically trigger file picker dialog
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // handle passport image selection and upload to R2
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setSubmitError?.(null);

    // user is changing avatar, so we need to delete the existing one
    if (avatarFileId && Number(avatarFileId) > 0) {
      await handleDeleteExistingAvatar();
    }

    try {
      // 1. Request a presigned URL from the API for uploading the passport photo
      const res = await getPresignedUploadURL({
        data: {
          original_name: rawFile.name,
          mime_type: rawFile.type,
          file_size: rawFile.size,
          folder: "avatars",
          is_public: true,
          owner_id: user?.id ? Number(user.id) : undefined,
        },
      });

      if (res && res.success && res.data) {
        const { upload_url, public_url, file_id } = res.data;

        // 2. Upload the file directly to R2 storage via the presigned URL
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": rawFile.type },
          body: rawFile,
        });

        if (!putRes.ok) {
          // Revert/reject the file confirmation in the DB if upload failed
          await confirmFileUpload({ data: { id: file_id, success: false } });
          throw new Error("Failed to upload image file to storage");
        }

        // 3. Confirm successful upload with the backend to finalize file status
        await confirmFileUpload({ data: { id: file_id, success: true } });
        setAvatarUrl(public_url);
        setAvatarFileId(file_id);
      } else {
        throw new Error("Presigned URL retrieval failed");
      }
    } catch (err) {
      // Fallback to base64 preview if remote storage upload encounters an issue
      console.warn("R2 upload failed, falling back to base64 preview:", err);

      // Create a FileReader to read the selected image file directly from the browser/client memory
      const reader = new FileReader();

      // Once the file reading completes, set the base64 data URI as the avatar URL so the user still sees an instant preview
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };

      // Read the file and convert it into a base64 data URL string (e.g., "data:image/jpeg;base64,...")
      reader.readAsDataURL(rawFile);
    } finally {
      setIsUploading(false);
    }
  };

  const displayAvatar = avatarUrl || user?.avatar;

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Add Your Passport Photograph"
        subtitle="Add a passport photograph of yourself. Please ensure that it is clear."
      />
      <div className="flex flex-col items-center gap-6 py-6 w-full">
        {/* Clickable avatar preview container */}
        <div
          onClick={handleUploadClick}
          className="relative size-64 rounded-full flex items-center justify-center shrink-0 cursor-pointer group"
        >
          {displayAvatar ? (
            <div className="w-full h-full rounded-full overflow-hidden bg-c-10">
              <img
                src={displayAvatar}
                alt="Passport preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <img
              src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1782894576/Free9ja/Avatar_Placeholder_xn9qiw.png"
              alt="avatar"
              className="w-full h-full object-cover"
            />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <div className="absolute bottom-5 right-5 size-10 bg-background/90 backdrop-blur-2xl shadow-sm rounded-full flex items-center justify-center">
            <PenIcon className="size-5 text-c-80" strokeWidth={1.15} />
          </div>
        </div>
        <Button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          variant="outline"
          size="4xl"
          className="w-full rounded-full mt-4"
        >
          Upload Your Passport
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

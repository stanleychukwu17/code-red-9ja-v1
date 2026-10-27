import { useRef } from "react";
import { Button } from "@repo/ui/components/button";
import PenIcon from "@repo/ui/icons/pen-icon";
import { Loader2 } from "lucide-react";
import { confirmFileUpload, getPresignedUploadURL } from "#/lib/server/parties";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 4 / Step 12: Clear passport photograph upload */
export const Step4 = () => {
  const { avatarUrl, setAvatarUrl, isUploading, setIsUploading, user, setSubmitError } = useApplyContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setSubmitError?.(null);

    try {
      const res = await getPresignedUploadURL({
        data: {
          original_name: rawFile.name,
          mime_type: rawFile.type,
          file_size: rawFile.size,
          folder: "avatars",
          is_public: true,
        },
      });

      if (res && res.success && res.data) {
        const { upload_url, public_url, file_id } = res.data;
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": rawFile.type,
          },
          body: rawFile,
        });

        if (!putRes.ok) {
          await confirmFileUpload({ data: { id: file_id, success: false } });
          throw new Error("Failed to upload image file to storage");
        }

        await confirmFileUpload({ data: { id: file_id, success: true } });
        setAvatarUrl(public_url);
      } else {
        throw new Error("Presigned URL retrieval failed");
      }
    } catch (err) {
      console.warn("R2 upload failed, falling back to base64 preview:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
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

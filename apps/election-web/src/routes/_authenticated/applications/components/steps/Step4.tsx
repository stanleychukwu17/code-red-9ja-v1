import { Button } from "@repo/ui/components/button";
import PenIcon from "@repo/ui/icons/pen-icon";
import { Loader2 } from "lucide-react";
import { StepHeader } from "./shared/StepHeader";

/** Step 4: Clear passport photograph upload */
export const Step4 = ({
  avatarUrl,
  isUploading,
  handleUploadClick,
  fileInputRef,
  handleFileChange,
}: any) => (
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
        {avatarUrl ? (
          <div className="w-full h-full rounded-full overflow-hidden bg-c-10">
            <img
              src={avatarUrl}
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

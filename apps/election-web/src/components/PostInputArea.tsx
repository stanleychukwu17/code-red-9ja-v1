import { X } from "lucide-react";
import { Textarea } from "@repo/ui/components/input";
import { VideoPreview } from "#/components/VideoPreview";
import { AppAvatar } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";

interface MediaFile {
  url: string;
  type: "image" | "video";
  file: File;
}

interface PostInputAreaProps {
  reportText: string;
  setReportText: (text: string) => void;
  placeholder?: string;
  selectedTags: string[];
  removeTag: (tag: string) => void;
  mediaFiles: MediaFile[];
  removeMedia: (index: number) => void;
  userAvatar?: string;
  isReport?: boolean;
}

export function PostInputArea({
  reportText,
  setReportText,
  placeholder = "Give situation report",
  selectedTags,
  removeTag,
  mediaFiles,
  removeMedia,
  userAvatar,
  isReport,
}: PostInputAreaProps) {
  return (
    <div className="flex gap-2 mt-2 px-4 pb-20">
      <AppAvatar
        src={userAvatar}
        alt="Profile Image"
        className="size-10 rounded-full object-cover shrink-0"
      />
      <div className="flex flex-col w-full">
        <Textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          className={cn(
            "text-xl font-medium",
            isReport && "text-red placeholder:text-red/50",
          )}
          placeholder={placeholder}
          autoFocus
        />

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedTags.map((tag) => (
              <div
                key={tag}
                className="bg-[#EAEAEA] rounded-[8px] py-1.5 px-3 flex items-center gap-2"
              >
                <span className="text-neutral-800 text-[14.5px] font-medium">
                  {tag}
                </span>
                <button onClick={() => removeTag(tag)}>
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Media Previews */}
        {mediaFiles.length > 0 && (
          <div className="mt-2 flex flex-col gap-3">
            {mediaFiles.map((m, i) =>
              m.type === "video" ? (
                <VideoPreview
                  key={i}
                  videoFile={m}
                  removeVideo={() => removeMedia(i)}
                />
              ) : (
                <div
                  key={i}
                  className="relative rounded-[20px] overflow-hidden w-full h-[320px]"
                >
                  <img
                    src={m.url}
                    alt="Media preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-4 right-4 bg-black/50 rounded-full p-2 backdrop-blur-sm"
                    onClick={() => removeMedia(i)}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

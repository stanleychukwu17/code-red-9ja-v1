import { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Video,
  Paperclip,
  Send,
  X,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { AppAvatar } from "@repo/ui/components/avatar";
import { useAuth } from "#/hooks";

export type CampaignGroupFeedComposerProps = {
  partyId?: string | number;
  groupId?: string | number;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  onSubmitPost?: (data: {
    content: string;
    postType: string;
    mediaFiles?: File[];
  }) => void;
  isSubmitting?: boolean;
  className?: string;
};

const POST_TYPES = [
  { id: "standard", label: "Update" },
  { id: "announcement", label: "Announcement" },
  { id: "rally_alert", label: "Rally Alert" },
  { id: "directive", label: "Directive" },
];

export function CampaignGroupFeedComposer({
  currentUserAvatar,
  currentUserName,
  onSubmitPost,
  isSubmitting = false,
  className,
}: CampaignGroupFeedComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("standard");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAvatar =
    currentUserAvatar ||
    user?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop";
  const activeName =
    currentUserName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Campaign Member";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() && selectedFiles.length === 0) return;

    onSubmitPost?.({
      content: content.trim(),
      postType: selectedType,
      mediaFiles: selectedFiles.map((item) => item.file),
    });

    setContent("");
    setSelectedFiles([]);
  };

  return (
    <div
      className={cn(
        "rounded-3xl bg-[#f8f9fc] dark:bg-card/50 border border-slate-100 dark:border-border/60 p-5 sm:p-6 space-y-4 shadow-xs",
        className,
      )}
    >
      {/* 1. Top Section: Avatar & Input Area */}
      <div className="flex items-start gap-3.5 sm:gap-4">
        <AppAvatar
          src={activeAvatar}
          alt={activeName}
          className="size-11 sm:size-12 rounded-full shrink-0 ring-2 ring-background mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-[#eef2f8] dark:bg-muted/70 p-3.5 sm:p-4 focus-within:ring-2 focus-within:ring-lime-300 dark:focus-within:ring-lime-400/40 transition-all">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in your campaign unit? Share an update, alert, or strategy note..."
              rows={2}
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/75 resize-none leading-relaxed"
            />

            {/* Media previews if files selected */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-2.5">
                {selectedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border border-border/40 shrink-0 group"
                  >
                    <img
                      src={item.preview}
                      alt="Attachment preview"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Post Type / Hashtags Selector */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pl-14 sm:pl-16">
        {POST_TYPES.map((type) => {
          const isActive = selectedType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                isActive
                  ? "bg-[#c6f987] text-neutral-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground",
              )}
            >
              # {type.label}
            </button>
          );
        })}
      </div>

      {/* 3. Bottom Action Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-3">
        {/* Attachment Options */}
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-muted text-xs font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <ImageIcon className="size-4 text-emerald-500 stroke-[2]" />
            <span>Photo</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-muted text-xs font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <Video className="size-4 text-sky-500 stroke-[2]" />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-muted text-xs font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <Paperclip className="size-4 text-amber-500 stroke-[2]" />
            <span>Attach</span>
          </button>
        </div>

        {/* Right: Visibility Badge & Submit Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Users className="size-3 text-muted-foreground" />
            <span>Group Members</span>
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0)}
            className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-[#c6f987] hover:bg-[#b8f573] active:scale-95 text-neutral-900 font-bold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="size-3.5 stroke-[2.5]" />
            <span>{isSubmitting ? "Posting..." : "Post"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


import { AppAvatar } from "@repo/ui/components/avatar";
import { format } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, VideoIcon } from "lucide-react";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import {
  PostActionButton,
  ReelNavButtons,
  ReelShell,
  UploaderRow,
  useReelKeyboard,
} from "./reel-shared";

export type UpdateReelItem = {
  id?: number | string;
  polling_unit_name?: string;
  polling_unit_id?: number | string;
  lga_name?: string;
  state_name?: string;
  ward_name?: string;
  user_avatar?: string;
  uploader_name?: string;
  /** Array of image or video URLs */
  media_urls?: string[];
  created_at?: string;
  /** Optional free-text message from the agent */
  message?: string;
  [key: string]: any;
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function UpdateReelSidebar({
  result,
  locationStr,
  displayTime,
}: {
  result: UpdateReelItem;
  locationStr: string;
  displayTime: string;
}) {
  return (
    <div className="w-[350px] flex-shrink-0 flex flex-col h-full relative">
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-bold tracking-wider">UPDATE</h2>
      </div>

      {/* Message */}
      {result.message && (
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {result.message}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 pt-4 pb-8 space-y-4 mt-auto">
        <div className="flex items-start gap-4">
          <PollingUnitIcon className="size-8 mb-2" />
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="leading-5 font-medium">
              {result.polling_unit_name ||
                `PU ${result.polling_unit_id || ""}`}
            </h3>
            {locationStr && (
              <p className="text-sm text-white/60">{locationStr}</p>
            )}
          </div>
        </div>
        <UploaderRow
          avatarSrc={result.user_avatar}
          name={result.uploader_name}
          time={displayTime}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media carousel item
// ---------------------------------------------------------------------------

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url);
}

function MediaSlide({
  url,
  index,
  total,
}: {
  url: string;
  index: number;
  total: number;
}) {
  if (isVideo(url)) {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="max-h-[85vh] lg:max-w-[600px] w-full object-contain rounded-xl shadow-2xl"
      />
    );
  }
  return (
    <img
      src={url}
      alt={`Media ${index + 1} of ${total}`}
      className="max-h-[85vh] lg:max-w-[600px] w-full object-contain rounded-xl shadow-2xl"
    />
  );
}

// ---------------------------------------------------------------------------
// Main reel
// ---------------------------------------------------------------------------

export function UpdateReel({
  result,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: {
  result: UpdateReelItem;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [mediaIndex, setMediaIndex] = useState(0);

  useReelKeyboard({ hasNext, hasPrev, onNext, onPrev, onClose });

  const mediaUrls: string[] = result.media_urls?.filter(Boolean) ?? [];
  const currentUrl = mediaUrls[mediaIndex];
  const hasMultipleMedia = mediaUrls.length > 1;

  const displayTime = result.created_at
    ? format(new Date(result.created_at), "h:mm a · MMM d, yyyy")
    : "";

  const locationStr = [result.state_name, result.lga_name, result.ward_name]
    .filter(Boolean)
    .join(" · ");

  const goToPrevMedia = () =>
    setMediaIndex((i) => Math.max(0, i - 1));
  const goToNextMedia = () =>
    setMediaIndex((i) => Math.min(mediaUrls.length - 1, i + 1));

  // Count images vs videos for the action labels
  const imageCount = mediaUrls.filter((u) => !isVideo(u)).length;
  const videoCount = mediaUrls.filter(isVideo).length;

  return (
    <ReelShell
      onClose={onClose}
      sidebar={
        isSidebarVisible ? (
          <UpdateReelSidebar
            result={result}
            locationStr={locationStr}
            displayTime={displayTime}
          />
        ) : undefined
      }
    >
      <div className="flex items-end gap-5 py-10">
        {/* Media area */}
        <div className="relative flex flex-col items-center gap-3">
          {currentUrl ? (
            <MediaSlide
              url={currentUrl}
              index={mediaIndex}
              total={mediaUrls.length}
            />
          ) : (
            <div className="h-64 w-64 flex items-center justify-center rounded-xl bg-white/5 text-white/30">
              No media
            </div>
          )}

          {/* Inline carousel controls when there are multiple media */}
          {hasMultipleMedia && (
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={goToPrevMedia}
                disabled={mediaIndex === 0}
                className={`p-2 rounded-full transition ${
                  mediaIndex === 0
                    ? "text-white/20 cursor-not-allowed"
                    : "text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                }`}
              >
                <ChevronLeft className="size-5" />
              </button>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5">
                {mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setMediaIndex(i)}
                    className={`size-2 rounded-full transition ${
                      i === mediaIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goToNextMedia}
                disabled={mediaIndex === mediaUrls.length - 1}
                className={`p-2 rounded-full transition ${
                  mediaIndex === mediaUrls.length - 1
                    ? "text-white/20 cursor-not-allowed"
                    : "text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                }`}
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>

        {/* Right action column */}
        <div className="flex flex-col gap-5 items-center">
          <PostActionButton
            icon={<ImageIcon className="size-6 text-white" />}
            label={`${imageCount} photo${imageCount !== 1 ? "s" : ""}`}
          />
          {videoCount > 0 && (
            <PostActionButton
              icon={<VideoIcon className="size-6 text-white" />}
              label={`${videoCount} video${videoCount !== 1 ? "s" : ""}`}
            />
          )}

          {/* Sidebar toggle */}
          <PostActionButton
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="size-6 text-white"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            }
            label={isSidebarVisible ? "Hide info" : "Show info"}
            onClick={() => setIsSidebarVisible((v) => !v)}
          />

          <AppAvatar
            src={result.user_avatar || ""}
            alt={result.uploader_name || ""}
            className="size-10"
          />
        </div>
      </div>

      <ReelNavButtons
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={onNext}
        onPrev={onPrev}
      />
    </ReelShell>
  );
}

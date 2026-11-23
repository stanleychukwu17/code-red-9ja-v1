import { Button } from "@repo/ui/components/button";
import {
  Camera,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Video,
  X,
} from "lucide-react";

/** Represents a captured media file and its preview blob URL */
export type MediaFile = {
  url: string;
  type: "image" | "video";
  file: File;
};

export type ElectionMediaState = {
  image?: MediaFile;
  video?: MediaFile;
};

type ElectionResultCardProps = {
  election: { id: number; name: string };
  media?: ElectionMediaState;
  isSubmitted: boolean;
  isQueuedOffline: boolean;
  isSubmittingThis: boolean;
  isSubmitDisabled: boolean;
  onTriggerMedia: (type: "image" | "video") => void;
  onRemoveMedia: (type: "image" | "video") => void;
  onSubmit: () => void;
}

export function ElectionResultCard({
  election,
  media,
  isSubmitted,
  isQueuedOffline,
  isSubmittingThis,
  isSubmitDisabled,
  onTriggerMedia,
  onRemoveMedia,
  onSubmit,
}: ElectionResultCardProps) {
  return (
    <div className="bg-sidebar-mobile/60 rounded-2xl p-4 flex flex-col gap-4">
      {/* Election title & status */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-c-90">{election.name}</h3>
        {isSubmitted ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
            <CheckCircle2 className="size-3.5" />
            Submitted
          </span>
        ) : isQueuedOffline ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1 rounded-full shrink-0">
            <CloudUpload className="size-3.5" />
            Queued offline
          </span>
        ) : null}
      </div>

      {/* Selected image/video previews */}
      {(media?.image || media?.video) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {media.image && (
            <div className="relative rounded-xl overflow-hidden border border-c-20 bg-neutral-100">
              <img
                src={media.image.url}
                alt={`${election.name} result sheet`}
                className="w-full h-40 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveMedia("image")}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {media.video && (
            <div className="relative rounded-xl overflow-hidden border border-c-20 bg-black">
              <video
                src={media.video.url}
                controls
                playsInline
                className="w-full h-40 object-contain"
              />
              <button
                type="button"
                onClick={() => onRemoveMedia("video")}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition"
                aria-label="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video tip */}
      <p className="text-xs text-c-60">
        Tip: Record a short 5-10s video of the signed sheet for faster upload, verification &amp; reward.
      </p>

      {/* Upload Image & Upload Video buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full h-11 font-semibold gap-2 text-sm text-c-90 border-sidebar-mobile dark:border-c-30"
          disabled={isSubmittingThis}
          onClick={() => onTriggerMedia("image")}
        >
          <Camera className="size-4" />
          {media?.image ? "Change Image" : "Upload Image"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full h-11 font-semibold gap-2 text-sm text-c-90 border-sidebar-mobile dark:border-c-30"
          disabled={isSubmittingThis}
          onClick={() => onTriggerMedia("video")}
        >
          <Video className="size-4 text-emerald-500! fill-emerald-500" />
          {media?.video ? "Change Video" : "Upload Video"}
        </Button>
      </div>

      {/* Submit button when image is ready */}
      {media?.image && (
        <Button
          type="button"
          variant="black"
          className="w-full rounded-full h-11 font-semibold"
          disabled={isSubmitDisabled}
          onClick={onSubmit}
        >
          {isSubmittingThis ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Submit ${election.name}`
          )}
        </Button>
      )}
    </div>
  );
}

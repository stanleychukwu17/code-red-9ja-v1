import { X } from "lucide-react";

interface VideoPreviewProps {
  videoFile: { url: string; file: File } | null;
  removeVideo: () => void;
  demoVideoUrl?: string;
}

export function VideoPreview({
  videoFile,
  removeVideo,
  demoVideoUrl,
}: VideoPreviewProps) {
  return (
    <div className="mt-6">
      {!videoFile ? (
        <div className="rounded-[20px] overflow-hidden w-full relative bg-neutral-100">
          {demoVideoUrl && (
            <video
              src={demoVideoUrl}
              className="w-full object-cover"
              autoPlay
              loop
              controls
              playsInline
            />
          )}
          <div className="absolute inset-0 pointer-events-none" />
        </div>
      ) : (
        <div className="relative rounded-[20px] overflow-hidden w-full bg-black">
          <video
            src={videoFile.url}
            className="w-full h-full object-contain max-h-[60vh]"
            controls
            playsInline
          />
          <button
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 transition-colors rounded-full p-2 backdrop-blur-sm z-10"
            onClick={removeVideo}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

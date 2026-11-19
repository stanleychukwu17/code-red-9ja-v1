import { useRef, useState, useEffect } from "react";
import { Video, FileImage, AudioLines, Mic, Play, Pause, X } from "lucide-react";
import { toast } from "sonner";

export type AttachedMedia = {
  url: string;
  type: "image" | "video" | "audio";
  file: File | Blob;
  name: string;
  durationSeconds?: number;
};

export type MediaAttachmentActionsProps = {
  mediaList: AttachedMedia[];
  onMediaListChange: (updater: (prev: AttachedMedia[]) => AttachedMedia[]) => void;
};

export function MediaAttachmentActions({
  mediaList,
  onMediaListChange,
}: MediaAttachmentActionsProps) {
  // Hidden native file input refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRecordInputRef = useRef<HTMLInputElement>(null);

  // Audio preview playback instance
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup active audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Format bytes for human-readable media size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Append files selected from native picker
  const handleFilesAdded = (files: FileList | null, type: "image" | "video" | "audio") => {
    if (!files || files.length === 0) return;
    const added: AttachedMedia[] = Array.from(files).map((f) => ({
      url: URL.createObjectURL(f),
      type,
      file: f,
      name: f.name,
    }));
    onMediaListChange((prev) => [...prev, ...added]);
  };

  // Remove attached media item and stop if playing
  const removeMedia = (index: number) => {

    onMediaListChange((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (target) {
        if (target.url === playingAudioUrl) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
          }
          setPlayingAudioUrl(null);
        }
        URL.revokeObjectURL(target.url);
        copy.splice(index, 1);
      }

      return copy;
    });
  };

  // Synchronous, direct Audio instance playback inside user click gesture
  const togglePlayAudio = (url: string) => {
    // If clicking current playing audio, pause and reset
    if (playingAudioUrl === url) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingAudioUrl(null);
      return;
    }

    // Stop previous audio playback if active
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    try {
      const audio = new Audio(url);
      audio.volume = 1.0;
      audioPlayerRef.current = audio;
      setPlayingAudioUrl(url);

      audio.onended = () => {
        setPlayingAudioUrl(null);
        audioPlayerRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        toast.error("Could not play audio. File format or output device unsupported.");
        setPlayingAudioUrl(null);
        audioPlayerRef.current = null;
      };

      // Play explicitly within click gesture to comply with browser autoplay policy
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Audio play error:", err);
          toast.error(`Playback failed: ${err.message}`);
          setPlayingAudioUrl(null);
          audioPlayerRef.current = null;
        });
      }
    } catch (err: any) {
      toast.error(`Playback failed: ${err?.message || "Unknown error"}`);
      setPlayingAudioUrl(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs for camera / gallery / audio uploads */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          handleFilesAdded(e.target.files, "video");
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesAdded(e.target.files, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          handleFilesAdded(e.target.files, "audio");
          e.target.value = "";
        }}
      />
      {/* Native microphone recorder capture input */}
      <input
        ref={audioRecordInputRef}
        type="file"
        accept="audio/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          handleFilesAdded(e.target.files, "audio");
          e.target.value = "";
        }}
      />

      {/* Media Attachments Preview List */}
      {mediaList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Attachments ({mediaList.length})
          </p>
          <div className="flex flex-wrap gap-2.5">
            {mediaList.map((m, idx) => (
              <div
                key={idx}
                className="relative group rounded-xl border border-border bg-card p-1.5 flex items-center gap-2 pr-7 overflow-hidden text-xs"
              >
                {m.type === "image" && (
                  <img
                    src={m.url}
                    alt={m.name}
                    className="size-10 object-cover rounded-lg"
                  />
                )}

                {m.type === "video" && (
                  <video
                    src={m.url}
                    className="size-10 object-cover rounded-lg bg-black"
                  />
                )}

                {m.type === "audio" && (
                  <button
                    type="button"
                    onClick={() => togglePlayAudio(m.url)}
                    className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  >
                    {playingAudioUrl === m.url ? (
                      <Pause className="size-4 animate-pulse" />
                    ) : (
                      <Play className="size-4 ml-0.5" />
                    )}
                  </button>
                )}

                <div className="flex flex-col min-w-0 pr-1">
                  <span className="max-w-30 truncate font-medium">
                    {m.name}
                  </span>
                  {"size" in m.file && m.file.size > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatFileSize(m.file.size)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeMedia(idx)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Four Media Action Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {/* Upload video */}
        <div className="w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-full text-sm font-semibold bg-muted text-foreground transition cursor-pointer text-center"
          >
            <Video className="size-5 text-emerald-600 fill-emerald-600 shrink-0" />
            <span>upload video</span>
          </button>
        </div>

        {/* Upload images */}
        <div className="w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-full text-sm font-semibold bg-muted text-foreground transition cursor-pointer text-center"
          >
            <FileImage className="size-5 text-foreground shrink-0" />
            <span>upload images</span>
          </button>
        </div>

        {/* Upload audio */}
        <div className="w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-full text-sm font-semibold bg-muted text-foreground transition cursor-pointer text-center"
          >
            <AudioLines className="size-5 text-foreground shrink-0" />
            <span>upload audio</span>
          </button>
        </div>

        {/* Record audio via native OS recorder */}
        <div className="w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => audioRecordInputRef.current?.click()}
            title="Record audio via phone microphone"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-full text-sm font-semibold bg-muted text-foreground transition cursor-pointer text-center"
          >
            <Mic className="size-4 text-rose-500 shrink-0" />
            <span>record audio</span>
          </button>
        </div>
      </div>
    </div>
  );
}

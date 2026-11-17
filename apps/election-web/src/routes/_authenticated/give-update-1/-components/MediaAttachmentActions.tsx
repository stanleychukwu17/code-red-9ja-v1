import { useRef, useState, useEffect } from "react";
import { Video, FileImage, AudioWaveform, Mic, Square, Play, Pause, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export type AttachedMedia = {
  url: string;
  type: "image" | "video" | "audio";
  file: File | Blob;
  name: string;
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

  // Live audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // Live mic input volume 0-100
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio preview playback instance
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup timers, audio contexts, and active playback on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Format recording timer seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

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
      if (copy[index]) {
        if (copy[index].url === playingAudioUrl) {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
          }
          setPlayingAudioUrl(null);
        }
        URL.revokeObjectURL(copy[index].url);
        copy.splice(index, 1);
      }
      return copy;
    });
  };

  // Start live microphone voice recording with real-time volume level meter
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Prevents aggressive noise gate from muting voice
          autoGainControl: true,
        },
      });

      // Detect supported audio mimeType across Chrome, Safari/iOS, and Firefox
      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const extension = actualMimeType.includes("mp4") ? "m4a" : actualMimeType.includes("ogg") ? "ogg" : "webm";
        const cleanType = actualMimeType.split(";")[0] ?? actualMimeType; // Clean container type for blob player compatibility
        const audioBlob = new Blob(audioChunksRef.current, { type: cleanType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const fileName = `voice-note-${Date.now()}.${extension}`;

        if (audioBlob.size === 0) {
          toast.error("Audio recording was empty (0 bytes)");
          return;
        }

        onMediaListChange((prev) => [
          ...prev,
          {
            url: audioUrl,
            type: "audio",
            file: audioBlob,
            name: fileName,
          },
        ]);
        stream.getTracks().forEach((track) => track.stop());
      };

      // Set up real-time audio volume visualizer using Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] ?? 0;
            }
            const avg = sum / (dataArray.length || 1);
            const level = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(level);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          animFrameRef.current = requestAnimationFrame(checkVolume);
        }
      } catch (err) {
        console.warn("Audio meter init failed:", err);
      }

      // Collect data chunks continuously
      mediaRecorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied or unavailable");
    }
  };

  // Stop live recording session
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.requestData();
        }
      } catch {}
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
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
        onChange={(e) => handleFilesAdded(e.target.files, "video")}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesAdded(e.target.files, "image")}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFilesAdded(e.target.files, "audio")}
      />
      {/* Active Recording Banner with real-time mic volume level */}
      {isRecording && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Recording voice note...</span>
                <span className="text-xs font-mono font-bold">
                  {formatTime(recordingSeconds)}
                </span>
              </div>
              {/* Live sound level bars */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground mr-1">Mic level:</span>
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, idx) => (
                  <span
                    key={idx}
                    className={`inline-block w-1 rounded-full transition-all duration-75 ${
                      audioLevel / 100 >= threshold * 0.25
                        ? "h-3.5 bg-emerald-500"
                        : "h-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
                {recordingSeconds > 2 && audioLevel < 2 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                    (No sound detected — check mic/unmute)
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="h-7 px-2.5 text-xs font-bold flex items-center gap-1 rounded-lg shrink-0 cursor-pointer"
          >
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        </div>
      )}

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
                  <span className="max-w-[120px] truncate font-medium">
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

      {/* Three Media Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        {/* Upload video */}
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition cursor-pointer"
        >
          <Video className="size-5 text-emerald-600 fill-emerald-600" />
          <span>upload video</span>
        </button>

        {/* Upload images */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition cursor-pointer"
        >
          <FileImage className="size-5 text-foreground" />
          <span>upload images</span>
        </button>

        {/* Upload audio */}
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition cursor-pointer"
        >
          <AudioWaveform className="size-5 text-foreground" />
          <span>upload audio</span>
        </button>

        {/* Live mic record trigger */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? "Stop recording" : "Record voice note"}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm font-semibold transition cursor-pointer ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-muted hover:bg-muted/80 text-foreground"
          }`}
        >
          <Mic className="size-4" />
          <span>{isRecording ? "recording..." : "record audio"}</span>
        </button>
      </div>
    </div>
  );
}

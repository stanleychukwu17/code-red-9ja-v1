import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  TriangleAlert,
  X,
  Loader2,
  Camera,
  Video,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "#/hooks/useAuth";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { submitPollingUnitResult } from "#/lib/server/polling_unit_results";
import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { getElectionsByGroup } from "#/lib/server/elections";
import { VideoPreview } from "#/components/VideoPreview";

export const Route = createFileRoute("/_authenticated/upload-result/")({
  component: UploadResultComponent,
});

type MediaFile = {
  url: string;
  type: "image" | "video";
  file: File;
  role: "result_sheet_image" | "result_sheet_video";
};

// ── Main Component ─────────────────────────────────────────────────────────

function UploadResultComponent() {
  const navigate = useNavigate();
  const {
    user,
    selectedElectionGroup,
    selectedElection,
    selectedAssignment,
    pollingUnitId,
  } = useAuth();

  // ── Elections for the selected group ──
  const { data: electionsData } = useQuery({
    queryKey: ["groupElections", selectedElectionGroup?.id],
    enabled: !!selectedElectionGroup?.id,
    queryFn: async () => {
      const res = await getElectionsByGroup({ data: selectedElectionGroup.id });
      if (!res?.success || !res.data?.elections) return [];
      return res.data.elections as any[];
    },
  });

  // ── Media ──
  const [resultSheetImage, setResultSheetImage] = useState<MediaFile | null>(
    null,
  );
  const [resultSheetVideo, setResultSheetVideo] = useState<MediaFile | null>(
    null,
  );

  const sheetImageRef = useRef<HTMLInputElement>(null);
  const sheetVideoRef = useRef<HTMLInputElement>(null);

  // ── File capture ──
  const handleSheetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage({
      url: URL.createObjectURL(file),
      type: "image",
      file,
      role: "result_sheet_image",
    });
    e.target.value = "";
  };

  const handleSheetVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (resultSheetVideo) URL.revokeObjectURL(resultSheetVideo.url);
    setResultSheetVideo({
      url: URL.createObjectURL(file),
      type: "video",
      file,
      role: "result_sheet_video",
    });
    e.target.value = "";
  };

  const removeSheetImage = () => {
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage(null);
    if (sheetImageRef.current) sheetImageRef.current.value = "";
  };

  const removeSheetVideo = () => {
    if (resultSheetVideo) URL.revokeObjectURL(resultSheetVideo.url);
    setResultSheetVideo(null);
    if (sheetVideoRef.current) sheetVideoRef.current.value = "";
  };

  // ── Upload helper ──
  const uploadFile = async (mediaFile: MediaFile): Promise<string> => {
    const res = await getPresignedUploadURL({
      data: {
        original_name: mediaFile.file.name,
        mime_type: mediaFile.file.type,
        file_size: mediaFile.file.size,
        folder: "results",
        is_public: true,
      },
    });
    if (!res.success || !res.data)
      throw new Error("Failed to initiate file upload");

    const { upload_url, public_url, file_id } = res.data;

    const putRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": mediaFile.file.type },
      body: mediaFile.file,
    });

    if (!putRes.ok) {
      await confirmFileUpload({ data: { id: file_id, success: false } });
      throw new Error("Failed to upload file to storage");
    }

    await confirmFileUpload({ data: { id: file_id, success: true } });
    return public_url;
  };

  // ── Submit ──
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedElectionGroup?.id) {
        throw new Error(
          "No active election group. Please select one from the home screen.",
        );
      }
      if (!selectedElection?.id) {
        throw new Error("Please select an election.");
      }
      if (!resultSheetImage) {
        throw new Error("Please take a photo of the result sheet.");
      }

      // Upload result sheet image (required)
      const imageUrl = await uploadFile(resultSheetImage);

      // Upload result sheet video (optional)
      let videoUrl: string | undefined;
      if (resultSheetVideo) {
        videoUrl = await uploadFile(resultSheetVideo);
      }

      const payload: Parameters<typeof submitPollingUnitResult>[0]["data"] = {
        election_id: selectedElection.id,
        election_group_id: selectedElectionGroup.id,
        polling_unit_id: pollingUnitId ?? 0,
        result_sheet_image_url: imageUrl,
        result_sheet_video_url: videoUrl,
      };

      // Attach assignment if available
      if (selectedAssignment?.id) {
        payload.assignment_id = selectedAssignment.id;
      }

      if (!payload.polling_unit_id || payload.polling_unit_id <= 0) {
        throw new Error(
          "Polling unit could not be determined. Make sure you have an active assignment, or contact support.",
        );
      }

      const res = await submitPollingUnitResult({ data: payload });
      if (!res.success) {
        throw new Error(res.message || "Failed to submit result");
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Election result submitted successfully!");
      navigate({ to: "/home" });
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred");
    },
  });

  const isSubmitting = submitMutation.isPending;
  const canSubmit = !!resultSheetImage;

  return (
    <div className="flex flex-col relative w-full min-h-screen bg-white">
      <PageHeader />

      <div className="px-4 pb-36 space-y-6 mt-2">
        {/* Title */}
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 leading-tight">
            Upload Election Result
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {selectedAssignment
              ? `You are submitting as a polling agent assigned to ${selectedAssignment.polling_unit_name ?? "your polling unit"}.`
              : "You are submitting as a citizen observer. Your result will be cross-referenced with others."}
          </p>
        </div>

        {/* Election selector */}
        {/* <Section title="Select Election">
          {!electionsData || electionsData.length === 0 ? (
            <InfoCard
              icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
              text="No elections found for the selected election group. Please select an election group on the home screen."
            />
          ) : (
            <div className="space-y-2">
              {electionsData.map((election: any) => (
                <button
                  key={election.id}
                  type="button"
                  onClick={() => handleElectionSelect(election.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                    selectedElectionId === election.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-neutral-900">
                        {election.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 capitalize">
                        {election.scope} • {election.office_name}
                      </p>
                    </div>
                    {selectedElectionId === election.id && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section> */}

        {/* Result sheet image (required) */}
        <Section title="Result Sheet Photo *">
          <p className="text-xs text-neutral-500 mb-3">
            Take a clear photo of the official INEC EC8A result sheet. Gemini AI
            will scan this to verify your submission.
          </p>

          {!resultSheetImage ? (
            <>
              <InfoCard
                icon={<TriangleAlert className="w-4 h-4 text-amber-500" />}
                text="Ensure the entire sheet is visible. Blurry or partial photos may cause your submission to be disputed."
              />
              <button
                type="button"
                onClick={() => sheetImageRef.current?.click()}
                className="mt-3 w-full flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                <Camera className="w-8 h-8 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-500">
                  Tap to take photo
                </span>
              </button>
            </>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 h-52 bg-neutral-100">
              <img
                src={resultSheetImage.url}
                alt="Result sheet"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => sheetImageRef.current?.click()}
                  className="text-xs bg-white/90 text-neutral-800 font-semibold rounded-full px-3 py-1.5"
                >
                  Retake
                </button>
              </div>
              <button
                type="button"
                onClick={removeSheetImage}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </Section>

        {/* Result sheet video (optional evidence) */}
        <Section title="On-Site Evidence Video (Optional)">
          <p className="text-xs text-neutral-500 mb-3">
            Record a short video at the polling unit as proof the result was
            taken on-site. This strengthens your submission.
          </p>

          {!resultSheetVideo ? (
            <button
              type="button"
              onClick={() => sheetVideoRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
            >
              <Video className="w-7 h-7 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-500">
                Tap to record video
              </span>
            </button>
          ) : (
            <VideoPreview
              videoFile={
                resultSheetVideo
                  ? { url: resultSheetVideo.url, file: resultSheetVideo.file }
                  : null
              }
              removeVideo={removeSheetVideo}
            />
          )}
        </Section>
      </div>

      {/* Sticky footer */}
      <StickyFooter>
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => submitMutation.mutate()}
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
              Submitting result…
            </>
          ) : (
            "Submit Result"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="4xl"
          className="w-full"
          onClick={() => navigate({ to: "/home" })}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </StickyFooter>

      {/* Hidden file inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={sheetImageRef}
        onChange={handleSheetImageChange}
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        ref={sheetVideoRef}
        onChange={handleSheetVideoChange}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
  collapsible = false,
  open = true,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">
          {title}
        </h2>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            className="text-neutral-400 hover:text-neutral-600 transition"
          >
            {open ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {(!collapsible || open) && children}
    </div>
  );
}

function InfoCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <p className="text-xs text-amber-800 font-medium leading-relaxed">
        {text}
      </p>
    </div>
  );
}

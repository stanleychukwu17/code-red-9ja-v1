import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  X,
  CalendarClock,
  Camera,
  Video,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { PageWrapper } from "#/components/Wrappers";
import {
  getPollingUnitResults,
  submitPollingUnitResult,
} from "#/lib/server/polling_unit_results";
import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";

/**
 * Route definition for EC8A polling unit result sheet photo & video upload.
 */
export const Route = createFileRoute("/_authenticated/upload-result/")({
  component: UploadResultFlow,
});

/** Represents a captured media file and its preview blob URL */
type MediaFile = {
  url: string;
  type: "image" | "video";
  file: File;
};

type ElectionMediaState = {
  image?: MediaFile;
  video?: MediaFile;
};

/**
 * Two-Step Result Sheet Upload Flow for Polling Agents.
 *
 * Step 1: Visual guidance & example of a clear INEC Form EC8A capture.
 * Step 2: List of elections under the agent's watch, each with dedicated
 *         Upload Image and Upload Video actions plus submission status.
 */
function UploadResultFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch() as any;

  const { selectedElectionGroup, electionDay } = useElection();
  const { pollingUnitAssignment, pollingUnitId, elections: assignedElections, isLoading: assignmentsLoading } = useAssignments();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Per-election selected image/video files keyed by election ID
  const [mediaByElection, setMediaByElection] = useState<
    Record<number, ElectionMediaState>
  >({});
  const mediaByElectionRef = useRef(mediaByElection);
  mediaByElectionRef.current = mediaByElection;
  const [activeElectionId, setActiveElectionId] = useState<number | null>(null);
  const [submittingElectionId, setSubmittingElectionId] = useState<
    number | null
  >(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sort elections under the user's watch by rank
  const elections = useMemo(() => {
    return [...(assignedElections || [])].sort(
      (a, b) => (a.rank || 0) - (b.rank || 0),
    );
  }, [assignedElections]);

  // Fetch already-submitted results for this polling unit & election group
  const { data: existingResultsRes } = useQuery({
    queryKey: [
      "pollingUnitResults",
      selectedElectionGroup?.id,
      pollingUnitId,
    ],
    enabled: !!selectedElectionGroup?.id && !!pollingUnitId,
    queryFn: () =>
      getPollingUnitResults({
        data: {
          election_group_id: selectedElectionGroup!.id,
          polling_unit_id: pollingUnitId!,
          limit: 50,
        },
      }),
  });

  const submittedElectionIds = useMemo(() => {
    const ids = new Set<number>();
    const list = existingResultsRes?.data?.results || existingResultsRes?.data;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item?.election_id) ids.add(Number(item.election_id));
      }
    }
    return ids;
  }, [existingResultsRes]);

  // Reset scroll position when switching steps
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Cleanup any created object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(mediaByElectionRef.current).forEach((entry) => {
        if (entry.image) URL.revokeObjectURL(entry.image.url);
        if (entry.video) URL.revokeObjectURL(entry.video.url);
      });
    };
  }, []);

  const triggerMediaPicker = (electionId: number, type: "image" | "video") => {
    if (search.isPractice) {
      const dummyFile = new File(["dummy"], `practice.${type === "image" ? "jpg" : "mp4"}`, {
        type: type === "image" ? "image/jpeg" : "video/mp4",
      });
      setMediaByElection((prev) => ({
        ...prev,
        [electionId]: {
          ...prev[electionId],
          [type]: {
            url: "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp",
            type,
            file: dummyFile,
          },
        },
      }));
      return;
    }

    setActiveElectionId(electionId);
    if (type === "image") {
      imageInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  const handleMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = e.target.files?.[0];
    if (!file || activeElectionId === null) return;

    setMediaByElection((prev) => {
      const existing = prev[activeElectionId]?.[type];
      if (existing) URL.revokeObjectURL(existing.url);
      return {
        ...prev,
        [activeElectionId]: {
          ...prev[activeElectionId],
          [type]: {
            url: URL.createObjectURL(file),
            type,
            file,
          },
        },
      };
    });
    e.target.value = "";
  };

  const removeMedia = (electionId: number, type: "image" | "video") => {
    setMediaByElection((prev) => {
      const current = prev[electionId];
      if (!current?.[type]) return prev;
      URL.revokeObjectURL(current[type]!.url);
      const nextEntry = { ...current };
      delete nextEntry[type];
      return {
        ...prev,
        [electionId]: nextEntry,
      };
    });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate({ to: "/" });
    }
  };

  // Presigned S3/R2 storage upload pipeline
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

  // Mutation uploading image (and optional video) to storage and recording result submission
  const submitMutation = useMutation({
    mutationFn: async (electionId: number) => {
      if (!selectedElectionGroup?.id)
        throw new Error("No active election group.");

      const media = mediaByElection[electionId];
      if (!media?.image) {
        throw new Error("Please upload a result sheet image first.");
      }

      setSubmittingElectionId(electionId);

      const imageUrl = await uploadFile(media.image);
      const videoUrl = media.video ? await uploadFile(media.video) : undefined;

      const payload: Parameters<typeof submitPollingUnitResult>[0]["data"] = {
        election_id: electionId,
        election_group_id: selectedElectionGroup.id,
        polling_unit_id: pollingUnitId ?? 0,
        result_sheet_image_url: imageUrl,
      };

      if (videoUrl) {
        payload.result_sheet_video_url = videoUrl;
      }

      if (pollingUnitAssignment?.id) {
        payload.assignment_id = pollingUnitAssignment.id;
      }

      const res = await submitPollingUnitResult({ data: payload });
      if (!res.success) {
        throw new Error(res.message || "Failed to submit result");
      }
      return { electionId, res };
    },
    onSuccess: ({ electionId }) => {
      toast.success("Result submitted successfully!");
      removeMedia(electionId, "image");
      removeMedia(electionId, "video");
      queryClient.invalidateQueries({
        queryKey: ["pollingUnitResults", selectedElectionGroup?.id, pollingUnitId],
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred");
    },
    onSettled: () => {
      setSubmittingElectionId(null);
    },
  });

  // Guard: No active election group selected
  if (!selectedElectionGroup) {
    return (
      <div className="p-8 text-center text-neutral-500">
        No active election group.
      </div>
    );
  }

  // Guard: Results can only be uploaded on election day
  if (!electionDay) {
    return (
      <PageWrapper>
        <PageHeader onBackClick={() => navigate({ to: "/" })} />
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center max-w-md mx-auto space-y-4">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CalendarClock className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              Result Upload Unavailable
            </h2>
            <p className="text-sm text-muted-foreground">
              You can only upload election results on election day.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Back to Home
          </Button>
        </div>
      </PageWrapper>
    );
  }

  // Guard: Loading assigned elections
  if (assignmentsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Guard: No elections under watch
  if (elections.length === 0) {
    return (
      <PageWrapper>
        <PageHeader onBackClick={() => navigate({ to: "/" })} />
        <div className="p-8 text-center text-neutral-500">
          No eligible elections found under your watch.
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Top Header with step-aware back navigation */}
      <PageHeader onBackClick={handleBack} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        {/* STEP 1: Visual Guidance & Reference Example */}
        {step === 1 && (
          <div className="px-4 flex flex-col gap-6 max-w-160 mx-auto">
            <div className="space-y-2 mt-2">
              <TitleText
                text="Take a clear picture of the Final Result Sheet"
                size="lg"
                className="text-c-90"
              />
              <DescriptiveText
                text="It needs to be as clear as the perfect example below"
                size="sm"
              />
            </div>

            {/* Visual reference showing an ideal INEC Form EC8A capture */}
            <div className="space-y-3">
              <p className="text-[15px] font-bold text-c-80">
                Perfect Example:
              </p>
              <div className="rounded-2xl overflow-hidden border-[1.5px] border-c-90">
                <img
                  src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp"
                  alt="Result sheet example"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Elections Under Watch with Image & Video Upload Actions */}
        {step === 2 && (
          <div className="px-4 flex flex-col gap-5 max-w-160 mx-auto">
            <div className="space-y-1.5 mt-2">
              <TitleText
                text="Upload Election Results"
                size="lg"
                className="text-c-90"
              />
              <DescriptiveText
                text="Select each election under your watch to upload the result sheet image and optional video."
                size="sm"
              />
            </div>

            <div className="flex flex-col gap-4">
              {elections.map((election: any) => {
                const media = mediaByElection[election.id];
                const isSubmitted = submittedElectionIds.has(Number(election.id));
                const isSubmittingThis =
                  submitMutation.isPending && submittingElectionId === election.id;

                return (
                  <div
                    key={election.id}
                    className="rounded-2xl border border-c-20 bg-white p-4 flex flex-col gap-4 shadow-xs"
                  >
                    {/* Election title & status */}
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-c-90">
                        {election.name}
                      </h3>
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                          <CheckCircle2 className="size-3.5" />
                          Submitted
                        </span>
                      )}
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
                              onClick={() => removeMedia(election.id, "image")}
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
                              onClick={() => removeMedia(election.id, "video")}
                              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition"
                              aria-label="Remove video"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload Image & Upload Video buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-full h-11 font-semibold gap-2"
                        disabled={isSubmittingThis}
                        onClick={() => triggerMediaPicker(election.id, "image")}
                      >
                        <Camera className="size-4" />
                        {media?.image ? "Change Image" : "Upload Image"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-full h-11 font-semibold gap-2"
                        disabled={isSubmittingThis}
                        onClick={() => triggerMediaPicker(election.id, "video")}
                      >
                        <Video className="size-4" />
                        {media?.video ? "Change Video" : "Upload Video"}
                      </Button>
                    </div>

                    {/* Submit button when image is ready */}
                    {media?.image && (
                      <Button
                        type="button"
                        variant="black"
                        className="w-full rounded-full h-11 font-semibold"
                        disabled={submitMutation.isPending}
                        onClick={() => {
                          if (search.isPractice) {
                            const failedAttempts = parseInt(
                              search.failedAttemptCount || "0",
                              10,
                            );
                            showFeedbackToast(true, failedAttempts);
                            navigate({
                              to: "/practice",
                              search: {
                                page: "completed",
                                taskId: search.taskId,
                                isPractice: "true",
                              } as any,
                            });
                          } else {
                            submitMutation.mutate(election.id);
                          }
                        }}
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
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs configured for mobile rear camera capture */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={imageInputRef}
        onChange={(e) => handleMediaChange(e, "image")}
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        ref={videoInputRef}
        onChange={(e) => handleMediaChange(e, "video")}
      />

      {/* Step 1 Sticky Footer: Next button */}
      {step === 1 && (
        <StickyFooter className="pb-14 bg-gradient-to-t from-white via-white to-white/90">
          <Button
            type="button"
            variant="black"
            size="4xl"
            className="w-full rounded-full h-14 text-[16px] gap-2"
            onClick={() => setStep(2)}
          >
            Next
            <ArrowRight className="size-5" />
          </Button>
        </StickyFooter>
      )}
    </PageWrapper>
  );
}

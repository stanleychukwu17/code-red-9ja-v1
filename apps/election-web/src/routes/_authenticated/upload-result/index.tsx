import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { PageHeader } from "#/components/Headers";
import { OfflineSyncBanner } from "#/components/OfflineSyncBanner";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { PageWrapper } from "#/components/Wrappers";
import { getPollingUnitResults } from "#/lib/server/polling_unit_results";
import { saveResultToOutbox, type OutboxResultItem } from "#/lib/outbox-db";
import { useOfflineResultOutbox } from "#/lib/use-offline-result-outbox";
import { QUERY_KEYS } from "#/lib/config";
import { convertToWebP } from "@repo/ui/lib/image";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import {
  ElectionResultCard,
  type ElectionMediaState,
} from "./components/ElectionResultCard";
import {
  AssignmentsLoadingScreen,
  NoActiveElectionGroup,
  NoEligibleElections,
  ResultUploadUnavailable,
} from "./components/UploadResultGuard";

/**
 * Route definition for EC8A polling unit result sheet photo & video upload.
 */
export const Route = createFileRoute("/_authenticated/upload-result/")({
  component: UploadResultFlow,
});

const FORM_BY_ROLE: Record<string, string> = {
  polling_agent: "EC8A",
  ward_election_supervisor: "EC8B",
  lga_election_supervisor: "EC8C",
  state_election_supervisor: "EC8D",
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

  const { selectedElectionGroup, electionDay } = useElection();
  const { pollingUnitAssignment, pollingUnitId, elections, role_type, isLoading: assignmentsLoading } = useAssignments();
  const { pendingCount, pendingElectionIds, isOnline, refreshCount, triggerSync } = useOfflineResultOutbox();
  const expectedForm = role_type ? FORM_BY_ROLE[role_type] : undefined;
  const uploadTitle = `${role_type && role_type !== "polling_agent" ? "Upload Collation Results" : "Upload Election Results"}${expectedForm ? ` (${expectedForm})` : ""}`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Per-election selected image/video files keyed by election ID
  const [mediaByElection, setMediaByElection] = useState<
    Record<number, ElectionMediaState>
  >({});

  const mediaByElectionRef = useRef(mediaByElection);
  mediaByElectionRef.current = mediaByElection;
  const [activeElectionId, setActiveElectionId] = useState<number | null>(null);
  const [submittingElectionId, setSubmittingElectionId] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch already-submitted results for this polling unit & election group
  const { data: existingResultsRes } = useQuery({
    queryKey: QUERY_KEYS.pollingUnitResults(selectedElectionGroup?.id, pollingUnitId),
    enabled: !!selectedElectionGroup?.id && !!pollingUnitId,
    queryFn: () =>
      getPollingUnitResults({
        data: {
          election_group_id: selectedElectionGroup!.id,
          polling_unit_id: pollingUnitId!,
          limit: 50,
        },
      }),
    staleTime: Infinity,
  });

  // Track election IDs that already have submitted results for this polling unit
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

  // Opens the camera/file picker for a specific election
  const triggerMediaPicker = (electionId: number, type: "image" | "video") => {
    setActiveElectionId(electionId);

    if (type === "image") {
      imageInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  // Store selected image or video file preview for the active election
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file || activeElectionId === null) return;

    setMediaByElection((prev) => {
      const existing = prev[activeElectionId]?.[type];

      // Free memory from the previous preview URL if replacing an existing file
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

  // Clear selected media and revoke its preview blob URL
  const removeMedia = (electionId: number, type: "image" | "video") => {
    setMediaByElection((prev) => {
      const current = prev[electionId];
      if (!current?.[type]) return prev;

      // Free preview blob URL before removing the entry from state
      URL.revokeObjectURL(current[type]!.url);
      const nextEntry = { ...current };
      delete nextEntry[type];

      return {
        ...prev,
        [electionId]: nextEntry,
      };
    });
  };

  // Step back to instructions or return to home
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate({ to: "/" });
    }
  };

  // Queue result image (compressed to WebP) and optional video into IndexedDB, then sync immediately if online
  const submitMutation = useMutation({
    mutationFn: async (electionId: number) => {
      if (!selectedElectionGroup?.id) throw new Error("No active election group.");
      if (!pollingUnitAssignment?.id) throw new Error("No active polling unit assignment.");

      // Ensure the required result sheet image is attached before queuing
      const media = mediaByElection[electionId]; // grabs the object of image and video uploaded
      if (!media?.image) {
        throw new Error("Please upload a result sheet image first.");
      }

      // Track which election card is currently submitting to show its spinner
      setSubmittingElectionId(electionId);

      let imageBlob: Blob = media.image.file;
      let imageName = media.image.file.name;
      try {
        const compressed = await convertToWebP(media.image.file, 0.85, 1600);
        imageBlob = compressed;
        imageName = compressed.name;
      } catch {
        // Fall back to original file if WebP compression fails
      }

      // Build offline outbox record with compressed image and optional video
      const outboxItem: OutboxResultItem = {
        id: `result_${electionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        electionId,
        electionGroupId: selectedElectionGroup.id,
        pollingUnitId: pollingUnitId ?? 0,
        assignmentId: pollingUnitAssignment.id,
        image: { name: imageName, blob: imageBlob },
        video: media.video ? { name: media.video.file.name, blob: media.video.file } : undefined,
        createdAt: Date.now(),
        syncStatus: "pending",
        retryCount: 0,
      };

      await saveResultToOutbox(outboxItem);
      await refreshCount();

      const synced = typeof navigator !== "undefined" && navigator.onLine
        ? await triggerSync() : 0;

      return { electionId, synced };
    },

    onSuccess: ({ electionId, synced }) => {
      removeMedia(electionId, "image");
      removeMedia(electionId, "video");

      if (synced > 0) {
        toast.success("Result submitted successfully!");
      } else {
        toast.info("Saved offline. Your result will sync automatically when connected.");
      }
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to save result");
    },

    onSettled: () => {
      setSubmittingElectionId(null);
    },
  });

  // Guards
  if (!selectedElectionGroup) return <NoActiveElectionGroup />;
  if (!electionDay) return <ResultUploadUnavailable onBack={() => navigate({ to: "/" })} />;
  if (assignmentsLoading) return <AssignmentsLoadingScreen />;
  if (elections.length === 0) return <NoEligibleElections onBack={() => navigate({ to: "/" })} />;

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
                text={uploadTitle}
                size="lg"
                className="text-c-90"
              />
              <DescriptiveText
                text="Select each election under your watch to upload the result sheet image and optional video."
                size="sm"
              />
            </div>

            {/* Offline / Pending Sync Banner */}
            <OfflineSyncBanner
              isOnline={isOnline}
              pendingCount={pendingCount}
              onSync={triggerSync}
              itemLabel="result"
            />

            <div className="flex flex-col gap-4">
              {elections.map((election: any) => (
                <ElectionResultCard
                  key={election.id}
                  election={election}
                  media={mediaByElection[election.id]}
                  isSubmitted={submittedElectionIds.has(Number(election.id))}
                  isQueuedOffline={pendingElectionIds.has(Number(election.id))}
                  isSubmittingThis={
                    submitMutation.isPending &&
                    submittingElectionId === election.id
                  }
                  isSubmitDisabled={submitMutation.isPending}
                  onTriggerMedia={(type) => triggerMediaPicker(election.id, type)}
                  onRemoveMedia={(type) => removeMedia(election.id, type)}
                  onSubmit={() => submitMutation.mutate(election.id)}
                />
              ))}
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
        <StickyFooter className="pb-14 bg-linear-to-t from-white via-white to-white/90">
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

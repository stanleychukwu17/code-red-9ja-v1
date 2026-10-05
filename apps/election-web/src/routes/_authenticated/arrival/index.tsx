import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TriangleAlert, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { PageHeader } from "#/components/Headers";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { VideoPreview } from "#/components/VideoPreview";

import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { updateAssignmentTracking } from "#/lib/server/polling_unit_assignments";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { getPotentialPayout } from "#/lib/server/practice_tests";

/**
 * Route definition for the polling agent arrival confirmation page.
 * Accessible under `/_authenticated/arrival/`.
 */
export const Route = createFileRoute("/_authenticated/arrival/")({
  component: ArrivalVideo,
});

/**
 * Polling Unit Agent Arrival Verification Page.
 *
 * Workflow:
 * 1. Guides the agent to record a 10-60s video proving physical arrival at their assigned polling unit.
 * 2. Fetches potential monetary payout reward for completing the attendance milestone.
 * 3. Uploads the captured video directly to Cloudflare R2 / S3 via a presigned URL.
 * 4. Records the arrival timestamp and video URL in the election tracking system.
 * 5. Supports interactive practice/simulation mode for agent onboarding tests.
 */
function ArrivalVideo() {
  const navigate = useNavigate();

  // Parse search parameters (e.g. assignmentId, practice mode flags)
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;

  // Retrieve current election schedule and agent's active assignment
  const { selectedElectionGroup } = useElection();
  const { selectedAssignment } = useAssignments();
  const effectiveAssignmentId = assignmentId || selectedAssignment?.id;

  // Fetch the potential monetary payout for completing the "attendance" milestone
  const { data: payoutRes } = useQuery({
    queryKey: ["potentialPayout", effectiveAssignmentId, "attendance"],
    queryFn: async () => {
      if (!effectiveAssignmentId) return null;
      return getPotentialPayout({
        data: {
          assignmentId: Number(effectiveAssignmentId),
          taskType: "attendance",
        },
      });
    },
    enabled: !!effectiveAssignmentId,
  });

  // Potential payout details returned by backend
  const payoutData = payoutRes?.success ? payoutRes?.data?.payout : undefined;

  // Cloudinary fallback sample video for preview/tutorials
  const tutorialVideo =
    "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4";

  // Local state tracking recorded video and upload status
  const [videoFile, setVideoFile] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  // Mutation to persist arrival timestamp and proof video URL to the backend
  const trackingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await updateAssignmentTracking({ data: payload });
      if (!res || !res.success)
        throw new Error(res?.message || "Failed to submit arrival");
      return res;
    },
    onSuccess: (_data, variables) => {
      if (search.isPractice === "true") {
        navigate({
          to: "/practice",
          search: {
            page: "dashboard",
            taskId: search.taskId,
            isPractice: "true",
          } as any,
        });
      } else {
        navigate({ to: "/" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred while submitting.");
    },
  });

  /**
   * Orchestrates the video upload and arrival submission process:
   * 1. Intercepts practice mode attempts.
   * 2. Verifies date matches election day.
   * 3. Obtains presigned upload URL from Cloudflare R2 / S3.
   * 4. Uploads raw video file via HTTP PUT.
   * 5. Confirms upload success with backend.
   * 6. Dispatches `trackingMutation` to mark agent arrival.
   */
  const handleSubmit = async () => {
    // 1. Handle practice mode simulation
    if (search.isPractice) {
      const failedAttempts = parseInt(search.failedAttemptCount || "0", 10);
      showFeedbackToast(true, failedAttempts);
      navigate({
        to: "/practice",
        search: {
          page: "completed",
          taskId: search.taskId,
          isPractice: "true",
        } as any,
      });
      return;
    }

    if (!assignmentId || !videoFile) return;

    // 2. Validate current date matches scheduled election day
    if (selectedElectionGroup?.election_date) {
      const today = new Date().toISOString().split("T")[0];
      const electionDate = new Date(selectedElectionGroup.election_date)
        .toISOString()
        .split("T")[0];
      if (today !== electionDate) {
        toast.error("Updates can only be submitted on the election day.");
        return;
      }
    }

    const now = new Date().toISOString();

    setIsUploading(true);
    try {
      // 3. Request presigned upload URL
      const res = await getPresignedUploadURL({
        data: {
          original_name: videoFile.file.name,
          mime_type: videoFile.file.type,
          file_size: videoFile.file.size,
          folder: "videos/arrival",
          is_public: true,
        },
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to initiate file upload");
      }

      const { upload_url, public_url, file_id } = res.data;

      // 4. Stream video directly to storage via PUT
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": videoFile.file.type },
        body: videoFile.file,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload video file to storage");
      }

      // 5. Notify server that file upload finished successfully
      await confirmFileUpload({ data: { id: file_id, success: true } });

      // 6. Record agent arrival timestamp and public video link
      trackingMutation.mutate({
        id: assignmentId,
        arrived_at: now,
        arrival_video_url: public_url,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during video upload");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handles user recording or selecting a video file via native input.
   */
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile({
        url: URL.createObjectURL(file),
        file,
      });
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  /**
   * Cleans up allocated object URL and removes selected video.
   */
  const removeVideo = () => {
    if (videoFile) {
      URL.revokeObjectURL(videoFile.url);
      setVideoFile(null);
    }
  };

  const AlertIcon = () => (
    <TriangleAlert className="w-5 h-5 text-[#916719]" strokeWidth={2.5} />
  );

  return (
    <div className="flex flex-col relative w-full">
      {/* Back navigation header */}
      <PageHeader
        onBackClick={() => {
          if (search.isPractice === false) navigate({ to: "/" });
        }}
      />

      <div className="px-4 pb-20 space-y-6">
        {/* Dynamic header title reflecting capture status and mode */}
        <TitleText
          text={
            !videoFile
              ? search.isPractice === false
                ? "You are required to take a video to confirm you are at your polling unit"
                : "On election day, you would be required to take a live video to confirm you are at your polling unit"
              : "Arrival Video Captured!"
          }
        />

        {/* Live election guidance and payout summary */}
        {search.isPractice !== true && (
          <div className="flex flex-col gap-3 mt-6">
            {!videoFile && (
              <>
                <InfoCard
                  label="Video must be within 10 to 60 seconds."
                  className="font-medium"
                  icon={<AlertIcon />}
                />
                <InfoCard
                  label="Polling unit agents that don't upload this evidence will not be paid."
                  className="font-medium"
                  icon={<AlertIcon />}
                />
              </>
            )}

            {/* Calculated payout reward card */}
            <RewardSumCard
              label="Reward for this"
              subtext="Potential pay so far"
              value={
                payoutData?.potential_payout_kobo !== undefined
                  ? `+₦${(payoutData.potential_payout_kobo / 100).toLocaleString()}`
                  : "+₦0"
              }
              subValue="₦0.00 total"
              variant="purple"
            />
          </div>
        )}

        {/* Video preview / tutorial playback card */}
        <VideoPreview
          videoFile={videoFile}
          removeVideo={removeVideo}
          demoVideoUrl={tutorialVideo}
        />
      </div>

      {/* Sticky footer action bar */}
      <StickyFooter>
        {!videoFile ? (
          <>
            {/* Action: Trigger camera capture (or simulate during practice onboarding) */}
            <Button
              type="button"
              variant="secondary"
              size="4xl"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                if (search.isPractice === true) {
                  const dummyFile = new File(
                    ["dummy content"],
                    "practice-video.mp4",
                    { type: "video/mp4" },
                  );
                  setVideoFile({ url: tutorialVideo, file: dummyFile });
                } else {
                  cameraVideoRef.current?.click();
                }
              }}
            >
              <Plus className="w-[20px] h-[20px]" strokeWidth={2.5} />
              {search.isPractice === true
                ? "Take video (simulate)"
                : "Take video"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="4xl"
              className="w-full"
              onClick={() => navigate({ to: "/" })}
              disabled={search.isPractice === true}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Action: Upload and submit arrival proof */}
            <Button
              type="button"
              variant="secondary"
              size="4xl"
              className="w-full"
              disabled={trackingMutation.isPending || isUploading}
              onClick={handleSubmit}
            >
              {trackingMutation.isPending || isUploading
                ? "Uploading video..."
                : "Submit"}
            </Button>
            {/* Action: Retake video */}
            <Button
              type="button"
              variant="outline"
              size="4xl"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                if (search.isPractice === true) {
                  const dummyFile = new File(
                    ["dummy content"],
                    "practice-video.mp4",
                    { type: "video/mp4" },
                  );
                  setVideoFile({ url: tutorialVideo, file: dummyFile });
                } else {
                  cameraVideoRef.current?.click();
                }
              }}
            >
              <Plus
                className="w-[20px] h-[20px] text-neutral-400"
                strokeWidth={2.5}
              />{" "}
              {search.isPractice === true
                ? "Take another video (simulate)"
                : "Take another video"}
            </Button>
          </>
        )}
      </StickyFooter>

      {/* Hidden native video camera input for mobile browsers */}
      <input
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        ref={cameraVideoRef}
        onChange={handleVideoChange}
      />
    </div>
  );
}

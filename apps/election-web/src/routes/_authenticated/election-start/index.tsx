import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TriangleAlert, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { SelectTime } from "@repo/ui/components/selects/time-select";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { TitleText, DescriptiveText } from "@repo/ui/components/custom/Texts";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { VideoPreview } from "#/components/VideoPreview";
import { getLocalTime } from "@repo/ui/lib/date";

import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { updateAssignmentTracking } from "#/lib/server/polling_unit_assignments";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { getPotentialPayout } from "#/lib/server/practice_tests";

/**
 * Route definition for the election start verification page.
 * Accessible under `/_authenticated/election-start/`.
 */
export const Route = createFileRoute("/_authenticated/election-start/")({
  component: ElectionStart,
});

/**
 * Election Commencement Verification Page.
 *
 * A multi-step flow for polling unit agents:
 * - Step 1: Log the exact time voting commenced at their polling unit.
 * - Step 2: Record a 10-60 second proof video capturing officials setting up and queue formation.
 *
 * Workflow:
 * 1. Checks potential monetary payout reward for the "election_start" milestone.
 * 2. Parses selected time into an ISO 8601 timestamp.
 * 3. Streams recorded video directly to Cloudflare R2 / S3 via presigned upload URL.
 * 4. Updates assignment tracking with start timestamp and video URL.
 * 5. Supports interactive practice/simulation mode during agent onboarding.
 */
function ElectionStart() {
  const navigate = useNavigate();

  // Search parameters from URL (e.g., assignmentId, isPractice)
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;

  // Retrieve current active election group and agent assignment
  const { selectedElectionGroup } = useElection();
  const { selectedAssignment } = useAssignments();
  const effectiveAssignmentId = assignmentId || selectedAssignment?.id;

  // Query potential monetary payout reward for completing the "election_start" task
  const { data: payoutRes } = useQuery({
    queryKey: ["potentialPayout", effectiveAssignmentId, "election_start"],
    queryFn: async () => {
      if (!effectiveAssignmentId) return null;
      return getPotentialPayout({
        data: {
          assignmentId: Number(effectiveAssignmentId),
          taskType: "election_start",
        },
      });
    },
    enabled: !!effectiveAssignmentId,
  });

  // Extract payout data if successful
  const payoutData = payoutRes?.success ? payoutRes?.data?.payout : undefined;

  // Demonstration video link for guidance or practice simulation
  const tutorialVideo =
    "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4";

  // Step 1: Time Selection | Step 2: Video Evidence
  const [step, setStep] = useState(1);

  // Default start time set to the current local hour
  const [startTime, setStartTime] = useState(() =>
    getLocalTime(Date.now(), { hour: "numeric" }),
  );

  // Local state tracking recorded video file, preview URL, and upload progress
  const [videoFile, setVideoFile] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  // Mutation to persist election start time and proof video link to the database
  const trackingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await updateAssignmentTracking({ data: payload });
      if (!res || !res.success)
        throw new Error(res?.message || "Failed to submit election start time");
      return res;
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred while submitting.");
    },
  });

  /**
   * Orchestrates the complete start-of-election submission:
   * 1. Handles practice mode simulation.
   * 2. Checks scheduled election date.
   * 3. Parses local AM/PM start time to an ISO 8601 string.
   * 4. Requests a presigned upload URL from storage.
   * 5. Uploads raw video directly to Cloudflare R2 / S3 via HTTP PUT.
   * 6. Confirms upload status with backend.
   * 7. Dispatches tracking mutation with start time and video URL.
   */
  const handleSubmit = async () => {
    // 1. Intercept practice mode attempts
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

    // 2. Validate submission occurs on the scheduled election day
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

    // 3. Parse 12-hour AM/PM string into an ISO date string
    let parsedTime = new Date().toISOString();
    try {
      if (startTime) {
        const timeParts = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeParts && timeParts[1] && timeParts[2] && timeParts[3]) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const ampm = timeParts[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          const d = new Date();
          d.setHours(hours, minutes, 0, 0);
          parsedTime = d.toISOString();
        }
      }
    } catch (e) {}

    setIsUploading(true);
    try {
      // 4. Request presigned upload URL for election start video
      const res = await getPresignedUploadURL({
        data: {
          original_name: videoFile.file.name,
          mime_type: videoFile.file.type,
          file_size: videoFile.file.size,
          folder: "videos/election-start",
          is_public: true,
        },
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to initiate file upload");
      }

      const { upload_url, public_url, file_id } = res.data;

      // 5. Upload video directly to object storage
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": videoFile.file.type },
        body: videoFile.file,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload video file to storage");
      }

      // 6. Confirm upload completion with the backend
      await confirmFileUpload({ data: { id: file_id, success: true } });

      // 7. Update polling unit assignment with start timestamp and video URL
      trackingMutation.mutate({
        id: assignmentId,
        election_started_at: parsedTime,
        election_started_video_url: public_url,
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
    <PageWrapper>
      {/* Header with back navigation */}
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      {/* Step 1: Record Poll Opening Time */}
      {step === 1 ? (
        <>
          <div className="px-4">
            <div className="flex flex-col mt-4">
              <TitleText text="What time did the election start?" />
              <div className="flex flex-col gap-2 mt-8">
                <label className="text-neutral-600 font-medium text-[15px]">
                  Start time
                </label>
                <div className="relative mt-2">
                  <SelectTime
                    initialData={startTime}
                    update={setStartTime}
                    className="bg-white border-neutral-300 rounded-[12px] py-4"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1" /> {/* Spacer */}
          </div>

          {/* Bottom Action Bar for Step 1 */}
          <StickyFooter>
            <Button
              type="button"
              variant="secondary"
              size="4xl"
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="grey"
              size="4xl"
              onClick={() => navigate({ to: "/" })}
            >
              Cancel
            </Button>
          </StickyFooter>
        </>
      ) : (
        /* Step 2: Record Proof Video of Election Start */
        <div className="flex flex-col relative w-full h-full">
          <div className="px-4 pb-20 space-y-6">
            {/* Dynamic header prompt based on video capture state and practice mode */}
            <TitleText
              text={
                !videoFile
                  ? search.isPractice !== true
                    ? "Take a video of the election process beginning."
                    : "On election day, you would be required to take a live video of the election process beginning"
                  : "Video Captured!"
              }
            />
            {!videoFile && (
              <DescriptiveText text="Please show the officials setting up and voters in line." />
            )}

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
                  </>
                )}

                {/* Milestone payout reward card */}
                <RewardSumCard
                  label="Reward for this"
                  subtext="Potential pay so far"
                  value={
                    payoutData?.potential_payout_kobo !== undefined
                      ? `+₦${(payoutData.potential_payout_kobo / 100).toLocaleString()}`
                      : "+₦0"
                  }
                  subValue="₦500.00 total"
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

          {/* Sticky footer action bar for Step 2 */}
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
                    if (search.isPractice) {
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
                  <Plus className="w-[20px] h-[20px]" strokeWidth={2.5} />{" "}
                  {search.isPractice ? "Take video (simulate)" : "Take video"}
                </Button>
                {/* Action: Return to Step 1 */}
                <Button
                  type="button"
                  variant="outline"
                  size="4xl"
                  className="w-full"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                {/* Action: Upload and submit election start report */}
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
                    if (search.isPractice) {
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
                  {search.isPractice
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
      )}
    </PageWrapper>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, TriangleAlert, X, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { PageHeader } from "#/components/Headers";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { VideoPreview } from "#/components/VideoPreview";

import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";

import { updateAssignmentTracking } from "#/lib/server/polling_unit_assignments";
import { createPollingUnitUpdate } from "#/lib/server/polling_unit_updates";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "#/hooks/useAuth";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";

export const Route = createFileRoute("/_authenticated/arrival/")({
  component: ArrivalVideo,
});

function ArrivalVideo() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;
  const { selectedElectionGroup, pollingUnitId, party } = useAuth();
  const tutorialVideo =
    "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4";

  const [videoFile, setVideoFile] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async () => {
    console.log("search", search);
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
      // Get presigned URL
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

      // Upload to R2
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": videoFile.file.type },
        body: videoFile.file,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload video file to storage");
      }

      // Confirm upload
      await confirmFileUpload({ data: { id: file_id, success: true } });

      // Submit tracking mutation
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
      {/* Header */}
      <PageHeader
        title="PRACTICE MODE"
        onBackClick={() => {
          if (search.isPractice === false) navigate({ to: "/" });
        }}
      />

      <div className="px-4 pb-20 space-y-6">
        <TitleText
          text={
            !videoFile
              ? search.isPractice === false
                ? "You are required to take a video to confirm you are at your polling unit"
                : "On election day, you would be required to take a live video to confirm you are at your polling unit"
              : "Arrival Video Captured!"
          }
        />

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

            <RewardSumCard
              label="Reward for this"
              subtext="Potential pay so far"
              value="+₦500"
              subValue="₦0.00 total"
              variant="purple"
            />
          </div>
        )}

        {/* Media Preview / Placeholder */}

        <VideoPreview
          videoFile={videoFile}
          removeVideo={removeVideo}
          demoVideoUrl={tutorialVideo}
        />
      </div>

      <StickyFooter>
        {!videoFile ? (
          <>
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

      {/* Hidden File Input */}
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

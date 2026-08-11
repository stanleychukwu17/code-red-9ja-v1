import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TriangleAlert, Plus } from "lucide-react";
import { useAuth } from "#/hooks/useAuth";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { useState, useRef } from "react";
import { SelectTime } from "@repo/ui/components/selects/time-select";
import { PageWrapper } from "#/components/Wrappers";
import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { TitleText, DescriptiveText } from "@repo/ui/components/custom/Texts";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { VideoPreview } from "#/components/VideoPreview";

import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { updateAssignmentTracking } from "#/lib/server/polling_unit_assignments";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/election-end/")({
  component: ElectionEnd,
});

function ElectionEnd() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;
  const { selectedElectionGroup } = useAuth();
  const tutorialVideo =
    "https://res.cloudinary.com/dhtcwqsx4/video/upload/v1782937548/Free9ja/videos/I_like_this_but_he_shouldn_t_b_wsibes.mp4";

  const [step, setStep] = useState(1);
  const [endTime, setEndTime] = useState("2:00 PM");

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
        throw new Error(res?.message || "Failed to submit election end time");
      return res;
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred while submitting.");
    },
  });

  const handleSubmit = async () => {
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
      if (today !== electionDate && search.isPractice !== true) {
        toast.error("Updates can only be submitted on the election day.");
        return;
      }
    }

    let parsedTime = new Date().toISOString();
    try {
      if (endTime) {
        const timeParts = endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
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
      const res = await getPresignedUploadURL({
        data: {
          original_name: videoFile.file.name,
          mime_type: videoFile.file.type,
          file_size: videoFile.file.size,
          folder: "videos/election-end",
          is_public: true,
        },
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to initiate file upload");
      }

      const { upload_url, public_url, file_id } = res.data;

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": videoFile.file.type },
        body: videoFile.file,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload video file to storage");
      }

      await confirmFileUpload({ data: { id: file_id, success: true } });

      trackingMutation.mutate({
        id: assignmentId,
        election_ended_at: parsedTime,
        election_ended_video_url: public_url,
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

  const handleContinue = () => {
    if (selectedElectionGroup?.election_date) {
      const today = new Date().toISOString().split("T")[0];
      const electionDate = new Date(selectedElectionGroup.election_date)
        .toISOString()
        .split("T")[0];
      if (today !== electionDate && search.isPractice !== true) {
        toast.error("Updates can only be submitted on the election day.");
        return;
      }
    }
    setStep(2);
  };

  return (
    <PageWrapper>
      <PageHeader />

      {step === 1 ? (
        <>
          <div className="flex flex-col mt-4 px-4">
            <TitleText text="What time did the election end?" />

            <div className="flex flex-col gap-2 mt-8">
              <label className="text-neutral-600 font-medium text-[15px]">
                End time
              </label>
              <div className="relative mt-2">
                <SelectTime
                  initialData={endTime}
                  update={setEndTime}
                  className="bg-white border-neutral-300 rounded-[12px] py-4"
                />
              </div>
            </div>
          </div>
          <div className="flex-1" />

          <StickyFooter>
            <Button
              type="button"
              variant="secondary"
              size="4xl"
              onClick={handleContinue}
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
        <div className="flex flex-col relative w-full h-full">
          <div className="px-4 pb-20 space-y-6">
            <TitleText
              text={
                !videoFile
                  ? search.isPractice !== true
                    ? "Take a video of the election process ending."
                    : "On election day, you would be required to take a live video of the election process ending"
                  : "Video Captured!"
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
                      label="Please ensure you capture the polling unit environment, including INEC officials and the voting line."
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
                  subValue="₦3,829.00 total"
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
      )}
    </PageWrapper>
  );
}

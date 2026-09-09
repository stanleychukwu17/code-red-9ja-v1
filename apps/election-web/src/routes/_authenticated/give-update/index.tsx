import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { Button } from "@repo/ui/components/button";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PostFooter } from "#/components/PostFooter";
import { PostHeader } from "#/components/PostHeader";
import { PostInputArea } from "#/components/PostInputArea";
import { useUser } from "#/hooks/useUser";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { confirmFileUpload, getPresignedUploadURL } from "#/lib/server/parties";
import { createPollingUnitUpdate } from "#/lib/server/polling_unit_updates";
import { useMutation, useQuery } from "@tanstack/react-query";
import { showFeedbackToast } from "../practice/page-components/utils";
import { getPotentialPayout } from "#/lib/server/practice_tests";

/**
 * Route definition for the polling unit situation update and incident reporting screen.
 * Accessible under `/_authenticated/give-update/`.
 */
export const Route = createFileRoute("/_authenticated/give-update/")({
  component: GiveUpdate,
});

/**
 * Polling Unit Situation Update & Incident Reporting Page.
 *
 * Supports two primary modes for polling unit agents:
 * 1. Situation Update: Real-time status report with optional photo/video evidence,
 *    earning bounties for quality documentation.
 * 2. Incident Report: Triggered directly via `search.isReport` or violation tagging,
 *    allowing agents to flag electoral offenses (fraud, misconduct, violence).
 *
 * Multi-Step Workflow:
 * - Step 1: Payout bounties breakdown and quick-capture media prompt.
 * - Step 2: Interactive composer with tag selector drawer, text input, media carousel,
 *   and direct R2/S3 asset upload.
 */
function GiveUpdate() {
  const navigate = useNavigate();

  // Search parameters from URL (e.g. isReport, isPractice, taskId)
  const search = Route.useSearch() as any;

  // Retrieve user, active election, and assigned polling unit
  const user = useUser();
  const { selectedElectionGroup } = useElection();
  const { selectedAssignment: currentAssignment } = useAssignments();

  const assignmentId = currentAssignment?.id;

  // Query potential monetary payout reward for providing situation updates
  const { data: payoutRes } = useQuery({
    queryKey: ["potentialPayout", assignmentId, "updates"],
    queryFn: async () => {
      if (!assignmentId) return null;
      return getPotentialPayout({
        data: {
          assignmentId: Number(assignmentId),
          taskType: "updates",
        },
      });
    },
    enabled: !!assignmentId,
  });

  // Extract payout details if available
  const payoutData = payoutRes?.success ? payoutRes?.data?.payout : undefined;

  // Start directly at Step 2 if user navigated specifically to report an incident
  const [step, setStep] = useState(search.isReport ? 2 : 1);

  // Form submission and composition state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportText, setReportText] = useState(
    search.isPractice && !search.isReport
      ? "Election is currently going fine at my polling unit"
      : "",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<
    { url: string; type: "image" | "video"; file: File }[]
  >([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // DOM references to hidden native file and camera inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraImageRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  // Toggle tag selection for incident categorization
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Remove a specific violation tag
  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  /**
   * Appends newly captured or selected media files with preview object URLs.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMedia = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/")
        ? "video"
        : ("image" as "image" | "video"),
      file,
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);

    if (e.target) {
      e.target.value = "";
    }
  };

  /**
   * Cleans up allocated object URL and removes selected media file from preview list.
   */
  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index]) {
        URL.revokeObjectURL(newFiles[index].url);
        newFiles.splice(index, 1);
      }
      return newFiles;
    });
  };

  // Standardized categorization taxonomy for election infractions and misconduct
  const REPORT_CATEGORIES = [
    {
      title: "Manipulation & Fraud",
      tags: [
        "Ballot box stuffing",
        "Result falsification",
        "Vote buying or selling",
        "Multiple voting",
        "Impersonation of voters",
      ],
    },
    {
      title: "Official Misconduct",
      tags: [
        "Late arrival of materials",
        "Absent officials",
        "Inadequate security",
        "Bribery",
      ],
    },
  ];

  /**
   * Handles media upload and submission of either a status update or incident report:
   * 1. Validates election schedule and required report message.
   * 2. Iterates through media files, requests presigned URLs, and PUTs to Cloudflare R2 / S3.
   * 3. Confirms successful upload per file.
   * 4. Determines whether this is a formal report (`is_report` flag based on query or tags).
   * 5. Calls `createPollingUnitUpdate` to save the post to the election feed.
   */
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!currentAssignment || !selectedElectionGroup) {
        throw new Error("No active assignment or election group found.");
      }

      // Enforce election day date check
      if (selectedElectionGroup.election_date) {
        const today = new Date().toISOString().split("T")[0];
        const electionDate = new Date(selectedElectionGroup.election_date)
          .toISOString()
          .split("T")[0];
        if (today !== electionDate) {
          throw new Error("Updates can only be submitted on the election day.");
        }
      }

      if (!reportText.trim()) {
        throw new Error("Report text is required.");
      }

      setIsSubmitting(true);

      const uploadedUrls: string[] = [];

      // Sequentially upload each attached photo/video directly to R2 / S3
      for (const m of mediaFiles) {
        const res = await getPresignedUploadURL({
          data: {
            original_name: m.file.name,
            mime_type: m.file.type,
            file_size: m.file.size,
            folder: "updates",
            is_public: true,
          },
        });

        if (!res.success || !res.data) {
          throw new Error("Failed to initiate file upload");
        }

        const { upload_url, public_url, file_id } = res.data;

        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": m.file.type },
          body: m.file,
        });

        if (!putRes.ok) {
          await confirmFileUpload({ data: { id: file_id, success: false } });
          throw new Error("Failed to upload file to storage");
        }
        await confirmFileUpload({ data: { id: file_id, success: true } });
        uploadedUrls.push(public_url);
      }

      // Mark as report if navigated via report intent or if specific tags were selected
      const isReport = Boolean(search.isReport) || selectedTags.length > 0;

      // Submit update entry to server
      const res = await createPollingUnitUpdate({
        data: {
          polling_unit_id: currentAssignment.polling_unit_id,
          election_group_id: selectedElectionGroup.id,
          assignment_id: currentAssignment.id,
          party_id: currentAssignment.party_id,
          message: reportText,
          media_urls: uploadedUrls,
          is_report: isReport,
          report_types: selectedTags,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to submit update");
      }
      return res;
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  return (
    <PageWrapper>
      {/* Step 1: Situation Update Bounty Overview & Media Prompt */}
      {step === 1 ? (
        <>
          {/* Header with back navigation */}
          <PageHeader onBackClick={() => navigate({ to: "/" })} />

          <div className="px-4 space-y-8">
            <TitleText
              text="Give us an update on what's happening at your polling unit"
              size="lg"
            />

            {/* Reward breakdown for evidence types and total payout potential */}
            <div className="flex flex-col gap-4">
              {[
                {
                  label: "Take video evidence reward",
                  value: "+₦1,200",
                  bg: "bg-[#FDF2D4]",
                },
                {
                  label: "Take picture evidence reward",
                  value: "+₦300",
                  bg: "bg-[#FDF2D4]",
                },
                {
                  label: "Give update reward",
                  value: "+₦500",
                  bg: "bg-[#FDF2D4]",
                },
              ].map((item, i) => (
                <InfoCard
                  key={i}
                  label={item.label}
                  value={item.value}
                  variant="yellow"
                />
              ))}

              <RewardSumCard
                label="Potential pay"
                subtext="Pay so far"
                value={
                  payoutData?.potential_payout_kobo !== undefined
                    ? `+₦${(payoutData.potential_payout_kobo / 100).toLocaleString()}`
                    : "+₦0"
                }
                subValue="₦3,829.00 total"
                variant="purple"
              />
            </div>

            {/* Quality & verification advisory */}
            <DescriptiveText
              text="Please take quality video or picture to ensure you qualify for the
            maximum payment. Falsified video or picture uploads will disqualify you
            from payout"
            />
          </div>

          {/* Quick-capture action footer for Step 1 */}
          <StickyFooter>
            <div className="flex items-center gap-4">
              {/* Trigger camera photo capture */}
              <Button
                type="button"
                variant="deepGrey"
                size="4xl"
                className="w-full"
                onClick={() => {
                  setStep(2);
                  if (!search.isPractice) {
                    setTimeout(() => cameraImageRef.current?.click(), 100);
                  }
                }}
              >
                Take Picture
              </Button>
              {/* Trigger camera video capture */}
              <Button
                type="button"
                variant="deepGrey"
                size="4xl"
                className="w-full"
                onClick={() => {
                  setStep(2);
                  if (!search.isPractice) {
                    setTimeout(() => cameraVideoRef.current?.click(), 100);
                  }
                }}
              >
                Take Video
              </Button>
            </div>
            {/* Skip straight to text editor */}
            <Button
              type="button"
              variant="outline"
              size="4xl"
              className="w-full"
              onClick={() => setStep(2)}
            >
              Skip
            </Button>
          </StickyFooter>
        </>
      ) : (
        /* Step 2: Feed Post Composer & Incident Report Editor */
        <>
          {/* Post Header with close navigation and submit action */}
          <PostHeader
            onClose={() => {
              if (search.isReport) {
                if (search.isPractice) {
                  navigate({ to: "/practice" });
                } else {
                  navigate({ to: "/" });
                }
              } else {
                setStep(1);
              }
            }}
            onPost={() => {
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
                submitMutation.mutate();
              }
            }}
            isSubmitting={isSubmitting}
            isDisabled={!reportText.trim()}
            isReport={search.isReport}
          />

          {/* Text editor area, selected violation tags, and media attachment carousel */}
          <PostInputArea
            reportText={reportText}
            setReportText={setReportText}
            selectedTags={selectedTags}
            removeTag={removeTag}
            mediaFiles={mediaFiles}
            removeMedia={removeMedia}
            userAvatar={user?.avatar}
            isReport={search.isReport}
          />

          {/* Action bar and incident violation categories drawer */}
          <PostFooter
            isDrawerOpen={isDrawerOpen}
            setIsDrawerOpen={setIsDrawerOpen}
            categories={REPORT_CATEGORIES}
            selectedTags={selectedTags}
            toggleTag={toggleTag}
            onGalleryClick={() => fileInputRef.current?.click()}
            onCameraImageClick={() => cameraImageRef.current?.click()}
            onCameraVideoClick={() => cameraVideoRef.current?.click()}
          />
        </>
      )}

      {/* Hidden File Inputs for native gallery and camera pickers */}
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraImageRef}
        onChange={handleFileChange}
      />
      <input
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        ref={cameraVideoRef}
        onChange={handleFileChange}
      />
    </PageWrapper>
  );
}

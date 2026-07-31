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
import { useAuth } from "#/hooks/useAuth";
import { confirmFileUpload, getPresignedUploadURL } from "#/lib/server/parties";
import { createPollingUnitUpdate } from "#/lib/server/polling_unit_updates";
import { useMutation } from "@tanstack/react-query";
import { showFeedbackToast } from "../practice/page-components/utils";

export const Route = createFileRoute("/_authenticated/give-update/")({
  component: GiveUpdate,
});

function GiveUpdate() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const {
    user,
    selectedElectionGroup,
    selectedAssignment: currentAssignment,
  } = useAuth();

  const [step, setStep] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<
    { url: string; type: "image" | "video"; file: File }[]
  >([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraImageRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

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

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!currentAssignment || !selectedElectionGroup) {
        throw new Error("No active assignment or election group found.");
      }

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

      const isReport = selectedTags.length > 0;

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
      navigate({ to: "/home" });
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
      {step === 1 ? (
        <>
          <PageHeader />

          <div className="px-4 space-y-8">
            <TitleText
              text="Give us an update on what's happening at your polling unit"
              size="lg"
            />

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
                value="+₦2,000"
                subValue="₦3,829.00 total"
                variant="purple"
              />
            </div>

            <DescriptiveText
              text="Please take quality video or picture to ensure you qualify for the
            maximum payment. Falsified video or picture uploads will disqualify you
            from payout"
            />
          </div>

          <StickyFooter>
            <div className="flex items-center gap-4">
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
                {search.isPractice ? "Take Picture (simulate)" : "Take Picture"}
              </Button>
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
                {search.isPractice ? "Take Video (simulate)" : "Take Video"}
              </Button>
            </div>
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
        <>
          <PostHeader
            onClose={() => setStep(1)}
            onPost={() => {
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
              } else {
                submitMutation.mutate();
              }
            }}
            isSubmitting={isSubmitting}
            isDisabled={!reportText.trim()}
          />

          <PostInputArea
            reportText={reportText}
            setReportText={setReportText}
            selectedTags={selectedTags}
            removeTag={removeTag}
            mediaFiles={mediaFiles}
            removeMedia={removeMedia}
            userAvatar={user?.avatar}
          />

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
      {/* Hidden File Inputs */}
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

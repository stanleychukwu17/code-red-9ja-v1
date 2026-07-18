import { RewardCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
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

export const Route = createFileRoute("/_authenticated/report/")({
  component: ReportIrregularities,
});

function ReportIrregularities() {
  const navigate = useNavigate();
  const {
    user,
    selectedElectionGroup,
    selectedAssignment: currentAssignment,
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reportText, setReportText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<
    { url: string; type: "image" | "video"; file: File }[]
  >([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInputMode, setIsInputMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraImageRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag];
      if (newTags.length > 0) setIsInputMode(true);
      return newTags;
    });
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsInputMode(true);
    }
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
        "Report what's happening at your polling unit",
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

      const res = await createPollingUnitUpdate({
        data: {
          polling_unit_id: currentAssignment.polling_unit_id,
          election_group_id: selectedElectionGroup.id,
          assignment_id: currentAssignment.id,
          party_id: currentAssignment.party_id,
          message: reportText,
          media_urls: uploadedUrls,
          is_report: true,
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
    <div className="flex flex-col relative w-full">
      <PostHeader
        onClose={() => navigate({ to: "/home" })}
        onPost={() => submitMutation.mutate()}
        isSubmitting={isSubmitting}
        isDisabled={!reportText.trim()}
        isInputMode={isInputMode}
        isReport
      />

      {!isInputMode ? (
        <div className="px-4 pb-20 space-y-6">
          <TitleText text="Report any irregularities taking place at your polling unit" />

          <div className="flex flex-col gap-3 mt-6">
            <RewardCard
              label="The value of your report will be determined upon review"
              value="₦???"
            />

            <RewardSumCard
              label="Potential payment"
              subtext="Potential pay so far"
              value="₦1k to 200k"
              subValue="₦3,829.00 total"
              variant="purple"
            />
          </div>

          <DescriptiveText text="Reports that capture quality picture or video evidences of verified events that is actually taking place (or took place) at a polling unit will get adequately compensated." />
        </div>
      ) : (
        <PostInputArea
          reportText={reportText}
          setReportText={setReportText}
          placeholder="Tell us what's happening here"
          selectedTags={selectedTags}
          removeTag={removeTag}
          mediaFiles={mediaFiles}
          removeMedia={removeMedia}
          userAvatar={user?.avatar}
          isReport
        />
      )}

      <PostFooter
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        categories={REPORT_CATEGORIES}
        selectedTags={selectedTags}
        toggleTag={toggleTag}
        onGalleryClick={() => fileInputRef.current?.click()}
        onCameraImageClick={() => cameraImageRef.current?.click()}
        onCameraVideoClick={() => cameraVideoRef.current?.click()}
        isInputMode={isInputMode}
        onSkip={() => setIsInputMode(true)}
      />

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
    </div>
  );
}

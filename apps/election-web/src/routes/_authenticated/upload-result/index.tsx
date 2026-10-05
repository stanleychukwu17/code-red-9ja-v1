import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, X, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useUser } from "#/hooks/useUser";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useUserParty } from "#/hooks/useUserParty";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { PageWrapper } from "#/components/Wrappers";
import { submitPollingUnitResult } from "#/lib/server/polling_unit_results";
import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { getElectionsByGroup } from "#/lib/server/elections";
import { AppAvatar } from "@repo/ui/components/avatar";
import { InfoCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import NigerianFlagIcon from "@repo/ui/icons/nigerian-flag-icon";
import TwinkleLittleStarIcon from "@repo/ui/icons/twinkle-little-star-icon";
import AlertIcon from "@repo/ui/icons/alert-icon";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";

import { getPotentialPayout } from "#/lib/server/practice_tests";

/**
 * Route definition for EC8A polling unit result sheet photo upload.
 */
export const Route = createFileRoute("/_authenticated/upload-result/")({
  component: UploadResultFlow,
});

/** Represents a captured result sheet image and its preview blob URL */
type MediaFile = {
  url: string;
  type: "image";
  file: File;
};

/**
 * Decorative background with Nigerian flag blur motifs and star icons.
 */
function BackgroundDesign() {
  return (
    <div className="absolute top-0 left-0 bg-c-primary inset-0 -z-10 overflow-hidden">
      <div>
        <TwinkleLittleStarIcon className="absolute top-10 left-4" />
        <TwinkleLittleStarIcon className="absolute top-0 right-4 rotate-12" />
        <TwinkleLittleStarIcon className="absolute top-96 left-16" />
        <TwinkleLittleStarIcon className="absolute top-[480px] right-8 rotate-45" />
      </div>
      <div>
        <NigerianFlagIcon className="absolute top-0 left-20 size-20 opacity-50 blur-[50px]" />
        <NigerianFlagIcon className="absolute top-[480px] left-40 size-5 blur-[16px]" />
      </div>
    </div>
  );
}

/**
 * Sequential Result Sheet Upload Flow for Polling Agents.
 *
 * Iterates through each election in the active election group (Presidential, Senatorial, etc.)
 * requiring a clear, verified photo upload of INEC Form EC8A for each ballot.
 *
 * Sub-steps per election:
 * 1. Overview & Payout Incentive Card
 * 2. Visual Reference Example & Camera Trigger
 * 3. Photo Preview, Retake, and Submission Confirmation
 */
function UploadResultFlow() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const user = useUser();
  const { selectedElectionGroup } = useElection();
  const { selectedAssignment, pollingUnitId } = useAssignments();
  const { party } = useUserParty();

  const assignmentId = selectedAssignment?.id;

  // Query potential compensation for result upload task
  const { data: payoutRes } = useQuery({
    queryKey: ["potentialPayout", assignmentId, "results"],
    queryFn: async () => {
      if (!assignmentId) return null;
      return getPotentialPayout({
        data: {
          assignmentId: Number(assignmentId),
          taskType: "results",
        },
      });
    },
    enabled: !!assignmentId,
  });

  const payoutData = payoutRes?.success ? payoutRes?.data?.payout : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sequential multi-election tracking
  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);
  const [subStep, setSubStep] = useState(1);

  // Captured result sheet image
  const [resultSheetImage, setResultSheetImage] = useState<MediaFile | null>(
    null,
  );
  const sheetImageRef = useRef<HTMLInputElement>(null);

  // Query all elections under the active election group, ordered by hierarchy rank
  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["groupElections", selectedElectionGroup?.id],
    enabled: !!selectedElectionGroup?.id,
    queryFn: async () => {
      const res = await getElectionsByGroup({
        data: selectedElectionGroup!.id,
      });
      if (!res?.success || !res.data?.elections) return [];
      return (res.data.elections as any[]).sort(
        (a, b) => (a.rank || 0) - (b.rank || 0),
      );
    },
  });

  // Reset scroll position on substep or election ballot changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentElectionIndex, subStep]);

  // Handles camera/photo capture, releases old blob URLs, and transitions to preview
  const handleSheetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage({
      url: URL.createObjectURL(file),
      type: "image",
      file,
    });
    setSubStep(3);
    e.target.value = "";
  };

  // Discards current photo and safely revokes blob URL to avoid memory leaks
  const removeSheetImage = () => {
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage(null);
    if (sheetImageRef.current) sheetImageRef.current.value = "";
    setSubStep(2);
  };

  // Handles contextual back navigation across substeps and election ballots
  const handleBack = () => {
    if (subStep === 3) {
      removeSheetImage();
    } else if (subStep === 2) {
      setSubStep(1);
    } else if (subStep === 1) {
      if (currentElectionIndex > 0) {
        setCurrentElectionIndex((prev) => prev - 1);
        setSubStep(1);
      } else {
        navigate({ to: "/" });
      }
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

  // Mutation uploading image to storage and recording result submission in backend
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedElectionGroup?.id)
        throw new Error("No active election group.");
      if (!elections || elections.length === 0)
        throw new Error("No elections found.");
      if (!resultSheetImage)
        throw new Error("Please take a photo of the result sheet.");

      const currentElection = elections[currentElectionIndex];
      const imageUrl = await uploadFile(resultSheetImage);

      const payload: Parameters<typeof submitPollingUnitResult>[0]["data"] = {
        election_id: currentElection.id,
        election_group_id: selectedElectionGroup.id,
        polling_unit_id: pollingUnitId ?? 0,
        result_sheet_image_url: imageUrl,
      };

      if (selectedAssignment?.id) {
        payload.assignment_id = selectedAssignment.id;
      }

      const res = await submitPollingUnitResult({ data: payload });
      if (!res.success) {
        throw new Error(res.message || "Failed to submit result");
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Result submitted successfully!");
      // Advance to the next election ballot in the sequence, or complete if finished
      if (elections && currentElectionIndex < elections.length - 1) {
        setResultSheetImage(null);
        setCurrentElectionIndex((prev) => prev + 1);
        setSubStep(1);
      } else {
        toast.success("All results submitted!");
        navigate({ to: "/" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred");
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
  // Guard: Loading election group elections
  if (electionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  // Guard: No elections found for this group
  if (!elections || elections.length === 0) {
    return (
      <PageWrapper>
        <PageHeader onBackClick={() => navigate({ to: "/" })} />
        <div className="p-8 text-center text-neutral-500">
          No eligible elections found.
        </div>
      </PageWrapper>
    );
  }

  const currentElection = elections[currentElectionIndex];
  const isSubmitting = submitMutation.isPending;

  return (
    <PageWrapper>
      {/* Top Header with step-aware back navigation */}
      <PageHeader
        onBackClick={handleBack}
      // title={subStep > 1 ? currentElection.name : ""}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        {/* SUBSTEP 1: Welcome Page & Payout Overview */}
        {subStep === 1 && (
          <div className="relative flex flex-col items-center gap-4 h-full px-4 pt-8 max-w-[430px] mx-auto">
            {/* Political Party Brand Avatar */}
            <AppAvatar
              src={party?.logo}
              alt="Party Logo"
              className="size-14 mt-4"
            />

            {/* Current Election Ballot Title */}
            <TitleText
              text={currentElection.name}
              size="xl"
              className="text-center text-c-90 mt-2"
            />

            <DescriptiveText
              text="Upload Final Voting Result Sheet (for this election)."
              size="sm"
              className="text-center text-c-70 max-w-[320px]"
            />

            {/* Compensation card & quality guidelines alert */}
            <div className="pt-6 w-full space-y-4">
              <RewardSumCard
                label="Reward for this upload"
                subtext="Potential pay so far"
                value={
                  payoutData?.potential_payout_kobo !== undefined
                    ? `+₦${(payoutData.potential_payout_kobo / 100).toLocaleString()}`
                    : "+₦0"
                }
                subValue="₦3,829.00 total"
                variant="purple"
                icon={<FancyMoneyBagIcon className="size-6" />}
                className="w-full "
              />

              <InfoCard
                icon={<AlertIcon className="size-6 text-c-90 shrink-0" />}
                label="Ensure the picture is clear and captures the entire result sheet. You will be paid based on how well you do this."
                variant="grey"
              />
            </div>
          </div>
        )}

        {/* SUBSTEP 2: Visual Guidance & Reference Example */}
        {subStep === 2 && (
          <div className="px-4 flex flex-col gap-6 max-w-[430px] mx-auto">
            <div className="space-y-2 mt-2">
              <TitleText
                text="Take a clear picture of the Final Result Sheet for this election"
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
              <div className="rounded-2xl overflow-hidden border-[1.5px] border-c-90 ">
                <img
                  src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp"
                  alt="Result sheet example"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBSTEP 3: Captured Photo Preview & Retake Option */}
        {subStep === 3 && resultSheetImage && (
          <div className="px-4 flex flex-col gap-6 max-w-[430px] mx-auto">
            <div className="space-y-2 mt-2">
              <TitleText
                text="👍 Picture taken!"
                size="lg"
                className="text-c-90"
              />
              <DescriptiveText
                text="If picture is clear enough and captures entire sheet, tap the upload result button."
                size="sm"
              />
            </div>

            {/* Photo preview with delete/discard overlay button */}
            <div className="relative rounded-2xl overflow-hidden border-[1.5px] border-c-90  bg-neutral-100">
              <img
                src={resultSheetImage.url}
                alt="Result sheet preview"
                className="w-full object-cover"
              />
              <button
                type="button"
                onClick={removeSheetImage}
                className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2 backdrop-blur-sm hover:bg-black/95 transition "
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Retake picture button (uses mock file in practice mode) */}
            <Button
              type="button"
              variant="outline"
              size="extra-large"
              className="w-full rounded-full border-2 border-c-30 text-c-90 font-bold h-14"
              onClick={() => {
                if (search.isPractice) {
                  const dummyFile = new File(["dummy"], "practice.jpg", {
                    type: "image/jpeg",
                  });
                  setResultSheetImage({
                    url: "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp",
                    type: "image",
                    file: dummyFile,
                  });
                  setSubStep(3);
                } else {
                  sheetImageRef.current?.click();
                }
              }}
            >
              {search.isPractice
                ? "Retake Picture (simulate)"
                : "Retake Picture"}
            </Button>
          </div>
        )}
      </div>

      {/* Hidden file input configured for mobile rear camera capture */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={sheetImageRef}
        onChange={handleSheetImageChange}
      />

      {/* Sticky Bottom Action Footer */}
      {subStep === 1 ? (
        // Substep 1: Continue to instructions
        <StickyFooter className="pb-14">
          <Button
            type="button"
            variant="secondary"
            size="4xl"
            className="w-full rounded-full"
            onClick={() => setSubStep(2)}
          >
            <ArrowHandleIcon className="ml-2 w-5 h-5" />
          </Button>
        </StickyFooter>
      ) : (
        // Substep 2 & 3: Election indicator badge + camera/upload action
        <div>
          <div className="bg-purple/20 w-full h-10 px-4 flex items-center">
            <p>{currentElection.name}</p>
          </div>
          <StickyFooter className="pb-14 bg-gradient-to-t from-white via-white to-white/90">
            <Button
              type="button"
              variant="black"
              size="4xl"
              className="w-full rounded-full h-14 text-[16px]"
              onClick={() => {
                if (subStep === 2) {
                  // Substep 2: Open camera (or simulate in practice mode)
                  if (search.isPractice) {
                    const dummyFile = new File(["dummy"], "practice.jpg", {
                      type: "image/jpeg",
                    });
                    setResultSheetImage({
                      url: "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp",
                      type: "image",
                      file: dummyFile,
                    });
                    setSubStep(3);
                  } else {
                    sheetImageRef.current?.click();
                  }
                } else if (subStep === 3) {
                  // Substep 3: Submit result or finish practice task
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
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : subStep === 2 ? (
                search.isPractice ? (
                  "Upload Result (simulate)"
                ) : (
                  "Upload Result"
                )
              ) : (
                "Upload Result"
              )}
            </Button>
          </StickyFooter>
        </div>
      )}
    </PageWrapper>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Camera,
  X,
  ArrowRight,
  ArrowLeft,
  TriangleAlert,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { showFeedbackToast } from "../practice/page-components/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "#/hooks/useAuth";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { PageWrapper } from "#/components/Wrappers";
import { submitPollingUnitResult } from "#/lib/server/polling_unit_results";
import { getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { getElectionsByGroup } from "#/lib/server/elections";

export const Route = createFileRoute("/_authenticated/upload-result/")({
  component: UploadResultFlow,
});

type MediaFile = {
  url: string;
  type: "image";
  file: File;
};

// ── Main Flow Component ─────────────────────────────────────────────────────────

function UploadResultFlow() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const { user, selectedElectionGroup, selectedAssignment, pollingUnitId } =
    useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);
  // subStep 1: Intro
  // subStep 2: Capture instructions & camera button
  // subStep 3: Picture taken preview & submit
  const [subStep, setSubStep] = useState(1);

  const [resultSheetImage, setResultSheetImage] = useState<MediaFile | null>(
    null,
  );
  const sheetImageRef = useRef<HTMLInputElement>(null);

  // ── Fetch Elections ──
  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["groupElections", selectedElectionGroup?.id],
    enabled: !!selectedElectionGroup?.id,
    queryFn: async () => {
      const res = await getElectionsByGroup({
        data: selectedElectionGroup!.id,
      });
      if (!res?.success || !res.data?.elections) return [];
      // Sort by rank if available, otherwise leave as returned
      return (res.data.elections as any[]).sort(
        (a, b) => (a.rank || 0) - (b.rank || 0),
      );
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentElectionIndex, subStep]);

  // ── Handlers ──
  const handleSheetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage({
      url: URL.createObjectURL(file),
      type: "image",
      file,
    });
    setSubStep(3); // Move to preview step
    e.target.value = "";
  };

  const removeSheetImage = () => {
    if (resultSheetImage) URL.revokeObjectURL(resultSheetImage.url);
    setResultSheetImage(null);
    if (sheetImageRef.current) sheetImageRef.current.value = "";
    setSubStep(2); // Go back to capture instructions
  };

  const handleBack = () => {
    if (subStep === 3) {
      removeSheetImage();
    } else if (subStep === 2) {
      setSubStep(1);
    } else if (subStep === 1) {
      if (currentElectionIndex > 0) {
        setCurrentElectionIndex((prev) => prev - 1);
        setSubStep(1); // Back to previous election
      } else {
        navigate({ to: "/home" });
      }
    }
  };

  // ── Upload helper ──
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

  // ── Submit logic ──
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedElectionGroup?.id)
        throw new Error("No active election group.");
      if (!elections || elections.length === 0)
        throw new Error("No elections found.");
      if (!resultSheetImage)
        throw new Error("Please take a photo of the result sheet.");

      const currentElection = elections[currentElectionIndex];

      // Upload image
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
      if (elections && currentElectionIndex < elections.length - 1) {
        // Move to next election
        setResultSheetImage(null);
        setCurrentElectionIndex((prev) => prev + 1);
        setSubStep(1);
      } else {
        // Finished all
        toast.success("All results submitted!");
        navigate({ to: "/home" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "An error occurred");
    },
  });

  // ── Render ──
  if (!selectedElectionGroup) {
    return (
      <div className="p-8 text-center text-neutral-500">
        No active election group.
      </div>
    );
  }
  if (electionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (!elections || elections.length === 0) {
    return (
      <PageWrapper>
        <PageHeader onBackClick={() => navigate({ to: "/home" })} />
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
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-4 py-4 mt-2">
        <button onClick={handleBack} className="p-2 -ml-2 text-neutral-800">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {subStep > 1 && (
          <h2 className="text-[17px] font-bold text-purple-600">
            {currentElection.name}
          </h2>
        )}
        <div className="w-6" /> {/* Spacer */}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
        {/* SUBSTEP 1: Intro */}
        {subStep === 1 && (
          <div className="flex flex-col items-center justify-center h-full px-6 -mt-12">
            <div className="text-4xl mb-4">🇳🇬</div>
            <h1 className="text-3xl font-extrabold text-neutral-900 text-center mb-3">
              {currentElection.name}
            </h1>
            <p className="text-neutral-500 text-center text-sm px-4">
              Upload Final Voting Result Sheet
              <br />
              (for this election)
            </p>
          </div>
        )}

        {/* SUBSTEP 2: Capture Instructions */}
        {subStep === 2 && (
          <div className="px-5 flex flex-col gap-5">
            <div>
              <h1 className="text-[26px] font-extrabold text-neutral-900 leading-[1.15] mb-2">
                Take a clear picture of the Final Result Sheet for this election
              </h1>
              <p className="text-neutral-500 text-[15px] leading-snug">
                Take a clear picture of the final voting result and upload it.
              </p>
            </div>

            <div className="bg-[#FFF8E6] border border-[#FDE6A8] rounded-2xl p-4 flex gap-3">
              <TriangleAlert className="w-5 h-5 text-[#B88700] flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#805D00] font-medium leading-tight">
                After everyone has voted and votes have been counted, ask INEC
                officials to show you the voting result sheet. Once shown take a
                picture of it and upload.
              </p>
            </div>

            <div className="bg-[#F3E8FF] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xl">💰</div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Reward for this
                  </p>
                  <p className="text-xs text-neutral-500">
                    Potential pay so far
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-neutral-900">+₦2,500</p>
                <p className="text-xs text-neutral-500">₦3,829.00 total</p>
              </div>
            </div>

            <div className="mt-2">
              <h3 className="font-bold text-neutral-900 mb-3">
                Perfect Example:
              </h3>
              <div className="rounded-2xl overflow-hidden border border-c-90">
                <img
                  src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp"
                  alt="Result sheet example"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBSTEP 3: Preview */}
        {subStep === 3 && resultSheetImage && (
          <div className="px-5 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="text-2xl">👍</div>
              <h1 className="text-[22px] font-extrabold text-neutral-900">
                Picture taken!
              </h1>
            </div>
            <p className="text-neutral-500 text-[15px] -mt-3">
              If picture is clear enough, tap the upload button.
            </p>

            <div className="bg-[#FFF8E6] border border-[#FDE6A8] rounded-2xl p-4 flex gap-3">
              <TriangleAlert className="w-5 h-5 text-[#B88700] flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#805D00] font-medium leading-tight">
                You are paid based on how clear the picture is.
              </p>
            </div>

            <div className="bg-[#F3E8FF] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xl">💰</div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Reward for this
                  </p>
                  <p className="text-xs text-neutral-500">
                    Potential pay so far
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-neutral-900">+₦2,500</p>
                <p className="text-xs text-neutral-500">₦3,829.00 total</p>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100">
              <img
                src={resultSheetImage.url}
                alt="Result sheet preview"
                className="w-full object-cover"
              />
              <button
                type="button"
                onClick={removeSheetImage}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full rounded-full border-2 border-neutral-200 text-neutral-700 font-bold h-14"
              onClick={() => {
                if (search.isPractice) {
                  const dummyFile = new File(["dummy"], "practice.jpg", { type: "image/jpeg" });
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
              + {search.isPractice ? "Take another picture (simulate)" : "Take another picture"}
            </Button>

            <div className="mt-2 pointer-events-none">
              <h3 className="font-bold text-neutral-900 mb-3">
                Perfect Example:
              </h3>
              <div className="rounded-2xl overflow-hidden border border-neutral-200">
                <img
                  src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1784365430/Free9ja/pictures/Example_-_Election_Result_zcloos.webp"
                  alt="Result sheet example"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={sheetImageRef}
        onChange={handleSheetImageChange}
      />

      {/* Sticky Footer */}
      {subStep === 1 ? (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white flex justify-center pb-12">
          <button
            onClick={() => setSubStep(2)}
            className="bg-[#00E676] text-white w-full max-w-md h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-[#00C853] transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <StickyFooter className="pb-10 bg-gradient-to-t from-white via-white to-white/90">
          <Button
            type="button"
            variant="black"
            size="4xl"
            className="w-full rounded-full h-14 text-[16px]"
            onClick={() => {
              if (subStep === 2) {
                if (search.isPractice) {
                  const dummyFile = new File(["dummy"], "practice.jpg", { type: "image/jpeg" });
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
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : subStep === 2 ? (
              search.isPractice ? "+ Upload Result (simulate)" : "+ Upload Result"
            ) : (
              "Upload Result"
            )}
          </Button>
        </StickyFooter>
      )}
    </PageWrapper>
  );
}

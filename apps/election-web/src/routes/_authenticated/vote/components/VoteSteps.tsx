import { StickyFooter } from "#/components/Footers";
import { useUser } from "#/hooks/useUser";
import { useElection } from "#/hooks/useElection";
import { getLGAs } from "#/lib/server/countries";
import { getPollingUnits } from "#/lib/server/polling_units";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { Button } from "@repo/ui/components/button";
import { SelectableCard, UserCard } from "@repo/ui/components/cards/Rewards";
import { Input, Label } from "@repo/ui/components/input";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "usehooks-ts";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { showFeedbackToast } from "../../practice/page-components/utils";
import { StepHeader } from "../../applications/components/-ApplySteps";

import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import {
  getEligibleElections,
  submitVotes as submitVotesServer,
} from "#/lib/server/elections";
import { getParties as getPartiesServer } from "#/lib/server/parties";

// --- Models & Payloads ---
/** Vote record pairing an individual election instance with the chosen political party */
type VoteInput = {
  election_id: number;
  party_id: number;
};

// --- API Fetchers ---
/**
 * Retrieves the specific election ballots applicable to the given polling unit
 * (e.g. Gubernatorial, State Assembly, Senatorial, etc.).
 */
const fetchEligibleElections = async (
  electionGroupId: number,
  pollingUnitId: number,
) => {
  const res = await getEligibleElections({
    data: { electionGroupId, pollingUnitId },
  });
  return res?.data?.elections || [];
};

/**
 * Submits the completed voter verification payload to the backend.
 */
const submitVotes = async (payload: any) => {
  const res = await submitVotesServer({ data: payload });
  return res;
};

/**
 * Fetches the global list of political parties participating in the election.
 */
const getParties = async () => {
  const res = await getPartiesServer();
  return res?.data?.parties || [];
};

// --- Step Components ---

/**
 * Step 1: Geographic Hierarchy Selection.
 * Cascading dropdowns selecting the State, LGA, and Ward where the citizen voted.
 * Selecting a parent jurisdiction automatically resets downstream selections.
 */
const Step1 = ({
  selectedStateId,
  setSelectedStateId,
  selectedLgaId,
  setSelectedLgaId,
  selectedWardId,
  setSelectedWardId,
}: any) => (
  <div className="flex flex-col gap-4 px-4 h-full">
    <StepHeader
      title="Where did you vote?"
      subtitle="This ensures your vote indeed counts."
    />
    <div className="space-y-4">
      {/* State Selection */}
      <div className="flex flex-col gap-2">
        <Label title="Which state are you currently in?" />
        <SelectState
          selectedId={selectedStateId || undefined}
          update={(stateObj) => {
            setSelectedStateId(stateObj?.id || null);
            setSelectedLgaId(null);
            setSelectedWardId(null);
          }}
          fetchStates={getStates}
        />
      </div>

      {/* Local Government Area Selection */}
      <div className="flex flex-col gap-2">
        <Label title="Which LGA do you stay in?" />
        <SelectLga
          selectedId={selectedLgaId || undefined}
          update={(lgaObj) => {
            setSelectedLgaId(lgaObj?.id || null);
            setSelectedWardId(null);
          }}
          stateId={selectedStateId || undefined}
          disabled={!selectedStateId}
          fetchLGAs={getLGAs}
        />
      </div>

      {/* Electoral Ward Selection */}
      <div className="flex flex-col gap-2">
        <Label title="Which ward do you stay in?" />
        <SelectWard
          selectedId={selectedWardId || undefined}
          update={(wardObj) => setSelectedWardId(wardObj?.id || null)}
          stateId={selectedStateId || undefined}
          lgaId={selectedLgaId || undefined}
          disabled={!selectedLgaId}
          fetchWards={getWards}
        />
      </div>
    </div>
  </div>
);

/**
 * Step 2: Polling Unit Picker.
 * Infinite paginated list of polling units in the selected ward.
 * Uses an intersection observer sentinel to fetch subsequent pages as the user scrolls.
 */
const Step2 = ({
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  setSelectedWardId,
  selectedPollingUnitId,
  setSelectedPollingUnitId,
}: any) => {
  // Cursor-paginated infinite query for polling units in the ward
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["polling-units", selectedWardId],
      queryFn: async ({ pageParam }) => {
        const res = await getPollingUnits({
          data: {
            stateId: selectedStateId,
            localGovernmentId: selectedLgaId,
            wardId: selectedWardId,
            limit: 20,
            cursor: pageParam,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch polling units");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
      enabled: !!selectedWardId,
    });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pollingUnits = data
    ? data.pages.flatMap((page) => page.data?.polling_units || [])
    : [];

  const targetWardName =
    pollingUnits.length > 0 ? pollingUnits[0].ward_name : "Selected Ward";

  return (
    <div className="flex flex-col gap-4 w-full px-4 h-full">
      <StepHeader
        title="Which polling unit did you vote?"
        subtitle="Pick the polling unit where you voted and your vote will count for that specific polling unit."
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label title="Ward" />
          <SelectWard
            selectedId={selectedWardId || undefined}
            update={(wardObj) => setSelectedWardId(wardObj?.id || null)}
            stateId={selectedStateId || undefined}
            lgaId={selectedLgaId || undefined}
            disabled={!selectedLgaId}
            fetchWards={getWards}
          />
        </div>

        <div className="space-y-3 mt-7">
          <Label title={`Polling Units (${targetWardName})`} className="" />

          {pollingUnits.map((unit: any) => {
            const isSelected = selectedPollingUnitId === unit.id;
            return (
              <SelectableCard
                key={unit.id}
                title={unit.name}
                subtitle={unit.ward_name || "Ward"}
                isSelected={isSelected}
                onClick={() => setSelectedPollingUnitId(unit.id)}
              />
            );
          })}

          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-4 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage
                ? "Loading more polling units..."
                : "Scroll down to load more"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Step 3: Multi-Ballot Candidate & Party Selection.
 * Iterates through all eligible elections at the chosen polling unit (e.g. Presidential, Senate).
 * When the user selects a candidate, it records their vote and auto-advances to the next election.
 */
const Step3 = ({
  elections,
  electionsLoading,
  currentElectionIndex,
  setCurrentElectionIndex,
  votes,
  setVotes,
}: any) => {
  // Query full list of political parties participating in this election
  const { data: parties } = useQuery({
    queryKey: ["parties"],
    queryFn: getParties,
  });

  if (electionsLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-c-80" />
      </div>
    );
  }

  if (!elections || elections.length === 0) {
    return (
      <div className="px-4 text-center">
        <p className="text-c-50">No elections found for this polling unit.</p>
      </div>
    );
  }

  const currentElection = elections[currentElectionIndex];

  // Map party IDs to candidate profiles registered for this election
  const candidateByPartyId: Record<number, any> = {};
  for (const c of currentElection.candidates || []) {
    const pid = c.party_id?.Int64 ?? c.party_id;
    if (pid) candidateByPartyId[pid] = c;
  }

  return (
    <div className="flex flex-col gap-4 w-full px-3 h-full">
      <StepHeader
        title={currentElection.name}
        subtitle="Pick the candidate you voted for this."
      />
      <div className="space-y-0.5 mt-4 flex-1">
        {parties?.map((party: any) => {
          const candidate = candidateByPartyId[party.id];
          const displayName = candidate
            ? `${candidate.first_name?.String ?? candidate.first_name ?? ""} ${candidate.last_name?.String ?? candidate.last_name ?? ""} (${party.short_name})`.trim() ||
              party.short_name
            : party.short_name;
          const displayImage =
            (candidate?.avatar?.String ?? candidate?.avatar) || party.logo;
          const isSelected = votes[currentElection.id] === party.id;

          return (
            <UserCard
              key={party.id}
              name={displayName}
              image={displayImage}
              image2={party.logo}
              isSelected={isSelected}
              onClick={() => {
                // Record the selected party for this specific election
                setVotes((prev: any) => ({
                  ...prev,
                  [currentElection.id]: party.id,
                }));
                // Auto-advance to the next election in the sequence if not at the final ballot
                if (currentElectionIndex < elections.length - 1) {
                  setTimeout(() => {
                    setCurrentElectionIndex((i: number) => i + 1);
                  }, 300);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Step 4: Permanent Voter's Card (PVC) Verification Upload.
 * Verifies that the reporter is an authentic registered voter.
 * In practice mode, allows one-tap mock card selection for training drills.
 */
const Step4 = ({ votersCardImage, setVotersCardImage, isPractice }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creates local blob preview of the selected voter's card photo
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      toast.success("Image selected");
      setVotersCardImage(URL.createObjectURL(file));
    } catch (e) {
      toast.error("Upload failed");
    }
  };

  // Upload area prompting the user to take/upload a photo of their PVC
  const uploadVotersCardPlaceholder = (
    <div
      className="min-h-48 border border-c-20 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer bg-c-10/50 hover:bg-c-10 transition-colors"
      onClick={() => {
        if (isPractice) {
          toast.success("Image auto-added for practice mode");
          setVotersCardImage(
            "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1783939243/Free9ja/pictures/PVC_2_i9lvfa.png",
          );
        } else {
          fileInputRef.current?.click();
        }
      }}
    >
      <UploadIcon className="size-8 text-c-80 mb-2" />
      <p className="font-semibold text-sm">Upload Voters Card/PVC</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full px-4 h-full">
      <StepHeader
        title="Upload a clear picture of your Voters Card for verification"
        subtitle="This is the only way we can know for sure that you are a real voter."
      />

      {votersCardImage ? (
        <div className="mt-2">
          <img
            src={votersCardImage}
            alt="PVC"
            className="rounded-xl object-cover h-full w-full"
          />
        </div>
      ) : (
        uploadVotersCardPlaceholder
      )}

      {!isPractice && (
        <div className="mt-4">
          <p className="font-semibold text-sm mb-2">Example:</p>
          <img
            src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1783939243/Free9ja/pictures/PVC_2_i9lvfa.png"
            alt="PVC Example"
            className="w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Multi-step voting declaration and PVC verification workflow.
 *
 * Flow Steps:
 *  1. Where did you vote? (State -> LGA -> Ward cascade)
 *  2. Which polling unit? (Infinite cursor-paginated unit selector)
 *  3. Who did you vote for? (Sequential candidate/party selection per eligible election)
 *  4. PVC Verification (Photo upload or practice mode confirmation)
 */
export function VoteFlow() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const user = useUser();
  const { selectedElectionGroup } = useElection();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Active step in the main wizard (1 to 4)
  const [step, setStep] = useState(1);

  // Active sub-index when multiple ballots exist (Presidential, Senatorial, etc.) in Step 3
  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);

  // Geographic territory state
  const [selectedStateId, setSelectedStateId] = useState<number | null>(
    user?.current_state ?? null,
  );
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(
    user?.current_lga ?? null,
  );
  const [selectedWardId, setSelectedWardId] = useState<number | null>(
    user?.current_ward ?? null,
  );
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<
    number | null
  >(user?.polling_unit_id ?? null);

  // Map of votes recorded per election instance: Record<electionId, partyId>
  const [votes, setVotes] = useState<Record<number, number>>({});

  // Permanent Voter's Card (PVC) preview URL
  const [votersCardImage, setVotersCardImage] = useState(
    user?.voters_card_image || "",
  );

  // Query elections eligible for this specific polling unit
  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: [
      "eligible-elections",
      selectedElectionGroup?.id,
      selectedPollingUnitId,
    ],
    queryFn: () =>
      fetchEligibleElections(selectedElectionGroup!.id, selectedPollingUnitId!),
    enabled: !!selectedElectionGroup && !!selectedPollingUnitId,
  });

  // Mutation submitting the complete voting report
  const submitMutation = useMutation({
    mutationFn: submitVotes,
    onSuccess: () => {
      toast.success("Vote submitted successfully!");
      navigate({ to: "/" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit votes");
    },
  });

  // Validates step completeness before allowing user to advance
  const isNextDisabled = (() => {
    if (submitMutation.isPending) return true;
    if (step === 1) return !selectedWardId;
    if (step === 2) return !selectedPollingUnitId;
    if (step === 3) {
      if (!elections || elections.length === 0) return true;
      const currentElection = elections[currentElectionIndex];
      return currentElection ? !votes[currentElection.id] : true;
    }
    if (step === 4) return search.isPractice ? false : !votersCardImage;
    return false;
  })();

  // Reset scroll position to top whenever step or ballot index changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, currentElectionIndex]);

  if (!selectedElectionGroup) {
    return <div className="p-8 text-center">No election group selected.</div>;
  }

  // Next step transition handler
  const handleNext = () => {
    if (step === 1) {
      if (!selectedWardId) return toast.error("Please select a ward");
      setStep(2);
    } else if (step === 2) {
      if (!selectedPollingUnitId)
        return toast.error("Please select a polling unit");
      setStep(3);
    } else if (step === 3) {
      if (Object.keys(votes).length === 0)
        return toast.error("Please select at least one party");

      // Advance to the next ballot in the polling unit, or advance to step 4 if completed
      if (elections && currentElectionIndex < elections.length - 1) {
        setCurrentElectionIndex(currentElectionIndex + 1);
      } else {
        setStep(4);
      }
    } else if (step === 4) {
      // Practice test mode: navigate back to practice dashboard with completion flag
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

      if (!votersCardImage) return toast.error("Please provide PVC image");

      // Compile vote payload across all voted ballots
      const votePayload = Object.entries(votes).map(
        ([electionId, partyId]) => ({
          election_id: Number(electionId),
          party_id: partyId,
        }),
      );

      submitMutation.mutate({
        election_group_id: selectedElectionGroup!.id,
        polling_unit_id: selectedPollingUnitId,
        votes: votePayload,
        voters_card_image: votersCardImage,
      });
    }
  };

  return (
    <PageWrapper>
      {/* Back button steps back through ballots first, then wizard steps, then home */}
      <PageHeader
        onBackClick={() => {
          if (step > 1) {
            if (step === 3 && currentElectionIndex > 0) {
              setCurrentElectionIndex(currentElectionIndex - 1);
            } else {
              setStep(step - 1);
            }
          } else {
            navigate({ to: "/" });
          }
        }}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24">
        {/* Step 1: Territory & Ward Selection */}
        {step === 1 && (
          <Step1
            selectedStateId={selectedStateId}
            setSelectedStateId={setSelectedStateId}
            selectedLgaId={selectedLgaId}
            setSelectedLgaId={setSelectedLgaId}
            selectedWardId={selectedWardId}
            setSelectedWardId={setSelectedWardId}
          />
        )}

        {/* Step 2: Polling Unit Picker */}
        {step === 2 && (
          <Step2
            selectedStateId={selectedStateId}
            selectedLgaId={selectedLgaId}
            selectedWardId={selectedWardId}
            setSelectedWardId={setSelectedWardId}
            selectedPollingUnitId={selectedPollingUnitId}
            setSelectedPollingUnitId={setSelectedPollingUnitId}
          />
        )}

        {/* Step 3: Candidate & Party Selection */}
        {step === 3 && (
          <Step3
            elections={elections}
            electionsLoading={electionsLoading}
            currentElectionIndex={currentElectionIndex}
            setCurrentElectionIndex={setCurrentElectionIndex}
            votes={votes}
            setVotes={setVotes}
          />
        )}

        {/* Step 4: PVC Card Photo Verification */}
        {step === 4 && (
          <Step4
            votersCardImage={votersCardImage}
            setVotersCardImage={setVotersCardImage}
            isPractice={search.isPractice}
          />
        )}
      </div>

      {/* Sticky footer with dynamic Continue / Submit action */}
      <StickyFooter className="pb-10">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={handleNext}
          disabled={isNextDisabled}
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step === 4 ? (
            "Submit"
          ) : (
            "Continue"
          )}
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
}

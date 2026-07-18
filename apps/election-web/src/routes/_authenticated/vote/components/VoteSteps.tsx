import { StickyFooter } from "#/components/Footers";
import { useAuth } from "#/hooks/useAuth";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StepHeader } from "../../applications/components/-ApplySteps";

import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import {
  getEligibleElections,
  submitVotes as submitVotesServer,
} from "#/lib/server/elections";
import { getParties as getPartiesServer } from "#/lib/server/parties";

// Models
type VoteInput = {
  election_id: number;
  party_id: number;
};

// API Fetchers
const fetchEligibleElections = async (
  electionGroupId: number,
  pollingUnitId: number,
) => {
  const res = await getEligibleElections({
    data: { electionGroupId, pollingUnitId },
  });
  return res?.data?.elections || [];
};

const submitVotes = async (payload: any) => {
  const res = await submitVotesServer({ data: payload });
  return res;
};

const getParties = async () => {
  const res = await getPartiesServer();
  return res?.data?.parties || [];
};

// Steps
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

const Step2 = ({
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  setSelectedWardId,
  selectedPollingUnitId,
  setSelectedPollingUnitId,
}: any) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useQuery({
    queryKey: ["polling-units", selectedWardId],
    queryFn: async () => {
      // Temporary implementation of getPollingUnits using useQuery for simplicity
      const res = await getPollingUnits({
        data: {
          stateId: selectedStateId,
          localGovernmentId: selectedLgaId,
          wardId: selectedWardId,
        },
      });
      return res;
    },
    enabled: !!selectedWardId,
  }) as any;

  const targetWardName =
    data?.data?.polling_units?.[0]?.ward_name || "Selected Ward";

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

          {data?.data?.polling_units?.map((unit: any) => {
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
        </div>
      </div>
    </div>
  );
};

const Step3 = ({
  elections,
  electionsLoading,
  currentElectionIndex,
  setCurrentElectionIndex,
  votes,
  setVotes,
}: any) => {
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

  // Build a map of party_id -> candidate from the election's candidates list
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
          console.log({ party: party.logo });

          return (
            <UserCard
              key={party.id}
              name={displayName}
              image={displayImage}
              // image2={candidate ? party.logo : undefined}
              image2={party.logo}
              isSelected={isSelected}
              onClick={() => {
                setVotes((prev: any) => ({
                  ...prev,
                  [currentElection.id]: party.id,
                }));
                // Auto advance if not the last
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

const Step4 = ({
  votersCardImage,
  setVotersCardImage,
}: any) => {
  const handleFileUpload = async (file: File) => {
    // Basic file upload dummy function for now
    // Actually we should use the existing file upload flow.
    // To keep it simple, let's just pretend we uploaded it.
    // In production, we'd use the presigned URL flow.
    const formData = new FormData();
    formData.append("file", file);
    try {
      toast.success("Image selected");
      setVotersCardImage(URL.createObjectURL(file)); // Fake URL for demo
    } catch (e) {
      toast.error("Upload failed");
    }
  };

  const UploadVotersCardPlaceholder = () => (
    <div className="min-h-48 border border-c-20 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer bg-c-10/50 hover:bg-c-10 transition-colors">
      <UploadIcon className="size-8 text-c-80 mb-2" />
      <p className="font-semibold text-sm">Upload Voters Card/PVC</p>
      <input
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
        <UploadVotersCardPlaceholder />
      )}


      <div className="mt-4">
        <p className="font-semibold text-sm mb-2">Example:</p>
        <img
          src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1783939243/Free9ja/pictures/PVC_2_i9lvfa.png"
          alt="PVC Example"
          className="w-full rounded-xl"
        />
      </div>
    </div>
  );
};

export const VoteFlow = () => {
  const { selectedElectionGroup, user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<
    number | null
  >(null);

  // votes: Record<electionId, partyId>
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [votersCardImage, setVotersCardImage] = useState(user?.voters_card_image || "");

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

  const submitMutation = useMutation({
    mutationFn: submitVotes,
    onSuccess: () => {
      toast.success("Vote submitted successfully!");
      navigate({ to: "/home" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit votes");
    },
  });

  const isNextDisabled = (() => {
    if (submitMutation.isPending) return true;
    if (step === 1) return !selectedWardId;
    if (step === 2) return !selectedPollingUnitId;
    if (step === 3) {
      if (!elections || elections.length === 0) return true;
      const currentElection = elections[currentElectionIndex];
      return currentElection ? !votes[currentElection.id] : true;
    }
    if (step === 4) return !votersCardImage;
    return false;
  })();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, currentElectionIndex]);

  if (!selectedElectionGroup) {
    return <div className="p-8 text-center">No election group selected.</div>;
  }

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

      if (elections && currentElectionIndex < elections.length - 1) {
        setCurrentElectionIndex(currentElectionIndex + 1);
      } else {
        setStep(4);
      }
    } else if (step === 4) {
      if (!votersCardImage)
        return toast.error("Please provide PVC image");

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
      <PageHeader
        onBackClick={() => {
          if (step > 1) {
            if (step === 3 && currentElectionIndex > 0) {
              setCurrentElectionIndex(currentElectionIndex - 1);
            } else {
              setStep(step - 1);
            }
          } else {
            navigate({ to: "/home" });
          }
        }}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24">
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
        {step === 4 && (
          <Step4
            votersCardImage={votersCardImage}
            setVotersCardImage={setVotersCardImage}
          />
        )}
      </div>

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
};

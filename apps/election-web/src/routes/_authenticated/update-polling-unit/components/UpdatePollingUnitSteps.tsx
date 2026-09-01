import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAppContext } from "#/hooks/useAppContext";
import { getLGAs } from "#/lib/server/countries";
import { getPollingUnits } from "#/lib/server/polling_units";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { Button } from "@repo/ui/components/button";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { Label } from "@repo/ui/components/input";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "usehooks-ts";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StepHeader } from "../../applications/components/-ApplySteps";

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
      title="Location Details"
      subtitle="Select the state, LGA, and ward of your polling unit."
    />
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label title="State" />
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
        <Label title="LGA" />
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
        title="Select Polling Unit"
        subtitle="Choose your assigned polling unit from the list below."
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
          <Label title={`Polling Units (${targetWardName})`} />

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

// Mock submit function since we lack the exact API for polling_unit_id update
const mockSubmitPollingUnit = async (payload: any) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ success: true }), 1000),
  );
};

export const UpdatePollingUnitFlow = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
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

  const submitMutation = useMutation({
    mutationFn: mockSubmitPollingUnit,
    onSuccess: () => {
      toast.success("Polling unit updated successfully!");
      navigate({ to: "/" });
    },
    onError: () => {
      toast.error("Failed to update polling unit.");
    },
  });

  const isNextDisabled = (() => {
    if (submitMutation.isPending) return true;
    if (step === 1) return !selectedWardId;
    if (step === 2) return !selectedPollingUnitId;
    return false;
  })();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1) {
      if (!selectedWardId) return toast.error("Please select a ward");
      setStep(2);
    } else if (step === 2) {
      if (!selectedPollingUnitId)
        return toast.error("Please select a polling unit");

      submitMutation.mutate({
        polling_unit_id: selectedPollingUnitId,
      });
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        onBackClick={() => {
          if (step > 1) {
            setStep(step - 1);
          } else {
            navigate({ to: "/" });
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
          ) : step === 2 ? (
            "Update Polling Unit"
          ) : (
            "Continue"
          )}
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
};

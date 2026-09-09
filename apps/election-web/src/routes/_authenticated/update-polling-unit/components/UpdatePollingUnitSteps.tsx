import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useUser } from "#/hooks/useUser";
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

// --- Step Components ---

/**
 * Step 1: Location Hierarchy Cascading Selectors.
 * Selects State, LGA, and Ward where the agent's new polling unit is located.
 * Changing parent selectors resets downstream child selections.
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
      title="Location Details"
      subtitle="Select the state, LGA, and ward of your polling unit."
    />
    <div className="space-y-4">
      {/* State Selector */}
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

      {/* Local Government Area Selector */}
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

      {/* Electoral Ward Selector */}
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

/**
 * Step 2: Polling Unit Selection.
 * Fetches and displays a paginated list of polling units registered under the chosen ward.
 * Uses an intersection observer sentinel for seamless infinite scrolling.
 */
const Step2 = ({
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  setSelectedWardId,
  selectedPollingUnitId,
  setSelectedPollingUnitId,
}: any) => {
  // Cursor-paginated query for polling units in the ward
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

  // Infinite scroll sentinel observer
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flattened array of polling unit records across all pages
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
        {/* Ward filter modifier */}
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

        {/* Polling Units list */}
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

          {/* Infinite Scroll Loading Sentinel */}
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

// Simulation submit function until backend provides a dedicated polling_unit assignment update API
const mockSubmitPollingUnit = async (payload: any) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ success: true }), 1000),
  );
};

/**
 * Multi-step flow allowing an agent to update their assigned polling unit.
 *
 * Steps:
 * 1. Location Details: Select State, LGA, and Ward.
 * 2. Select Polling Unit: Pick the new polling unit from a paginated list.
 */
export const UpdatePollingUnitFlow = () => {
  const user = useUser();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Active step counter (1: Location hierarchy, 2: Polling Unit selection)
  const [step, setStep] = useState(1);

  // Geographic territory state initialized with existing user assignments
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

  // Mutation submitting the updated polling unit assignment
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

  // Validates step requirements before allowing progress
  const isNextDisabled = (() => {
    if (submitMutation.isPending) return true;
    if (step === 1) return !selectedWardId;
    if (step === 2) return !selectedPollingUnitId;
    return false;
  })();

  // Reset scroll to top upon step change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Handles stepping forward or submitting
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
      {/* Header with back navigation */}
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
        {/* Step 1: State, LGA, and Ward cascading selectors */}
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

        {/* Step 2: Polling Unit selection */}
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

import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPollingUnitsWithCapacity } from "#/lib/server/parties";
import { getWards } from "#/lib/server/wards";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { Label } from "@repo/ui/components/input";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIntersectionObserver } from "usehooks-ts";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 6: Target polling unit selection with capacity limit checking and infinite scroll */
export const Step6 = () => {
  const {
    selectedStateId,
    selectedLgaId,
    selectedWardId,
    setSelectedWardId,
    selectedPartyId,
    selectedElectionIds,
    selectedPollingUnitId,
    setSelectedPollingUnitId,
  } = useApplyContext();

  const [searchQuery, setSearchQuery] = useState("");
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  const { data: pollingUnitsData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [
      "pollingUnits",
      selectedStateId,
      selectedLgaId,
      selectedWardId,
      selectedPartyId,
      selectedElectionIds?.[0],
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnitsWithCapacity({
        data: {
          stateId: selectedStateId || undefined,
          localGovernmentId: selectedLgaId || undefined,
          wardId: selectedWardId || undefined,
          limit: 20,
          cursor: pageParam || undefined,
          partyId: selectedPartyId!,
          electionGroupId: selectedElectionIds?.[0]!,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load polling units");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: any) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled:
      (!!selectedStateId || !!selectedLgaId || !!selectedWardId) &&
      !!selectedPartyId &&
      !!selectedElectionIds?.[0],
  });

  // Flattened array of polling units across all fetched pages
  const pollingUnits = useMemo(() => {
    return pollingUnitsData
      ? pollingUnitsData.pages.flatMap(
          (page: any) => page.data?.polling_units || [],
        )
      : [];
  }, [pollingUnitsData]);

  // Fallback: select the first polling unit if current selection is absent from new results
  useEffect(() => {
    if (pollingUnits && pollingUnits.length > 0) {
      setSelectedPollingUnitId((current) => {
        const exists = pollingUnits.some((u: any) => u.id === current);
        return exists ? current : pollingUnits[0].id;
      });
    } else {
      setSelectedPollingUnitId(null);
    }
  }, [pollingUnits, setSelectedPollingUnitId]);

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Normalizes ward name extraction from nested or polymorphic unit response
  const getWardName = (unit: any) => {
    if (unit.ward_name) return unit.ward_name;
    if (unit.ward?.name) return unit.ward.name;
    if (unit.ward?.String) return unit.ward.String;
    return "Unknown Ward";
  };

  const targetWardName =
    pollingUnits.length > 0 ? getWardName(pollingUnits[0]) : "your";

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title={`Select a Polling Unit`}
        subtitle="You will be assigned to the polling unit you select or the one closest to your address."
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
            const wardName = getWardName(unit);
            const isFull = unit.is_capacity_full;

            return (
              <SelectableCard
                key={unit.id}
                title={unit.name}
                subtitle={
                  <div className="flex flex-col gap-1">
                    <span>{wardName}</span>
                    {isFull && (
                      <span className="text-[13px] text-orange font-medium">
                        Capacity full for this polling unit
                      </span>
                    )}
                  </div>
                }
                isSelected={isSelected}
                disabled={isFull}
                onClick={() => {
                  if (isFull) {
                    toast.error(
                      "This polling unit has reached its required number of polling agents.",
                      { position: "top-center" },
                    );
                    return;
                  }
                  setSelectedPollingUnitId(unit.id);
                }}
              />
            );
          })}
        </div>

        {/* Sentinel element for infinite scroll */}
        {hasNextPage && (
          <div
            ref={sentinelRef}
            className="py-6 flex items-center justify-center text-c-50 text-[14px]"
          >
            {isFetchingNextPage ? (
              <Loader2 className="size-5 animate-spin mr-2" />
            ) : null}
            {isFetchingNextPage
              ? "Loading more..."
              : "Scroll down to load more"}
          </div>
        )}
      </div>
    </div>
  );
};

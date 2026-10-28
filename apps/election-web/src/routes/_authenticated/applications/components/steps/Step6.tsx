import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPollingUnitsWithCapacity } from "#/lib/server/polling_units";
import { getWards } from "#/lib/server/wards";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { IconInput, Label } from "@repo/ui/components/input";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { cn } from "@repo/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 7: Target polling unit selection with capacity limit checking and infinite scroll */
export const Step6 = () => {
  const {
    selectedStateId,
    selectedLgaId,
    selectedWardId,
    setSelectedWardId,
    selectedPartyId,
    selectedElectionId,
    selectedPollingUnitId,
    setSelectedPollingUnitId,
  } = useApplyContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 350);

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  const { data: pollingUnitsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: [
      "pollingUnits",
      selectedWardId,
      selectedPartyId,
      selectedElectionId,
      debouncedSearch,
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnitsWithCapacity({
        data: {
          wardId: selectedWardId || undefined,
          limit: 20,
          cursor: pageParam || undefined,
          partyId: selectedPartyId!,
          electionGroupId: selectedElectionId!,
          search: debouncedSearch.trim() || undefined,
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
      !!selectedWardId &&
      !!selectedPartyId &&
      !!selectedElectionId,
  });

  // Flattened array of polling units across all fetched pages
  const pollingUnits = useMemo(() => {
    return pollingUnitsData
      ? pollingUnitsData.pages.flatMap(
        (page: any) => page.data?.polling_units || [],
      )
      : [];
  }, [pollingUnitsData]);

  // Fallback: select the current selection if available, or first non-full unit
  useEffect(() => {
    if (pollingUnits && pollingUnits.length > 0) {
      setSelectedPollingUnitId((current) => {
        const matchingUnit = pollingUnits.find((u: any) => u.id === current);
        if (matchingUnit && !matchingUnit.is_capacity_full) {
          return current;
        }
        const availableUnit = pollingUnits.find((u: any) => !u.is_capacity_full);
        return availableUnit ? availableUnit.id : null;
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

          <IconInput
            placeholder="Search polling unit name or code..."
            className="h-12 rounded-2xl bg-hover-5 border border-border text-c-100 placeholder:text-c-40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pollingUnits.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {debouncedSearch.trim()
                ? `No polling units found matching "${debouncedSearch.trim()}".`
                : "No polling units found for this ward."}
            </div>
          ) : (
            pollingUnits.map((unit: any) => {
              const isSelected = selectedPollingUnitId === unit.id;
              const wardName = getWardName(unit);
              const isFull = unit.is_capacity_full;
              const targetCount = unit.target_count ?? 1;
              const remainingSlots = unit.remaining_slots ?? (isFull ? 0 : 1);
              const puCode = typeof unit.pu_code === "string" ? unit.pu_code : unit.pu_code?.String;

              return (
                <SelectableCard
                  key={unit.id}
                  title={unit.name}
                  className="py-3 bg-sidebar-softer/60"
                  subtitle={
                    <div className="flex items-center gap-2 text-xs text-c-60 mt-0.5">
                      <span>{wardName}</span>
                      {puCode && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{puCode}</span>
                        </>
                      )}
                    </div>
                  }
                  rightComponent={
                    <div className="text-xs text-center w-37.5 space-y-1.5 mr-4">
                      <div className="bg-white shadow-inner rounded-full p-1">party target: {targetCount}</div>
                      <div
                        className={cn(
                          "bg-white shadow-inner rounded-full p-1",
                          remainingSlots < 1 && "text-red"
                        )}
                      >
                        open slots: {remainingSlots}
                      </div>
                    </div>
                  }
                  isSelected={isSelected}
                  disabled={isFull}
                  onClick={() => {
                    if (isFull) {
                      toast.error("This polling unit has reached its party target capacity.", { position: "top-center" },);
                      return;
                    }

                    setSelectedPollingUnitId(unit.id);
                  }}
                />
              );
            })
          )}
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


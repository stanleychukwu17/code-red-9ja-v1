import { useState, useEffect } from "react";
import { getWards } from "#/lib/server/wards";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { Label } from "@repo/ui/components/input";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIntersectionObserver } from "usehooks-ts";
import { StepHeader } from "./shared/StepHeader";

/** Step 6: Target polling unit selection with capacity limit checking and infinite scroll */
export const Step6 = ({
  pollingUnits,
  selectedPollingUnitId,
  setSelectedPollingUnitId,
  getWardName,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  setSelectedWardId,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                      <span className="text-[13px] text-orange-500 font-medium">
                        Capacity full for this polling unit
                      </span>
                    )}
                  </div>
                }
                isSelected={isSelected}
                disabled={isFull}
                onClick={() => {
                  if (isFull) {
                    toast.error("This polling unit has reached its required number of polling agents.", {
                      position: "top-center",
                    });
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

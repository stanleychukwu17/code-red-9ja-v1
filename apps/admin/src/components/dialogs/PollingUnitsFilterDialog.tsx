import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/input";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { getStates } from "#/lib/server/states";
import { getLGAs } from "#/lib/server/countries";
import { getWards } from "#/lib/server/wards";
import { ChevronRight, MapPin, RotateCcw } from "lucide-react";

/**
 * Filter criteria state shape for Polling Units
 */
export type PollingUnitsFilters = {
  stateId?: number;
  stateName?: string;
  lgaId?: number;
  lgaName?: string;
  wardId?: number;
  wardName?: string;
};

export type PollingUnitsFilterDialogProps = {
  open: boolean;
  onClose: () => void;
  filters: PollingUnitsFilters;
  onApply: (filters: PollingUnitsFilters) => void;
};

export function PollingUnitsFilterDialog({
  open,
  onClose,
  filters,
  onApply,
}: PollingUnitsFilterDialogProps) {
  // Cascading geographic state
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(
    filters.stateId,
  );
  const [selectedStateName, setSelectedStateName] = useState<string | undefined>(
    filters.stateName,
  );

  const [selectedLgaId, setSelectedLgaId] = useState<number | undefined>(
    filters.lgaId,
  );
  const [selectedLgaName, setSelectedLgaName] = useState<string | undefined>(
    filters.lgaName,
  );

  const [selectedWardId, setSelectedWardId] = useState<number | undefined>(
    filters.wardId,
  );
  const [selectedWardName, setSelectedWardName] = useState<string | undefined>(
    filters.wardName,
  );

  // Sync state whenever the dialog opens or active filters prop changes
  useEffect(() => {
    if (open) {
      setSelectedStateId(filters.stateId);
      setSelectedStateName(filters.stateName);
      setSelectedLgaId(filters.lgaId);
      setSelectedLgaName(filters.lgaName);
      setSelectedWardId(filters.wardId);
      setSelectedWardName(filters.wardName);
    }
  }, [open, filters]);

  // Handle State selection change -> cascade resets to LGA and Ward
  const handleStateChange = (stateItem: { id: number; name: string }) => {
    if (!stateItem || stateItem.id === 0) {
      setSelectedStateId(undefined);
      setSelectedStateName(undefined);
    } else {
      setSelectedStateId(Number(stateItem.id));
      setSelectedStateName(stateItem.name);
    }
    // Reset lower levels
    setSelectedLgaId(undefined);
    setSelectedLgaName(undefined);
    setSelectedWardId(undefined);
    setSelectedWardName(undefined);
  };

  // Handle LGA selection change -> cascade resets to Ward
  const handleLgaChange = (lgaItem: { id: number; name: string }) => {
    if (!lgaItem || lgaItem.id === 0) {
      setSelectedLgaId(undefined);
      setSelectedLgaName(undefined);
    } else {
      setSelectedLgaId(Number(lgaItem.id));
      setSelectedLgaName(lgaItem.name);
    }
    // Reset lower level
    setSelectedWardId(undefined);
    setSelectedWardName(undefined);
  };

  // Handle Ward selection change
  const handleWardChange = (wardItem: { id: number; name: string }) => {
    if (!wardItem || wardItem.id === 0) {
      setSelectedWardId(undefined);
      setSelectedWardName(undefined);
    } else {
      setSelectedWardId(Number(wardItem.id));
      setSelectedWardName(wardItem.name);
    }
  };

  // Reset all filters to empty state
  const handleReset = () => {
    setSelectedStateId(undefined);
    setSelectedStateName(undefined);
    setSelectedLgaId(undefined);
    setSelectedLgaName(undefined);
    setSelectedWardId(undefined);
    setSelectedWardName(undefined);
  };

  // Apply filters and close modal
  const handleApply = () => {
    onApply({
      stateId: selectedStateId,
      stateName: selectedStateName,
      lgaId: selectedLgaId,
      lgaName: selectedLgaName,
      wardId: selectedWardId,
      wardName: selectedWardName,
    });
    onClose();
  };

  const hasActiveFilters = Boolean(
    selectedStateId || selectedLgaId || selectedWardId,
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[480px] p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader title="Filter Polling Units" />

        {/* Scrollable Filters Content */}
        <DialogPadding className="flex-1 overflow-y-auto space-y-5 py-5 custom-scrollbar">
          <p className="text-[13.5px] text-c-60 leading-relaxed">
            Narrow down polling units by administrative hierarchy. Selecting a State enables LGAs, and selecting an LGA enables Wards.
          </p>

          {/* Active Hierarchy Breadcrumb Preview */}
          <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-2 text-[13px] text-c-70">
            <MapPin className="size-4 text-[#00cf79] shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap font-medium">
              <span>Nigeria</span>
              {selectedStateName && (
                <>
                  <ChevronRight className="size-3.5 text-c-40" />
                  <span className="text-black font-semibold">{selectedStateName}</span>
                </>
              )}
              {selectedLgaName && (
                <>
                  <ChevronRight className="size-3.5 text-c-40" />
                  <span className="text-black font-semibold">{selectedLgaName}</span>
                </>
              )}
              {selectedWardName && (
                <>
                  <ChevronRight className="size-3.5 text-c-40" />
                  <span className="text-[#00b56a] font-semibold">{selectedWardName}</span>
                </>
              )}
            </div>
          </div>

          {/* Cascading Tier 1: State */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label title="State" />
              {selectedStateId && (
                <button
                  type="button"
                  onClick={() => handleStateChange({ id: 0, name: "" })}
                  className="text-[12px] text-c-50 hover:text-red-500 font-medium transition cursor-pointer"
                >
                  Clear State
                </button>
              )}
            </div>
            <SelectState
              selectedId={selectedStateId !== undefined ? String(selectedStateId) : undefined}
              update={handleStateChange}
              fetchStates={getStates}
              showAll={true}
            />
          </div>

          {/* Cascading Tier 2: LGA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label title="Local Government Area (LGA)" />
              {selectedLgaId && (
                <button
                  type="button"
                  onClick={() => handleLgaChange({ id: 0, name: "" })}
                  className="text-[12px] text-c-50 hover:text-red-500 font-medium transition cursor-pointer"
                >
                  Clear LGA
                </button>
              )}
            </div>
            <SelectLga
              selectedId={selectedLgaId !== undefined ? String(selectedLgaId) : undefined}
              stateId={selectedStateId}
              disabled={!selectedStateId}
              update={handleLgaChange}
              fetchLGAs={getLGAs}
              showAll={true}
            />
            {!selectedStateId && (
              <p className="text-[12px] text-c-40 italic">
                Select a state above to filter by LGA
              </p>
            )}
          </div>

          {/* Cascading Tier 3: Ward */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label title="Ward" />
              {selectedWardId && (
                <button
                  type="button"
                  onClick={() => handleWardChange({ id: 0, name: "" })}
                  className="text-[12px] text-c-50 hover:text-red-500 font-medium transition cursor-pointer"
                >
                  Clear Ward
                </button>
              )}
            </div>
            <SelectWard
              selectedId={selectedWardId !== undefined ? String(selectedWardId) : undefined}
              lgaId={selectedLgaId}
              stateId={selectedStateId}
              disabled={!selectedLgaId}
              update={handleWardChange}
              fetchWards={getWards}
              showAll={true}
            />
            {!selectedLgaId && (
              <p className="text-[12px] text-c-40 italic">
                Select an LGA above to filter by Ward
              </p>
            )}
          </div>
        </DialogPadding>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t border-[#f0f0f0] bg-white flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="text-c-50 hover:text-c-90 flex items-center gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#00cf79] hover:bg-[#00b56a] text-white"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

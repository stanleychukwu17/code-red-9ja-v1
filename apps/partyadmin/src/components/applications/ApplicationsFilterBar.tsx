/**
 * @file Applications Filter Bar Component
 * @description Provides cascaded geographic filtering (State -> LGA -> Ward),
 * election group selection, and quick actions for agent applications.
 */

import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getPollingUnits, getWards } from "#/lib/server/applications";
import { useElectionGroup } from "#/hooks/useElectionGroup";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

export type ApplicationsFilterValues = {
  electionGroupId?: number;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
  pollingUnitId?: number;
};

export type ApplicationsFilterBarProps = {
  electionGroupId?: number;
  onElectionGroupChange?: (id?: number) => void;
  stateId?: number;
  onStateChange?: (id?: number) => void;
  lgaId?: number;
  onLgaChange?: (id?: number) => void;
  wardId?: number;
  onWardChange?: (id?: number) => void;
  pollingUnitId?: number;
  onPollingUnitChange?: (id?: number) => void;
  onFiltersChange?: (filters: ApplicationsFilterValues) => void;
  onAcceptAll?: () => void;
  showAcceptAll?: boolean;
};

export function ApplicationsFilterBar({
  electionGroupId,
  onElectionGroupChange,
  stateId,
  onStateChange,
  lgaId,
  onLgaChange,
  wardId,
  onWardChange,
  pollingUnitId,
  onPollingUnitChange,
  onFiltersChange,
  onAcceptAll,
  showAcceptAll = true,
}: ApplicationsFilterBarProps) {
  // Load available election groups
  const { electionGroups, isLoading: isGroupsLoading } = useElectionGroup();

  // Lazy-load polling units only after a ward is selected
  const { data: unitsRes, isLoading: isUnitsLoading } = useQuery({
    queryKey: ["polling-units-filter", stateId, lgaId, wardId],
    queryFn: async () => {
      const res = await getPollingUnits({
        data: {
          stateID: stateId,
          lgaID: lgaId,
          wardID: wardId,
        },
      });
      return (res?.data?.polling_units ?? res?.data ?? []) as Array<{ id: number; name: string }>;
    },
    enabled: Boolean(wardId),
    staleTime: Infinity,
  });

  // Normalize polling units list
  const pollingUnits = Array.isArray(unitsRes) ? unitsRes : [];

  // Check if any filter is currently active
  const hasActiveFilters = Boolean(electionGroupId || stateId || lgaId || wardId || pollingUnitId);

  // Clear all cascaded and election group filters
  const handleClearFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({
        electionGroupId: undefined,
        stateId: undefined,
        lgaId: undefined,
        wardId: undefined,
        pollingUnitId: undefined,
      });
    }
    onElectionGroupChange?.(undefined);
    onStateChange?.(undefined);
    onLgaChange?.(undefined);
    onWardChange?.(undefined);
    onPollingUnitChange?.(undefined);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      {/* Left side: Cascaded Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Election Group Selector (Native HTML Select) */}
        <select
          value={electionGroupId ? String(electionGroupId) : ""}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : undefined;
            if (onFiltersChange) {
              onFiltersChange({
                electionGroupId: val,
                stateId,
                lgaId,
                wardId,
                pollingUnitId,
              });
            }
            onElectionGroupChange?.(val);
          }}
          className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-44 max-w-48 sm:max-w-56 truncate outline-none cursor-pointer"
        >
          <option value="">
            {isGroupsLoading ? "Loading..." : "Select Election Group *"}
          </option>
          {electionGroups.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>

        {/* State Selector */}
        <div className="w-28 sm:w-32">
          <SelectState
            selectedId={stateId}
            countryOriginalId={161}
            fetchStates={getStates}
            update={(state) => {
              const val = state?.id ? Number(state.id) : undefined;
              if (onFiltersChange) {
                onFiltersChange({
                  electionGroupId,
                  stateId: val,
                  lgaId: undefined,
                  wardId: undefined,
                  pollingUnitId: undefined,
                });
              }
              onStateChange?.(val);
              onLgaChange?.(undefined);
              onWardChange?.(undefined);
              onPollingUnitChange?.(undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040]"
          />
        </div>

        {/* LGA Selector */}
        <div className="w-28 sm:w-32">
          <SelectLga
            selectedId={lgaId}
            stateId={stateId}
            disabled={!stateId}
            fetchLGAs={getLGAs}
            showAll="All LGAs"
            update={(lga) => {
              const val = lga?.id ? Number(lga.id) : undefined;
              if (onFiltersChange) {
                onFiltersChange({
                  electionGroupId,
                  stateId,
                  lgaId: val,
                  wardId: undefined,
                  pollingUnitId: undefined,
                });
              }
              onLgaChange?.(val);
              onWardChange?.(undefined);
              onPollingUnitChange?.(undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] disabled:opacity-50"
          />
        </div>

        {/* Ward Selector */}
        <div className="w-28 sm:w-32">
          <SelectWard
            selectedId={wardId}
            lgaId={lgaId}
            stateId={stateId}
            disabled={!lgaId}
            fetchWards={getWards}
            showAll="All Wards"
            update={(ward) => {
              const val = ward?.id ? Number(ward.id) : undefined;
              if (onFiltersChange) {
                onFiltersChange({
                  electionGroupId,
                  stateId,
                  lgaId,
                  wardId: val,
                  pollingUnitId: undefined,
                });
              }
              onWardChange?.(val);
              onPollingUnitChange?.(undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] disabled:opacity-50"
          />
        </div>

        {/* Polling Unit Selector */}
        <div className="w-28 sm:w-32">
          <select
            value={pollingUnitId ? String(pollingUnitId) : ""}
            disabled={!wardId || isUnitsLoading}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              if (onFiltersChange) {
                onFiltersChange({
                  electionGroupId,
                  stateId,
                  lgaId,
                  wardId,
                  pollingUnitId: val,
                });
              }
              onPollingUnitChange?.(val);
            }}
            className="w-full h-11 px-3 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] truncate outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
          <option value="">
            {isUnitsLoading ? "Loading..." : "All Units"}
          </option>
          {pollingUnits.map((pu) => (
            <option key={pu.id} value={String(pu.id)}>
              {pu.name}
            </option>
          ))}
        </select>
      </div>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 h-11 px-3 rounded-12 text-[14px] text-red-600 hover:bg-red-50 transition"
          >
            <X className="size-4" />
            Clear
          </button>
        )}
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-3">
        {showAcceptAll && onAcceptAll && (
          <button
            type="button"
            onClick={onAcceptAll}
            className="flex h-11 items-center gap-2 rounded-12 bg-[#262626] px-5 text-[15px] font-medium text-white transition hover:bg-[#111]"
          >
            Accept all
          </button>
        )}
      </div>
    </div>
  );
}


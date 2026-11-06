/**
 * @file Applications Filter Bar Component
 * @description Provides cascaded geographic filtering (State -> LGA -> Ward),
 * election group selection, and quick actions for agent applications.
 */

import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import ExportIcon from "@repo/ui/icons/export-icon";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import { useElectionGroup } from "#/hooks/useElectionGroup";
import { X } from "lucide-react";

export interface ApplicationsFilterBarProps {
  electionGroupId?: number;
  onElectionGroupChange: (id?: number) => void;
  stateId?: number;
  onStateChange: (id?: number) => void;
  lgaId?: number;
  onLgaChange: (id?: number) => void;
  wardId?: number;
  onWardChange: (id?: number) => void;
  onAcceptAll?: () => void;
  onExport?: () => void;
  showAcceptAll?: boolean;
}

export function ApplicationsFilterBar({
  electionGroupId,
  onElectionGroupChange,
  stateId,
  onStateChange,
  lgaId,
  onLgaChange,
  wardId,
  onWardChange,
  onAcceptAll,
  onExport,
  showAcceptAll = true,
}: ApplicationsFilterBarProps) {
  const { electionGroups, isLoading: isGroupsLoading } = useElectionGroup();

  const hasActiveFilters = Boolean(electionGroupId || stateId || lgaId || wardId);

  const handleClearFilters = () => {
    onElectionGroupChange(undefined);
    onStateChange(undefined);
    onLgaChange(undefined);
    onWardChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      {/* Left side: Cascaded Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Election Group Selector (Native HTML Select) */}
        <select
          value={electionGroupId ? String(electionGroupId) : ""}
          onChange={(e) =>
            onElectionGroupChange(
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-44 outline-none cursor-pointer"
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
        <div className="w-38 sm:w-44">
          <SelectState
            selectedId={stateId}
            countryOriginalId={161}
            fetchStates={getStates}
            update={(state) => {
              onStateChange(state?.id ? Number(state.id) : undefined);
              onLgaChange(undefined);
              onWardChange(undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040]"
          />
        </div>

        {/* LGA Selector */}
        <div className="w-38 sm:w-44">
          <SelectLga
            selectedId={lgaId}
            stateId={stateId}
            disabled={!stateId}
            fetchLGAs={getLGAs}
            showAll="All LGAs"
            update={(lga) => {
              onLgaChange(lga?.id ? Number(lga.id) : undefined);
              onWardChange(undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] disabled:opacity-50"
          />
        </div>

        {/* Ward Selector */}
        <div className="w-38 sm:w-44">
          <SelectWard
            selectedId={wardId}
            lgaId={lgaId}
            stateId={stateId}
            disabled={!lgaId}
            fetchWards={getWards}
            showAll="All Wards"
            update={(ward) => {
              onWardChange(ward?.id ? Number(ward.id) : undefined);
            }}
            className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] disabled:opacity-50"
          />
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
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex h-11 items-center gap-2.5 rounded-12 border border-[#dddddd] bg-white px-4 text-[15px] text-[#404040] transition hover:bg-[#fafafa]"
          >
            Export
            <ExportIcon />
          </button>
        )}
      </div>
    </div>
  );
}


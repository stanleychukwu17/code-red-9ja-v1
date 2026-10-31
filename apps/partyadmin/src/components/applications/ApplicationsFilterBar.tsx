/**
 * @file Applications Filter Bar Component
 * @description Provides cascaded geographic filtering (State -> LGA -> Ward),
 * election group selection, and quick actions for agent applications.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import ExportIcon from "@repo/ui/icons/export-icon";
import { getStates, getLGAs, getWards } from "#/lib/server/countries";
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

  const fetchStates = useServerFn(getStates);
  const fetchLGAs = useServerFn(getLGAs);
  const fetchWards = useServerFn(getWards);

  // 1. Fetch States (Default: Nigeria countryId = 1)
  const { data: statesData, isLoading: isStatesLoading } = useQuery({
    queryKey: ["geo-states", 1],
    queryFn: () => fetchStates({ data: { countryId: 1, limit: 100 } }),
    staleTime: 60 * 60 * 1000,
  });
  const states: Array<{ id: number; name: string }> =
    (statesData as any)?.data?.states || (statesData as any)?.states || [];

  // 2. Cascaded LGAs (enabled only when state is selected)
  const { data: lgasData, isLoading: isLgasLoading } = useQuery({
    queryKey: ["geo-lgas", stateId],
    queryFn: () => fetchLGAs({ data: { stateId: stateId! } }),
    enabled: Boolean(stateId),
    staleTime: 30 * 60 * 1000,
  });
  const lgas: Array<{ id: number; name: string }> =
    (lgasData as any)?.data?.lgas || (lgasData as any)?.lgas || [];

  // 3. Cascaded Wards (enabled only when LGA is selected)
  const { data: wardsData, isLoading: isWardsLoading } = useQuery({
    queryKey: ["geo-wards", stateId, lgaId],
    queryFn: () => fetchWards({ data: { stateId, lgaId: lgaId! } }),
    enabled: Boolean(lgaId),
    staleTime: 30 * 60 * 1000,
  });
  const wards: Array<{ id: number; name: string }> =
    (wardsData as any)?.data?.wards || (wardsData as any)?.wards || [];

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
        {/* Election Group Selector */}
        <Select
          value={electionGroupId ? String(electionGroupId) : "all"}
          onValueChange={(val) =>
            onElectionGroupChange(val === "all" ? undefined : Number(val))
          }
        >
          <SelectTrigger className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-44">
            <SelectValue placeholder={isGroupsLoading ? "Loading..." : "All Election Groups"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Election Groups</SelectItem>
            {electionGroups.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State Selector */}
        <Select
          value={stateId ? String(stateId) : "all"}
          onValueChange={(val) => {
            onStateChange(val === "all" ? undefined : Number(val));
            onLgaChange(undefined);
            onWardChange(undefined);
          }}
        >
          <SelectTrigger className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-36">
            <SelectValue placeholder={isStatesLoading ? "Loading..." : "All States"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* LGA Selector */}
        <Select
          value={lgaId ? String(lgaId) : "all"}
          disabled={!stateId || isLgasLoading}
          onValueChange={(val) => {
            onLgaChange(val === "all" ? undefined : Number(val));
            onWardChange(undefined);
          }}
        >
          <SelectTrigger className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-36 disabled:opacity-50">
            <SelectValue
              placeholder={
                !stateId
                  ? "Select State first"
                  : isLgasLoading
                  ? "Loading..."
                  : "All LGAs"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All LGAs</SelectItem>
            {lgas.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ward Selector */}
        <Select
          value={wardId ? String(wardId) : "all"}
          disabled={!lgaId || isWardsLoading}
          onValueChange={(val) =>
            onWardChange(val === "all" ? undefined : Number(val))
          }
        >
          <SelectTrigger className="h-11 px-3.5 rounded-12 border border-[#dddddd] bg-white text-[14px] text-[#404040] min-w-36 disabled:opacity-50">
            <SelectValue
              placeholder={
                !lgaId
                  ? "Select LGA first"
                  : isWardsLoading
                  ? "Loading..."
                  : "All Wards"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wards.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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


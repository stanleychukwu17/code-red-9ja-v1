import {
  useState,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getContestedOffices } from "#/lib/server/offices";
import { getStates } from "#/lib/server/countries";
import { Loader2, Search } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import type { ElectionFilters } from "#/lib/server/elections";

export type { ElectionFilters };

export type ElectionInstancesFilterDialogProps = {
  open: boolean;
  onClose: () => void;
  filters: ElectionFilters;
  onApply: (filters: ElectionFilters) => void;
};

const SCOPE_OPTIONS = [
  { label: "Nationwide", value: "nationwide" },
  { label: "State", value: "state" },
  { label: "Senatorial District", value: "senatorial-district" },
  { label: "Federal Constituency", value: "federal-constituency" },
  { label: "State Constituency", value: "state-constituency" },
  { label: "Local Government (LGA)", value: "lga" },
  { label: "Ward", value: "ward" },
];

const STATUS_OPTIONS = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Ended", value: "ended" },
];

export function ElectionInstancesFilterDialog({
  open,
  onClose,
  filters,
  onApply,
}: ElectionInstancesFilterDialogProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(
    filters.election_group_ids,
  );
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    filters.scopes,
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    filters.statuses,
  );
  const [selectedStateIds, setSelectedStateIds] = useState<number[]>(
    filters.state_ids,
  );
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<number[]>(
    filters.office_ids,
  );
  const [dateFrom, setDateFrom] = useState<string>(
    filters.date_from || "",
  );
  const [dateTo, setDateTo] = useState<string>(filters.date_to || "");

  const [stateSearch, setStateSearch] = useState("");
  const [officeSearch, setOfficeSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedGroupIds(filters.election_group_ids);
      setSelectedScopes(filters.scopes);
      setSelectedStatuses(filters.statuses);
      setSelectedStateIds(filters.state_ids);
      setSelectedOfficeIds(filters.office_ids);
      setDateFrom(filters.date_from || "");
      setDateTo(filters.date_to || "");
      setStateSearch("");
      setOfficeSearch("");
    }
  }, [open, filters]);

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["election-groups-filter"],
    queryFn: async () => {
      const res = await getElectionGroups({ data: { limit: 100 } });
      if (res && res.success) return res;
      throw new Error(res?.message || "Failed to load election groups");
    },
    enabled: open,
    staleTime: 60_000,
  });

  const { data: officesData, isLoading: isLoadingOffices } = useQuery({
    queryKey: ["contested-offices-filter"],
    queryFn: async () => {
      const res = await getContestedOffices({ data: { limit: 100 } });
      if (res && res.success) return res;
      throw new Error(res?.message || "Failed to load contested offices");
    },
    enabled: open,
    staleTime: 60_000,
  });

  const { data: statesData, isLoading: isLoadingStates } = useQuery({
    queryKey: ["states-filter", 161],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161, limit: 50 } });
      if (res && (res.success || res.status === "success") && res.data) {
        return res.data;
      }
      return res;
    },
    enabled: open,
    staleTime: Infinity,
  });

  const electionGroups =
    groupsData?.data?.election_groups || groupsData?.election_groups || [];
  const offices = officesData?.data?.offices || officesData?.offices || [];
  const states = statesData?.states || statesData?.data?.states || [];

  const filteredOffices = useMemo(() => {
    if (!officeSearch.trim()) return offices;
    const q = officeSearch.toLowerCase();
    return offices.filter((o: any) => o.name?.toLowerCase().includes(q));
  }, [offices, officeSearch]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return states;
    const q = stateSearch.toLowerCase();
    return states.filter((s: any) => s.name?.toLowerCase().includes(q));
  }, [states, stateSearch]);

  const toggleItem = <T,>(
    list: T[],
    item: T,
    setter: Dispatch<SetStateAction<T[]>>,
  ) => {
    setter(
      list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
    );
  };

  const handleApply = () => {
    onApply({
      election_group_ids: selectedGroupIds,
      scopes: selectedScopes,
      statuses: selectedStatuses,
      state_ids: selectedStateIds,
      office_ids: selectedOfficeIds,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedGroupIds([]);
    setSelectedScopes([]);
    setSelectedStatuses([]);
    setSelectedStateIds([]);
    setSelectedOfficeIds([]);
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-120 p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader title="Filter Elections" />

        <DialogPadding className="flex-1 overflow-y-auto space-y-6 pb-6 pt-5 min-h-0 custom-scrollbar">
          {/* Section 1: Election Groups */}
          <div className="space-y-3">
            <h4 className="font-semibold text-c-90 text-[15px]">Election Groups</h4>
            {isLoadingGroups ? (
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading election groups...
              </div>
            ) : electionGroups.length === 0 ? (
              <div className="text-sm text-c-40">No election groups available</div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {electionGroups.map((group: any) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={() =>
                        toggleItem(selectedGroupIds, group.id, setSelectedGroupIds)
                      }
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 rounded-full shrink-0",
                          group.active ? "bg-[#00cf79]" : "bg-c-30",
                        )}
                        title={group.active ? "Active" : "Inactive"}
                      />
                      <span className="text-[14px] text-c-80 group-hover:text-black transition">
                        {group.name} {group.year ? `(${group.year})` : ""}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Section 2: Administrative Hierarchy Scope */}
          <div className="space-y-3">
            <h4 className="font-semibold text-c-90 text-[15px]">Scope</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {SCOPE_OPTIONS.map((scope) => (
                <label
                  key={scope.value}
                  className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                >
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() =>
                      toggleItem(selectedScopes, scope.value, setSelectedScopes)
                    }
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">
                    {scope.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Section 3: Election Status */}
          <div className="space-y-3">
            <h4 className="font-semibold text-c-90 text-[15px]">Status</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {STATUS_OPTIONS.map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                >
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedStatuses.includes(status.value)}
                    onChange={() =>
                      toggleItem(selectedStatuses, status.value, setSelectedStatuses)
                    }
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Section 4: Contested Offices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-c-90 text-[15px]">Offices</h4>
              {selectedOfficeIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedOfficeIds([])}
                  className="text-xs text-c-50 hover:text-black transition cursor-pointer"
                >
                  Clear ({selectedOfficeIds.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-sidebar-softer border border-border/50 text-xs">
              <Search className="size-3.5 text-c-40 shrink-0" />
              <input
                type="text"
                placeholder="Search offices..."
                value={officeSearch}
                onChange={(e) => setOfficeSearch(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-c-40 text-c-80"
              />
            </div>

            {isLoadingOffices ? (
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading offices...
              </div>
            ) : filteredOffices.length === 0 ? (
              <div className="text-sm text-c-40 py-2">No matching offices</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {filteredOffices.map((office: any) => (
                  <label
                    key={office.id}
                    className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                      checked={selectedOfficeIds.includes(office.id)}
                      onChange={() =>
                        toggleItem(
                          selectedOfficeIds,
                          office.id,
                          setSelectedOfficeIds,
                        )
                      }
                    />
                    <span className="text-[14px] text-c-80 group-hover:text-black transition">
                      {office.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Section 5: State Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-c-90 text-[15px]">State</h4>
              {selectedStateIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStateIds([])}
                  className="text-xs text-c-50 hover:text-black transition cursor-pointer"
                >
                  Clear ({selectedStateIds.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-sidebar-softer border border-border/50 text-xs">
              <Search className="size-3.5 text-c-40 shrink-0" />
              <input
                type="text"
                placeholder="Search states..."
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-c-40 text-c-80"
              />
            </div>

            {isLoadingStates ? (
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading states...
              </div>
            ) : filteredStates.length === 0 ? (
              <div className="text-sm text-c-40 py-2">No matching states</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {filteredStates.map((state: any) => (
                  <label
                    key={state.id}
                    className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                      checked={selectedStateIds.includes(state.id)}
                      onChange={() =>
                        toggleItem(
                          selectedStateIds,
                          state.id,
                          setSelectedStateIds,
                        )
                      }
                    />
                    <span className="text-[14px] text-c-80 group-hover:text-black transition truncate">
                      {state.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Section 6: Election Date Range */}
          <div className="space-y-3">
            <h4 className="font-semibold text-c-90 text-[15px]">
              Election Date Range
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-c-60">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-sidebar-softer border border-border text-sm text-c-90 outline-none focus:border-c-60 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-c-60">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-sidebar-softer border border-border text-sm text-c-90 outline-none focus:border-c-60 transition"
                />
              </div>
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="flex-row items-center justify-between gap-3 px-6 py-4 bg-background border-t border-border mt-auto">
          <Button
            type="button"
            variant="ghost"
            size="2xl"
            onClick={handleClear}
            className="flex-1 text-c-60 hover:text-black hover:bg-[#f5f5f5]"
          >
            Clear All
          </Button>
          <Button
            type="button"
            variant="black"
            size="2xl"
            className="flex-1"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useElectionGroups } from "#/hooks/useElectionGroups";
import { useContestedOffices } from "#/hooks/useContestedOffices";
import { useNigeriaStates } from "#/hooks/useNigeriaStates";
import { Loader2, Search } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

// Filter criteria state shape passed to the parent query
export type ElectionFilters = {
  election_group_ids: number[];
  scopes: string[];
  statuses: string[];
  state_ids: number[];
  office_ids: number[];
  date_from?: string;
  date_to?: string;
};

// Component props for controlling dialog visibility and filter application
export type ElectionInstancesFilterDialogProps = {
  open: boolean;
  onClose: () => void;
  filters: ElectionFilters;
  onApply: (filters: ElectionFilters) => void;
};

// Available administrative hierarchy scopes for elections
const SCOPE_OPTIONS = [
  { label: "Nationwide", value: "nationwide" },
  { label: "State", value: "state" },
  { label: "Senatorial District", value: "senatorial-district" },
  { label: "Federal Constituency", value: "federal-constituency" },
  { label: "State Constituency", value: "state-constituency" },
  { label: "Local Government (LGA)", value: "lga" },
  { label: "Ward", value: "ward" },
];

// Available lifecycle statuses for election instances
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
  // Selected election group IDs
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<number[]>(filters.election_group_ids);

  // Selected administrative hierarchy scopes
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>(filters.scopes);

  // Selected election statuses
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(filters.statuses);

  // Selected state IDs (for state and sub-state tiers)
  const [selectedStateIds, setSelectedStateIds] = React.useState<number[]>(filters.state_ids);

  // Selected contested office IDs
  const [selectedOfficeIds, setSelectedOfficeIds] = React.useState<number[]>(filters.office_ids);

  // Filter bounds for election date
  const [dateFrom, setDateFrom] = React.useState<string>(filters.date_from || "");
  const [dateTo, setDateTo] = React.useState<string>(filters.date_to || "");

  // Quick text search filter for long lists inside the dialog
  const [stateSearch, setStateSearch] = React.useState("");
  const [officeSearch, setOfficeSearch] = React.useState("");

  // Re-sync local dialog state whenever the modal opens with active filters
  React.useEffect(() => {
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

  // Fetch election groups (e.g. 2027 General Elections)
  const { data: electionGroups = [], isLoading: isLoadingGroups } = useElectionGroups({
    enabled: open,
  });

  // Fetch only contested/elective offices (e.g. President, Governor, Senator)
  const { data: offices = [], isLoading: isLoadingOffices } = useContestedOffices({
    enabled: open,
  });

  // Fetch Nigerian states (country ID 161)
  const { data: states = [], isLoading: isLoadingStates } = useNigeriaStates({
    enabled: open,
  });

  // Filter office choices by in-modal search query
  const filteredOffices = React.useMemo(() => {
    if (!officeSearch.trim()) return offices;
    const q = officeSearch.toLowerCase();
    return offices.filter((o: any) => o.name?.toLowerCase().includes(q));
  }, [offices, officeSearch]);

  // Filter state choices by in-modal search query
  const filteredStates = React.useMemo(() => {
    if (!stateSearch.trim()) return states;
    const q = stateSearch.toLowerCase();
    return states.filter((s: any) => s.name?.toLowerCase().includes(q));
  }, [states, stateSearch]);

  // Generic helper to toggle an item in an array state
  const toggleItem = <T,>(list: T[], item: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  // Submit filters to parent page and close dialog
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

  // Reset all local filter selections to default empty state
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
        {/* Modal title bar */}
        <DialogHeader title="Filter Elections" />

        {/* Scrollable container with individual filter sections */}
        <DialogPadding className="flex-1 overflow-y-auto space-y-6 pb-6 pt-5 min-h-0 custom-scrollbar">
          
          {/* Section 1: Election Groups */}
          <div className="space-y-3">
            <h4 className="font-semibold text-c-90 text-[15px]">Election Groups</h4>
            {isLoadingGroups ? (
              // Loading spinner for election groups
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading election groups...
              </div>
            ) : electionGroups.length === 0 ? (
              // Empty fallback
              <div className="text-sm text-c-40">No election groups available</div>
            ) : (
              // Scrollable checkbox list with active status indicator
              <div className="grid grid-cols-1 gap-2.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {electionGroups.map((group: any) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-3 cursor-pointer group hover:bg-black/2 p-1.5 rounded-lg transition"
                  >
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={() => toggleItem(selectedGroupIds, group.id, setSelectedGroupIds)}
                    />
                    <div className="flex items-center gap-2">
                      {/* Visual status dot: green for active group, gray for inactive */}
                      <span
                        className={cn(
                          "size-2.5 rounded-full shrink-0",
                          group.active ? "bg-[#00cf79]" : "bg-c-30"
                        )}
                        title={group.active ? "Active" : "Inactive"}
                      />
                      {/* Election group name and year label */}
                      <span className="text-[14px] text-c-80 group-hover:text-black transition">
                        {group.name} ({group.year})
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
            {/* 2-column grid of scope checkboxes */}
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
                    onChange={() => toggleItem(selectedScopes, scope.value, setSelectedScopes)}
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
            {/* 2-column grid of status checkboxes */}
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
                    onChange={() => toggleItem(selectedStatuses, status.value, setSelectedStatuses)}
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
              {/* Reset selected offices button */}
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

            {/* Quick search input to filter long office list */}
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
              // Loading spinner for offices
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading offices...
              </div>
            ) : filteredOffices.length === 0 ? (
              // No matching search results
              <div className="text-sm text-c-40 py-2">No matching offices</div>
            ) : (
              // Scrollable list of filtered offices
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
                      onChange={() => toggleItem(selectedOfficeIds, office.id, setSelectedOfficeIds)}
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
              {/* Reset selected states button */}
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

            {/* Quick search input to filter 37 states list */}
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
              // Loading spinner for states
              <div className="flex items-center gap-2 text-sm text-c-50 py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading states...
              </div>
            ) : filteredStates.length === 0 ? (
              // No matching search results
              <div className="text-sm text-c-40 py-2">No matching states</div>
            ) : (
              // 2-column scrollable grid of state options
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
                      onChange={() => toggleItem(selectedStateIds, state.id, setSelectedStateIds)}
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
            <h4 className="font-semibold text-c-90 text-[15px]">Election Date Range</h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Lower date boundary */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-c-60">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-sidebar-softer border border-border text-sm text-c-90 outline-none focus:border-c-60 transition"
                />
              </div>
              {/* Upper date boundary */}
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

        {/* Modal action footer */}
        <DialogFooter className="flex-row items-center justify-between gap-3 px-6 py-4 bg-background border-t border-border mt-auto">
          {/* Reset all selections */}
          <Button
            type="button"
            variant="ghost"
            size="2xl"
            onClick={handleClear}
            className="flex-1 text-c-60 hover:text-black hover:bg-[#f5f5f5]"
          >
            Clear All
          </Button>
          {/* Apply and close */}
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

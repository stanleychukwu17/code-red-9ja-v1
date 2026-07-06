import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { IconInput } from "../input";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ElectionGroup {
  id: number;
  name: string;
  election_date?: string;
}

export interface Election {
  id: number;
  name: string;
  election_date?: string;
}

interface ElectionGroupsResponse {
  success: boolean;
  message: string;
  data: {
    election_groups: ElectionGroup[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const SelectElectionGroupAndElection = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  partyId,
  className,
  align = "start",
  fetchElectionGroups,
  fetchElectionsByGroup,
  onElectionSelect,
}: SelectProps<ElectionGroup, number> & {
  partyId?: number;
  fetchElectionGroups: (args: {
    data: { partyId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
  /** When provided, clicking a group opens step 2 — the elections list. */
  fetchElectionsByGroup?: (args: { data: number | string }) => Promise<any>;
  /** Called with the final group + election selection when two-step flow completes. */
  onElectionSelect?: (group: ElectionGroup, election: Election) => void;
}) => {
  const [open, setOpen] = useState(false);

  // Step 1 search states
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");

  // Step 2 search states (elections within a group)
  const [desktopElectionSearch, setDesktopElectionSearch] = useState("");
  const [mobileElectionSearch, setMobileElectionSearch] = useState("");

  const [selectedItem, setSelectedItem] = useState<ElectionGroup | undefined>(
    undefined,
  );

  /**
   * The group the user clicked in step 1.
   * Non-null means we are on step 2 (elections within this group).
   */
  const [pendingGroup, setPendingGroup] = useState<ElectionGroup | null>(null);

  // ─── Groups query ──────────────────────────────────────────────────────────
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<ElectionGroupsResponse>({
      queryKey: ["election-groups-select", partyId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchElectionGroups({
          data: { partyId, limit: 50, cursor: pageParam as string },
        });
        if (res && res.success && res.data) return res;
        throw new Error(res?.message || "Failed to fetch election groups");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more)
          return lastPage.meta.next_cursor || "";
        return undefined;
      },
    });

  const electionGroups = data
    ? data.pages.flatMap((page) => page.data?.election_groups || [])
    : [];

  // ─── Elections query (step 2) ──────────────────────────────────────────────
  const { data: electionsRaw, isLoading: isLoadingElections } = useQuery({
    queryKey: ["elections-by-group-select", pendingGroup?.id],
    queryFn: async () => {
      const res = await fetchElectionsByGroup!({ data: pendingGroup!.id });
      return res;
    },
    enabled: !!pendingGroup && !!fetchElectionsByGroup,
  });

  const elections: Election[] =
    electionsRaw?.elections || electionsRaw?.data?.elections || [];

  const electionStatus = isLoadingElections
    ? ("LoadingFirstPage" as const)
    : ("Exhausted" as const);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedId && hasNextPage && !isFetchingNextPage && !isLoading) {
      const found = electionGroups.some(
        (eg) => String(eg.id) === String(selectedId),
      );
      if (!found) fetchNextPage();
    }
  }, [
    selectedId,
    electionGroups,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const eg = electionGroups.find(
        (eg) => String(eg.id) === String(selectedId),
      );
      if (eg) setSelectedItem(eg);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, electionGroups]);

  // Reset everything when the popover/drawer closes
  useEffect(() => {
    if (!open) {
      setMobileSearch("");
      setMobileElectionSearch("");
      setDesktopElectionSearch("");
      setPendingGroup(null);
    }
  }, [open]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  /** Called when the user clicks a group row. */
  const handleGroupClick = (eg: ElectionGroup) => {
    if (fetchElectionsByGroup && onElectionSelect) {
      // Two-step: navigate to elections within this group
      setPendingGroup(eg);
    } else {
      // Single-step: select the group and close
      setSelectedItem(eg);
      update(eg);
      setOpen(false);
    }
  };

  /** Called when the user clicks an election row in step 2. */
  const handleElectionClick = (election: Election) => {
    if (pendingGroup && onElectionSelect) {
      onElectionSelect(pendingGroup, election);
      setOpen(false);
    }
  };

  /** Go back to step 1. */
  const handleBack = () => {
    setPendingGroup(null);
    setMobileElectionSearch("");
    setDesktopElectionSearch("");
  };

  // ─── Status / filtering helpers ───────────────────────────────────────────
  const getGroupStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && electionGroups.length === 0) return "LoadingFirstPage";
    if (isFetchingNextPage) return "LoadingMore";
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const desktopFilteredGroups = electionGroups.filter((eg) =>
    eg.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFilteredGroups = electionGroups.filter((eg) =>
    eg.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );
  const desktopFilteredElections = elections.filter((e) =>
    e.name.toLowerCase().includes(desktopElectionSearch.toLowerCase()),
  );
  const mobileFilteredElections = elections.filter((e) =>
    e.name.toLowerCase().includes(mobileElectionSearch.toLowerCase()),
  );

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem ? "Loading..." : "Select Election Group");
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  const getGroupId = (item: ElectionGroup) => `${item.id}`;
  const getGroupName = (item: ElectionGroup) => item.name;
  const getElectionId = (item: Election) => `${item.id}`;
  const getElectionName = (item: Election) => item.name;
  const getGroupExtra = (item: ElectionGroup) => formatDate(item.election_date);
  const getElectionExtra = (item: Election) => formatDate(item.election_date);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (electionGroups.length === 0 && isLoading && !disabled) {
    return (
      <div className="flex items-center gap-4 cursor-pointer select-none group text-left animate-pulse">
        <span className="text-sm font-semibold text-c-900 group-hover:text-c-800 transition line-clamp-1">
          Select Election Group
        </span>
        <ArrowDownIcon className="size-6 text-c-50 group-hover:text-c-600 transition" />
      </div>
    );
  }

  // ─── Desktop content ──────────────────────────────────────────────────────
  const desktopContent = pendingGroup ? (
    // Step 2: elections for the selected group
    <GeneralCommand
      data={desktopFilteredElections}
      getId={getElectionId}
      getName={getElectionName}
      handleSelect={handleElectionClick}
      selectedId={undefined}
      status={electionStatus}
      onSearch={setDesktopElectionSearch}
      beforeList={
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            "inlineflex items-center gap-2 px-3 pt-2 pb-1 text-left hover:bg-c-10/60 transition",
          )}
        >
          <ChevronLeft className="size-4 text-c-50 shrink-0" />
          <span className="text-sm font-semibold text-c-800 line-clamp-1">
            {pendingGroup.name}
          </span>
        </button>
      }
    />
  ) : (
    // Step 1: election groups
    <GeneralCommand
      data={desktopFilteredGroups}
      getId={getGroupId}
      getName={getGroupName}
      getExtra={getGroupExtra}
      handleSelect={handleGroupClick}
      selectedId={currentSelectedId}
      status={getGroupStatus()}
      loadMore={handleLoadMore}
      onSearch={setDesktopSearch}
    />
  );

  // ─── Mobile content ───────────────────────────────────────────────────────
  const mobileContent = pendingGroup ? (
    // Step 2: elections for the selected group
    <div className="flex flex-col" style={{ maxHeight: "75dvh" }}>
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="text-c-50 hover:text-c-800 transition shrink-0 p-1 -ml-1 rounded-lg"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="text-base font-semibold text-c-900 line-clamp-1 flex-1">
          {pendingGroup.name}
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <IconInput
          placeholder="Search elections..."
          value={mobileElectionSearch}
          onChange={(e) => setMobileElectionSearch(e.target.value)}
        />
      </div>

      {/* Elections list */}
      <div className="flex-1 overflow-y-auto px-3 pb-10">
        {isLoadingElections ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : mobileFilteredElections.length === 0 ? (
          <p className="text-center text-c-50 py-8 text-sm">None found.</p>
        ) : (
          <ul className="space-y-0.5">
            {mobileFilteredElections.map((election) => (
              <li key={election.id}>
                <button
                  type="button"
                  onClick={() => handleElectionClick(election)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3.5 rounded-xl text-left transition-colors hover:bg-c-10/60 active:bg-c-10 text-c-800"
                >
                  <span className="text-base font-medium leading-snug flex-1 min-w-0">
                    {election.name}
                  </span>
                  {election.election_date && (
                    <span className="text-sm text-c-50 shrink-0">
                      {formatDate(election.election_date)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : (
    // Step 1: election groups
    <DrawerList
      data={mobileFilteredGroups}
      getId={getGroupId}
      getName={getGroupName}
      getExtra={getGroupExtra}
      handleSelect={handleGroupClick}
      selectedId={currentSelectedId}
      status={getGroupStatus()}
      searchValue={mobileSearch}
      onSearch={setMobileSearch}
    />
  );

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Election Group"
      align={align}
      className={className}
      trigger={
        <button
          type="button"
          className="flex items-center gap-4 cursor-pointer select-none group text-left"
        >
          <span className="text-sm font-semibold text-c-900 group-hover:text-c-800 transition line-clamp-1">
            {displayText}
          </span>
          <ArrowDownIcon className="size-6 text-c-50 group-hover:text-c-600 transition" />
        </button>
      }
      desktopContent={desktopContent}
      mobileContent={mobileContent}
    />
  );
};

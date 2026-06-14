import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import { LoadingSelect } from "../selects/loading-select";
import { Button, Bullet } from "../button";
import { cn } from "../../lib/utils";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Plus, Folder } from "lucide-react";
import FancyFolderIcon from "../../icons/fancy-folder-icon";
import { LoadingBullet } from "./loading-bullet";

export interface ElectionGroup {
  id: number;
  name: string;
  rank: number;
  elections_count: number;
  states_count: number;
  election_date: string;
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

export const ElectionGroupBullet = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  className,
  align = "start",
  buttonText,
  fetchElectionGroups,
}: SelectProps<ElectionGroup, number | string> & {
  fetchElectionGroups: (args: {
    data: { limit?: number; cursor?: string };
  }) => Promise<any>;
  variant?: "select" | "bullet";
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ElectionGroup | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<ElectionGroupsResponse>({
      queryKey: ["election-groups-select"],
      queryFn: async ({ pageParam }) => {
        const res = await fetchElectionGroups({
          data: { limit: 50, cursor: pageParam as string },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch election groups");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
    });

  const electionGroups = data
    ? data.pages.flatMap((page) => page.data?.election_groups || [])
    : [];

  // Keep fetching until selectedId is found in the list, if it exists
  useEffect(() => {
    if (selectedId && hasNextPage && !isFetchingNextPage && !isLoading) {
      const found = electionGroups.some(
        (eg) => String(eg.id) === String(selectedId),
      );
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    electionGroups,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  // Sync selected item with selectedId prop once the matching item is loaded
  useEffect(() => {
    if (selectedId) {
      const item = electionGroups.find(
        (eg) => String(eg.id) === String(selectedId),
      );
      if (item) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, electionGroups]);

  const handleSelect = (item: ElectionGroup) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  const filteredElectionGroups = electionGroups.filter((eg) =>
    eg.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && electionGroups.length === 0) {
      return "LoadingFirstPage";
    }
    if (isFetchingNextPage) {
      return "LoadingMore";
    }
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem ? "Loading..." : "Select Group");
  const hasError = Boolean(errorMsg);

  if (electionGroups.length === 0 && isLoading && !disabled) {
    return (
      <LoadingBullet
        open={open}
        setOpen={setOpen}
        className={className}
        align={align}
        placeholder="Select Group"
        icon={<FancyFolderIcon className="size-4 shrink-0" />}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Group"
      align={align}
      className={className}
      trigger={
        <Bullet showError={hasError} disabled={disabled} className={className}>
          <FancyFolderIcon className="size-4 shrink-0" />
          <p>
            {selectedItem
              ? `Group: ${selectedItem.name}`
              : buttonText
                ? `New Group: ${buttonText}`
                : "Election Group"}
          </p>
        </Bullet>
      }
    >
      <GeneralCommand
        data={filteredElectionGroups}
        getId={(item: ElectionGroup) => `${item.id}`}
        getName={(item: ElectionGroup) => item.name}
        getLabel={(item: ElectionGroup) => (
          <div className="flex items-center gap-2">
            <Folder className="size-4 text-[#ffbf2e] fill-[#ffbf2e] shrink-0" />
            <span>{item.name}</span>
          </div>
        )}
        handleSelect={handleSelect}
        selectedId={
          selectedItem?.id
            ? `${selectedItem.id}`
            : selectedId
              ? `${selectedId}`
              : undefined
        }
        status={getStatus()}
        loadMore={handleLoadMore}
        onSearch={setSearchQuery}
      />
    </SelectResponsiveWrapper>
  );
};

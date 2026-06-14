import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import { LoadingSelect } from "./loading-select";
import { Button } from "../button";
import { cn } from "../../lib/utils";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { useInfiniteQuery } from "@tanstack/react-query";

export interface Office {
  id: number;
  name: string;
  scope: string;
  rank: number;
  election: string;
  instances_count: number;
}

interface OfficesResponse {
  success: boolean;
  message: string;
  data: {
    offices: Office[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectOffice = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  className,
  align = "start",
  fetchOffices,
  filterScope,
}: SelectProps<Office, number | string> & {
  fetchOffices: (args: {
    data: { limit?: number; cursor?: string };
  }) => Promise<any>;
  filterScope?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Office | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<OfficesResponse>({
      queryKey: ["offices-select", filterScope ?? "all"],
      queryFn: async ({ pageParam }) => {
        const res = await fetchOffices({
          data: { limit: 50, cursor: pageParam as string },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch offices");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
    });

  const allOffices = data
    ? data.pages.flatMap((page) => page.data?.offices || [])
    : [];

  // Filter by scope if filterScope is provided
  const offices = filterScope
    ? allOffices.filter((o) => o.scope === filterScope)
    : allOffices;

  // Keep fetching until selectedId is found in the list, if it exists
  useEffect(() => {
    if (selectedId && hasNextPage && !isFetchingNextPage && !isLoading) {
      const found = offices.some(
        (o) => String(o.id) === String(selectedId),
      );
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    offices,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  // Sync selected item with selectedId prop once the matching item is loaded
  useEffect(() => {
    if (selectedId) {
      const item = offices.find(
        (o) => String(o.id) === String(selectedId),
      );
      if (item) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, offices]);

  const handleSelect = (item: Office) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  const filteredOffices = offices.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.election.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && offices.length === 0) {
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
    selectedItem?.name ? `${selectedItem.name} (${selectedItem.election})` :
    (isLoading && !selectedItem ? "Loading..." : "Select Office");
  const hasError = Boolean(errorMsg);

  if (offices.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select Office"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Office"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          className={cn(
            "justify-between w-full gap-2",
            hasError && "border-0.8 border-red",
            className,
          )}
          type="button"
          disabled={disabled}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={filteredOffices}
        getId={(item: Office) => `${item.id}`}
        getName={(item: Office) => `${item.name} (${item.election})`}
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

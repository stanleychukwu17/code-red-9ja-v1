import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface State {
  id: number;
  name: string;
}

interface StatesResponse {
  success: boolean;
  message: string;
  data: {
    states: State[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectState = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  countryOriginalId,
  className,
  align = "start",
  fetchStates,
}: SelectProps<State> & {
  countryOriginalId?: number;
  fetchStates: (args: {
    data: { countryId: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<State | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<StatesResponse>({
      queryKey: ["states", countryOriginalId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchStates({
          data: {
            countryId: countryOriginalId!,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch states");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
      enabled: !!countryOriginalId,
    });

  const states = data
    ? data.pages.flatMap((page) => page.data?.states || [])
    : [];

  // Keep fetching until selectedId is found in the list, if it exists
  useEffect(() => {
    if (
      selectedId &&
      countryOriginalId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = states.some((s) => String(s.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    countryOriginalId,
    states,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  // Sync selected item with selectedId prop once the matching state is loaded
  useEffect(() => {
    if (selectedId) {
      const state = states.find((s) => String(s.id) === String(selectedId));
      if (state) {
        setSelectedItem(state);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, states]);

  useEffect(() => {
    setSelectedItem(undefined);
  }, [countryOriginalId]);

  const handleStateSelect = (state: State) => {
    setSelectedItem(state);
    update(state);
    setOpen(false);
  };

  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && states.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select state");
  const hasError = Boolean(errorMsg);

  // Show loading state while states are loading and not disabled
  if (states.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select state"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select state"
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
        data={filteredStates}
        getId={(item: State) => `${item.id}`}
        getName={(item: State) => item.name}
        handleSelect={handleStateSelect}
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

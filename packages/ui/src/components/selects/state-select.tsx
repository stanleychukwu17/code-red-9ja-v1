import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
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
  countryOriginalId = 161, // Nigeria
  className,
  align = "start",
  fetchStates,
  showAll,
}: SelectProps<State, number | string> & {
  countryOriginalId?: number;
  fetchStates: (args: {
    data: { countryId: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<State | undefined>(
    undefined,
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery<StatesResponse>({
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
    ? Array.from(
        new Map(
          data.pages
            .flatMap((page) => page.data?.states || [])
            .map((s) => [s.id, s]),
        ).values(),
      )
    : [];

  useEffect(() => {
    if (
      selectedId &&
      countryOriginalId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading &&
      !isFetching
    ) {
      const found = states.some((s) => String(s.id) === String(selectedId));
      if (!found) fetchNextPage();
    }
  }, [
    selectedId,
    countryOriginalId,
    states,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const state = states.find((s) => String(s.id) === String(selectedId));
      if (state) setSelectedItem(state);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, states]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleStateSelect = (state: State) => {
    setSelectedItem(state);
    update(state);
    setOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
  };

  const filteredStates = states.filter((s) =>
    s.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = states.filter((s) =>
    s.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && states.length === 0) return "LoadingFirstPage";
    if (isFetchingNextPage) return "LoadingMore";
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem
      ? "Loading..."
      : showAll
        ? "All states"
        : "Select state");
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;
  const getId = (item: State) => `${item.id}`;
  const getName = (item: State) => item.name;

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
          size="select"
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
      desktopContent={
        <GeneralCommand
          data={filteredStates}
          getId={getId}
          getName={getName}
          handleSelect={handleStateSelect}
          selectedId={currentSelectedId}
          status={getStatus()}
          loadMore={handleLoadMore}
          onSearch={setDesktopSearch}
          showAll={showAll}
          onSelectAll={handleSelectAll}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          handleSelect={handleStateSelect}
          selectedId={currentSelectedId}
          status={getStatus()}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
          showAll={showAll}
          onSelectAll={handleSelectAll}
        />
      }
    />
  );
};

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

export interface StateConstituency {
  id: number;
  name: string;
}

interface StateConstituenciesResponse {
  success: boolean;
  message: string;
  data: {
    constituencies: StateConstituency[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectStateConstituency = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  stateId,
  lgaId,
  className,
  align = "start",
  fetchStateConstituencies,
  showAll,
}: SelectProps<StateConstituency, number> & {
  stateId?: number;
  lgaId?: number;
  fetchStateConstituencies: (args: {
    data: {
      stateId?: number;
      lgaId?: number;
      limit?: number;
      cursor?: string;
    };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<
    StateConstituency | undefined
  >(undefined);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<StateConstituenciesResponse>({
      queryKey: ["state_constituencies", stateId, lgaId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchStateConstituencies({
          data: {
            stateId,
            lgaId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) return res;
        throw new Error(
          res?.message || "Failed to fetch federal constituencies",
        );
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more)
          return lastPage.meta.next_cursor || "";
        return undefined;
      },
      enabled: !!stateId,
    });

  const constituencies = data
    ? data.pages.flatMap((page) => page.data?.constituencies || [])
    : [];

  useEffect(() => {
    if (
      selectedId &&
      stateId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = constituencies.some(
        (c) => String(c.id) === String(selectedId),
      );
      if (!found) fetchNextPage();
    }
  }, [
    selectedId,
    stateId,
    constituencies,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const c = constituencies.find((c) => String(c.id) === String(selectedId));
      if (c) setSelectedItem(c);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, constituencies]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleConstituencySelect = (constituency: StateConstituency) => {
    setSelectedItem(constituency);
    update(constituency);
    setOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
  };

  const filteredConstituencies = constituencies.filter((c) =>
    c.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = constituencies.filter((c) =>
    c.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && constituencies.length === 0) return "LoadingFirstPage";
    if (isFetchingNextPage) return "LoadingMore";
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem ? "Loading..." : "Select state constituency");
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;
  const getId = (item: StateConstituency) => `${item.id}`;
  const getName = (item: StateConstituency) => item.name;

  if (constituencies.length === 0 && isLoading && !disabled && stateId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select state constituency"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select state constituency"
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
          disabled={disabled || !stateId}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={filteredConstituencies}
          getId={getId}
          getName={getName}
          handleSelect={handleConstituencySelect}
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
          handleSelect={handleConstituencySelect}
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

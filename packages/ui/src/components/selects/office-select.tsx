import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
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
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
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
        if (res && res.success && res.data) return res;
        throw new Error(res?.message || "Failed to fetch offices");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more)
          return lastPage.meta.next_cursor || "";
        return undefined;
      },
    });

  const allOffices = data
    ? data.pages.flatMap((page) => page.data?.offices || [])
    : [];
  const offices = filterScope
    ? allOffices.filter((o) => o.scope === filterScope)
    : allOffices;

  useEffect(() => {
    if (selectedId && hasNextPage && !isFetchingNextPage && !isLoading) {
      const found = offices.some((o) => String(o.id) === String(selectedId));
      if (!found) fetchNextPage();
    }
  }, [
    selectedId,
    offices,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const item = offices.find((o) => String(o.id) === String(selectedId));
      if (item) setSelectedItem(item);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, offices]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleSelect = (item: Office) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  const filteredOffices = offices.filter(
    (o) =>
      o.name.toLowerCase().includes(desktopSearch.toLowerCase()) ||
      o.election.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = offices.filter(
    (o) =>
      o.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
      o.election.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && offices.length === 0) return "LoadingFirstPage";
    if (isFetchingNextPage) return "LoadingMore";
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const displayText = selectedItem?.name
    ? `${selectedItem.name} (${selectedItem.election})`
    : isLoading && !selectedItem
      ? "Loading..."
      : "Select Office";
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;
  const getId = (item: Office) => `${item.id}`;
  const getName = (item: Office) => `${item.name} (${item.election})`;

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
          data={filteredOffices}
          getId={getId}
          getName={getName}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          status={getStatus()}
          loadMore={handleLoadMore}
          onSearch={setDesktopSearch}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          status={getStatus()}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
        />
      }
    />
  );
};

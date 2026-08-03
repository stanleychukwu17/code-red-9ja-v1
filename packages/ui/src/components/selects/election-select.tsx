import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { LoadingSelect } from "./loading-select";

export interface Election {
  id: number;
  name: string;
  election_date?: string;
  election_group_name?: string;
  office_name?: string;
  scope?: string;
}

interface ElectionResponse {
  success: boolean;
  message: string;
  data: {
    elections: Election[];
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

export const SelectElection = ({
  update,
  selectedId,
  disabled,
  partyId,
  className,
  align = "start",
  fetchElection,
  electionGroupId,
  errorMsg,
}: SelectProps<Election, number> & {
  partyId?: number;
  electionGroupId?: number | string;
  fetchElection: (args: {
    data: {
      partyId?: number;
      electionGroupId?: number | string;
      limit?: number;
      cursor?: string;
    };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);

  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");

  const [selectedItem, setSelectedItem] = useState<Election | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<ElectionResponse>({
      queryKey: ["elections-select", partyId, electionGroupId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchElection({
          data: {
            partyId,
            electionGroupId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) return res;
        throw new Error(res?.message || "Failed to fetch elections");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more)
          return lastPage.meta.next_cursor || "";
        return undefined;
      },
      enabled: !!electionGroupId,
    });

  const elections = data
    ? data.pages.flatMap((page) => page.data?.elections || [])
    : [];

  useEffect(() => {
    if (selectedId && hasNextPage && !isFetchingNextPage && !isLoading) {
      const found = elections.some((e) => String(e.id) === String(selectedId));
      if (!found) fetchNextPage();
    }
  }, [
    selectedId,
    elections,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const e = elections.find((e) => String(e.id) === String(selectedId));
      if (e) setSelectedItem(e);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, elections]);

  useEffect(() => {
    if (!open) {
      setMobileSearch("");
    }
  }, [open]);

  const handleSelect = (election: Election) => {
    setSelectedItem(election);
    update(election);
    setOpen(false);
  };

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && elections.length === 0) return "LoadingFirstPage";
    if (isFetchingNextPage) return "LoadingMore";
    return hasNextPage ? "CanLoadMore" : "Exhausted";
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const desktopFiltered = elections.filter((e) =>
    e.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = elections.filter((e) =>
    e.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem ? "Loading..." : "Select Election");
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  const getId = (item: Election) => `${item.id}`;
  const getName = (item: Election) => item.name;
  const getExtra = (item: Election) => formatDate(item.election_date);

  if (elections.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Election"
        className={className}
        align={align}
      />
    );
  }

  const desktopContent = (
    <GeneralCommand
      data={desktopFiltered}
      getId={getId}
      getName={getName}
      getExtra={getExtra}
      handleSelect={handleSelect}
      selectedId={currentSelectedId}
      status={getStatus()}
      loadMore={handleLoadMore}
      onSearch={setDesktopSearch}
    />
  );

  const mobileContent = (
    <DrawerList
      data={mobileFiltered}
      getId={getId}
      getName={getName}
      getExtra={getExtra}
      handleSelect={handleSelect}
      selectedId={currentSelectedId}
      status={getStatus()}
      searchValue={mobileSearch}
      onSearch={setMobileSearch}
    />
  );

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Election"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between w-full gap-2",
            errorMsg && "border-0.8 border-red",
            className,
          )}
          type="button"
          disabled={disabled}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.name : "Select Election"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80 shrink-0" />
        </Button>
      }
      desktopContent={desktopContent}
      mobileContent={mobileContent}
    />
  );
};

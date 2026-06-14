import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface FederalConstituency {
  id: number;
  name: string;
}

interface FederalConstituenciesResponse {
  success: boolean;
  message: string;
  data: {
    constituencies: FederalConstituency[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectFederalConstituency = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  stateId,
  senatorialDistrictId,
  className,
  align = "start",
  fetchFederalConstituencies,
}: SelectProps<FederalConstituency> & {
  stateId?: number;
  senatorialDistrictId?: number;
  fetchFederalConstituencies: (args: {
    data: { stateId?: number; senatorialDistrictId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FederalConstituency | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<FederalConstituenciesResponse>({
      queryKey: ["federal_constituencies", stateId, senatorialDistrictId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchFederalConstituencies({
          data: {
            stateId,
            senatorialDistrictId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch federal constituencies");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
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
      const found = constituencies.some((c) => String(c.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
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
      const constituency = constituencies.find((c) => String(c.id) === String(selectedId));
      if (constituency) {
        setSelectedItem(constituency);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, constituencies]);

  useEffect(() => {
    setSelectedItem(undefined);
  }, [stateId, senatorialDistrictId]);

  const handleConstituencySelect = (constituency: FederalConstituency) => {
    setSelectedItem(constituency);
    update(constituency);
    setOpen(false);
  };

  const filteredConstituencies = constituencies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && constituencies.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select federal constituency");
  const hasError = Boolean(errorMsg);

  if (constituencies.length === 0 && isLoading && !disabled && stateId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select federal constituency"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select federal constituency"
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
          disabled={disabled || !stateId}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={filteredConstituencies}
        getId={(item: FederalConstituency) => `${item.id}`}
        getName={(item: FederalConstituency) => item.name}
        handleSelect={handleConstituencySelect}
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

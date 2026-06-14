import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface Lga {
  id: number;
  name: string;
}

interface LgasResponse {
  success: boolean;
  message: string;
  data: {
    lgas: Lga[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectLga = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  stateId,
  className,
  align = "start",
  fetchLGAs,
}: SelectProps<Lga> & {
  stateId?: number;
  fetchLGAs: (args: {
    data: { stateId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Lga | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<LgasResponse>({
      queryKey: ["lgas", stateId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchLGAs({
          data: {
            stateId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch LGAs");
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

  const lgas = data
    ? data.pages.flatMap((page) => page.data?.lgas || [])
    : [];

  useEffect(() => {
    if (
      selectedId &&
      stateId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = lgas.some((l) => String(l.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    stateId,
    lgas,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const lga = lgas.find((l) => String(l.id) === String(selectedId));
      if (lga) {
        setSelectedItem(lga);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, lgas]);

  useEffect(() => {
    setSelectedItem(undefined);
  }, [stateId]);

  const handleLgaSelect = (lga: Lga) => {
    setSelectedItem(lga);
    update(lga);
    setOpen(false);
  };

  const filteredLgas = lgas.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && lgas.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select LGA");
  const hasError = Boolean(errorMsg);

  if (lgas.length === 0 && isLoading && !disabled && stateId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select LGA"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select LGA"
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
        data={filteredLgas}
        getId={(item: Lga) => `${item.id}`}
        getName={(item: Lga) => item.name}
        handleSelect={handleLgaSelect}
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

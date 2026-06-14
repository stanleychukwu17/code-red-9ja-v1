import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface Ward {
  id: number;
  name: string;
}

interface WardsResponse {
  success: boolean;
  message: string;
  data: {
    wards: Ward[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectWard = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  lgaId,
  stateId,
  className,
  align = "start",
  fetchWards,
}: SelectProps<Ward> & {
  lgaId?: number;
  stateId?: number;
  fetchWards: (args: {
    data: { lga_id?: number; stateId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Ward | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<WardsResponse>({
      queryKey: ["wards", lgaId, stateId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchWards({
          data: {
            lga_id: lgaId,
            stateId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch Wards");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
      enabled: !!lgaId,
    });

  const wards = data
    ? data.pages.flatMap((page) => page.data?.wards || [])
    : [];

  useEffect(() => {
    if (
      selectedId &&
      lgaId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = wards.some((w) => String(w.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    lgaId,
    wards,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const ward = wards.find((w) => String(w.id) === String(selectedId));
      if (ward) {
        setSelectedItem(ward);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, wards]);

  useEffect(() => {
    setSelectedItem(undefined);
  }, [lgaId]);

  const handleWardSelect = (ward: Ward) => {
    setSelectedItem(ward);
    update(ward);
    setOpen(false);
  };

  const filteredWards = wards.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && wards.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select Ward");
  const hasError = Boolean(errorMsg);

  if (wards.length === 0 && isLoading && !disabled && lgaId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select Ward"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Ward"
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
          disabled={disabled || !lgaId}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={filteredWards}
        getId={(item: Ward) => `${item.id}`}
        getName={(item: Ward) => item.name}
        handleSelect={handleWardSelect}
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

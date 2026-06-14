import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useInfiniteQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface SenatorialDistrict {
  id: number;
  name: string;
}

interface SenatorialDistrictsResponse {
  success: boolean;
  message: string;
  data: {
    districts: SenatorialDistrict[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectSenatorialDistrict = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  stateId,
  className,
  align = "start",
  fetchSenatorialDistricts,
}: SelectProps<SenatorialDistrict> & {
  stateId?: number;
  fetchSenatorialDistricts: (args: {
    data: { stateId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SenatorialDistrict | undefined>(
    undefined,
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<SenatorialDistrictsResponse>({
      queryKey: ["senatorial_districts", stateId],
      queryFn: async ({ pageParam }) => {
        const res = await fetchSenatorialDistricts({
          data: {
            stateId,
            limit: 50,
            cursor: pageParam as string,
          },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch districts");
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

  const districts = data
    ? data.pages.flatMap((page) => page.data?.districts || [])
    : [];

  useEffect(() => {
    if (
      selectedId &&
      stateId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = districts.some((d) => String(d.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    stateId,
    districts,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (selectedId) {
      const district = districts.find((d) => String(d.id) === String(selectedId));
      if (district) {
        setSelectedItem(district);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, districts]);

  useEffect(() => {
    setSelectedItem(undefined);
  }, [stateId]);

  const handleDistrictSelect = (district: SenatorialDistrict) => {
    setSelectedItem(district);
    update(district);
    setOpen(false);
  };

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && districts.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select district");
  const hasError = Boolean(errorMsg);

  if (districts.length === 0 && isLoading && !disabled && stateId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select district"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select district"
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
        data={filteredDistricts}
        getId={(item: SenatorialDistrict) => `${item.id}`}
        getName={(item: SenatorialDistrict) => item.name}
        handleSelect={handleDistrictSelect}
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

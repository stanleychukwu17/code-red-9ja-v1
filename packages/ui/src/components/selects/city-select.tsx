import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import { LoadingSelect } from "./loading-select";
import { Button } from "../button";
import { cn } from "../../lib/utils";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { useInfiniteQuery } from "@tanstack/react-query";

export interface City {
  id: number;
  name: string;
}

interface CitiesResponse {
  success: boolean;
  message: string;
  data: {
    cities: City[];
  };
  meta: {
    next_cursor: string;
    has_more: boolean;
  };
}

export const SelectCity = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  stateId,
  className,
  align = "start",
  fetchCities,
}: SelectProps<City> & {
  stateId?: number;
  fetchCities: (args: {
    data: { stateId: number; limit?: number; cursor?: string | number };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<City | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<CitiesResponse>({
    queryKey: ["cities", stateId],
    queryFn: async ({ pageParam }) => {
      const res = await fetchCities({
        data: { stateId: stateId!, limit: 50, cursor: pageParam as string },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch cities");
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

  const cities = data
    ? data.pages.flatMap((page) => page.data?.cities || [])
    : [];

  // Keep fetching until selectedId is found in the list, if it exists
  useEffect(() => {
    if (
      selectedId &&
      stateId &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      const found = cities.some((c) => String(c.id) === String(selectedId));
      if (!found) {
        fetchNextPage();
      }
    }
  }, [
    selectedId,
    stateId,
    cities,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  ]);

  // Sync selected item with selectedId prop once the matching city is loaded
  useEffect(() => {
    if (selectedId) {
      const city = cities.find((c) => String(c.id) === String(selectedId));
      if (city) {
        setSelectedItem(city);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, cities]);

  // Reset selected item when stateId changes
  useEffect(() => {
    setSelectedItem(undefined);
  }, [stateId]);

  const handleCitySelect = (city: City) => {
    setSelectedItem(city);
    update(city);
    setOpen(false);
  };

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatus = ():
    | "CanLoadMore"
    | "LoadingMore"
    | "LoadingFirstPage"
    | "Exhausted" => {
    if (isLoading && cities.length === 0) {
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
    (isLoading && !selectedItem ? "Loading..." : "Select city");
  const hasError = Boolean(errorMsg);

  // Show loading state while cities are loading initially and not disabled
  if (cities.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select city"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select city"
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
        data={filteredCities}
        getId={(item: City) => `${item.id}`}
        getName={(item: City) => item.name}
        handleSelect={handleCitySelect}
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

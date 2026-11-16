import { useEffect, useState } from "react";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";
import { useQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export type PollingUnit = {
  id: number;
  name: string;
  code?: string;
  pu_code?: string;
  ward_id?: number;
  lga_id?: number;
  state_id?: number;
};

type PollingUnitsResponse = {
  success?: boolean;
  message?: string;
  data: {
    polling_units?: PollingUnit[];
    pollingUnits?: PollingUnit[];
  };
};

export const SelectPollingUnit = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  ward_id,
  className,
  contentClassName,
  align = "start",
  fetchPollingUnits,
  showAll,
  size = "select",
  placeholder = "Select Polling Unit",
}: SelectProps<PollingUnit, number | string> & {
  ward_id?: number;
  placeholder?: string;
  contentClassName?: string;
  fetchPollingUnits: (args: {
    data: {
      ward_id?: number;
      lga_id?: number;
    };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<PollingUnit | undefined>(undefined);

  // Fetch polling units scoped to territory hierarchy
  const { data, isLoading } = useQuery<PollingUnitsResponse>({
    queryKey: ["polling-units", ward_id],
    queryFn: async () => {
      const res = await fetchPollingUnits({
        data: {
          ward_id,
        },
      });
      if (res && res.data) return res;
      throw new Error(res?.message || "Failed to fetch Polling Units");
    },
    staleTime: Infinity,
    enabled: !disabled && !!ward_id,
    retry: false,
  });

  const pollingUnits = data?.data?.polling_units || data?.data?.pollingUnits || [];

  // Sync selected item when selectedId or list changes
  useEffect(() => {
    if (selectedId) {
      const pu = pollingUnits.find((p) => String(p.id) === String(selectedId));
      if (pu) setSelectedItem(pu);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, pollingUnits]);

  // Reset search terms when dropdown closes
  useEffect(() => {
    if (!open) {
      setDesktopSearch("");
      setMobileSearch("");
    }
  }, [open]);

  // Handle polling unit selection
  const handleSelect = (pu: PollingUnit) => {
    setSelectedItem(pu);
    update(pu);
    setOpen(false);
  };

  // Clear selection
  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
  };

  // Case-insensitive search across name and PU code
  const matchesSearch = (item: PollingUnit, search: string) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      Boolean(item.pu_code && item.pu_code.toLowerCase().includes(q)) ||
      Boolean(item.code && item.code.toLowerCase().includes(q))
    );
  };

  // Filter options by desktop and mobile search queries
  const filteredPollingUnits = pollingUnits.filter((p) =>
    matchesSearch(p, desktopSearch)
  );
  const mobileFiltered = pollingUnits.filter((p) =>
    matchesSearch(p, mobileSearch)
  );

  // Selected name or fallback label
  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem
      ? "Loading..."
      : showAll
        ? "All polling units"
        : placeholder);

  // Resolve selection ID and validation state
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  // Accessors for command list and drawer rendering
  const getId = (item: PollingUnit) => `${item.id}`;
  const getName = (item: PollingUnit) => item.name;
  const getDescription = (item: PollingUnit) =>
    item.pu_code ? `PU Code: ${item.pu_code}` : item.code || "";

  // Compact size flag
  const isSmall = size === "sm" || size === "xs";

  if (pollingUnits.length === 0 && isLoading && !disabled && ward_id) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder={placeholder}
        className={cn(
          isSmall &&
          "h-9 md:h-9 text-xs md:text-[13px] px-3 rounded-lg ring-0 md:ring-0 border border-border bg-sidebar-softer text-c-90 shadow-none",
          className
        )}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      align={align}
      className={className}
      contentClassName={cn("w-[340px] sm:w-[420px] md:w-[480px] max-w-[92vw]", contentClassName)}
      trigger={
        <Button
          variant="select"
          size={isSmall ? "default" : size}
          className={cn(
            "justify-between w-full gap-2",
            isSmall &&
            "h-9 md:h-9 px-3 md:px-3 text-xs md:text-[13px] font-normal rounded-lg md:rounded-lg ring-0 md:ring-0 border border-border bg-sidebar-softer text-c-90 shadow-none hover:shadow-none hover:border-c-60",
            hasError && "border-0.8 border-red",
            className
          )}
          type="button"
          disabled={disabled || !ward_id}
        >
          <p className="whitespace-normal text-left text-xs md:text-[13px] line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon
            className={cn("ml-auto text-c-80 shrink-0", isSmall ? "size-3.5" : "size-4")}
          />
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={filteredPollingUnits}
          getId={getId}
          getName={getName}
          getLabel={(item) => (
            <span className="text-xs md:text-sm font-medium leading-snug line-clamp-2">
              {item.name}
            </span>
          )}
          getDescription={getDescription}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          onSearch={setDesktopSearch}
          showAll={showAll}
          onSelectAll={handleSelectAll}
          tileSize={54}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          getLabel={(item) => (
            <span className="text-xs md:text-sm font-medium leading-snug line-clamp-2">
              {item.name}
            </span>
          )}
          getDescription={getDescription}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
          showAll={showAll}
          onSelectAll={handleSelectAll}
        />
      }
    />
  );
};

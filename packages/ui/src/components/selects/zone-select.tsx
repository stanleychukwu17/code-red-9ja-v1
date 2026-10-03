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

export interface Zone {
  id: number;
  name: string;
}

interface ZonesResponse {
  success: boolean;
  message: string;
  data: {
    zones: Zone[];
  };
}

export const SelectZone = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  className,
  align = "start",
  fetchZones,
  showAll,
  size = "select",
}: SelectProps<Zone, number | string> & {
  fetchZones: () => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Zone | undefined>(undefined);

  const { data, isLoading } = useQuery<ZonesResponse>({
    queryKey: ["geopolitical_zones"],
    queryFn: async () => {
      const res = await fetchZones();
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch geopolitical zones");
    },
    staleTime: Infinity,
  });

  const zones = data?.data?.zones || [];

  useEffect(() => {
    if (selectedId) {
      const zone = zones.find(
        (z) =>
          String(z.id) === String(selectedId) ||
          z.name.toLowerCase() === String(selectedId).toLowerCase(),
      );
      if (zone) setSelectedItem(zone);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, zones]);

  const handleZoneSelect = (zone: Zone) => {
    setSelectedItem(zone);
    update(zone);
    setOpen(false);
    setDesktopSearch("");
    setMobileSearch("");
  };

  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
    setDesktopSearch("");
    setMobileSearch("");
  };

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );

  const mobileFiltered = zones.filter((z) =>
    z.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const getId = (item: Zone) => `${item.id}`;
  const getName = (item: Zone) => item.name;

  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  const hasError = !!errorMsg;

  const displayText = selectedItem
    ? selectedItem.name
    : showAll
      ? typeof showAll === "string"
        ? showAll
        : "All Zones"
      : "Select Zone";

  const isSmall = size === "sm" || size === "xs";

  if (isLoading && zones.length === 0) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select Zone"
        className={cn(
          isSmall && "h-9 md:h-9 text-[13px] md:text-[13px] px-3 rounded-lg ring-0 md:ring-0",
          className,
        )}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Zone"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          size={isSmall ? "default" : size}
          className={cn(
            "justify-between w-full gap-2",
            isSmall &&
              "h-9 md:h-9 px-3 md:px-3 text-[13px] md:text-[13px] font-normal rounded-lg md:rounded-lg ring-0 md:ring-0 border border-[#d1d5db] bg-white shadow-none hover:shadow-none hover:border-[#ff9a3c]",
            hasError && "border-0.8 border-red",
            className,
          )}
          type="button"
          disabled={disabled}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {displayText}
          </p>
          <ArrowDownIcon
            className={cn("ml-auto text-c-80", isSmall ? "size-3.5" : "size-4")}
          />
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={filteredZones}
          getId={getId}
          getName={getName}
          handleSelect={handleZoneSelect}
          selectedId={currentSelectedId}
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
          handleSelect={handleZoneSelect}
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

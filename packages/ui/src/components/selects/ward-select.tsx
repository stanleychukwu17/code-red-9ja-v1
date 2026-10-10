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
  showAll,
  size = "select",
}: SelectProps<Ward, number | string> & {
  lgaId?: number;
  stateId?: number;
  fetchWards: (args: {
    data: {
      lga_id?: number;
      stateId?: number;
      limit?: number;
      cursor?: string;
    };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Ward | undefined>(undefined);

  const { data, isLoading } = useQuery<WardsResponse>({
    queryKey: ["wards", lgaId, stateId],
    queryFn: async () => {
      const res = await fetchWards({
        data: {
          lga_id: lgaId,
          stateId,
        },
      });
      if (res && res.success && res.data) return res;
      throw new Error(res?.message || "Failed to fetch Wards");
    },
    staleTime: Infinity,
    enabled: !!lgaId,
  });

  const wards = data?.data?.wards || [];

  useEffect(() => {
    if (selectedId) {
      const ward = wards.find((w) => String(w.id) === String(selectedId));
      if (ward) setSelectedItem(ward);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, wards]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleWardSelect = (ward: Ward) => {
    setSelectedItem(ward);
    update(ward);
    setOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
  };

  const filteredWards = wards.filter((w) =>
    w.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = wards.filter((w) =>
    w.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem ? "Loading..." : showAll ? "All wards" : "Select Ward");
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;
  const getId = (item: Ward) => `${item.id}`;
  const getName = (item: Ward) => item.name;

  const isSmall = size === "sm" || size === "xs";

  if (wards.length === 0 && isLoading && !disabled && lgaId) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select Ward"
        className={cn(
          isSmall &&
            "h-9 md:h-9 text-[13px] md:text-[13px] px-3 rounded-lg ring-0 md:ring-0 border border-border bg-sidebar-softer text-c-90 shadow-none",
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
      placeholder="Select Ward"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          size={isSmall ? "default" : size}
          className={cn(
            "justify-between w-full gap-2",
            isSmall &&
              "h-9 md:h-9 px-3 md:px-3 text-[13px] md:text-[13px] font-normal rounded-lg md:rounded-lg ring-0 md:ring-0 border border-border bg-sidebar-softer text-c-90 shadow-none hover:shadow-none hover:border-c-60",
            hasError && "border-0.8 border-red",
            className,
          )}
          type="button"
          disabled={disabled || !lgaId}
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
          data={filteredWards}
          getId={getId}
          getName={getName}
          handleSelect={handleWardSelect}
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
          handleSelect={handleWardSelect}
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

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

export interface State {
  id: number;
  name: string;
}

interface StatesResponse {
  success: boolean;
  message: string;
  data: {
    states: State[];
  };
}

export const SelectState = ({
  update,
  errorMsg,
  selectedId,
  disabled,
  countryOriginalId = 161, // Nigeria
  className,
  align = "start",
  fetchStates,
  showAll,
  size = "select",
}: SelectProps<State, number | string> & {
  countryOriginalId?: number;
  fetchStates: (args: {
    data: { countryId: number; limit?: number; cursor?: string };
  }) => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<State | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery<StatesResponse>({
    queryKey: ["states", countryOriginalId],
    queryFn: async () => {
      const res = await fetchStates({ data: { countryId: countryOriginalId! } });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch states");
    },
    staleTime: Infinity,
    enabled: !!countryOriginalId,
  });

  const states = data?.data?.states || [];

  useEffect(() => {
    if (selectedId) {
      const state = states.find((s) => String(s.id) === String(selectedId));
      if (state) setSelectedItem(state);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, states]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleStateSelect = (state: State) => {
    setSelectedItem(state);
    update(state);
    setOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedItem(undefined);
    update(undefined as any);
    setOpen(false);
  };

  const filteredStates = states.filter((s) =>
    s.name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = states.filter((s) =>
    s.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const displayText =
    selectedItem?.name ||
    (isLoading && !selectedItem
      ? "Loading..."
      : showAll
        ? "All states"
        : "Select state");
  const hasError = Boolean(errorMsg);
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;
  const getId = (item: State) => `${item.id}`;
  const getName = (item: State) => item.name;

  const isSmall = size === "sm" || size === "xs";

  if (states.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select state"
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
      placeholder="Select state"
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
          data={filteredStates}
          getId={getId}
          getName={getName}
          handleSelect={handleStateSelect}
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
          handleSelect={handleStateSelect}
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

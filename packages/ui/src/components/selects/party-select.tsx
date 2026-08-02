import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { LoadingSelect } from "./loading-select";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { useQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface Party {
  id: number;
  short_name: string;
  name: string;
  logo: string;
}

interface PartiesResponse {
  success: boolean;
  message: string;
  data: {
    parties: Party[];
  };
}

/**
 * SelectParty
 * A responsive select component for choosing a political party.
 * Uses react-query to fetch parties and supports both desktop (popover/command) and mobile (drawer) views.
 */
export const SelectParty = ({ update, errorMsg, selectedId, className, align = "start", fetchParties }: SelectProps<Party> & {
  fetchParties: () => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Party | undefined>(undefined);

  // Fetch parties using react-query for caching and state management
  const { data, isLoading } = useQuery<PartiesResponse>({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await fetchParties();
      if (res && res.success && res.data) return res;
      throw new Error(res?.message || "Failed to fetch parties");
    },
    staleTime: Infinity,
  });

  const parties = data?.data?.parties || [];

  // Sync selected item state when selectedId prop or parties data changes
  useEffect(() => {
    if (selectedId) {
      const party = parties.find((p) => String(p.id) === String(selectedId));
      if (party) setSelectedItem(party);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, parties]);

  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleSelect = (item: Party) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  // Filter parties based on search input for desktop and mobile views respectively
  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(desktopSearch.toLowerCase()) ||
    p.short_name.toLowerCase().includes(desktopSearch.toLowerCase()),
  );
  const mobileFiltered = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
      p.short_name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  const currentSelectedId = selectedItem?.id ? `${selectedItem.id}` : selectedId ? `${selectedId}` : undefined;
  const getId = (item: Party) => `${item.id}`;
  const getName = (item: Party) => item.name;

  /** Logo + short name label used in both desktop and mobile */
  const getLabel = (item: Party) => (
    <div className="flex items-center gap-4">
      {item.logo && (
        <img
          src={item.logo}
          alt={item.short_name}
          className="size-5 rounded-full object-cover shrink-0"
        />
      )}
      <span className="font-normal text-c-90">{item.short_name} - {item.name}</span>
    </div>
  );

  if (isLoading && parties.length === 0) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Party"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Party"
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
        >
          <div className="flex items-center gap-2 whitespace-normal text-left line-clamp-1">
            {selectedItem ? (
              <>
                {selectedItem.logo && (
                  <img
                    src={selectedItem.logo}
                    alt={selectedItem.short_name}
                    className="size-5 rounded-full object-cover shrink-0"
                  />
                )}
                <span>{selectedItem.short_name}</span>
              </>
            ) : (
              <span>Select Party</span>
            )}
          </div>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={filteredParties}
          getId={getId}
          getName={getName}
          getLabel={getLabel}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          onSearch={setDesktopSearch}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          getLabel={getLabel}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
        />
      }
    />
  );
};

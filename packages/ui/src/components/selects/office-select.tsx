import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import ArrowDownIcon from "../../icons/arrow-down-icon";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { LoadingSelect } from "./loading-select";

export type Office = {
  id: number;
  name: string;
  category?: string;
  scope: string;
  rank: number;
  election?: string | null;
  instances_count: number;
  is_contested?: boolean;
  parent_office_id?: number | null;
  appointing_office_id?: number | null;
};

export type SelectOfficeProps = SelectProps<Office, number | string> & {
  fetchOffices: (args: {
    data: { limit?: number; cursor?: string; contested?: boolean };
  }) => Promise<any>;
  filterScope?: string;
};

export const SelectOffice = ({
  update, errorMsg, selectedId, disabled, className, align = "start", fetchOffices, filterScope,
}: SelectOfficeProps) => {
  const [open, setOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Office | undefined>(undefined);

  // Fetch and cache contested political offices indefinitely
  const { data: rawOffices = [], isLoading } = useQuery<Office[]>({
    queryKey: ["offices", "contested"],
    queryFn: async () => {
      const res = await fetchOffices({
        data: { limit: 100, contested: true },
      });
      if (res && res.success && res.data?.offices) {
        return res.data.offices;
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Filter offices, optionally constrained by geographic scope
  const offices = useMemo(() => {
    return filterScope ? rawOffices.filter((o) => o.scope === filterScope) : rawOffices;
  }, [rawOffices, filterScope]);

  // Keep internal selected item in sync with incoming selectedId prop
  useEffect(() => {
    if (selectedId) {
      const match = offices.find((o) => String(o.id) === String(selectedId));
      setSelectedItem(match);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, offices]);

  // Reset mobile search query whenever drawer closes
  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleSelect = (item: Office) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  // Search filter matching office name or election description
  const matchesSearch = (item: Office, query: string) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      Boolean(item.election && item.election.toLowerCase().includes(q))
    );
  };

  const filteredOffices = useMemo(
    () => offices.filter((o) => matchesSearch(o, desktopSearch)),
    [offices, desktopSearch],
  );

  const mobileFiltered = useMemo(
    () => offices.filter((o) => matchesSearch(o, mobileSearch)),
    [offices, mobileSearch],
  );

  const getId = (item: Office) => `${item.id}`;
  const getName = (item: Office) =>
    item.election ? `${item.name} (${item.election})` : item.name;

  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  const displayText = selectedItem?.name
    ? selectedItem.election
      ? `${selectedItem.name} (${selectedItem.election})`
      : selectedItem.name
    : isLoading && !selectedItem
      ? "Loading..."
      : "Select Office";

  const status = isLoading && offices.length === 0 ? "LoadingFirstPage" : "Exhausted";

  // Loading skeleton while initial offices are being retrieved
  if (offices.length === 0 && isLoading && !disabled) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Select Office"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Office"
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
          disabled={disabled}
        >
          <p className="whitespace-normal text-left line-clamp-1">{displayText}</p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={filteredOffices}
          getId={getId}
          getName={getName}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          status={status}
          loadMore={() => { }}
          onSearch={setDesktopSearch}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          handleSelect={handleSelect}
          selectedId={currentSelectedId}
          status={status}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
        />
      }
    />
  );
};

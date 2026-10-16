import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { SelectProps } from "../../lib/types";
import { Bullet } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";
import FancyFolderIcon from "../../icons/fancy-folder-icon";
import { LoadingBullet } from "./loading-bullet";

export type ElectionGroup = {
  id: number;
  name: string;
  election_date?: string;
  year?: number;
  active?: boolean;
};

export type ElectionGroupBulletProps = SelectProps<ElectionGroup, number | string> & {
  fetchElectionGroups: (args?: {
    data?: { limit?: number; cursor?: string; active?: boolean };
  }) => Promise<any>;
  variant?: "select" | "bullet";
  activeOnly?: boolean;
};

export const ElectionGroupBullet = ({
  update, errorMsg, selectedId, disabled, className, align = "start", buttonText, fetchElectionGroups, activeOnly = true,
}: ElectionGroupBulletProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ElectionGroup | undefined>(undefined);

  // Fetch election groups (cached indefinitely, invalidated when a group is created or updated)
  const { data: electionGroups = [], isLoading } = useQuery<ElectionGroup[]>({
    queryKey: ["election-groups-select", activeOnly],
    queryFn: async () => {
      const res = await fetchElectionGroups(activeOnly ? { data: { active: true } } : undefined);
      if (res && res.success && res.data?.election_groups) {
        const groups: ElectionGroup[] = res.data.election_groups;
        return activeOnly ? groups.filter((eg) => eg.active !== false) : groups;
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Keep internal selected item in sync with incoming selectedId prop
  useEffect(() => {
    if (selectedId) {
      const match = electionGroups.find((eg) => String(eg.id) === String(selectedId));
      setSelectedItem(match);
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, electionGroups]);

  const handleSelect = (item: ElectionGroup) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  // Filter election groups matching search query
  const filteredElectionGroups = useMemo(() =>
    electionGroups.filter((eg) =>
      eg.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [electionGroups, searchQuery]);

  // Resolve active selection ID string and validation error state
  const currentSelectedId = selectedItem?.id
    ? `${selectedItem.id}`
    : selectedId
      ? `${selectedId}`
      : undefined;

  const hasError = Boolean(errorMsg);

  // Loading skeleton before initial data arrives
  if (electionGroups.length === 0 && isLoading && !disabled) {
    return (
      <LoadingBullet
        open={open}
        setOpen={setOpen}
        className={className}
        align={align}
        placeholder="Select Group"
        icon={<FancyFolderIcon className="size-4 shrink-0" />}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Group"
      align={align}
      className={className}
      trigger={
        <Bullet showError={hasError} disabled={disabled} className={className}>
          <FancyFolderIcon className="size-4 shrink-0" />
          <p>
            {selectedItem
              ? `Group: ${selectedItem.name}`
              : (buttonText || "Select an election group")}
          </p>
        </Bullet>
      }
    >
      <GeneralCommand
        data={filteredElectionGroups}
        getId={(item: ElectionGroup) => `${item.id}`}
        getName={(item: ElectionGroup) => item.name}
        getLabel={(item: ElectionGroup) => (
          <div className="flex items-center gap-2">
            <Folder className="size-4 text-[#ffbf2e] fill-[#ffbf2e] shrink-0" />
            <span>{item.name}</span>
          </div>
        )}
        handleSelect={handleSelect}
        selectedId={currentSelectedId}
        status={isLoading && electionGroups.length === 0 ? "LoadingFirstPage" : "Exhausted"}
        loadMore={() => { }}
        onSearch={setSearchQuery}
      />
    </SelectResponsiveWrapper>
  );
};

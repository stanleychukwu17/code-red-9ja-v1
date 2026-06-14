import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
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

export const SelectParty = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
  fetchParties,
}: SelectProps<Party> & {
  fetchParties: () => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Party | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery<PartiesResponse>({
    queryKey: ["parties-select"],
    queryFn: async () => {
      const res = await fetchParties();
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch parties");
    },
  });

  const parties = data?.data?.parties || [];

  useEffect(() => {
    if (selectedId) {
      const party = parties.find((p) => String(p.id) === String(selectedId));
      if (party) {
        setSelectedItem(party);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, parties]);

  const handleSelect = (item: Party) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.short_name.toLowerCase().includes(searchQuery.toLowerCase()),
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
    >
      <GeneralCommand
        data={filteredParties}
        getId={(item: Party) => `${item.id}`}
        getName={(item: Party) => item.name}
        getLabel={(item: Party) => (
          <div className="flex items-center gap-4">
            {item.logo && (
              <img
                src={item.logo}
                alt={item.short_name}
                className="size-5 rounded-full object-cover shrink-0"
              />
            )}
            <span className="font-normal text-c-90">{item.short_name}</span>
          </div>
        )}
        handleSelect={handleSelect}
        selectedId={
          selectedItem?.id
            ? `${selectedItem.id}`
            : selectedId
              ? `${selectedId}`
              : undefined
        }
        onSearch={setSearchQuery}
      />
    </SelectResponsiveWrapper>
  );
};

import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const ELECTION_ROLE_OPTIONS = [
  { label: "Polling Agent", value: "polling_agent" },
  { label: "State Election Supervisor", value: "state_election_supervisor" },
  { label: "LGA Election Supervisor", value: "lga_election_supervisor" },
  { label: "Ward Election Supervisor", value: "ward_election_supervisor" },
];

export const SelectElectionRole = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
}: SelectProps<string>) => {
  const [open, setOpen] = useState(false);
  const selectedItem = ELECTION_ROLE_OPTIONS.find(
    (opt) => opt.value === selectedId,
  );

  const handleSelect = (item: { label: string; value: string }) => {
    update(item.value);
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select election role"
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
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.label : "Select role"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={ELECTION_ROLE_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedId}
      />
    </SelectResponsiveWrapper>
  );
};

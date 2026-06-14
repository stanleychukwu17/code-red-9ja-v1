import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const ELECTION_SCOPE_OPTIONS = [
  { label: "Nationwide", value: "nationwide" },
  { label: "State", value: "state" },
  { label: "Senatorial district", value: "senatorial-district" },
  { label: "Federal Constituency", value: "federal-constituency" },
  { label: "State constituency", value: "state-constituency" },
  { label: "LGA", value: "lga" },
  { label: "Ward", value: "ward" },
];

export const SelectElectionScope = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
}: SelectProps<string>) => {
  const [open, setOpen] = useState(false);
  const selectedItem = ELECTION_SCOPE_OPTIONS.find(
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
      placeholder="Select scope"
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
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.label : "Select"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={ELECTION_SCOPE_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedId}
      />
    </SelectResponsiveWrapper>
  );
};

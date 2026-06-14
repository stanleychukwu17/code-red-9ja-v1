import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const RANK_OPTIONS = [
  { label: "Rank 1", value: "1" },
  { label: "Rank 2", value: "2" },
  { label: "Rank 3", value: "3" },
  { label: "Rank 4", value: "4" },
  { label: "Rank 5", value: "5" },
  { label: "Rank 6", value: "6" },
  { label: "Rank 7", value: "7" },
];

export const SelectRank = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
}: SelectProps<string>) => {
  const [open, setOpen] = useState(false);
  const selectedItem = RANK_OPTIONS.find((opt) => opt.value === selectedId);

  const handleSelect = (item: { label: string; value: string }) => {
    update(item.value);
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select rank"
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
        data={RANK_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedId}
      />
    </SelectResponsiveWrapper>
  );
};

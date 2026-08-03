import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
];

export const SelectDateRange = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
}: SelectProps<string>) => {
  const [open, setOpen] = useState(false);
  const selectedItem = DATE_RANGE_OPTIONS.find(
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
      placeholder="Select range"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          // size="select"
          className={cn(
            "justify-between w-full gap-2",
            errorMsg && "border-0.8 border-red",
            className,
          )}
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.label : "Today"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={DATE_RANGE_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedId}
        disableSearch
      />
    </SelectResponsiveWrapper>
  );
};

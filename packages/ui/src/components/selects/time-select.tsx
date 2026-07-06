import { useState, useEffect } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const TIME_OPTIONS = Array.from({ length: 49 }).map((_, i) => {
  const totalMinutes = 6 * 60 + i * 15; // start at 6:00 AM
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, "0");
  const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;
  return { label: timeStr, value: timeStr };
});

export const SelectTime = ({
  initialData,
  update,
  errorMsg,
  className,
  buttonText,
  hideIcon,
}: SelectProps<string> & { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(initialData);

  useEffect(() => {
    setSelectedItem(initialData);
  }, [initialData]);

  const handleSelect = (item: { label: string; value: string }) => {
    setSelectedItem(item.value);
    update(item.value);
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select time"
      align="start"
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between gap-2 w-full text-[16px] font-medium h-auto",
            className,
            errorMsg && "border-[0.8px] border-red-500",
          )}
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem : buttonText || "Select time"}
          </p>
          {!hideIcon && <ArrowDownIcon className="ml-auto text-neutral-400" />}
        </Button>
      }
    >
      <GeneralCommand
        data={TIME_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedItem}
      />
    </SelectResponsiveWrapper>
  );
};

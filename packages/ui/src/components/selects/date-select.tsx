import { useEffect, useState } from "react";
import { getLocalDate } from "../../lib/date";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { Calendar } from "../calendar";
import CalendarIcon from "../../icons/navbar/calendar-icon";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";

export const SelectDate = ({
  initialData,
  update,
  errorMsg,
  disabled,
  className,
  buttonText,
  startMonth,
  endMonth,
  align = "start",
  selectedId,
}: SelectProps<string> & {
  startMonth?: Date;
  endMonth?: Date;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Date | undefined>(() => {
    if (selectedId) {
      const parsed = new Date(selectedId);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (initialData) {
      const parsed = new Date(initialData);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return undefined;
  });

  useEffect(() => {
    if (selectedId) {
      const parsed = new Date(selectedId);
      if (!isNaN(parsed.getTime())) {
        setSelectedItem(parsed);
      } else {
        setSelectedItem(undefined);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    update(date.toISOString());
    setSelectedItem(date);
    setOpen(false);
  };

  const now = new Date();

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={buttonText ?? "Select date"}
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          className={cn(
            "justify-start w-full gap-2",
            className,
            errorMsg && "border-0.8 border-red",
          )}
          disabled={disabled}
          type="button"
        >
          <div className="[&_svg]:text-c-80">
            <CalendarIcon className="size-4" />
          </div>
          {!selectedItem && <p>{buttonText ?? "Select date"}</p>}
          {selectedItem && (
            <p>
              {getLocalDate(selectedItem.toISOString(), {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </Button>
      }
    >
      <div className="flex justify-center w-full bg-background p-2">
        <Calendar
          mode="single"
          selected={selectedItem}
          onSelect={handleSelect}
          captionLayout="dropdown"
          className="p-4 [--cell-size:44px] [--cell-radius:12px]"
          defaultMonth={selectedItem}
          startMonth={
            startMonth ? startMonth : new Date(now.getFullYear() - 100, 0)
          }
          endMonth={endMonth ? endMonth : new Date(now.getFullYear() + 10, 11)}
        />
      </div>
    </SelectResponsiveWrapper>
  );
};

import { useEffect, useState } from "react";
import {
  getLocalDate,
  formatDateToYYYYMMDD,
  parseDateString,
} from "../../lib/date";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { Calendar } from "../calendar";
import CalendarIcon from "../../icons/navbar/calendar-icon";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";

const parseSafeDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value.includes("T")) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const parsed = parseDateString(value);
  if (parsed && !isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(value);
  if (!isNaN(fallback.getTime())) return fallback;
  return undefined;
};

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
    return parseSafeDate(selectedId) || parseSafeDate(initialData);
  });

  useEffect(() => {
    const val = selectedId || initialData;
    setSelectedItem(parseSafeDate(val));
  }, [selectedId, initialData]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = formatDateToYYYYMMDD(date);
    update(formatted);
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
          size="select"
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

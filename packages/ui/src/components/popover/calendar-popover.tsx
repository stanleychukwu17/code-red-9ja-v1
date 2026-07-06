"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { Calendar } from "../calendar";
import { Drawer, DrawerContent, DrawerTrigger } from "../drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { cn } from "../../lib/utils";

type CalendarPopoverProps = {
  value?: Date;
  onChange: (value: Date) => void;
  placeholder?: string;
  title?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

export function CalendarPopover({
  value,
  onChange,
  placeholder = "Select date",
  title = "Select date",
  description,
  disabled = false,
  className,
}: CalendarPopoverProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = React.useState(false);
  const initialMonth = React.useMemo(
    () => value ?? new Date(2000, 6, 20),
    [value],
  );
  const [month, setMonth] = React.useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  React.useEffect(() => {
    setMonth(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  }, [initialMonth]);

  // Generate year range for dropdown (current year ± 50 years)
  const currentYear = new Date().getFullYear();

  const getCalendar = (noShadow = false) => (
    <div
      className={cn(
        "rounded-[28px] bg-white/96 dark:bg-zinc-950/96",
        !noShadow && "shadow-[0_24px_60px_rgba(25,40,32,0.10)] dark:shadow-none",
      )}
    >
      <div className="rounded-[28px] bg-white p-5 dark:bg-zinc-950">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={value}
          onSelect={(nextValue) => {
            if (!nextValue) {
              return;
            }

            onChange(nextValue);
            setOpen(false);
          }}
          disabled={{ after: new Date() }}
          showOutsideDays
          captionLayout="dropdown"
          fromYear={currentYear - 50}
          toYear={currentYear + 50}
          className="w-full bg-transparent p-0 [--cell-size:--spacing(12)]"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full gap-5",
            month_caption:
              "flex h-12 items-center justify-center gap-2 relative",
            caption_dropdowns: "flex gap-2",
            caption_label: "hidden",
            nav: "absolute inset-x-0 top-4 flex h-12 items-center justify-between px-4",
            dropdown:
              "flex items-center gap-1 rounded-[8px] border border-black/8 bg-white/75 px-3 py-1 text-[1.1rem] font-medium tracking-[-0.03em] text-c-90 hover:bg-white transition-colors dark:border-white/10 dark:bg-zinc-900/75 dark:text-zinc-100 dark:hover:bg-zinc-900",
            dropdown_month: "appearance-none bg-transparent outline-none",
            dropdown_year: "appearance-none bg-transparent outline-none",
            button_previous:
              "size-11 rounded-[12px] border border-black/8 bg-white/75 p-0 text-c-60 shadow-none hover:bg-white hover:text-c-90 flex items-center justify-center dark:border-white/10 dark:bg-zinc-900/75 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white",
            button_next:
              "size-11 rounded-[12px] border border-black/8 bg-white/75 p-0 text-c-60 shadow-none hover:bg-white hover:text-c-90 flex items-center justify-center dark:border-white/10 dark:bg-zinc-900/75 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white",
            weekdays: "grid grid-cols-7 gap-x-1",
            weekday:
              "flex h-10 items-center justify-center text-[0.95rem] font-normal text-c-50 dark:text-zinc-400",
            month_grid: "w-full border-collapse",
            week: "mt-2 grid grid-cols-7 gap-x-1",
            day: "flex items-center justify-center p-0",
            day_button:
              "flex size-12 items-center justify-center rounded-[14px] border-0 bg-transparent text-[1.05rem] font-normal text-c-90 shadow-none hover:bg-black/[0.04] hover:text-c-90 dark:text-zinc-200 dark:hover:bg-white/[0.04] dark:hover:text-white",
            selected:
              "bg-primary! text-white! hover:bg-primary! hover:text-white! rounded-[12px]",
            today: "bg-transparent text-c-90 dark:text-white",
            outside: "text-c-30 dark:text-zinc-600",
            disabled: "text-c-30 opacity-100 dark:text-zinc-600",
          }}
        />
      </div>
    </div>
  );
  const trigger = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        `flex h-14 w-full items-center justify-between rounded-[4px] bg-black/5 px-4 text-left text-md text-c-80
        transition-colors hover:bg-black/[0.06]
        dark:bg-black/30 dark:hover:bg-black/90
        disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
    >
      <span>{value ? formatDisplayDate(value) : placeholder}</span>
      <ChevronDown className="size-4 text-c-50" />
    </button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={trigger} />
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[428px] border-0 bg-transparent p-0 shadow-none"
        >
          <div className="sr-only">{title}</div>
          {getCalendar()}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="rounded-t-[28px] min-h-[540px] border-0 bg-white px-0 pt-2 pb-0 dark:bg-zinc-950">
        <div className="sr-only">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div>{getCalendar(true)}</div>
      </DrawerContent>
    </Drawer>
  );
}

function formatDisplayDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

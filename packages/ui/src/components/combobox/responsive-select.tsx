"use client";

import { ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSelect,
} from "../combobox";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer";
import { cn } from "../../lib/utils";
import type { SelectOption } from "./data";

type ResponsiveSelectProps = {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** When false, only the option list is shown (e.g. gender). */
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  optionClassName?: string;
};

export function ResponsiveSelect({
  options,
  value,
  onChange,
  placeholder,
  searchEnabled = true,
  searchPlaceholder,
  emptyMessage = "No options found.",
  disabled = false,
  className,
  triggerClassName,
  optionClassName,
}: ResponsiveSelectProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const selectedOption = options.find((option) => option.value === value);

  if (isDesktop) {
    return (
      <DesktopSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchEnabled={searchEnabled}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
        className={className}
        triggerClassName={triggerClassName}
        optionClassName={optionClassName}
      />
    );
  }

  return (
    <MobileSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchEnabled={searchEnabled}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      optionClassName={optionClassName}
      selectedOption={selectedOption}
    />
  );
}

function DesktopSelect({
  options,
  value,
  onChange,
  placeholder,
  searchEnabled,
  searchPlaceholder,
  emptyMessage,
  disabled,
  className,
  triggerClassName,
  optionClassName,
}: ResponsiveSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const [query, setQuery] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions =
    normalizedQuery.length === 0
      ? options
      : options.filter((option) =>
          `${option.label} ${option.searchText ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery),
        );

  return (
    <Combobox<SelectOption>
      items={options}
      filteredItems={filteredOptions}
      value={selectedOption}
      open={open}
      disabled={disabled}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      isItemEqualToValue={(item, nextValue) => item.value === nextValue.value}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
      onValueChange={(nextOption) => {
        if (!nextOption) {
          return;
        }

        onChange(nextOption.value);
        setOpen(false);
        setQuery("");
      }}
      autoHighlight
      filter={null}
    >
      <ComboboxSelect
        className={cn(
          "h-14 w-full rounded-[16px] bg-black/5 px-4 text-lg text-c-80 transition-colors hover:bg-black/[0.06] data-[popup-open]:bg-black/[0.06]",
          triggerClassName,
          className,
        )}
        disabled={disabled}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3 pr-3">
          {selectedOption?.leading}
          <span className={cn("truncate", !selectedOption && "text-c-60")}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
      </ComboboxSelect>
      <ComboboxContent className="overflow-hidden rounded-[24px] border-0 bg-zinc-100 shadow-[0_18px_40px_rgba(16,24,40,0.08)] ring-0">
        {searchEnabled ? (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-[14px] bg-black/5 px-3">
              <Search className="size-4 shrink-0 text-c-50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? "Search…"}
                className="h-11 w-full bg-transparent text-sm text-c-80 outline-none placeholder:text-c-50"
              />
            </div>
          </div>
        ) : null}
        <ComboboxList className="max-h-72 space-y-1 p-3">
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          {filteredOptions.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-sm text-c-80 transition-colors data-highlighted:bg-black/5 data-highlighted:text-c-90",
                optionClassName,
              )}
            >
              {option.leading}
              <span className="flex-1">{option.label}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function MobileSelect({
  options,
  value,
  onChange,
  placeholder,
  searchEnabled,
  searchPlaceholder,
  emptyMessage,
  disabled,
  className,
  triggerClassName,
  optionClassName,
  selectedOption,
}: ResponsiveSelectProps & { selectedOption?: SelectOption }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions =
    normalizedQuery.length === 0
      ? options
      : options.filter((option) =>
          `${option.label} ${option.searchText ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery),
        );

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-14 w-full items-center justify-between rounded-[16px] bg-black/5 px-4 text-left text-lg text-c-80 transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
            className,
          )}
        >
          <span className="flex items-center gap-3">
            {selectedOption?.leading}
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 text-c-50" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-[28px] border-t-0 bg-zinc-50 px-3 pt-3 pb-6">
        <DrawerTitle className="sr-only">{placeholder}</DrawerTitle>
        <div className="space-y-3 px-1">
          {searchEnabled ? (
            <div className="flex items-center gap-2 rounded-[16px] bg-black/5 px-3">
              <Search className="size-4 shrink-0 text-c-50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? "Search…"}
                className="h-12 w-full bg-transparent text-base text-c-80 outline-none placeholder:text-c-50"
              />
            </div>
          ) : null}
          <div className="max-h-[50vh] space-y-1 overflow-y-auto pb-2">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-c-50">
                {emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[16px] px-4 py-4 text-left transition-colors",
                      isSelected
                        ? "bg-emerald-50 text-primary"
                        : "hover:bg-black/5 text-c-90",
                      optionClassName,
                    )}
                  >
                    {option.leading}
                    <span className="flex-1 text-lg">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

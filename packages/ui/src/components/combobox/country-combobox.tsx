"use client";

import * as React from "react";
import { ResponsiveSelect } from "./responsive-select";
import { COUNTRY_OPTIONS } from "./data";

const COUNTRY_FLAG: Record<string, string> = {
  Nigeria: "NG",
  Ghana: "GH",
  Kenya: "KE",
  "South Africa": "ZA",
};

type CountryComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CountryCombobox({
  value,
  onChange,
  placeholder = "Country of residence",
  disabled = false,
  className,
}: CountryComboboxProps) {
  const options = React.useMemo(
    () =>
      COUNTRY_OPTIONS.map((option) => ({
        ...option,
        leading: (
          <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-primary">
            {COUNTRY_FLAG[option.value] ?? option.value.slice(0, 2).toUpperCase()}
          </span>
        ),
      })),
    [],
  );

  return (
    <ResponsiveSelect
      searchPlaceholder="Search countries"
      emptyMessage="No countries found."
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

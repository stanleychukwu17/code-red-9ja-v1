"use client";

import * as React from "react";
import { ResponsiveSelect } from "./responsive-select";
import { STATES_BY_COUNTRY } from "./data";

type StateComboboxProps = {
  country?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function StateCombobox({
  country,
  value,
  onChange,
  placeholder = "State of residence",
  disabled = false,
  className,
}: StateComboboxProps) {
  const options = React.useMemo(() => {
    if (!country) {
      return [];
    }

    return STATES_BY_COUNTRY[country] ?? [];
  }, [country]);

  return (
    <ResponsiveSelect
      searchPlaceholder="Search states"
      emptyMessage={country ? "No states found." : "Select a country first."}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || !country}
      className={className}
    />
  );
}

"use client";

import { ResponsiveSelect } from "./responsive-select";
import { GENDER_OPTIONS } from "./data";

type GenderComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function GenderCombobox({
  value,
  onChange,
  placeholder = "Gender",
  disabled = false,
  className,
}: GenderComboboxProps) {
  return (
    <ResponsiveSelect
      searchEnabled={false}
      emptyMessage="No gender options found."
      options={GENDER_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

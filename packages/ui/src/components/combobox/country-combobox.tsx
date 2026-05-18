import {useMemo} from "react";
import { ResponsiveSelect } from "./responsive-select";
import { type SelectOption } from "./data";

const COUNTRY_FLAG: Record<string, string> = {
  Nigeria: "NG",
  Ghana: "GH",
  Kenya: "KE",
  "South Africa": "ZA",
};

type CountryComboboxProps = {
  value?: string;
  iso2?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CountryCombobox({ value, iso2, onChange, placeholder = "Country of residence", disabled = false, className}: CountryComboboxProps) {
  const options = [{
    value: value as string, label: value as string,
    leading: (
      <span className="country"><img src={`https://flagcdn.com/w40/${iso2?.toLowerCase()}.png`} width="23" /></span>
    ),
    searchText: value,
  }] as SelectOption[]

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

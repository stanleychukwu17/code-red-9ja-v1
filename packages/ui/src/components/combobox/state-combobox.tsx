import { ResponsiveSelect } from "./responsive-select";

type StateComboboxProps = {
  country?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  options?: { value: string; label: string; searchText?: string }[];
};

export function StateCombobox({ country, value, onChange, placeholder = "State of residence", disabled = false, className, options = []}: StateComboboxProps) {
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

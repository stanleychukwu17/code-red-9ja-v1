import { ResponsiveSelect } from "./responsive-select";

type CityComboboxProps = {
  state?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  options?: { value: string; label: string; searchText?: string }[];
};

export function CityCombobox({ state, value, onChange, placeholder = "City of residence", disabled = false, className, options = [] }: CityComboboxProps) {
  return (
    <ResponsiveSelect
      searchPlaceholder="Search cities"
      emptyMessage={state ? "No cities found." : "Select a state first."}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || !state}
      className={className}
    />
  );
}

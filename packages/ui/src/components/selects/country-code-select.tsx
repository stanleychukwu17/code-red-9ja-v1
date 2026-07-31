import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export type CountryType = {
  id: number;
  name: string;
  iso2: string;
  phonecode: string;
};

type SelectCountryCodeProps = Omit<SelectProps<string>, "update"> & {
  countries: CountryType[];
  update: (val: string) => void;
};

export const SelectCountryCode = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
  countries,
}: SelectCountryCodeProps) => {
  const [open, setOpen] = useState(false);
  const selectedCountry = countries.find(
    (c) => c.name.toLowerCase() === selectedId?.toLowerCase(),
  );

  const handleSelect = (item: CountryType) => {
    update(item.name.toLowerCase());
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Search country..."
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between gap-1 px-3 rounded-xl",
            errorMsg && "border-0.8 border-red",
            className,
          )}
          type="button"
        >
          {selectedCountry ? (
            <div className="flex items-center gap-1.5">
              <img
                src={`https://flagcdn.com/w40/${selectedCountry.iso2.toLowerCase()}.png`}
                width="20"
                alt={selectedCountry.name}
                className="rounded-[2px]"
              />
              <span className="font-medium text-c-90">
                +{selectedCountry.phonecode}
              </span>
            </div>
          ) : (
            <span className="text-c-60">+</span>
          )}
          <ArrowDownIcon className="ml-1 text-c-80 shrink-0" />
        </Button>
      }
    >
      <GeneralCommand
        data={countries}
        getId={(item) => item.name.toLowerCase()}
        getName={(item) => item.name}
        getLabel={(item) => (
          <div className="flex items-center gap-2">
            <img
              src={`https://flagcdn.com/w40/${item.iso2.toLowerCase()}.png`}
              width="20"
              alt={item.name}
              className="rounded-[2px]"
            />
            <span>{item.name}</span>
          </div>
        )}
        getExtra={(item) => `+${item.phonecode}`}
        handleSelect={handleSelect}
        selectedId={selectedId}
      />
    </SelectResponsiveWrapper>
  );
};

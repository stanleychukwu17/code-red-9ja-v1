import { useEffect, useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { LoadingSelect } from "./loading-select";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { useQuery } from "@tanstack/react-query";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface Country {
  id: number;
  name: string;
  iso2?: string;
  phone_code?: string;
}

interface CountriesResponse {
  success: boolean;
  message: string;
  data: {
    countries: Country[];
  };
}

export const SelectCountry = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
  fetchCountries,
}: SelectProps<Country> & {
  fetchCountries: () => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Country | undefined>(
    undefined,
  );

  const { data, isLoading } = useQuery<CountriesResponse>({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetchCountries();
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch countries");
    },
  });

  const countries = data?.data?.countries || [];

  useEffect(() => {
    if (selectedId) {
      const country = countries.find(
        (c) => String(c.id) === String(selectedId),
      );
      if (country) {
        setSelectedItem(country);
      }
    } else {
      setSelectedItem(undefined);
    }
  }, [selectedId, countries]);

  const handleSelect = (item: Country) => {
    setSelectedItem(item);
    update(item);
    setOpen(false);
  };

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Show loading state while countries are loading
  if (isLoading && countries.length === 0) {
    return (
      <LoadingSelect
        open={open}
        setOpen={setOpen}
        errorMsg={errorMsg}
        placeholder="Country"
        className={className}
        align={align}
      />
    );
  }

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select Country"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          className={cn(
            "justify-between w-full gap-2",
            errorMsg && "border-0.8 border-red",
            className,
          )}
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.name : "Country"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={filteredCountries}
        getId={(item: Country) => `${item.id}`}
        getName={(item: Country) => item.name}
        handleSelect={handleSelect}
        selectedId={
          selectedItem?.id
            ? `${selectedItem.id}`
            : selectedId
              ? `${selectedId}`
              : undefined
        }
        onSearch={setSearchQuery}
      />
    </SelectResponsiveWrapper>
  );
};

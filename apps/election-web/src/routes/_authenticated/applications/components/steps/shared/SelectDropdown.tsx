import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { GeneralCommand } from "@repo/ui/components/command/general-command";
import { SelectResponsiveWrapper } from "@repo/ui/components/selects/select-responsive-wrapper";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";

/** Generic responsive dropdown select component using mobile bottom sheet / desktop popover */
export const SelectDropdown = ({
  value,
  update,
  options,
  placeholder,
}: {
  value: string;
  update: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = options.find((o) => String(o.value) === String(value));

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      align="start"
      trigger={
        <Button
          variant="select"
          size="select"
          className="justify-between gap-2 w-full h-14 rounded-2xl bg-transparent border border-input px-3 py-1 font-normal"
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.label : placeholder}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={options}
        getId={(item) => String(item.value)}
        getName={(item) => item.label}
        handleSelect={(item) => {
          update(item.value);
          setOpen(false);
        }}
        selectedId={value}
      />
    </SelectResponsiveWrapper>
  );
};

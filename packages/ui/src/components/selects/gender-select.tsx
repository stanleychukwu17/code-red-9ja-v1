import { useState, useEffect } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import ArrowDownIcon from "../../icons/arrow-down-icon";

const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

export const gendersData = GENDER_OPTIONS.map((o) => o.value);

export const SelectGender = ({
  initialData,
  update,
  errorMsg,
  className,
  buttonText,
  hideIcon,
}: SelectProps<string> & { className?: string }) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(initialData);

  useEffect(() => {
    setSelectedItem(initialData);
  }, [initialData]);

  const handleSelect = (item: { label: string; value: string }) => {
    setSelectedItem(item.value);
    update(item.value);
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select gender"
      align="start"
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between gap-2 w-full",
            className,
            errorMsg && "border-0.8 border-red",
          )}
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem : buttonText || "Select gender"}
          </p>
          {!hideIcon && <ArrowDownIcon className="ml-auto text-c-80" />}
        </Button>
      }
    >
      <GeneralCommand
        data={GENDER_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={handleSelect}
        selectedId={selectedItem}
      />
    </SelectResponsiveWrapper>
  );
};

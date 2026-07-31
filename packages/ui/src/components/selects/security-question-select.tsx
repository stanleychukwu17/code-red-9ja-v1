import { useState } from "react";
import { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export const SECURITY_QUESTIONS = [
  { id: 1, question: "What is your father's first name?" },
  { id: 2, question: "What is your mother's first name?" },
  { id: 3, question: "What state is your father from?" },
  { id: 4, question: "What state is your mother from?" },
];

export const SelectSecurityQuestion = ({
  update,
  errorMsg,
  selectedId,
  className,
  align = "start",
}: SelectProps<number, number>) => {
  const [open, setOpen] = useState(false);
  const selectedItem = SECURITY_QUESTIONS.find((opt) => opt.id === selectedId);

  const handleSelect = (item: { id: number; question: string }) => {
    update(item.id);
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select a question"
      align={align}
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between w-full gap-2",
            errorMsg && "border-0.8 border-red",
            className,
          )}
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.question : "Select a question"}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={SECURITY_QUESTIONS}
        getId={(item) => String(item.id)}
        getName={(item) => item.question}
        handleSelect={handleSelect}
        selectedId={selectedId ? String(selectedId) : undefined}
        disableSearch
      />
    </SelectResponsiveWrapper>
  );
};

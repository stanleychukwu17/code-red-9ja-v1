import ArrowDownIcon from "../../icons/arrow-down-icon";
import { Button } from "../button";
import { cn } from "../../lib/utils";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";

type LoadingSelectProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  errorMsg?: string;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  align?: "start" | "center" | "end";
};

export const LoadingSelect = ({
  open,
  setOpen,
  errorMsg,
  placeholder = "Loading...",
  className,
  icon,
  align = "start",
}: LoadingSelectProps) => {
  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
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
          disabled
        >
          <div className="flex items-center gap-2">
            {icon}
            <p className="whitespace-normal text-left line-clamp-1 animate-pulse">
              {placeholder}
            </p>
          </div>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
        Loading...
      </div>
    </SelectResponsiveWrapper>
  );
};

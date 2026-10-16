import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/utils";

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  onClick,
  onKeyDown,
  ...props
}, ref) => {
  const isChecked = checked === true;
  const isIndeterminate = checked === "indeterminate";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onCheckedChange?.(!isChecked);
    onClick?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === " ") {
      e.preventDefault();
      onCheckedChange?.(!isChecked);
    }
    onKeyDown?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "peer size-4.5 shrink-0 rounded-[5px] border transition-colors flex items-center justify-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        isChecked || isIndeterminate
          ? "bg-primary border-primary text-white"
          : "bg-background border-border/80 hover:border-c-40",
        className,
      )}
      {...props}
    >
      {isIndeterminate ? (
        <Minus className="size-3 stroke-[3]" />
      ) : isChecked ? (
        <Check className="size-3 stroke-[3]" />
      ) : null}
    </button>
  );
},
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

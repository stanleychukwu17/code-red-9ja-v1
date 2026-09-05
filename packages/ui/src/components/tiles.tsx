import { Ellipsis } from "lucide-react";
import { cn } from "../lib/utils";
import { ReactNode, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";

export type TileHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export function TileHeader({ children, className }: TileHeaderProps) {
  return (
    <div
      className={cn(
        "h-10 border-y border-border flex items-center justify-between gap-5 md:gap-20 px-3 text-[15px] sticky top-0 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type TileRowProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};
export function TileRow({ children, className, onClick, ...props }: TileRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "h-14 flex items-center justify-between gap-5 md:gap-20 px-3 hover:bg-c-5 duration-200 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type TileLeftProps = {
  children: React.ReactNode;
  className?: string;
};
export function TileLeft({ children, className }: TileLeftProps) {
  return (
    <div
      className={cn("flex w-full min-w-0 items-center gap-4 px-0", className)}
    >
      {children}
    </div>
  );
}

export type TileRightProps = {
  children: React.ReactNode;
  className?: string;
};
export function TileRight({ children, className }: TileRightProps) {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-3 text-[15px] text-c-70",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type TileOptionsProps = {
  dropdown: ReactNode;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
export const TileOptions = ({
  dropdown,
  className,
  disabled,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TileOptionsProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen =
    controlledOnOpenChange !== undefined
      ? controlledOnOpenChange
      : setInternalOpen;

  return (
    <div onClick={(e) => e.stopPropagation()} className={cn(className)}>
      <DropdownMenu modal={true} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            variant="ghost"
            size="icon-md"
            className="hover:[&_svg]:text-c-80 rounded-lg"
            disabled={disabled}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {dropdown}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

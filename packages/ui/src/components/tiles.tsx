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
};

export function TileHeader({ children }: TileHeaderProps) {
  return (
    <div className="h-10 border-y border-border flex items-center justify-between gap-5 md:gap-20 px-3 text-[15px]">
      {children}
    </div>
  );
}

export type TileRowProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};
export function TileRow({ children, className, onClick }: TileRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "h-14 flex items-center justify-between gap-5 md:gap-20 px-3 hover:bg-c-5 duration-200 cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type TileLeftProps = {
  children: React.ReactNode;
};
export function TileLeft({ children }: TileLeftProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-4 px-0">
      {children}
    </div>
  );
}

export type TileRightProps = {
  children: React.ReactNode;
};
export function TileRight({ children }: TileRightProps) {
  return (
    <div className="shrink-0 flex items-center gap-3 text-[15px] text-c-70">{children}</div>
  );
}

export type TileOptionsProps = {
  dropdown: ReactNode;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
export const TileOptions = ({ dropdown, className, disabled, open: controlledOpen, onOpenChange: controlledOnOpenChange }: TileOptionsProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

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

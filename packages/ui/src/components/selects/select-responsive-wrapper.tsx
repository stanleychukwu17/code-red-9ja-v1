import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { Popover as RadixPopover } from "radix-ui";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "../drawer";

interface SelectResponsiveWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  /** Content rendered inside the Popover on desktop.
   *  Falls back to `children` when not provided (backward compatible). */
  desktopContent?: React.ReactNode;
  children?: React.ReactNode;
  /** Optional alternative content rendered inside the Drawer on mobile.
   *  When omitted, `desktopContent ?? children` is used on both. */
  mobileContent?: React.ReactNode;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function SelectResponsiveWrapper({
  open,
  onOpenChange,
  trigger,
  desktopContent,
  children,
  mobileContent,
  placeholder = "Select option",
  className,
  align = "start",
}: SelectResponsiveWrapperProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
        <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
        <RadixPopover.Portal>
          <RadixPopover.Content
            align={align}
            sideOffset={4}
            className="z-50 p-0 border-0 bg-transparent shadow-none outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="overflow-hidden rounded-xl bg-popover shadow-[0_18px_40px_rgba(16,24,40,0.08)]">
              {desktopContent ?? children}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild className={className}>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="rounded-t-[28px] border-t-0 bg-background focus:outline-none">
        <DrawerTitle className="sr-only">{placeholder}</DrawerTitle>
        <div className="flex flex-col flex-1 overflow-hidden">
          {mobileContent ?? desktopContent ?? children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

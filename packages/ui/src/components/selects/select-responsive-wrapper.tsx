import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { Popover as RadixPopover } from "radix-ui";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "../drawer";

interface SelectResponsiveWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function SelectResponsiveWrapper({
  open,
  onOpenChange,
  trigger,
  children,
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
              {children}
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
      <DrawerContent className="rounded-t-[28px] border-t-0 bg-background px-3 pt-3 pb-6 focus:outline-none">
        <DrawerTitle className="sr-only">{placeholder}</DrawerTitle>
        <div className="mt-2 focus:outline-none">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

import * as React from "react";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-2 border bg-background p-5 shadow-lg duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-open:slide-in-from-left-1/2 data-open:slide-in-from-top-1/2 data-closed:slide-out-to-left-1/2 data-closed:slide-out-to-top-1/2 rounded-[24px]",
          className,
        )}
        onPointerDownOutside={(e) => {
          // Radix fires a CustomEvent — the actual clicked element is in detail.originalEvent.target
          const target = (
            e as unknown as { detail: { originalEvent: PointerEvent } }
          ).detail?.originalEvent?.target as Element | null;

          if (!target) {
            onPointerDownOutside?.(e);
            return;
          }

          // Prevent dialog from closing when the click landed inside a portaled
          // element (popover, drawer, calendar, etc.) that lives outside the dialog DOM tree.
          const isInsidePortaledOverlay =
            target.closest("[data-slot='popover-content']") !== null ||
            target.closest("[data-vaul-drawer]") !== null ||
            target.closest("[data-radix-popper-content-wrapper]") !== null ||
            target.closest("[data-radix-select-viewport]") !== null ||
            // Catch any open base-ui popover by querying all popover-content elements
            Array.from(
              document.querySelectorAll("[data-slot='popover-content']"),
            ).some((el) => el.contains(target));

          if (isInsidePortaledOverlay) {
            e.preventDefault();
            return;
          }
          onPointerDownOutside?.(e);
        }}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  title,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    // <div
    //   data-slot="dialog-header"
    //   className={cn("flex flex-col gap-1.5 text-left", className)}
    //   {...props}
    // />
    <div
      className="flex items-center justify-between px-6 pr-4 pt-4"
      {...props}
    >
      <h2 className="text-[20px] font-medium text-c-80 tracking-tight">
        {title}
      </h2>
      <DialogClose asChild>
        <button
          className="size-10 flex items-center justify-center rounded-full text-c-50 hover:bg-c-5 hover:text-c-80 transition-colors duration-150 cursor-pointer"
          aria-label="Close"
        >
          <X className="size-6" />
        </button>
      </DialogClose>
    </div>
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // "flex flex-row justify-end gap-2 border-t pt-4 mt-2",
        "flex justify-end px-6 pb-3 pt-3 border-t# border-border",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogPadding({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5", className)}>{children}</div>;
}

const DialogToolbelt = ({ children }: { children: React.ReactNode }) => {
  return (
    <DialogPadding className="flex items-center gap-2.5 pt-1.5 pb-3 shrink-0 flex-wrap">
      {children}
    </DialogPadding>
  );
};

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogPadding,
  DialogToolbelt,
};

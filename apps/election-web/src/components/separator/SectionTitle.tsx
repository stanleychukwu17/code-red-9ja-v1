import { cn } from "@repo/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type SectionTitleProps = ComponentProps<"div"> & {
  children: ReactNode;
};

/**
 * Pill-styled section heading used above home/section content blocks.
 */
export function SectionTitle({
  children,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div
      className={cn("bg-sidebar-mobile px-4 py-2.5 rounded-md w-fit", className)}
      {...props}
    >
      <h3 className="text-sm font-bold text-c-90">{children}</h3>
    </div>
  );
}

import { cn } from "@repo/ui/lib/utils";
import type { ComponentProps } from "react";

type SeparatorProps = ComponentProps<"div">;

/**
 * Horizontal divider used between sections.
 * Accepts standard div props and `className` overrides (e.g. height, spacing).
 */
export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("h-0.5 bg-sidebar-mobile/70 my-3", className)}
      {...props}
    />
  );
}

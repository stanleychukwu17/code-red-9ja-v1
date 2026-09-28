import * as React from "react";
import { cn } from "../lib/utils";

export interface HeaderAccentProps extends React.HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  fromColor?: string;
  opacity?: number;
}

export const HeaderAccent = React.forwardRef<HTMLDivElement, HeaderAccentProps>(
  (
    {
      className,
      style,
      accentColor = "var(--lime)",
      fromColor = "var(--sidebar-mobile)",
      opacity,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("absolute top-4 left-0 h-4 w-1/2 z-0 opacity-80", className)}
        style={{
          background: `linear-gradient(to right, ${fromColor}, ${accentColor})`,
          ...(opacity !== undefined ? { opacity } : {}),
          ...style,
        }}
        {...props}
      />
    );
  }
);

HeaderAccent.displayName = "HeaderAccent";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface TinyErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string | null;
  wrapperClassName?: string;
}

export function TinyError({ error, className, wrapperClassName, ...props }: TinyErrorProps) {
  if (!error) return null;

  return (
    <div className={cn(wrapperClassName)}>
      <div
        className={cn("p-3 text-sm text-destructive bg-red-50 rounded-lg border border-red-200", className)}
        {...props}
      >
        {error}
      </div>
    </div>
  );
}

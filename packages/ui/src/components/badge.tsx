import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#2c3e50] text-white hover:bg-[#34495e]",
        secondary:
          "border-transparent bg-[#ecf0f1] text-[#2c3e50] dark:bg-[#34495e] dark:text-[#ecf0f1]",
        destructive:
          "border-transparent bg-[#e74c3c]/15 text-[#c0392b] dark:bg-[#e74c3c]/25 dark:text-[#e74c3c]",
        outline:
          "border-[#bdc3c7] text-[#2c3e50] dark:border-[#7f8c8d] dark:text-[#ecf0f1]",
        success:
          "border-transparent bg-[#2ecc71]/15 text-[#27ae60] dark:bg-[#2ecc71]/25 dark:text-[#2ecc71]",
        warning:
          "border-transparent bg-[#f39c12]/15 text-[#d35400] dark:bg-[#f39c12]/25 dark:text-[#f1c40f]",
        info:
          "border-transparent bg-[#3498db]/15 text-[#2980b9] dark:bg-[#3498db]/25 dark:text-[#3498db]",
        purple:
          "border-transparent bg-[#9b59b6]/15 text-[#8e44ad] dark:bg-[#9b59b6]/25 dark:text-[#9b59b6]",
        muted:
          "border-transparent bg-[#95a5a6]/15 text-[#7f8c8d] dark:bg-[#95a5a6]/25 dark:text-[#bdc3c7]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

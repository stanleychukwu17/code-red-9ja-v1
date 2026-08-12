import * as React from "react";
import { cn } from "../../lib/utils";

export type MarketingStatusType =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | string;

export function MarketingStatusBadge({
  status,
  className,
}: {
  status: MarketingStatusType;
  className?: string;
}) {
  const normalized = (status || "pending").toLowerCase();

  let textColor = "";
  let bgColor = "";
  let label = normalized;

  switch (normalized) {
    case "pending":
      textColor = "text-[#FF8D28]";
      bgColor = "bg-[#FF8D28]/20";
      label = "Pending";
      break;
    case "active":
      textColor = "text-[#54A0FF]";
      bgColor = "bg-[#54A0FF] animate-pulse";
      label = "Active";
      break;
    case "completed":
    case "concluded":
      textColor = "text-c-80";
      bgColor = "bg-c-30";
      label = "Concluded";
      break;
    default:
      textColor = "text-c-30";
      bgColor = "bg-c-30";
      break;
  }

  return (
    <div
      className={cn("w-[110px] shrink-0 flex items-center gap-3", className)}
    >
      <p className={cn("size-3 rounded-full", bgColor)} />
      <p className={cn("font-medium text-[15px] capitalize", textColor)}>
        {label}
      </p>
    </div>
  );
}

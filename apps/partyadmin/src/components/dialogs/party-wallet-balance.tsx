import { type ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import FancyBillIcon from "@repo/ui/icons/fancy-bill-icon";

export type PartyWalletBalanceProps = {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
};

export function PartyWalletBalance({ icon, label, value, className, valueClassName }: PartyWalletBalanceProps) {
  return (
    <div
      className={cn(
        "h-14 rounded-xl bg-c-5 px-5 flex items-center justify-between gap-3",
        className,
      )}
    >
      {icon}
      <p className="text-[15px] font-medium text-c-70 w-full">{label}</p>
      <span
        className={cn(
          "shrink-0 text-[15px] font-semibold text-c-90 whitespace-nowrap",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export type PricingRowProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  isLoading?: boolean;
  valueClassName?: string;
};

export function PricingRow({ icon, label, value, isLoading, valueClassName = "text-c-80" }: PricingRowProps) {
  return (
    <div className="h-12 flex items-center gap-3">
      {icon ?? <FancyBillIcon className="shrink-0 size-5" />}
      <p className="text-base text-c-70 w-full">{label}</p>
      <span
        className={cn(
          "text-base font-semibold",
          valueClassName,
          isLoading && "animate-pulse",
        )}
      >
        {!isLoading && <>{value}</>}
      </span>
    </div>
  );
}

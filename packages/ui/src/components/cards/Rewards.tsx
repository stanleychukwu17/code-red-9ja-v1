import { ReactNode } from "react";
import FancyMoneyBagIcon from "../../icons/fancy-money-bag-icon";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

export function RewardCard({
  label,
  value,
  variant = "yellow",
  className,
  icon,
}: {
  label: string;
  value?: string;
  variant?: "yellow" | "green" | "purple";
  className?: string;
  icon?: ReactNode;
}) {
  const bgColor = {
    yellow: "bg-yellow/20",
    green: "bg-secondary/20",
    purple: "bg-purple/20",
  };

  return (
    <div
      className={cn(
        `rounded-[16px] p-4 flex items-center justify-between text-[17px] [&_svg]:shrink-0`,
        bgColor[variant],
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon ? icon : <FancyMoneyBagIcon className="size-6 shrink-0" />}
        <span className="text-c-90">{label}</span>
      </div>
      <span className="text-c-90 font-extrabold">{value}</span>
    </div>
  );
}

export function RewardSumCard({
  label,
  subtext,
  value,
  subValue,
  variant = "yellow",
  className,
  icon,
}: {
  label: string;
  subtext: string;
  value: string;
  subValue: string;
  variant?: "yellow" | "green" | "purple";
  className?: string;
  icon?: ReactNode;
}) {
  const bgColor = {
    yellow: "bg-yellow/20",
    green: "bg-secondary/20",
    purple: "bg-purple/20",
  };

  return (
    <div
      className={cn(
        `rounded-[16px] p-4 flex items-center gap-3 text-lg`,
        bgColor[variant],
        className,
      )}
    >
      {icon ? icon : <FancyMoneyBagIcon className="size-6 shrink-0" />}
      <div className="space-y-0.5 w-full">
        <div className="flex items-center justify-between text-c-90">
          <span className="font-medium">{label}</span>
          <span className="font-bold text-xl">{value}</span>
        </div>
        <div className="flex items-center justify-between text-c-60 text-base">
          <span>{subtext}</span>
          <span>{subValue}</span>
        </div>
      </div>
    </div>
  );
}

export function SelectableCard({
  title,
  subtitle,
  isSelected,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-5 rounded-2xl transition ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : isSelected
            ? "bg-secondary/20 cursor-pointer"
            : "bg-hover-5 cursor-pointer"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-c-90 text-[17px]">{title}</span>
        <span className="text-sm text-c-60">{subtitle}</span>
      </div>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
          disabled
            ? "bg-c-10"
            : isSelected
              ? "bg-secondary text-white"
              : "bg-c-20"
        }`}
      >
        {isSelected && !disabled && <Check className="size-4 stroke-[3]" />}
      </div>
    </div>
  );
}

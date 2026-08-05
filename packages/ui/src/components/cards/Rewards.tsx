import { ReactNode } from "react";
import FancyMoneyBagIcon from "../../icons/fancy-money-bag-icon";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";
import { AppAvatar } from "../avatar";

export function InfoCard({
  label,
  value,
  variant = "yellow",
  className,
  icon,
}: {
  label: string | ReactNode;
  value?: string;
  variant?: "yellow" | "green" | "purple" | "grey";
  className?: string;
  icon?: ReactNode;
}) {
  const bgColor = {
    grey: "bg-c-10",
    yellow: "bg-yellow/20",
    green: "bg-secondary/20",
    purple: "bg-purple/20",
  };

  return (
    <div
      className={cn(
        `rounded-xl p-3 flex items-center justify-between text-[17px] [&_svg]:shrink-0 text-c-80`,
        bgColor[variant],
        className,
      )}
    >
      <div className="flex items-center gap-3 w-full">
        {icon}
        <div className="w-full text-c-90">{label}</div>
      </div>
      <span className="shrink-0 font-extrabold">{value}</span>
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

export function CheckmarkIndicator({
  isSelected,
  disabled,
}: {
  isSelected?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "size-6 rounded-full text-c-80 flex items-center justify-center transition-all shrink-0",
        disabled && "bg-c-10",
        isSelected && "bg-secondary",
        !isSelected && "bg-c-20",
      )}
    >
      {isSelected && !disabled && <Check className="size-4 stroke-[3]" />}
    </div>
  );
}

export function SelectableCard({
  title,
  subtitle,
  isSelected,
  rightComponent,
  titleClassName,
  className,
  onClick,
  disabled,
}: {
  title: string;
  subtitle?: string | ReactNode;
  isSelected: boolean;
  onClick: () => void;
  rightComponent?: ReactNode;
  titleClassName?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-between p-5 rounded-2xl bg-hover-5 cursor-pointer transition",
        disabled && "opacity-50 cursor-not-allowed",
        isSelected && "bg-secondary/20 cursor-pointer",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 w-full">
        <p className={cn("text-c-90 text-[17px]", titleClassName)}>{title}</p>
        {subtitle && <span className="text-sm text-c-60">{subtitle}</span>}
      </div>
      {rightComponent}
      <CheckmarkIndicator isSelected={isSelected} disabled={disabled} />
    </div>
  );
}

export function UserCard({
  name,
  image,
  image2,
  isSelected,
  onClick,
  disabled,
}: {
  name: string;
  image?: string;
  image2?: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "h-16 flex items-center justify-between gap-3 px-2 rounded-2xl transition",
        disabled && "opacity-50 cursor-not-allowed",
        isSelected && "bg-secondary/20",
      )}
    >
      <DoubleAvatar image={image} image2={image2} />
      <p className="w-full text-c-90 text-[17px]">{name}</p>
      <CheckmarkIndicator isSelected={isSelected} disabled={disabled} />
    </div>
  );
}

export function DoubleAvatar({
  image,
  image2,
  avatar1ClassName,
  avatar2ClassName,
  containerClassName,
}: {
  image?: string;
  image2?: string;
  avatar1ClassName?: string;
  avatar2ClassName?: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn("size-10 relative", containerClassName)}>
      {image && (
        <AppAvatar
          src={image}
          alt="image"
          className={cn("size-10", avatar1ClassName)}
        />
      )}
      {image2 && (
        <AppAvatar
          src={image2}
          alt="image"
          className={cn(
            "size-5 absolute bottom-[-1px] right-[-2px] ring-[1.5px] ring-background",
            avatar2ClassName,
          )}
        />
      )}
    </div>
  );
}

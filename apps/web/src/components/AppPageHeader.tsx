import { ReactNode } from "react";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";

export interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function AppPageHeader({
  title,
  subtitle,
  right,
  onBack,
  className = "",
}: AppPageHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full text-c-80 transition-colors hover:bg-black/5"
            aria-label="Go back"
          >
            <ArrowDownIcon className="size-6 rotate-90" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1d] md:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-medium text-c-60">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

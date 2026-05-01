import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AppPageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <Link
          to="/dashboard"
          className="inline-flex size-10 items-center justify-center rounded-full text-[#5f575c] transition hover:bg-white/60"
          aria-label="Go back"
        >
          <ChevronLeft className="size-6" />
        </Link>

        <div className="space-y-2">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[18px] font-normal text-[#827d82]">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {right}
    </header>
  );
}

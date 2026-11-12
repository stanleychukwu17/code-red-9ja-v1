import * as React from "react";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

export function ObjectiveCardWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-[#111111] text-white rounded-[20px] md:rounded-[28px] py-2.5 flex flex-col gap-2.5 shadow-md select-none",
        className,
      )}
    >
      <div className="flex flex-col min-h-[168px] h-full">{children}</div>
    </section>
  );
}

// Alias for backwards compatibility during migration
export const LeaderboardCardWrapper = ObjectiveCardWrapper;

export function ObjectiveTile({
  isCompleted,
  title,
  rightText,
  rightText2,
  onClick,
}: {
  isCompleted: boolean;
  title: string;
  rightText?: string | React.ReactNode;
  rightText2?: string | React.ReactNode;
  onClick?: () => void;
}) {
  const TodoIcon = () => (
    <div
      className={`size-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
        isCompleted ? "bg-secondary text-black" : "bg-white/20"
      }`}
    >
      {isCompleted && <Check className="size-3 stroke-[3]" />}
    </div>
  );

  return (
    <div
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 md:px-8 h-14 gap-2 transition text-[15px] md:text-base cursor-pointer"
    >
      <TodoIcon />
      <p className="text-white w-full md:pl-2">{title}</p>
      {rightText && (
        <p className="text-white shrink-0 text-right">{rightText}</p>
      )}
      {rightText2 && (
        <p className="text-white/50 shrink-0 md:w-28 text-right">
          {rightText2}
        </p>
      )}
    </div>
  );
}


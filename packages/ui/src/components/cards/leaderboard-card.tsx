import * as React from "react";
import { cn } from "../../lib/utils";

export function LeaderboardCardWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-[#111111] text-white rounded-[28px] py-2.5 flex flex-col gap-2.5 shadow-md select-none",
        className,
      )}
    >
      <div className="flex flex-col min-h-[168px] h-full">{children}</div>
    </section>
  );
}

export function LeaderboardCardRow({
  rank,
  avatarUrl,
  name,
  partyShortName,
  regionsWinningCount: statesWinningCount,
  votesCount,
  className,
}: {
  rank: number;
  avatarUrl?: string;
  name: string;
  partyShortName?: string;
  regionsWinningCount?: string;
  votesCount: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[56px] flex items-center justify-between px-4 md:px-6",
        className,
      )}
    >
      {/* Left: Avatar & Name */}
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0">
          <img
            src={avatarUrl || "/default-avatar.png"}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center">
          <span className={cn("text-white leading-tight")}>
            {name}{" "}
            {partyShortName && (
              <span className="text-white/50 font-normal">
                · {partyShortName}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Right: Votes & Rank */}
      <div className="flex items-center gap-6">
        <span className="text-white font-medium hidden md:block">
          {statesWinningCount}
        </span>
        <span className="md:w-[100px] text-right text-white font-medium">
          {votesCount}
        </span>
        <span className="text-neutral-500 font-semibold w-6 text-right">
          #{rank}
        </span>
      </div>
    </div>
  );
}

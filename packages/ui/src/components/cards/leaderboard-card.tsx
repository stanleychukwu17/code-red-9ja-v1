import * as React from "react";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";
import { DoubleAvatar } from "./Rewards";

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
        "bg-[#111111] text-white rounded-[20px] md:rounded-[28px] py-2.5 flex flex-col gap-2.5 shadow-md select-none",
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
  image,
  image2,
  name,
  partyShortName,
  regionsWinningCount: statesWinningCount,
  votesCount,
  className,
}: {
  rank: number;
  /** Primary avatar (candidate photo or party logo). Used in DoubleAvatar as image. */
  image?: string;
  /** Secondary overlay image (party logo). Used in DoubleAvatar as image2. */
  image2?: string;
  /** Legacy single avatar — used only when image is not supplied. */
  avatarUrl?: string;
  name: string;
  partyShortName?: string;
  regionsWinningCount?: string;
  votesCount: string | number;
  className?: string;
}) {
  const hasDoubleAvatar = !!image;
  return (
    <div
      className={cn(
        "h-[56px] flex items-center justify-between px-4 gap-4 md:px-6",
        className,
      )}
    >
      {/* Left: Avatar & Name */}
      <div className="flex items-center gap-4">
        {hasDoubleAvatar ? (
          <DoubleAvatar image={image} image2={image2} />
        ) : (
          <div className="size-10 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0">
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        )}
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
        <span className="shrink-0 md:w-[100px] text-right text-white font-medium">
          {votesCount}
        </span>
        <span className="md:w-[100px] text-white text-right hidden md:block">
          {statesWinningCount}
        </span>
        <span className="text-neutral-500 font-semibold w-6 text-right md:ml-6">
          #{rank}
        </span>
      </div>
    </div>
  );
}

export function ObjectiveTile({
  isCompleted,
  title,
  rightText,
  rightText2,
  onClick,
}: {
  isCompleted: boolean;
  title: string;
  rightText?: string;
  rightText2?: string;
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
      className="w-full flex items-center justify-between px-4 h-14 gap-2 transition text-[15px]"
    >
      <TodoIcon />
      <p className="text-white w-full">{title}</p>
      {rightText && <p className="text-white shrink-0">{rightText}</p>}
      {rightText2 && <p className="text-white/50 shrink-0">{rightText2}</p>}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Check, MessageCircleMore, Plus } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";

interface PartyHeaderLayoutProps {
  coverImage?: string | null;
  logo?: string | null;
  shortName: string;
  fullName: string;
  isVerified?: boolean;
  verifications?: any[];
  chapterName?: string;
  chapterLevel?: string;
  isChapterMemberInitial?: boolean;
  isFollowingInitial?: boolean;
  followersDisplay?: string;
  followersValue?: number;
  totalMembers?: string;
  chapterMembers?: string;
  onChapterMemberToggle?: (isChapterMember: boolean) => void;
  onFollowToggle?: (isFollowing: boolean) => void;
  onMessageClick?: () => void;
  children?: React.ReactNode;
}

export function PartyHeaderLayout({
  coverImage,
  logo,
  shortName,
  fullName,
  isVerified,
  verifications,
  chapterName,
  chapterLevel,
  isChapterMemberInitial = false,
  isFollowingInitial = false,
  followersDisplay = "100k",
  followersValue = 100,
  totalMembers = "300,000",
  chapterMembers = "200,000",
  onChapterMemberToggle,
  onFollowToggle,
  onMessageClick,
  children,
}: PartyHeaderLayoutProps) {
  const [isChapterMember, setIsChapterMember] = useState(isChapterMemberInitial);
  const [isFollowing, setIsFollowing] = useState(isFollowingInitial);

  useEffect(() => {
    setIsChapterMember(isChapterMemberInitial);
  }, [isChapterMemberInitial]);

  const handleChapterMemberClick = () => {
    const next = !isChapterMember;
    setIsChapterMember(next);
    onChapterMemberToggle?.(next);
  };

  const handleFollowClick = () => {
    const next = !isFollowing;
    setIsFollowing(next);
    onFollowToggle?.(next);
  };

  return (
    <header className="w-full bg-background">
      {/* 1. HERO COVER SECTION */}
      <div className="w-full h-44 sm:h-56 md:h-64 lg:h-72 relative overflow-hidden bg-muted">
        {coverImage ? (
          <img src={coverImage} alt={`${shortName} Cover`} className="w-full h-full object-cover object-center" />
        ) : null}

        {/* Small Screen Avatar: Centered in banner */}
        <div className="absolute inset-0 flex items-center justify-center lg:hidden pointer-events-none">
          <div className="size-26 md:size-35 rounded-full p-1 bg-transparent shadow-xl pointer-events-auto">
            <div className="w-full h-full rounded-full overflow-hidden bg-background border-4 border-background flex items-center justify-center">
              {logo ? (
                <img src={logo} alt={shortName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl md:text-2xl font-black text-muted-foreground select-none">
                  {shortName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INNER HEADER SECTION */}
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-7 ">
        <div className="relative">
          <div className="flex flex-col md:flex-row lg:items-center lg:justify-between gap-6 lg:min-w-250">

            {/* Left Column: Avatar + Identity + Action Buttons */}
            <div className="flex sm:flex-row items-start sm:items-center gap-5 sm:gap-6 mt-4 max-md:mb-7 max-lg:mb-9 sm:-mt-9 lg:-mt-21">
              {/* Circular Avatar with blue gradient ring border (Hidden on small screens, visible on sm and up) */}
              <div className="relative shrink-0 hidden lg:block">
                <div className="size-28 sm:size-32 md:size-44 rounded-full p-1 bg-linear-to-tr from-bg-sidebar-mobile via-blue-500 to-lime">
                  <div className="w-full h-full rounded-full overflow-hidden bg-background border-5 border-background flex items-center justify-center">
                    {logo ? (
                      <img src={logo} alt={shortName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-muted-foreground select-none">
                        {shortName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity & Actions */}
              <div className="sm:mt-7 pt-2 sm:pt-6 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">{shortName}</h1>
                    {(isVerified || (verifications && verifications.length > 0)) && (
                      <div className="flex items-center gap-1 shrink-0 relative -bottom-px">
                        <VerificationBadge id={3} title="Verified Political Party" />
                      </div>
                    )}
                    {chapterName && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-300 border border-lime-300 dark:border-lime-700">
                        {chapterName} {chapterLevel ? `(${chapterLevel})` : "Chapter"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground/90 -translate-y-0.5">{fullName}</p>

                  {/* Membership stats (Visible only on mobile/small screens: max-md) */}
                  <div className="flex items-center gap-4 pt-2 md:hidden text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <strong className="font-semibold text-foreground">{totalMembers}</strong>
                      <span>members</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="flex items-center gap-1.5">
                      <strong className="font-semibold text-foreground">{chapterMembers}</strong>
                      <span>in chapter</span>
                    </span>
                  </div>
                </div>

                {/* Become member, Follow & Message buttons */}
                <div className="flex items-center gap-3 lg:gap-5">
                  <button
                    type="button"
                    onClick={handleChapterMemberClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2 sm:px-4 py-3 rounded-full text-xs xl:text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer",
                      isChapterMember
                        ? "bg-lime-accent text-neutral-900 hover:bg-lime-accent-hover"
                        : "bg-lime hover:bg-lime-accent text-neutral-900 active:scale-95"
                    )}
                  >
                    {isChapterMember ? (
                      <> <Check className="w-4 h-4 stroke-[2.5]" /> <span>Member</span> </>
                    ) : (
                      <> <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Become a member</span> </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 rounded-full text-xs xl:text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer",
                      isFollowing
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    {isFollowing ? (
                      <> <Check className="w-4 h-4" /> <span>Following</span> </>
                    ) : (
                      <> <Plus className="w-4 h-4" /> <span>Follow</span> </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onMessageClick}
                    title="Send message"
                    aria-label="Send message"
                    className="size-8 text-background hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircleMore className="size-full" fill="black" color="#fff" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Statistics (Follower Ring Gauge & Member Counts) */}
            <div className="hidden md:flex items-center self-start lg:self-center">
              {/* Followers Ring Gauge */}
              <div className="flex items-center">
                <div className="relative size-28 md:size-35 lg:size-45 xl:size-50 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      strokeWidth="1.5"
                      className="stroke-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      strokeWidth="2"
                      strokeDasharray={282.7}
                      strokeDashoffset={Math.max(0, 282.7 - (282.7 * (followersValue % 100 || 75)) / 100)}
                      strokeLinecap="round"
                      className="stroke-lime-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="flex items-baseline">
                      <span className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-extralight tracking-tight text-foreground">
                        {followersDisplay.replace(/[^0-9.]/g, "") || "100"}
                      </span>
                      <span className="text-base font-medium text-foreground ml-0.5">
                        {followersDisplay.replace(/[0-9.]/g, "") || "k"}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground -mt-2.5">
                      Followers
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Counts */}
              <div className="flex flex-1 items-center gap-1 lg:gap-6 sm:min-w-75">
                {/* Total Members */}
                <div className="w-1/2 text-center py-2">
                  <div className="text-md md:text-lg lg:text-xl xl:text-2xl font-medium tracking-tight text-foreground">
                    {totalMembers}
                  </div>
                  <div className="text-[10px] sm:text-[11px] lg:text-xs font-semibold text-muted-foreground">
                    total members
                  </div>
                </div>

                {/* Members in Chapter */}
                <div className="w-1/2 text-center py-2">
                  <div className="text-md md:text-lg lg:text-xl xl:text-2xl font-medium tracking-tight text-foreground">
                    {chapterMembers}
                  </div>
                  <div className="text-[10px] sm:text-[11px] lg:text-xs font-semibold text-muted-foreground">
                    members in this chapter
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Optional Inner Navigation / Slot */}
        {children}
      </div>
    </header>
  );
}

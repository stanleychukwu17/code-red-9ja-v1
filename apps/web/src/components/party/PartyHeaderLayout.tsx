import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

interface PartyHeaderLayoutProps {
  coverImage: string;
  logo: string;
  shortName: string;
  fullName: string;
  isMemberInitial?: boolean;
  isFollowingInitial?: boolean;
  followersDisplay?: string;
  followersValue?: number;
  totalMembers?: string;
  chapterMembers?: string;
  onMemberToggle?: (isMember: boolean) => void;
  onFollowToggle?: (isFollowing: boolean) => void;
  children?: React.ReactNode;
}

export function PartyHeaderLayout({
  coverImage,
  logo,
  shortName,
  fullName,
  isMemberInitial = false,
  isFollowingInitial = false,
  followersDisplay = "100k",
  followersValue = 100,
  totalMembers = "300,000",
  chapterMembers = "200,000",
  onMemberToggle,
  onFollowToggle,
  children,
}: PartyHeaderLayoutProps) {
  const [isMember, setIsMember] = useState(isMemberInitial);
  const [isFollowing, setIsFollowing] = useState(isFollowingInitial);

  const handleMemberClick = () => {
    const next = !isMember;
    setIsMember(next);
    onMemberToggle?.(next);
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
        <img src={coverImage} alt={`${shortName} Cover`} className="w-full h-full object-cover object-center" />

        {/* Small Screen Avatar: Centered in banner */}
        <div className="absolute inset-0 flex items-center justify-center lg:hidden pointer-events-none">
          <div className="size-26 md:size-35 rounded-full p-1 bg-transparent shadow-xl pointer-events-auto">
            <div className="w-full h-full rounded-full overflow-hidden bg-background border-4 border-background">
              <img src={logo} alt={shortName} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. INNER HEADER SECTION */}
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-7 ">
        <div className="relative">
          <div className="flex flex-col md:flex-row lg:items-center lg:justify-between gap-6 ">

            {/* Left Column: Avatar + Identity + Action Buttons */}
            <div className="flex sm:flex-row items-start sm:items-center gap-5 sm:gap-6 mt-4 max-md:mb-7 max-lg:mb-9 sm:-mt-9 lg:-mt-11 xl:-mt-25">
              {/* Circular Avatar with blue gradient ring border (Hidden on small screens, visible on sm and up) */}
              <div className="relative shrink-0 hidden lg:block">
                <div className="size-28 sm:size-32 md:size-44 rounded-full p-1 bg-linear-to-tr from-sky-400 via-blue-500 to-indigo-500 shadow-xl">
                  <div className="w-full h-full rounded-full overflow-hidden bg-background border-5 border-background ">
                    <img src={logo} alt={shortName} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Identity & Actions */}
              <div className="sm:mt-7 pt-2 sm:pt-6 space-y-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">{shortName}</h1>
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

                {/* Become member & Follow buttons */}
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={handleMemberClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 sm:px-5 py-3 rounded-full text-xs lg:text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer",
                      isMember
                        ? "bg-lime-accent text-neutral-900 hover:bg-lime-accent-hover"
                        : "bg-lime hover:bg-lime-accent text-neutral-900 active:scale-95"
                    )}
                  >
                    {isMember ? (
                      <> <Check className="w-4 h-4 stroke-[2.5]" /> <span>Member</span> </>
                    ) : (
                      <> <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Become a member</span> </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-5 sm:px-6 py-3 rounded-full text-xs lg:text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer",
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
                </div>
              </div>
            </div>

            {/* Right Column: Statistics (Follower Ring Gauge & Member Counts) */}
            <div className="hidden md:flex items-center self-start lg:self-center">
              {/* Followers Ring Gauge */}
              <div className="flex items-center">
                <div className="relative size-28 md:size-40 lg:size-45 xl:size-50 flex items-center justify-center">
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
                <div className="w-1/2 text-center">
                  <div className="text-md md:text-lg lg:text-xl xl:text-2xl font-medium tracking-tight text-foreground">
                    {totalMembers}
                  </div>
                  <div className="text-[10px] sm:text-[11px] lg:text-xs font-semibold text-muted-foreground mt-0.5">
                    total members
                  </div>
                </div>

                {/* Members in Chapter */}
                <div className="w-1/2 text-center">
                  <div className="text-md md:text-lg lg:text-xl xl:text-2xl font-medium tracking-tight text-foreground">
                    {chapterMembers}
                  </div>
                  <div className="text-[10px] sm:text-[11px] lg:text-xs font-semibold text-muted-foreground mt-0.5">
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

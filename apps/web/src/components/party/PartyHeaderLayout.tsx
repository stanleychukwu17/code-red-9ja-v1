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
    <header className="w-full bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-900">
      {/* 1. HERO COVER SECTION */}
      <div className="w-full h-44 sm:h-56 md:h-64 lg:h-72 relative overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        <img
          src={coverImage}
          alt={`${shortName} Cover`}
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* 2. INNER HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left Column: Avatar + Identity + Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 -mt-14 sm:-mt-16 md:-mt-20">
              {/* Circular Avatar with blue gradient ring border */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 shadow-xl">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-neutral-900 border-2 border-white dark:border-neutral-950">
                    <img
                      src={logo}
                      alt={shortName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Identity & Actions */}
              <div className="pt-2 sm:pt-6 space-y-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                    {shortName}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {fullName}
                  </p>
                </div>

                {/* Become member & Follow buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleMemberClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer",
                      isMember
                        ? "bg-[#C4F27B] text-neutral-900 hover:bg-[#b8eb6a]"
                        : "bg-[#D8F999] hover:bg-[#cbf482] text-neutral-900 active:scale-95"
                    )}
                  >
                    {isMember ? (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Member</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Become a member</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowClick}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer",
                      isFollowing
                        ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                        : "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Statistics (Follower Ring Gauge & Member Counts) */}
            <div className="flex items-center gap-6 sm:gap-10 pt-4 lg:pt-0 self-start lg:self-center">
              {/* Followers Ring Gauge */}
              <div className="flex items-center gap-3">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="#e5e7eb"
                      strokeWidth="2.5"
                      className="dark:stroke-neutral-800"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="#84cc16"
                      strokeWidth="3.5"
                      strokeDasharray={282.7}
                      strokeDashoffset={Math.max(0, 282.7 - (282.7 * (followersValue % 100 || 75)) / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-extralight tracking-tight text-neutral-900 dark:text-white">
                        {followersDisplay.replace(/[^0-9.]/g, "") || "100"}
                      </span>
                      <span className="text-base font-medium text-neutral-900 dark:text-white ml-0.5">
                        {followersDisplay.replace(/[0-9.]/g, "") || "k"}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 -mt-0.5">
                      Followers
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Members */}
              <div className="text-left">
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                  {totalMembers}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">
                  total members
                </div>
              </div>

              {/* Members in Chapter */}
              <div className="text-left">
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                  {chapterMembers}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">
                  members in this chapter
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

import { useState, useEffect } from "react";
import { Check, Loader2, MessageCircleMore, Plus } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "#/lib/config";
import { JoinPartyDialog } from "#/components/parties";
import { PARTY_PRESETS } from "#/components/parties/party-constants";
import { formatNumber } from "@repo/ui/lib/number";
import { followParty, leaveParty, partyProfileQueryOptions, unfollowParty } from "#/lib/server/parties";

interface PartyHeaderLayoutProps {
  partyId?: number | string;
  partyName?: string;
  chapterId?: number;
  coverImage?: string | null;
  coverPositionY?: number | null;
  logo?: string | null;
  shortName?: string;
  fullName?: string;
  isVerified?: boolean;
  verifications?: any[];
  chapterLevel?: string;
  chapterType?: string;
  chapterGeoName?: string;
  followersDisplay?: string;
  followersValue?: number;
  totalMembers?: string;
  chapterMembers?: string;
  children?: React.ReactNode;
}

function getChapterTypeBadgeConfig(type?: string, geoName?: string) {
  if (!type) return null;
  const normalized = type.toLowerCase().trim().replace(/\s*chapter\s*/gi, "");

  const prefix = geoName ? `${geoName} ` : "";

  switch (normalized) {
    case "national":
      return {
        label: geoName ? `National (${geoName})` : "National Chapter",
        className: "bg-[#f1f2f6] text-black dark:bg-sidebar-mobile dark:text-c-80",
      };
    case "zonal":
      return {
        label: `${prefix}Zonal Chapter`,
        className: "bg-[#f4ff81] text-black dark:bg-sidebar-mobile dark:text-c-80",
      };
    case "state":
      return {
        label: `${prefix}State Chapter`,
        className: "bg-[#ffe57f] text-black dark:bg-sidebar-mobile dark:text-c-80",
      };
    case "lga":
      return {
        label: `${prefix}LGA Chapter`,
        className: "bg-[#efebe9] text-black dark:bg-sidebar-mobile dark:text-c-80",
      };
    case "ward":
      return {
        label: `${prefix}Ward Chapter`,
        className: "bg-[#ffea00] text-black dark:bg-sidebar-mobile dark:text-c-80",
      };
    default:
      return {
        label: `${prefix}${normalized.charAt(0).toUpperCase() + normalized.slice(1)} Chapter`,
        className:
          "bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-700 dark:text-white dark:border-zinc-600",
      };
  }
}

function resolvePartyHeaderData(
  props: PartyHeaderLayoutProps,
  profileRes?: any
) {
  const partyDetails = profileRes?.success ? profileRes.data.data : null;
  const isServerChapterMember = profileRes?.success ? Boolean(profileRes.data?.is_chapter_member) : false;
  const isServerFollowing = profileRes?.success ? Boolean(profileRes.data?.is_following) : false;

  // Resolve short name, preset themes, and full party branding
  const resolvedPartyName = props.partyName || props.shortName || "";
  const shortName = props.shortName || partyDetails?.short_name || resolvedPartyName;
  const partyUpper = shortName.toUpperCase();
  const preset = PARTY_PRESETS[partyUpper];

  const fullName = props.fullName || partyDetails?.name || "Nigerian Party";
  const logo = props.logo !== undefined ? props.logo : (partyDetails?.logo || null);
  const isVerified = props.isVerified !== undefined ? props.isVerified : Boolean(partyDetails?.is_verified);
  const verifications = props.verifications !== undefined ? props.verifications : partyDetails?.verifications;

  const coverPositionY = props.coverPositionY ?? partyDetails?.cover_position_y ?? preset?.coverPositionY ?? 50;
  const coverImage = props.coverImage !== undefined
    ? props.coverImage
    : (partyDetails?.cover_image || preset?.coverImage || "https://images.unsplash.com/photo-1624383045192-cf512eb9d78c?q=80&w=1600&auto=format&fit=crop");

  const resolvedChapterType = props.chapterType || props.chapterLevel || (profileRes?.success ? profileRes.data.chapter_type : undefined);
  const chapterGeoName = props.chapterGeoName !== undefined ? props.chapterGeoName : (profileRes?.success ? profileRes.data.chapter_geo_name : undefined);
  const chapterBadge = getChapterTypeBadgeConfig(resolvedChapterType, chapterGeoName);

  // Active chapter & national member statistics
  const rawChapterMembers = profileRes?.success ? Number(profileRes.data?.chapter_member_count ?? 0) : 0;
  const chapterMembers = props.chapterMembers || rawChapterMembers.toLocaleString();

  const rawTotalMembers = profileRes?.success ? Number(profileRes.data?.national_member_count ?? 0) : 0;
  const totalMembers = props.totalMembers || rawTotalMembers.toLocaleString();

  // Follower counts and logarithmic gauge progress
  const rawFollowersCount = profileRes?.success ? Number(profileRes.data?.national_followers_count ?? 0) : 0;
  const followersValue = props.followersValue !== undefined ? props.followersValue : rawFollowersCount;
  const followersDisplay = props.followersDisplay || formatNumber(followersValue);

  return {
    shortName,
    fullName,
    logo,
    isVerified,
    verifications,
    coverPositionY,
    coverImage,
    chapterBadge,
    chapterMembers,
    totalMembers,
    followersValue,
    followersDisplay,
    isServerChapterMember,
    isServerFollowing,
  };
}

export function PartyHeaderLayout(props: PartyHeaderLayoutProps) {
  const {
    partyId,
    partyName,
    chapterId,
    children,
  } = props;

  // Query full party profile and chapter metadata from TanStack Query
  const resolvedPartyName = partyName || props.shortName || "";
  const { data: profileRes } = useQuery({
    ...partyProfileQueryOptions(partyId || "", resolvedPartyName, chapterId),
    enabled: Boolean(partyId && resolvedPartyName),
  });

  const {
    shortName,
    fullName,
    logo,
    isVerified,
    verifications,
    coverPositionY,
    coverImage,
    chapterBadge,
    chapterMembers,
    totalMembers,
    followersValue,
    followersDisplay,
    isServerChapterMember,
    isServerFollowing,
  } = resolvePartyHeaderData(props, profileRes);

  // Membership & Following state (auto-synced with TanStack query data)
  const [isChapterMember, setIsChapterMember] = useState(isServerChapterMember);
  const [isFollowing, setIsFollowing] = useState(isServerFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeavingParty, setIsLeavingParty] = useState(false);
  const queryClient = useQueryClient();

  // Logarithmic progress for followers ring gauge (0% at 0 followers, 100% at 100,000+ followers)
  const followersPercentage =
    followersValue <= 0
      ? 0
      : Math.min(100, (Math.log10(followersValue + 1) / Math.log10(100_000)) * 100);
  const followersStrokeOffset =
    followersValue <= 0
      ? 282.7
      : Math.max(0, 282.7 - (282.7 * followersPercentage) / 100);

  // Synchronize chapter membership state when query updates
  useEffect(() => {
    setIsChapterMember(isServerChapterMember);
  }, [isServerChapterMember]);

  // Synchronize following state when query updates
  useEffect(() => {
    setIsFollowing(isServerFollowing);
  }, [isServerFollowing]);

  // Leave the party
  const handleLeaveParty = async () => {
    if (!partyId || isLeavingParty) return;

    setIsLeavingParty(true);
    try {
      const res = await leaveParty({
        data: { partyId, chapterId },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to leave party");
      }

      toast.success(`You have left ${shortName}`);
      setIsChapterMember(false);
      setIsLeaveDialogOpen(false);

      // Invalidate relevant queries so the UI updates
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyProfile.root });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyCards });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyMembers.root });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to leave party. Please try again.";
      toast.error(message);
    } finally {
      setIsLeavingParty(false);
    }
  };

  // Open chapter enrollment modal or prompt confirmation to leave party
  const handleChapterMemberClick = () => {
    if (isChapterMember) {
      setIsLeaveDialogOpen(true);
      return;
    }

    setIsJoinDialogOpen(true);
  };

  // Handle follow/unfollow party
  const handleFollowClick = async () => {
    if (!props.partyId || isFollowLoading) return;

    const previousState = isFollowing;
    const nextState = !previousState;
    setIsFollowing(nextState);
    setIsFollowLoading(true);

    try {
      const fn = nextState ? followParty : unfollowParty;
      const res = await fn({
        data: { partyId: Number(partyId), chapterId: Number(chapterId) },
      });

      if (!res?.success) {
        throw new Error(res?.message || `Failed to ${nextState ? "follow" : "unfollow"} party`);
      }

      toast.success(nextState ? `You are now following ${shortName}` : `Unfollowed ${shortName}`);

      // Invalidate relevant queries so follower count and profile cache stay fresh
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyProfile.root });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyCards });
    } catch (err: unknown) {
      setIsFollowing(previousState);
      const message =
        err instanceof Error ? err.message : `Failed to ${nextState ? "follow" : "unfollow"} party`;
      toast.error(message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Handle direct message click
  const handleMessageClick = () => {
    toast.info("Direct messaging is not yet available for this party.");
  };

  return (
    <header className="w-full bg-background">
      {/* 1. HERO COVER SECTION */}
      <div className="w-full h-44 sm:h-56 md:h-64 lg:h-72 relative overflow-hidden bg-muted">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${shortName} Cover`}
            style={{ objectPosition: `center ${coverPositionY ?? 50}%` }}
            className="w-full h-full object-cover"
          />
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
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground/90 -translate-y-0.5">{fullName}</p>

                  {/* Chapter tier badge */}
                  {chapterBadge && (
                    <div className="pt-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-2 rounded-sm text-xs font-semibold shadow-xs dark:border dark:border-border",
                          chapterBadge.className
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full bg-black dark:bg-white")} />
                        <span>{chapterBadge.label}</span>
                      </span>
                    </div>
                  )}

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
                        ? "bg-lime-accent text-neutral-900 hover:bg-lime-accent-hover dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80"
                        : "bg-lime hover:bg-lime-accent text-neutral-900 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 active:scale-95"
                    )}
                  >
                    {isLeavingParty ? (
                      <> <Loader2 className="w-4 h-4 animate-spin" /> <span>Leaving...</span> </>
                    ) : isChapterMember ? (
                      <> <Check className="w-4 h-4 stroke-[2.5]" /> <span>Member</span> </>
                    ) : (
                      <> <Plus className="w-4 h-4 stroke-[2.5]" /> <span>Become a member</span> </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 rounded-full",
                      "text-xs xl:text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer",
                      "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-70 disabled:cursor-not-allowed"
                    )}
                  >
                    {isFollowLoading ? (
                      <> <Loader2 className="w-4 h-4 animate-spin" /> <span>Updating...</span> </>
                    ) : isFollowing ? (
                      <> <Check className="w-4 h-4" /> <span>Following</span> </>
                    ) : (
                      <> <Plus className="w-4 h-4" /> <span>Follow</span> </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleMessageClick}
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
                      strokeDashoffset={followersStrokeOffset}
                      strokeLinecap="round"
                      className="stroke-lime-500 transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="flex items-baseline">
                      <span className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-extralight tracking-tight text-foreground">
                        {followersDisplay.replace(/[^0-9.]/g, "") || "0"}
                      </span>
                      <span className="text-base font-medium text-foreground ml-0.5">
                        {followersDisplay.replace(/[0-9.]/g, "")}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground -mt-2.5">
                      National followers
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
                    national members
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

        {/* Modal for Chapter Enrollment */}
        {partyId && isJoinDialogOpen && (
          <JoinPartyDialog
            open={isJoinDialogOpen}
            onOpenChange={setIsJoinDialogOpen}
            partyId={Number(partyId)}
            partyName={shortName}
            partyLogo={logo || undefined}
            chapterId={chapterId}
            onJoinSuccess={(id) => {
              setIsChapterMember(true);
            }}
          />
        )}

        {/* Confirmation dialog before leaving party */}
        {isLeaveDialogOpen && (
          <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave {shortName.toUpperCase()}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave {fullName || shortName}? You will forfeit your membership status in this chapter and will need to wait 48 hours before you can join again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLeavingParty}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isLeavingParty}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLeaveParty();
                  }}
                >
                  {isLeavingParty ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      <span>Leaving...</span>
                    </>
                  ) : (
                    <span>Leave Party</span>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Optional Inner Navigation / Slot */}
        {children}
      </div>
    </header>
  );
}

import { useParams } from "@tanstack/react-router";
import { Activity, Check, FolderOpen, MessageCircleMore } from "lucide-react";
import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { ProfileFloatingToolbar } from "./ProfileFloatingToolbar";

/* ========================================================================== */
/*                             TYPES & INTERFACES                             */
/* ========================================================================== */

export type TimelineBranch = {
  id: string;
  title: string;
};

export type TimelineEvent = {
  id: string;
  year: string;
  title: string;
  branches?: TimelineBranch[];
};

export type UserProfileData = {
  username: string;
  name: string;
  avatar: string;
  party: {
    name: string;
    since: string;
    color: string;
    logo?: string;
  };
  role: {
    title: string;
    chapter: string;
  };
  followersCount: string;
  followingCount: string;
  timeline: TimelineEvent[];
};

export type ActiveProfileTab = "history" | "followers" | "following";

export const DEFAULT_USER_PROFILE: UserProfileData = {
  username: "",
  name: "",
  avatar: "",
  party: {
    name: "",
    since: "",
    color: "#6b7280",
    logo: "",
  },
  role: {
    title: "",
    chapter: "",
  },
  followersCount: "0",
  followingCount: "0",
  timeline: [],
};

/* ========================================================================== */
/*                           PARENT PAGE COMPONENT                            */
/* ========================================================================== */
export function ProfilePageComponent() {
  const profile = DEFAULT_USER_PROFILE;
  const [activeTab, setActiveTab] = useState<ActiveProfileTab>("history");

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-2 md:px-8 lg:px-8 py-8">
      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
        {/* Left Column: Profile Card & Floating Tools */}
        <div className="flex flex-col items-center">
          <ProfileCard profile={profile} />
          <ProfileFloatingToolbar />
        </div>

        {/* Right Column: Navigation Tabs & Tab Content */}
        <div className="flex flex-col gap-8 pt-2">
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <ProfileTabContent activeTab={activeTab} profile={profile} />
        </div>
      </div>
    </div>
  );
}

export { ProfileCard, ProfileFloatingToolbar, PartyHistoryTimeline, FollowersList, FollowingList };

function ProfileCard({ profile }: { profile: UserProfileData }) {
  return (
    <div className="relative w-full max-w-92.5 rounded-[18px] bg-sidebar-mobile/50 mt-25 pt-24 pb-8 px-6 transition-all">
      {/* Overlapping Avatar */}
      <ProfileAvatar src={profile.avatar} name={profile.name} />

      {/* Display Name & Username */}
      <div className="text-center mt-2">
        <h1 className="text-[23px] font-bold tracking-tight text-c-100">
          {profile.name}
        </h1>
        <p className="text-[13px] font-medium text-c-40 mt-0.5">
          @{profile.username}
        </p>
      </div>

      {/* Party & Role Stats Grid */}
      <ProfilePartyRoleGrid party={profile.party} role={profile.role} />

      {/* Action Buttons & Follower Metrics */}
      <ProfileActions followersCount={profile.followersCount} />
    </div>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function ProfileAvatar({ src, name }: { src: string; name: string }) {
  return (
    <div className="absolute -top-16 left-1/2 -translate-x-1/2">
      <div className="relative">
        <img
          src={src}
          alt={name}
          className="size-34 rounded-full object-cover ring-8 ring-background shadow-md"
        />
      </div>
    </div>
  );
}


type ProfilePartyRoleGridProps = {
  party: UserProfileData["party"];
  role: UserProfileData["role"];
};

function ProfilePartyRoleGrid({ party, role }: ProfilePartyRoleGridProps) {
  return (
    <div className="mt-3 grid grid-cols-[43%_57%] gap-4 items-center pt-6">
      {/* Party Column (38%) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0">
          <img
            src={party.logo}
            alt={party.name}
            className="size-8 rounded-full object-cover ring-1 ring-border shadow-2xs"
          />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-[12px] leading-tight text-c-100 truncate">
            {party.name}
          </p>
          <p className="text-[9px] font-bold text-c-40 truncate mt-1">
            {party.since}
          </p>
        </div>
      </div>

      {/* Role / Office Column (60%) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 text-c-80">
          <FolderOpen className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-[12px] leading-tight text-c-100 truncate">
            {role.title}
          </p>
          <p className="text-[9px] font-bold text-c-40 truncate mt-1">
            {role.chapter}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileActions({ followersCount }: { followersCount: string }) {
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="mt-8 flex items-start justify-center gap-3">
      {/* Follow Button & Followers Count Column */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsFollowing((prev) => !prev)}
          className={cn(
            "px-8 py-2.5 rounded-full text-[14px] font-semibold transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5",
            isFollowing
              ? "bg-hover-10 text-c-90"
              : "bg-c-100 text-background hover:opacity-90",
          )}
        >
          {isFollowing ? (
            <>
              <Check className="size-4 stroke-[2.5]" />
              <span>Following</span>
            </>
          ) : (
            <>
              <span>+ Follow</span>
            </>
          )}
        </button>

        {/* Followers count label */}
        <p className="mt-2 text-[11px] font-medium text-c-50 text-center">
          {followersCount}
        </p>
      </div>

      {/* Speech Bubble / Message Button */}
      <button
        type="button"
        title="Send message"
        className="size-8 text-background hover:opacity-90 transition active:scale-95 cursor-pointer"
      >
        <MessageCircleMore className="size-full" fill="black" color="#fff" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ========================================================================== */
/*                             4. NAVIGATION TABS                             */
/* ========================================================================== */
interface ProfileTabsProps {
  activeTab: ActiveProfileTab;
  onTabChange: (tab: ActiveProfileTab) => void;
}

function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex items-center">
      <div className="inline-flex items-center bg-hover-5 border border-border p-1.5 rounded-full shadow-2xs">
        {/* Tab: Party History */}
        <button
          type="button"
          onClick={() => onTabChange("history")}
          className={cn(
            "px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition cursor-pointer flex items-center gap-2",
            activeTab === "history"
              ? "bg-hover-10 text-c-100 shadow-2xs"
              : "text-c-70 hover:text-c-100",
          )}
        >
          <Activity className="size-4 stroke-[2.5]" />
          <span>Party history</span>
        </button>

        {/* Tab: Followers */}
        <button
          type="button"
          onClick={() => onTabChange("followers")}
          className={cn(
            "px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5",
            activeTab === "followers"
              ? "bg-hover-10 text-c-100 shadow-2xs"
              : "text-c-70 hover:text-c-100",
          )}
        >
          <span className="text-xs font-bold leading-none">«</span>
          <span>Followers</span>
        </button>

        {/* Tab: Following */}
        <button
          type="button"
          onClick={() => onTabChange("following")}
          className={cn(
            "px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5",
            activeTab === "following"
              ? "bg-hover-10 text-c-100 shadow-2xs"
              : "text-c-70 hover:text-c-100",
          )}
        >
          <span className="text-xs font-bold leading-none">»</span>
          <span>Following</span>
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*                             5. TAB CONTENT ROUTER                          */
/* ========================================================================== */
function ProfileTabContent({
  activeTab,
  profile,
}: {
  activeTab: ActiveProfileTab;
  profile: UserProfileData;
}) {
  switch (activeTab) {
    case "history":
      return <PartyHistoryTimeline events={profile.timeline} />;
    case "followers":
      return <FollowersList count={profile.followersCount} />;
    case "following":
      return <FollowingList count={profile.followingCount} />;
  }
}

/* ========================================================================== */
/*                       6. PARTY HISTORY TIMELINE TREE                       */
/* ========================================================================== */
interface PartyHistoryTimelineProps {
  events: TimelineEvent[];
}

function PartyHistoryTimeline({ events }: PartyHistoryTimelineProps) {
  return (
    <div className="relative pt-3 pl-2">
      {events.map((event, index) => (
        <TimelineNodeItem
          key={event.id}
          event={event}
          isLastEvent={index === events.length - 1}
        />
      ))}
    </div>
  );
}

function TimelineNodeItem({
  event,
  isLastEvent,
}: {
  event: TimelineEvent;
  isLastEvent: boolean;
}) {
  const hasBranches = Boolean(event.branches && event.branches.length > 0);

  return (
    <div className="relative">
      {/* Event Header: Primary Dot + Horizontal Segment + Event Title */}
      <div className="flex items-center">
        {/* Primary Circular Node */}
        <div className="relative z-10 size-3.5 rounded-full bg-[#97a9cf] dark:bg-chart-1 ring-4 ring-background shrink-0" />

        {/* Horizontal connector from Primary Dot to Text */}
        <div className="w-8 h-0.5 bg-[#97a9cf] dark:bg-chart-1 shrink-0" />

        {/* Event Label */}
        <h4 className="pl-3 font-bold text-[15px] tracking-tight text-c-100 whitespace-nowrap">
          {event.year} - {event.title}
        </h4>
      </div>

      {/* Vertical trunk connecting nodes and carrying branches */}
      <div className="relative ml-1.5">
        {(!isLastEvent || hasBranches) && (
          <div
            className={cn(
              "absolute left-0 top-0 w-0.5 bg-[#97a9cf] dark:bg-chart-1",
              isLastEvent ? "h-full" : "h-[calc(100%+16px)]",
            )}
          />
        )}

        {/* Sub-branch horizontal lines */}
        {hasBranches && (
          <div className="py-5 space-y-7 pl-0">
            {event.branches?.map((branch) => (
              <TimelineBranchItem key={branch.id} branch={branch} />
            ))}
          </div>
        )}

        {!hasBranches && !isLastEvent && <div className="h-14" />}
      </div>
    </div>
  );
}

function TimelineBranchItem({ branch }: { branch: TimelineBranch }) {
  return (
    <div className="relative flex items-center">
      {/* Horizontal branch line from vertical trunk */}
      <div className="w-20 md:w-28 h-[1.5px] bg-[#97a9cf] dark:bg-chart-1 shrink-0" />

      {/* Small Terminal Dot */}
      <div className="size-2 rounded-full bg-[#97a9cf] dark:bg-chart-1 shrink-0 -ml-1 z-10" />

      {/* Sub-branch Title */}
      <span className="pl-3 text-[13px] font-medium text-c-80">
        {branch.title}
      </span>
    </div>
  );
}

/* ========================================================================== */
/*                       7. FOLLOWERS & FOLLOWING LISTS                       */
/* ========================================================================== */
function FollowersList({ count }: { count: string }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="font-bold text-c-100">
            Followers ({count})
          </h3>
          <span className="text-xs text-c-40">Verified Nigerian Voters</span>
        </div>

        <div className="py-8 text-center text-sm text-c-50">
          No followers to display yet.
        </div>
      </div>
    </div>
  );
}

function FollowingList({ count }: { count: string }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="font-bold text-c-100">
            Following ({count})
          </h3>
          <span className="text-xs text-c-40">
            Candidates & Political Org Leaders
          </span>
        </div>

        <div className="py-8 text-center text-sm text-c-50">
          Not following anyone yet.
        </div>
      </div>
    </div>
  );
}

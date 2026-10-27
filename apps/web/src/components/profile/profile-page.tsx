import { useParams } from "@tanstack/react-router";
import { Activity, Check, FolderOpen, MessageCircleMore } from "lucide-react";
import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { ProfileFloatingToolbar } from "./ProfileFloatingToolbar";
import { PartyHistoryTimeline } from "./PartyHistoryTimeline";
import { FollowersList } from "./FollowersList";
import { FollowingList } from "./FollowingList";

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
  party?: {
    name: string;
    since?: string;
    color?: string;
    logo?: string;
  } | null;
  role?: {
    title: string;
    chapter: string;
  } | null;
  followersCount: string;
  followingCount: string;
  timeline: TimelineEvent[];
};

export type ActiveProfileTab = "history" | "followers" | "following";

export const DEFAULT_USER_PROFILE: UserProfileData = {
  username: "",
  name: "",
  avatar: "",
  party: undefined,
  role: undefined,
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

      {/* Party & Role Stats Grid - hidden if user does not belong to a party */}
      {profile.party && (
        <ProfilePartyRoleGrid party={profile.party} role={profile.role} />
      )}

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
  party?: UserProfileData["party"];
  role?: UserProfileData["role"];
};

function ProfilePartyRoleGrid({ party, role }: ProfilePartyRoleGridProps) {
  if (!party) return null;

  return (
    <div className="mt-3 grid grid-cols-[43%_57%] gap-4 items-center pt-6">
      {/* Party Column (43%) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0">
          {party.logo ? (
            <img
              src={party.logo}
              alt={party.name}
              className="size-8 rounded-full object-cover ring-1 ring-border shadow-2xs"
            />
          ) : (
            <div
              className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
              style={{ backgroundColor: party.color || "#0066da" }}
            >
              {party.name?.charAt(0) || "P"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-[12px] leading-tight text-c-100 truncate">
            {party.name}
          </p>
          {party.since && (
            <p className="text-[9px] font-bold text-c-40 truncate mt-1">
              {party.since}
            </p>
          )}
        </div>
      </div>

      {/* Role / Office Column (57%) */}
      {role ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 text-c-80">
            <FolderOpen className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[12px] leading-tight text-c-100 truncate">
              {role.title}
            </p>
            {role.chapter && (
              <p className="text-[9px] font-bold text-c-40 truncate mt-1">
                {role.chapter}
              </p>
            )}
          </div>
        </div>
      ) : null}
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

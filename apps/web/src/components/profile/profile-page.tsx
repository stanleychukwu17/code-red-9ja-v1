import { useParams } from "@tanstack/react-router";
import { Activity, Check, MoreHorizontal, Settings, PencilRuler, Network, MessageCircleMore } from "lucide-react";
import { useState } from "react";
import { FaFacebook, FaXTwitter, FaYoutube } from "react-icons/fa6";
import InstagramIcon from "@repo/ui/icons/instagram-icon";
import { cn } from "@repo/ui/lib/utils";

/* ========================================================================== */
/*                             TYPES & INTERFACES                             */
/* ========================================================================== */

export interface TimelineBranch {
  id: string;
  title: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  branches?: TimelineBranch[];
}

export interface UserProfileData {
  username: string;
  name: string;
  avatar: string;
  party: {
    name: string;
    since: string;
    color: string;
  };
  role: {
    title: string;
    chapter: string;
  };
  followersCount: string;
  followingCount: string;
  socials: {
    twitter?: string[];
    instagram?: string[];
  };
  timeline: TimelineEvent[];
}

export type ActiveProfileTab = "history" | "followers" | "following";

/* ========================================================================== */
/*                                 MOCK DATA                                  */
/* ========================================================================== */
const STANLEY_PROFILE: UserProfileData = {
  username: "chukwu_stanley",
  name: "Chukwu Stanley",
  avatar:
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
  party: {
    name: "APC",
    since: "since 2013",
    color: "#0066da",
  },
  role: {
    title: "National treasurer",
    chapter: "APC Lagos",
  },
  followersCount: "+3m followers",
  followingCount: "142 following",
  socials: {
    twitter: ["https://x.com", "https://x.com"],
    instagram: ["https://instagram.com", "https://instagram.com"],
  },
  timeline: [
    {
      id: "joined-apc",
      year: "2015",
      title: "Joined APC",
      branches: [
        { id: "b1", title: "Became state treasurer" },
        { id: "b2", title: "Became ward chairman" },
      ],
    },
    {
      id: "left-pdp",
      year: "2015",
      title: "Left PDP",
    },
  ],
};

const ATIKU_PROFILE: UserProfileData = {
  username: "atiku_abubakar",
  name: "Atiku Abubakar",
  avatar: "https://miro.medium.com/v2/0*AZFse8ApInmJg7xf.jpg",
  party: {
    name: "PDP",
    since: "since 1998",
    color: "#2f6f57",
  },
  role: {
    title: "Presidential Candidate",
    chapter: "PDP National",
  },
  followersCount: "+5.4m followers",
  followingCount: "89 following",
  socials: {
    twitter: ["https://x.com", "https://x.com"],
    instagram: ["https://instagram.com"],
  },
  timeline: [
    {
      id: "rejoined-pdp",
      year: "2018",
      title: "Rejoined PDP",
      branches: [
        { id: "atiku-1", title: "Presidential Flagbearer (2019, 2023)" },
        { id: "atiku-2", title: "Founded Atiku Care Foundation" },
      ],
    },
    {
      id: "apc-era",
      year: "2014",
      title: "Joined APC Coalition",
      branches: [{ id: "atiku-3", title: "Key merger stakeholder" }],
    },
    {
      id: "vp-era",
      year: "1999",
      title: "Vice President of Nigeria",
      branches: [{ id: "atiku-4", title: "Chairman, National Economic Council" }],
    },
  ],
};

const MOCK_FOLLOWERS = [
  {
    name: "Amina Bello",
    handle: "amina_bello_lagos",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
  },
  {
    name: "Emeka Okonkwo",
    handle: "emeka_eko_pu",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
  },
  {
    name: "Zainab Mohammed",
    handle: "zainab_vote9ja",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop",
  },
];

const MOCK_FOLLOWING = [
  {
    name: "Babajide Sanwo-Olu",
    handle: "jidesanwoolu",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop",
  },
  {
    name: "APC Lagos State Secretariat",
    handle: "apclagos_official",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop",
  },
];

export function resolveProfile(username?: string): UserProfileData {
  if (!username) return STANLEY_PROFILE;
  const normalized = username.toLowerCase();
  if (
    normalized === "atiku" ||
    normalized === "atiku_abubakar" ||
    normalized === "atiku-abubakar"
  ) {
    return ATIKU_PROFILE;
  }
  return STANLEY_PROFILE;
}

/* ========================================================================== */
/*                           PARENT PAGE COMPONENT                            */
/* ========================================================================== */
export function ProfilePageComponent() {
  const params = useParams({ strict: false }) as { username?: string };
  const profile = resolveProfile(params.username);
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

      {/* Social Shoulder Badges */}
      <ProfileSocialLinks />

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

function ProfileSocialLinks() {
  return (
    <>
      {/* Social Badges on Left Shoulder (X & YouTube) */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <a
          href="https://x.com"
          target="_blank"
          rel="noreferrer"
          className="size-7 rounded-full bg-black text-white flex items-center justify-center hover:opacity-100 transition-all shadow-xs cursor-pointer grayscale-[50%] hover:grayscale-0"
          title="X (Twitter)"
        >
          <FaXTwitter className="size-3.5" />
        </a>
        <a
          href="https://youtube.com"
          target="_blank"
          rel="noreferrer"
          className="size-7 rounded-full bg-[#FF0000] text-white flex items-center justify-center hover:opacity-100 transition-all shadow-xs cursor-pointer grayscale-[50%] hover:grayscale-0"
          title="YouTube"
        >
          <FaYoutube className="size-4" />
        </a>
      </div>

      {/* Social Badges on Right Shoulder (Instagram & Facebook) */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          className="size-7 hover:opacity-100 transition-all shadow-xs cursor-pointer block rounded-[8px] overflow-hidden grayscale-[50%] hover:grayscale-0"
          title="Instagram"
        >
          <InstagramIcon className="size-7" />
        </a>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noreferrer"
          className="size-7 hover:opacity-100 transition-all shadow-xs cursor-pointer flex items-center justify-center rounded-full text-[#1877F2] grayscale-[50%] hover:grayscale-0"
          title="Facebook"
        >
          <FaFacebook className="size-7" />
        </a>
      </div>
    </>
  );
}

function ProfilePartyRoleGrid({
  party,
  role,
}: {
  party: UserProfileData["party"];
  role: UserProfileData["role"];
}) {
  return (
    <div className="mt-3 grid grid-cols-[38%_62%] gap-4 items-center pt-6">
      {/* Party Column (38%) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0">
          <PartyLogoBadge party={party.name} />
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
          <Network className="size-6" />
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
/*                       3. FLOATING ACTION TOOLBAR                           */
/* ========================================================================== */
function ProfileFloatingToolbar() {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-5 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-sidebar-mobile/50 px-1 shadow-xs">
        <button
          type="button"
          title="Civic & Endorsement Actions"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          <PencilRuler className="size-5" />
        </button>

        <button
          type="button"
          title="Profile Settings"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          <Settings className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleShare}
          title="Share profile link"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer relative bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          {copied ? (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-c-100 text-background text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
              Copied!
            </span>
          ) : null}
          <MoreHorizontal className="size-5" />
        </button>
      </div>
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
        <div className="w-8 h-[2px] bg-[#97a9cf] dark:bg-chart-1 shrink-0" />

        {/* Event Label */}
        <h4 className="pl-3 font-bold text-[15px] tracking-tight text-c-100 whitespace-nowrap">
          {event.year} - {event.title}
        </h4>
      </div>

      {/* Vertical trunk connecting nodes and carrying branches */}
      <div className="relative ml-[6px]">
        {(!isLastEvent || hasBranches) && (
          <div
            className={cn(
              "absolute left-0 top-0 w-[2px] bg-[#97a9cf] dark:bg-chart-1",
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

        <div className="divide-y divide-border">
          {MOCK_FOLLOWERS.map((user) => (
            <div
              key={user.handle}
              className="flex items-center justify-between py-3.5"
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="size-10 rounded-full object-cover ring-1 ring-border"
                />
                <div>
                  <p className="text-sm font-semibold text-c-90 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-xs text-c-40">@{user.handle}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-border px-3.5 py-1 text-xs font-semibold text-c-80 hover:bg-hover-5 transition cursor-pointer"
              >
                Follow Back
              </button>
            </div>
          ))}
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

        <div className="divide-y divide-border">
          {MOCK_FOLLOWING.map((user) => (
            <div
              key={user.handle}
              className="flex items-center justify-between py-3.5"
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="size-10 rounded-full object-cover ring-1 ring-border"
                />
                <div>
                  <p className="text-sm font-semibold text-c-90 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-xs text-c-40">@{user.handle}</p>
                </div>
              </div>
              <span className="rounded-full bg-hover-7 text-c-60 px-3 py-1 text-xs font-medium">
                Following
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*                             8. CUSTOM SVG ICONS                            */
/* ========================================================================== */

function PartyLogoBadge({ party }: { party: string }) {
  if (party === "APC") {
    return (
      <svg
        viewBox="0 0 36 32"
        fill="none"
        className="size-8 drop-shadow-2xs"
        aria-hidden="true"
      >
        <path d="M12.5 3.5L2 21.5L6.5 29.5L17 11.5L12.5 3.5Z" fill="#1d63ed" />
        <path d="M23.5 3.5L34 21.5L29.5 29.5L19 11.5L23.5 3.5Z" fill="#f59e0b" />
        <path d="M6.5 29.5L29.5 29.5L25 21.5L11 21.5L6.5 29.5Z" fill="#16a34a" />
      </svg>
    );
  }

  return (
    <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
      PDP
    </div>
  );
}

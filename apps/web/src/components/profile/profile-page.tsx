import { useParams } from "@tanstack/react-router";
import {
  Activity,
  Check,
  MoreHorizontal,
  Settings,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { FaFacebook, FaXTwitter, FaYoutube } from "react-icons/fa6";
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
          <OrgHierarchyIcon className="size-6" />
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
        className="size-10 rounded-full bg-c-100 text-background flex items-center justify-center hover:opacity-90 transition active:scale-95 shadow-xs cursor-pointer"
      >
        <SpeechBubbleDotsIcon className="size-4.5" />
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
      <div className="inline-flex items-center gap-5 rounded-full bg-hover-5 border border-border px-5 py-2.5 shadow-xs">
        <button
          type="button"
          title="Civic & Endorsement Actions"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer"
        >
          <Wand2 className="size-4.5" />
        </button>

        <button
          type="button"
          title="Profile Settings"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer"
        >
          <Settings className="size-4.5" />
        </button>

        <button
          type="button"
          onClick={handleShare}
          title="Share profile link"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer relative"
        >
          {copied ? (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-c-100 text-background text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
              Copied!
            </span>
          ) : null}
          <MoreHorizontal className="size-4.5" />
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

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 71 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M55.1594 0H65.8536L42.4953 26.8761L70.075 63.3208H48.4052L31.5197 41.2288L12.1013 63.3208H1.40713L26.454 34.6153L0 0H22.2326L37.5703 20.2626L55.1594 0ZM51.3602 56.848H57.2701L18.9962 6.05065H12.5234L51.3602 56.848Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 71 71"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M35.0489 0C20.4211 0 16.143 0.0150962 15.3114 0.0840898C12.3096 0.333685 10.4416 0.806469 8.40657 1.81992C6.83828 2.59892 5.6014 3.50188 4.38071 4.76765C2.15761 7.07601 0.810263 9.91589 0.322515 13.2916C0.0853942 14.9305 0.0164001 15.2647 0.00238954 23.6356C-0.00298692 26.4259 0.00238954 30.0981 0.00238954 35.0237C0.00238954 49.6437 0.0185453 53.9186 0.0886247 54.7488C0.331148 57.6707 0.789233 59.5089 1.75933 61.5197C3.61328 65.3688 7.15406 68.2583 11.3255 69.3364C12.7698 69.7084 14.3651 69.9133 16.413 70.0103C17.2807 70.048 26.1247 70.075 34.974 70.075C43.8234 70.075 52.6727 70.0642 53.5188 70.0211C55.8902 69.9095 57.2671 69.7246 58.7896 69.331C62.988 68.2475 66.4641 65.4011 68.3558 61.4981C69.307 59.5359 69.7893 57.6275 70.0076 54.8582C70.055 54.2545 70.075 44.628 70.075 35.0146C70.075 25.3995 70.0534 15.7908 70.006 15.187C69.785 12.373 69.3027 10.4809 68.3207 8.48085C67.515 6.84365 66.6204 5.621 65.3216 4.3709C63.0036 2.15633 60.1688 0.808615 56.7907 0.32129C55.154 0.0846198 54.8279 0.0145403 46.4528 0H35.0489Z"
        fill="url(#paint0_radial_2204_3)"
      />
      <path
        d="M35.0489 0C20.4211 0 16.143 0.0150962 15.3114 0.0840898C12.3096 0.333685 10.4416 0.806469 8.40657 1.81992C6.83828 2.59892 5.6014 3.50188 4.38071 4.76765C2.15761 7.07601 0.810263 9.91589 0.322515 13.2916C0.0853942 14.9305 0.0164001 15.2647 0.00238954 23.6356C-0.00298692 26.4259 0.00238954 30.0981 0.00238954 35.0237C0.00238954 49.6437 0.0185453 53.9186 0.0886247 54.7488C0.331148 57.6707 0.789233 59.5089 1.75933 61.5197C3.61328 65.3688 7.15406 68.2583 11.3255 69.3364C12.7698 69.7084 14.3651 69.9133 16.413 70.0103C17.2807 70.048 26.1247 70.075 34.974 70.075C43.8234 70.075 52.6727 70.0642 53.5188 70.0211C55.8902 69.9095 57.2671 69.7246 58.7896 69.331C62.988 68.2475 66.4641 65.4011 68.3558 61.4981C69.307 59.5359 69.7893 57.6275 70.0076 54.8582C70.055 54.2545 70.075 44.628 70.075 35.0146C70.075 25.3995 70.0534 15.7908 70.006 15.187C69.785 12.373 69.3027 10.4809 68.3207 8.48085C67.515 6.84365 66.6204 5.621 65.3216 4.3709C63.0036 2.15633 60.1688 0.808615 56.7907 0.32129C55.154 0.0846198 54.8279 0.0145403 46.4528 0H35.0489Z"
        fill="url(#paint1_radial_2204_3)"
      />
      <path
        d="M35.0489 0C20.4211 0 16.143 0.0150962 15.3114 0.0840898C12.3096 0.333685 10.4416 0.806469 8.40657 1.81992C6.83828 2.59892 5.6014 3.50188 4.38071 4.76765C2.15761 7.07601 0.810263 9.91589 0.322515 13.2916C0.0853942 14.9305 0.0164001 15.2647 0.00238954 23.6356C-0.00298692 26.4259 0.00238954 30.0981 0.00238954 35.0237C0.00238954 49.6437 0.0185453 53.9186 0.0886247 54.7488C0.331148 57.6707 0.789233 59.5089 1.75933 61.5197C3.61328 65.3688 7.15406 68.2583 11.3255 69.3364C12.7698 69.7084 14.3651 69.9133 16.413 70.0103C17.2807 70.048 26.1247 70.075 34.974 70.075C43.8234 70.075 52.6727 70.0642 53.5188 70.0211C55.8902 69.9095 57.2671 69.7246 58.7896 69.331C62.988 68.2475 66.4641 65.4011 68.3558 61.4981C69.307 59.5359 69.7893 57.6275 70.0076 54.8582C70.055 54.2545 70.075 44.628 70.075 35.0146C70.075 25.3995 70.0534 15.7908 70.006 15.187C69.785 12.373 69.3027 10.4809 68.3207 8.48085C67.515 6.84365 66.6204 5.621 65.3216 4.3709C63.0036 2.15633 60.1688 0.808615 56.7907 0.32129C55.154 0.0846198 54.8279 0.0145403 46.4528 0H35.0489Z"
        fill="url(#paint2_radial_2204_3)"
      />
      <path
        d="M35.0489 0C20.4211 0 16.143 0.0150962 15.3114 0.0840898C12.3096 0.333685 10.4416 0.806469 8.40657 1.81992C6.83828 2.59892 5.6014 3.50188 4.38071 4.76765C2.15761 7.07601 0.810263 9.91589 0.322515 13.2916C0.0853942 14.9305 0.0164001 15.2647 0.00238954 23.6356C-0.00298692 26.4259 0.00238954 30.0981 0.00238954 35.0237C0.00238954 49.6437 0.0185453 53.9186 0.0886247 54.7488C0.331148 57.6707 0.789233 59.5089 1.75933 61.5197C3.61328 65.3688 7.15406 68.2583 11.3255 69.3364C12.7698 69.7084 14.3651 69.9133 16.413 70.0103C17.2807 70.048 26.1247 70.075 34.974 70.075C43.8234 70.075 52.6727 70.0642 53.5188 70.0211C55.8902 69.9095 57.2671 69.7246 58.7896 69.331C62.988 68.2475 66.4641 65.4011 68.3558 61.4981C69.307 59.5359 69.7893 57.6275 70.0076 54.8582C70.055 54.2545 70.075 44.628 70.075 35.0146C70.075 25.3995 70.0534 15.7908 70.006 15.187C69.785 12.373 69.3027 10.4809 68.3207 8.48085C67.515 6.84365 66.6204 5.621 65.3216 4.3709C63.0036 2.15633 60.1688 0.808615 56.7907 0.32129C55.154 0.0846198 54.8279 0.0145403 46.4528 0H35.0489Z"
        fill="url(#paint3_radial_2204_3)"
      />
      <path
        d="M35.0517 8.9978C27.9758 8.9978 27.0877 9.02871 24.3086 9.1551C21.5349 9.28201 19.6416 9.72082 17.985 10.3647C16.2713 11.0296 14.8177 11.9192 13.3695 13.3668C11.9203 14.8139 11.0301 16.2665 10.3624 17.9783C9.71649 19.6342 9.27681 21.5266 9.15199 24.2972C9.02769 27.0743 8.99512 27.9622 8.99512 35.0329C8.99512 42.1036 9.02661 42.9882 9.15252 45.7653C9.2801 48.5369 9.71922 50.4288 10.363 52.0842C11.029 53.7966 11.9192 55.2491 13.3679 56.6962C14.8156 58.1444 16.2692 59.0361 17.9817 59.7011C19.6394 60.3449 21.5333 60.7837 24.3064 60.9106C27.0856 61.037 27.973 61.0679 35.0484 61.0679C42.1249 61.0679 43.0102 61.037 45.7893 60.9106C48.5631 60.7837 50.4585 60.3449 52.1162 59.701C53.8293 59.0361 55.2808 58.1444 56.7284 56.6962C58.1777 55.2491 59.0679 53.7966 59.7355 52.0847C60.376 50.4288 60.8157 48.5364 60.946 45.7658C61.0708 42.9887 61.1034 42.1035 61.1034 35.0329C61.1034 27.9621 61.0708 27.0748 60.946 24.2977C60.8157 21.5261 60.376 19.6342 59.7355 17.9788C59.0679 16.2665 58.1777 14.8139 56.7284 13.3668C55.2791 11.9186 53.8298 11.0291 52.1146 10.3646C50.4536 9.72082 48.5593 9.28201 45.7856 9.1551C43.0064 9.02871 42.1216 8.9978 35.0435 8.9978H35.0517ZM32.7144 13.6895C33.4081 13.6885 34.1821 13.6895 35.0517 13.6895C42.0082 13.6895 42.8327 13.7145 45.5798 13.8392C48.1201 13.9553 49.4988 14.3795 50.4173 14.7358C51.6331 15.2077 52.5 15.7718 53.4113 16.683C54.3233 17.5943 54.8878 18.4621 55.3611 19.677C55.7177 20.5937 56.1427 21.9714 56.2583 24.5098C56.3832 27.2543 56.4103 28.0788 56.4103 35.0269C56.4103 41.975 56.3832 42.7995 56.2583 45.544C56.1422 48.0824 55.7177 49.4601 55.3611 50.3767C54.8889 51.5917 54.3233 52.4568 53.4113 53.3675C52.4995 54.2787 51.6337 54.8428 50.4173 55.3147C49.4999 55.6727 48.1201 56.0957 45.5798 56.2118C42.8333 56.3366 42.0082 56.3637 35.0517 56.3637C28.0946 56.3637 27.2701 56.3366 24.5235 56.2118C21.9832 56.0947 20.6045 55.6705 19.6856 55.3142C18.4697 54.8423 17.6012 54.2782 16.6893 53.367C15.7774 52.4557 15.2129 51.5901 14.7396 50.3746C14.3829 49.4579 13.9579 48.0802 13.8423 45.5418C13.7175 42.7973 13.6925 41.9728 13.6925 35.0204C13.6925 28.068 13.7175 27.2478 13.8423 24.5033C13.9585 21.9649 14.3829 20.5872 14.7396 19.6695C15.2118 18.4545 15.7774 17.5867 16.6893 16.6754C17.6012 15.7642 18.4697 15.2001 19.6856 14.7272C20.604 14.3692 21.9832 13.9461 24.5235 13.8295C26.927 13.721 27.8585 13.6885 32.7144 13.683L32.7144 13.6895ZM48.9593 18.0124C47.2332 18.0124 45.8328 19.4102 45.8328 21.1355C45.8328 22.8604 47.2332 24.2598 48.9593 24.2598C50.6854 24.2598 52.0858 22.8604 52.0858 21.1355C52.0858 19.4107 50.6854 18.0114 48.9593 18.0114L48.9593 18.0124ZM35.0517 21.6628C27.6625 21.6628 21.6717 27.6492 21.6717 35.0329C21.6717 42.4165 27.6625 48.4002 35.0517 48.4002C42.4408 48.4002 48.4295 42.4165 48.4295 35.0329C48.4295 27.6492 42.4403 21.6628 35.0511 21.6628H35.0517ZM35.0517 26.3545C39.8479 26.3545 43.7365 30.2397 43.7365 35.0329C43.7365 39.8255 39.8479 43.7112 35.0517 43.7112C30.255 43.7112 26.3669 39.8255 26.3669 35.0329C26.3669 30.2397 30.255 26.3545 35.0517 26.3545Z"
        fill="white"
      />
      <defs>
        <radialGradient
          id="paint0_radial_2204_3"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-43.093 12.1532 -8.75594 -31.0464 67.8123 32.845)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF005F" />
          <stop offset="1" stopColor="#FC01D8" />
        </radialGradient>
        <radialGradient
          id="paint1_radial_2204_3"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(18.6131 75.4722) rotate(-90) scale(55.9352 59.346)"
        >
          <stop stopColor="#FFCC00" />
          <stop offset="0.1242" stopColor="#FFCC00" />
          <stop offset="0.5672" stopColor="#FE4A05" />
          <stop offset="0.6942" stopColor="#FF0F3F" />
          <stop offset="1" stopColor="#FE0657" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="paint2_radial_2204_3"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(11.6102 -20.0047 26.0438 15.1152 36.8082 69.0867)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFCC00" />
          <stop offset="1" stopColor="#FFCC00" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="paint3_radial_2204_3"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-42.6199 12.001 -4.0877 -14.5209 9.50767 2.85343)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#780CFF" />
          <stop offset="1" stopColor="#820BFF" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function OrgHierarchyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4" />
      <path d="M6 12h12" />
      <path d="M6 12v4" />
      <path d="M18 12v4" />
    </svg>
  );
}

function SpeechBubbleDotsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8.5 11.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );
}

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

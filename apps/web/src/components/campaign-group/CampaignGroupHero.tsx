import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { AppAvatar } from "@repo/ui/components/avatar";
import type { Party } from "#/hooks";
import { getPartyHome } from "@/lib/server/parties";
import type { CampaignGroupDetails } from "@/lib/server/campaign_groups";

export type CampaignGroupHeroProps = {
  activeParty?: Party | null;
  group?: CampaignGroupDetails;
  groupTitle?: string;
  partyShortName?: string;
  totalMembers?: number;
  roleCounts?: {
    candidate: number;
    party_official: number;
    supervisor: number;
    agent?: number;
    all?: number;
    polling_agent?: number;
    ward_supervisor?: number;
    lga_supervisor?: number;
    state_supervisor?: number;
  };
  isSyncing?: boolean;
  onSync?: () => void;
  onShare?: () => void;
};

type LeaderItem = {
  id?: string | number;
  name: string;
  role?: string;
  avatar?: string | null;
};

function formatStat(val?: number): string {
  const num = typeof val === "number" && !isNaN(val) ? val : 0;
  return num.toLocaleString();
}

// 2x2 operative role breakdown stats grid
function RoleStatsGrid({ roleCounts }: { roleCounts?: CampaignGroupHeroProps["roleCounts"] }) {
  return (
    <div className="mt-4 max-w-sm">
      <div className="grid grid-cols-2">
        {/* Top Left: Polling Unit Agent */}
        <div className="pb-5 pr-5 border-r-6 border-border/40">
          <p className="text-2xl sm:text-xl font-extrabold text-foreground tracking-tight">
            {formatStat(roleCounts?.polling_agent ?? roleCounts?.agent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            polling unit agent
          </p>
        </div>

        {/* Top Right: Ward Supervisors */}
        <div className="pb-5 pl-5">
          <p className="text-2xl sm:text-xl font-extrabold text-foreground tracking-tight">
            {formatStat(roleCounts?.ward_supervisor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            ward supervisors
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 mt-4 pt-4 border-t-6 border-border/40">
        {/* Bottom Left: LGA Supervisor */}
        <div className="pt-5 pr-5 border-r-6 border-border/40">
          <p className="text-2xl sm:text-xl font-extrabold text-foreground tracking-tight">
            {formatStat(roleCounts?.lga_supervisor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            Lga supervisor
          </p>
        </div>

        {/* Bottom Right: State Supervisors */}
        <div className="pt-5 pl-5">
          <p className="text-2xl sm:text-xl font-extrabold text-foreground tracking-tight">
            {formatStat(roleCounts?.state_supervisor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            state supervisors
          </p>
        </div>
      </div>
    </div>
  );
}


export function CampaignGroupHero({
  activeParty,
  group,
  groupTitle,
  partyShortName: partyShortNameProp,
  roleCounts,
}: CampaignGroupHeroProps) {
  const partyId = activeParty?.id || group?.party_id;
  const partyShortName = activeParty?.short_name || partyShortNameProp || "Party";

  // Query live party leaders (national and state) if party ID is available
  const { data: homeRes } = useQuery({
    queryKey: ["partyHome", partyId],
    queryFn: () => getPartyHome({ data: { partyId: partyId! } }),
    staleTime: Infinity,
    enabled: Boolean(partyId),
  });

  const nationalLeaders: LeaderItem[] =
    homeRes?.data?.national_leaders && homeRes.data.national_leaders.length > 0
      ? homeRes.data.national_leaders.slice(0, 5).map((l) => ({
        id: l.id,
        name: (l.name ? l.name.split(" ")[0] : "") || "Leader",
        avatar: l.avatar,
      }))
      : [];

  const stateLeaders: LeaderItem[] =
    homeRes?.data?.dynamic_leaders?.leaders && homeRes.data.dynamic_leaders.leaders.length > 0
      ? homeRes.data.dynamic_leaders.leaders.slice(0, 5).map((l) => ({
        id: l.id,
        name: (l.role || l.name || "").split(" ")[0] || "Leader",
        avatar: l.avatar,
      }))
      : [];

  const displayTitle = groupTitle || "Campaign Group";
  const leadershipHref = partyId ? `/party/${partyShortName.toLowerCase()}/${partyId}/leadership` : "#";

  return (
    <div className="w-full">
      <div
        className={cn(
          "grid grid-cols-1 items-center",
          "md:grid-cols-12 md:bg-1red",
          "lg:grid-cols-12 lg:bg-1blue-600",
          "gap-y-8 gap-x-14 lg:gap-8",
        )}
      >
        {/* LEFT COLUMN: Title & 2x2 Stats Grid (col-span-5) */}
        <div className="md:col-span-6 lg:col-span-3 flex flex-col justify-center">
          <div className="mb-2">
            <HeaderAccent
              as="h2"
              title={displayTitle}
              titleClassName="text-xl sm:text-xl font-bold tracking-tight text-foreground"
              accentClassName="top-3 sm:top-5 h-4 w-4/5"
            />
          </div>

          <RoleStatsGrid roleCounts={roleCounts} />
        </div>

        {/* CENTER COLUMN: Party Emblem & Caption (col-span-3) */}
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center py-4",
            "hidden",
            "lg:flex lg:col-span-5",
          )}
        >
          <div className="relative flex items-center justify-center">
            <img
              src={activeParty?.logo}
              alt={partyShortName}
              className="size-24 lg:size-35 rounded-full object-contain drop-shadow-sm"
            />
          </div>
          <p className="mt-5 text-base sm:text-xl font-bold text-slate-600 dark:text-slate-300 tracking-tight">
            Group for {partyShortName.toUpperCase()}
          </p>
        </div>

        {/* RIGHT COLUMN: Leaders (National & State) (col-span-4) */}
        <div className="md:col-span-6 lg:col-span-4 space-y-6">
          <div className="mb-1">
            <HeaderAccent
              as="h2"
              title="Leaders"
              titleClassName="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
              accentClassName="top-3 sm:top-5 h-4 w-4/5"
            />
          </div>

          {/* National Leaders Subsection */}
          <LeaderSection
            title="National leaders"
            leaders={nationalLeaders}
            emptyMessage="No national leaders assigned yet."
            leadershipHref={leadershipHref}
            ariaLabel="View all national leaders"
          />

          {/* State Leaders Subsection */}
          <LeaderSection
            title="State leaders"
            leaders={stateLeaders}
            emptyMessage="No state leaders assigned yet."
            leadershipHref={leadershipHref}
            ariaLabel="View all state leaders"
          />
        </div>
      </div>
    </div>
  );
}

// Mini avatar item for a party leader
function LeaderAvatarItem({ leader }: { leader: LeaderItem }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 w-11 text-center">
      <AppAvatar
        src={leader.avatar || undefined}
        alt={leader.name}
        className="size-10 sm:size-11 ring-2 ring-background shrink-0"
      />
      <span className="text-[11px] font-medium text-foreground truncate max-w-full">
        {leader.name}
      </span>
    </div>
  );
}

type LeaderSectionProps = {
  title: string;
  leaders: LeaderItem[];
  emptyMessage: string;
  leadershipHref: string;
  ariaLabel: string;
};

// Reusable subsection for displaying leadership tier (national, state)
function LeaderSection({ title, leaders, emptyMessage, leadershipHref, ariaLabel }: LeaderSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs sm:text-sm font-bold text-foreground">{title}</h4>
      {leaders.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
            {leaders.map((leader, i) => (
              <LeaderAvatarItem key={leader.id || i} leader={leader} />
            ))}
          </div>

          <Link
            to={leadershipHref as any}
            className="size-7 rounded-full border border-border/80 flex items-center justify-center text-foreground hover:bg-muted transition shrink-0 ml-auto"
            aria-label={ariaLabel}
          >
            <ArrowRight className="size-3.5 stroke-[2.5]" />
          </Link>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">{emptyMessage}</p>
      )}

      {/* Accent underline mark */}
      <div className="relative h-0.5 w-full bg-border/40 mt-1">
        <div className="absolute left-0 top-0 h-full w-28 bg-linear-to-r from-lime-400 to-transparent" />
      </div>
    </div>
  );
}
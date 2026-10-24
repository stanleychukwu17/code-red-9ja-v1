import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { Search, MapPin, Calendar, Loader2, Users } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { VacantPositionAvatar } from "@repo/ui/components/vacant-avatar";
import {
  getPartyOfficials,
  getPartyPositions,
  type PartyOfficialItem,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { partyProfileQueryOptions } from "../$partyName.$partyId";
import { APP_URL, QUERY_KEYS } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId/leadership")({
  component: PartyLeadershipTabComponent,
});

// Appointment badge styling consistent with partyadmin roster
const APPOINTMENT_BADGE_STYLES: Record<string, string> = {
  acting: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300 dark:border dark:border-blue-500/30",
  substantive: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30",
  caretaker: "bg-amber-600 text-white dark:bg-amber-500/20 dark:text-amber-300 dark:border dark:border-amber-500/30",
  interim: "bg-purple-600 text-white dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-500/30",
};

type OccupiedPositionCardProps = {
  official: PartyOfficialItem;
  positionTitle: string;
};

/**
 * Occupied Position Card
 */
function OccupiedPositionCard({ official, positionTitle }: OccupiedPositionCardProps) {
  const fullName = [official.first_name, official.last_name].filter(Boolean).join(" ");
  const profileUrl = official.username ? APP_URL.profile(official.username) : "#";

  const badgeStyle =
    APPOINTMENT_BADGE_STYLES[official.appointment_type?.toLowerCase()] ||
    "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300";

  const tenureDate = official.tenure_start
    ? new Date(official.tenure_start).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    })
    : null;

  const chapterDisplay =
    official.chapter_type === "national"
      ? "National Chapter"
      : official.geo_name
        ? `${official.geo_name} (${official.chapter_type})`
        : `${official.chapter_type} Chapter`;

  return (
    <div className="flex flex-col items-center justify-start text-center w-full max-w-65">
      {/* Official Circular Avatar */}
      <Link
        to={profileUrl}
        className="size-36 rounded-full shrink-0 overflow-hidden border border-border/60 shadow-xs bg-sidebar-mobile dark:bg-card flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all duration-200"
      >
        {official.avatar ? (
          <img
            src={official.avatar}
            alt={fullName}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted text-muted-foreground font-bold text-2xl uppercase">
            {fullName.slice(0, 2)}
          </div>
        )}
      </Link>

      {/* Position title */}
      <h4 className="mt-4 text-[16px] font-medium text-muted-foreground tracking-tight capitalize leading-tight">
        {positionTitle}
      </h4>

      {/* Official Name + Appointment Badge */}
      <div className="mt-1 flex items-center justify-center gap-2 flex-wrap">
        <Link
          to={profileUrl}
          className="text-[18px] font-bold text-foreground capitalize hover:text-primary transition-colors"
        >
          {fullName}
        </Link>
        {official.appointment_type && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize leading-tight ${badgeStyle}`}
          >
            {official.appointment_type}
          </span>
        )}
      </div>

      {/* Chapter Jurisdiction & Tenure */}
      <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-normal">
          <MapPin className="size-3.5 shrink-0" />
          <span className="capitalize">{chapterDisplay}</span>
        </span>
        {tenureDate && (
          <>
            <span className="opacity-40">|</span>
            <span className="inline-flex items-center gap-1 font-normal">
              <Calendar className="size-3.5 shrink-0" />
              <span>{tenureDate}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

type VacantPositionCardProps = {
  position: PartyPositionItem;
};

/**
 * Vacant Position Card
 */
function VacantPositionCard({ position }: VacantPositionCardProps) {
  return (
    <div className="flex flex-col items-center justify-start text-center w-full max-w-60">
      {/* Vacant circular gradient avatar */}
      <VacantPositionAvatar />

      {/* Position title */}
      <h3 className="mt-4 text-[17px] font-semibold text-foreground tracking-tight capitalize leading-tight">
        {position.name}
      </h3>

      {/* Vacant text */}
      <p className="mt-1 text-[14px] font-semibold text-destructive">
        Vacant
      </p>
    </div>
  );
}

function PartyLeadershipTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const search = Route.useSearch() as { chapterId?: number };
  const chapterId = search?.chapterId;

  // Retrieve current active chapter metadata from parent profile query cache
  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName, chapterId),
  );

  const activeChapterType = profileRes?.success ? profileRes.data.chapter_type || "national" : "national";
  const activeChapterGeoName = profileRes?.success ? profileRes.data.chapter_geo_name : undefined;

  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);
  const [showVacant, setShowVacant] = React.useState(true);
  const [appointmentTypeFilter, setAppointmentTypeFilter] = React.useState("all");

  // 1. Fetch positions catalog
  const { data: positionsRes, isLoading: isPositionsLoading } = useQuery({
    queryKey: QUERY_KEYS.partyPositions.byParty(partyId),
    queryFn: () => getPartyPositions({ data: { partyId: Number(partyId) } }),
    staleTime: Infinity,
  });

  const positions: PartyPositionItem[] = React.useMemo(() => {
    if (!positionsRes?.success || !positionsRes.data) return [];
    return positionsRes.data.positions || [
      ...(positionsRes.data.default || []),
      ...(positionsRes.data.custom || []),
    ];
  }, [positionsRes]);

  // 2. Fetch appointed officials for the current chapter
  const { data: officialsRes, isLoading: isOfficialsLoading } = useQuery({
    queryKey: QUERY_KEYS.partyOfficials.byChapter(partyId, chapterId),
    queryFn: () =>
      getPartyOfficials({
        data: {
          partyId: Number(partyId),
          chapterId: chapterId,
        },
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const rawOfficials: PartyOfficialItem[] = React.useMemo(() => {
    return officialsRes?.success && officialsRes.data?.officials ? officialsRes.data.officials : [];
  }, [officialsRes]);

  // Sort officials (active status first, followed by tenure recency)
  const sortedOfficials = React.useMemo(() => {
    return [...rawOfficials].sort((a, b) => {
      const aIsActive = (a.assignment_status || "active") === "active";
      const bIsActive = (b.assignment_status || "active") === "active";
      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      }
      const timeA = a.tenure_start ? new Date(a.tenure_start).getTime() : 0;
      const timeB = b.tenure_start ? new Date(b.tenure_start).getTime() : 0;
      return timeB - timeA;
    });
  }, [rawOfficials]);

  // Group officials by position_id
  const officialsByPosition = React.useMemo(() => {
    const map = new Map<number, PartyOfficialItem[]>();
    for (const off of sortedOfficials) {
      if ((off.assignment_status || "active") !== "active") continue;
      const list = map.get(off.position_id) || [];
      list.push(off);
      map.set(off.position_id, list);
    }
    return map;
  }, [sortedOfficials]);

  // Build roster display items (merging position catalog with appointed occupants)
  const displayItems = React.useMemo(() => {
    const sorted = [...positions].sort((a, b) => {
      if (a.rank_order !== b.rank_order) return a.rank_order - b.rank_order;
      return a.id - b.id;
    });

    // Filter positions allowed for the active chapter tier
    const chapterPositions = sorted.filter((p) =>
      p.allowed_levels.some(
        (lvl) => lvl.toLowerCase() === activeChapterType.toLowerCase(),
      ),
    );

    const searchLower = debouncedSearchQuery.toLowerCase().trim();

    const results: Array<
      | {
        type: "occupied";
        official: PartyOfficialItem;
        positionTitle: string;
        position: PartyPositionItem;
        key: string;
      }
      | { type: "vacant"; position: PartyPositionItem; key: string }
    > = [];

    for (const pos of chapterPositions) {
      let assigned = officialsByPosition.get(pos.id) || [];

      if (appointmentTypeFilter !== "all") {
        assigned = assigned.filter(
          (o) => o.appointment_type?.toLowerCase() === appointmentTypeFilter.toLowerCase(),
        );
      }

      if (searchLower) {
        const posMatches = pos.name.toLowerCase().includes(searchLower);
        const matchingOfficials = assigned.filter(
          (o) =>
            posMatches ||
            o.position_name?.toLowerCase().includes(searchLower) ||
            `${o.first_name} ${o.last_name}`.toLowerCase().includes(searchLower) ||
            (o.username && o.username.toLowerCase().includes(searchLower)),
        );

        if (matchingOfficials.length > 0) {
          for (const off of matchingOfficials) {
            results.push({
              type: "occupied",
              official: off,
              positionTitle: off.position_name || pos.name,
              position: pos,
              key: `occupied-${off.assignment_id}`,
            });
          }
        } else if (posMatches && showVacant && appointmentTypeFilter === "all") {
          results.push({
            type: "vacant",
            position: pos,
            key: `vacant-${pos.id}`,
          });
        }
        continue;
      }

      if (assigned.length > 0) {
        for (const off of assigned) {
          results.push({
            type: "occupied",
            official: off,
            positionTitle: off.position_name || pos.name,
            position: pos,
            key: `occupied-${off.assignment_id}`,
          });
        }
      } else if (showVacant && appointmentTypeFilter === "all") {
        results.push({
          type: "vacant",
          position: pos,
          key: `vacant-${pos.id}`,
        });
      }
    }

    return results;
  }, [
    positions,
    activeChapterType,
    officialsByPosition,
    appointmentTypeFilter,
    debouncedSearchQuery,
    showVacant,
  ]);

  const chapterHeading =
    activeChapterType === "national"
      ? "National Executive Leadership"
      : `${activeChapterGeoName ? `${activeChapterGeoName} ` : ""}${activeChapterType.toUpperCase()} Leadership`;

  const totalOccupied = React.useMemo(() => {
    return displayItems.filter((i) => i.type === "occupied").length;
  }, [displayItems]);

  const totalVacant = React.useMemo(() => {
    return displayItems.filter((i) => i.type === "vacant").length;
  }, [displayItems]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header section with underline accent */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="relative inline-block">
            <h2 className="relative text-xl sm:text-2xl font-bold tracking-tight text-foreground z-2 capitalize">
              {chapterHeading}
            </h2>
            <HeaderAccent />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Officials holding constitutional executive leadership and governance offices for {partyName.toUpperCase()}.
          </p>
        </div>

        {/* Status Counts Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Users className="size-3.5" />
            <span>{totalOccupied} Appointed</span>
          </span>
          {showVacant && totalVacant > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
              <span>{totalVacant} Vacant</span>
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search officials by name or position title..."
            className="pl-10 h-11 bg-card border-border/60 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Appointment Type selector */}
          <select
            value={appointmentTypeFilter}
            onChange={(e) => setAppointmentTypeFilter(e.target.value)}
            className="h-11 px-3 text-xs font-medium rounded-xl border border-border/60 bg-card text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Appointments</option>
            <option value="substantive">Substantive</option>
            <option value="acting">Acting</option>
            <option value="caretaker">Caretaker</option>
            <option value="interim">Interim</option>
          </select>

          {/* Toggle vacant positions button */}
          <button
            type="button"
            onClick={() => setShowVacant((v) => !v)}
            className={`h-11 px-3.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap cursor-pointer ${showVacant
              ? "bg-muted/80 text-foreground border-border"
              : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
              }`}
          >
            {showVacant ? "Hide Vacant" : "Show Vacant"}
          </button>
        </div>
      </div>

      {/* Roster Grid View */}
      {isPositionsLoading || isOfficialsLoading ? (
        <div className="flex items-center justify-center p-20 text-muted-foreground bg-card/40 rounded-3xl border border-border/50">
          <Loader2 className="size-6 animate-spin mr-2 text-primary" />
          <span className="text-sm font-medium">Loading leadership roster...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="w-full p-16 text-center text-muted-foreground bg-card/40 rounded-3xl border border-border/50 space-y-2">
          <p className="text-base font-semibold text-foreground">No leadership officials found</p>
          <p className="text-sm max-w-md mx-auto">
            No appointed officials or vacant positions match your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="w-full rounded-3xl bg-sidebar-mobile/40 dark:bg-card/40 p-8 sm:p-12 border border-border/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
            {displayItems.map((item) =>
              item.type === "occupied" ? (
                <OccupiedPositionCard
                  key={item.key}
                  official={item.official}
                  positionTitle={item.positionTitle}
                />
              ) : (
                <VacantPositionCard
                  key={item.key}
                  position={item.position}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default PartyLeadershipTabComponent;

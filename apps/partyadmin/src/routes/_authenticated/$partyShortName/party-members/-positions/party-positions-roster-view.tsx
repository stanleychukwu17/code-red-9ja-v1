import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  MapPin,
  Calendar,
  UserX,
  UserPlus,
} from "lucide-react";
import { useUserParty } from "#/hooks/useUserParty";
import { usePartyPositions } from "#/hooks/usePartyPositions";
import {
  getPartyOfficials,
  vacatePartyOfficial,
  type PartyOfficialItem,
  type PartyPositionItem,
} from "#/lib/server/parties";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { VacantPositionAvatar } from "@repo/ui/components/vacant-avatar";
import { AppointOfficialDialog } from "./party-positions-appoint-dialog";

export interface PartyPositionsRosterViewProps {
  chapterTier?: string;
  selectedCountryId?: number;
  selectedZonalId?: number;
  selectedStateId?: number;
  selectedLgaId?: number;
  selectedWardId?: number;
  searchQuery?: string;
  appointmentTypeFilter?: string;
  onVacateOfficial?: (official: PartyOfficialItem) => void;
  onAppointPosition?: (position: PartyPositionItem) => void;
}

const APPOINTMENT_BADGE_STYLES: Record<string, string> = {
  acting: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300 dark:border dark:border-blue-500/30",
  substantive: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30",
  caretaker: "bg-amber-600 text-white dark:bg-amber-500/20 dark:text-amber-300 dark:border dark:border-amber-500/30",
  interim: "bg-purple-600 text-white dark:bg-purple-500/20 dark:text-purple-300 dark:border dark:border-purple-500/30",
};

/**
 * Vacant Position Card
 * Matches design with pastel lime-green gradient circle, position title, red 'Vacant' status, and 3-dots action.
 */
function VacantPositionCard({ position, onAppoint }: {
  position: PartyPositionItem;
  onAppoint?: (position: PartyPositionItem) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-start text-center w-full max-w-60">
      {/* Vacant circular gradient avatar */}
      <VacantPositionAvatar />

      {/* Position title */}
      <h3 className="mt-4 text-[17px] font-semibold text-c-90 tracking-tight capitalize leading-tight">
        {position.name}
      </h3>

      {/* Vacant text */}
      <p className="mt-1 text-[14px] font-semibold text-destructive">
        Vacant
      </p>

      {/* Actions */}
      <div className="mt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-sidebar-mobile hover:bg-hover-7 text-c-70 hover:text-c-90 border border-border/40 transition cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44">
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2"
              onClick={() => onAppoint?.(position)}
            >
              <UserPlus className="size-4" />
              <span>Appoint official</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Occupied Position Card
 * Matches design with official avatar photo, position title, bold full name + appointment badge,
 * chapter jurisdiction & tenure start date, and 3-dots action.
 */
function OccupiedPositionCard({ official, positionTitle, onVacate }: {
  official: PartyOfficialItem;
  positionTitle: string;
  onVacate: (official: PartyOfficialItem) => void;
}) {
  const fullName =
    [official.first_name, official.middle_name, official.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed Official";

  const badgeStyle =
    APPOINTMENT_BADGE_STYLES[official.appointment_type?.toLowerCase()] ||
    "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300";

  const tenureDate = official.tenure_start
    ? new Date(official.tenure_start).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    })
    : official.assigned_at
      ? new Date(official.assigned_at).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
      : "Active";

  const chapterDisplay = official.chapter_type === "national"
    ? "National chapter"
    : official.geo_name
      ? `${official.geo_name} (${official.chapter_type})`
      : `${official.chapter_type} chapter`;

  return (
    <div className="flex flex-col items-center justify-start text-center w-full max-w-65">
      {/* Official Circular Avatar */}
      <div className="size-36 rounded-full shrink-0 overflow-hidden border border-border/60 shadow-xs bg-sidebar-mobile dark:bg-card flex items-center justify-center">
        {official.avatar ? (
          <img
            src={official.avatar}
            alt={fullName}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-c-50 uppercase">
            {official.first_name?.[0] || ""}
            {official.last_name?.[0] || ""}
          </span>
        )}
      </div>

      {/* Position title */}
      <h4 className="mt-4 text-[16px] font-medium text-c-70 tracking-tight capitalize leading-tight">
        {positionTitle}
      </h4>

      {/* Official Name + Appointment Badge */}
      <div className="mt-1 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-[18px] font-bold text-c-90 capitalize">
          {fullName}
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize leading-tight ${badgeStyle}`}
        >
          {official.appointment_type}
        </span>
      </div>

      {/* Chapter Jurisdiction & Tenure */}
      <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-c-60">
        <span className="inline-flex items-center gap-1 font-normal">
          <MapPin className="size-3.5 text-c-50 shrink-0" />
          <span className="capitalize">{chapterDisplay}</span>
        </span>
        <span className="text-c-30">|</span>
        <span className="inline-flex items-center gap-1 font-normal">
          <Calendar className="size-3.5 text-c-50 shrink-0" />
          <span>{tenureDate}</span>
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-sidebar-mobile hover:bg-hover-7 text-c-70 hover:text-c-90 border border-border/40 transition cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
              onClick={() => onVacate(official)}
            >
              <UserX className="size-4" />
              <span>Vacate Office</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Main Roster View
 * Fetches all arranged party positions & active officials.
 * Matches officials to positions, displaying occupied cards (with multi-occupant support)
 * or vacant cards as designed.
 */
export function PartyPositionsRosterView({
  chapterTier = "national",
  selectedCountryId,
  selectedZonalId,
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  searchQuery = "",
  appointmentTypeFilter = "all",
  onVacateOfficial,
  onAppointPosition,
}: PartyPositionsRosterViewProps) {
  const { party } = useUserParty();
  const queryClient = useQueryClient();
  const partyId = party?.id;

  // Internal state for appointment dialog if not overridden by parent
  const [appointingPosition, setAppointingPosition] = React.useState<PartyPositionItem | null>(null);

  // Fetch positions catalog (already pre-sorted by rank_order and ID)
  const { positions, isLoading: isPositionsLoading } = usePartyPositions();

  // Fetch appointed officials matching current geographic and chapter filters
  const { data: officialsRes, isLoading: isOfficialsLoading } = useQuery({
    queryKey: [
      "partyOfficials",
      partyId,
      chapterTier,
      selectedCountryId,
      selectedZonalId,
      selectedStateId,
      selectedLgaId,
      selectedWardId,
    ],
    queryFn: () =>
      getPartyOfficials({
        data: {
          partyId: partyId!,
          countryId: selectedCountryId,
          zonalId: selectedZonalId,
          stateId: selectedStateId,
          lgaId: selectedLgaId,
          wardId: selectedWardId,
        },
      }),
    enabled: !!partyId,
    staleTime: Infinity,
  });

  // Extract list of officials from response; default empty array
  const rawOfficials: PartyOfficialItem[] = officialsRes?.data?.officials || [];

  // Sort officials in frontend (active status first, followed by tenure recency)
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

  // Index active officials by position_id for O(1) slot matching
  const officialsByPosition = React.useMemo(() => {
    const map = new Map<number, PartyOfficialItem[]>();
    for (const off of sortedOfficials) {
      if ((off.assignment_status || "active") !== "active") {
        continue;
      }
      const list = map.get(off.position_id) || [];
      list.push(off);
      map.set(off.position_id, list);
    }
    return map;
  }, [sortedOfficials]);

  // Handle vacating an official from office (either via prop or built-in confirmation)
  const handleVacateOfficial = async (official: PartyOfficialItem) => {
    if (onVacateOfficial) {
      onVacateOfficial(official);
      return;
    }

    const confirmVacate = window.confirm(
      `Are you sure you want to vacate ${official.position_name} for ${official.first_name} ${official.last_name}?`,
    );
    if (!confirmVacate || !partyId) return;

    try {
      const res = await vacatePartyOfficial({
        data: {
          partyId,
          assignmentId: official.assignment_id,
        },
      });
      if (res?.success) {
        toast.success("Office vacated successfully");
        queryClient.invalidateQueries({ queryKey: ["partyOfficials"] });
      } else {
        toast.error(res?.message || "Failed to vacate office");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to vacate office");
    }
  };

  // Debounce client-side search query to avoid recalculating filtered cards on every keystroke
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);

  // Build the roster display list: merges position catalog with appointed occupants
  const displayItems = React.useMemo(() => {
    // Stable sort positions by rank_order ASC, then ID ASC
    const sorted = [...positions].sort((a, b) => {
      if (a.rank_order !== b.rank_order) return a.rank_order - b.rank_order;
      return a.id - b.id;
    });

    // Filter positions valid for the active chapter tier (e.g. national, state, LGA)
    const tierFiltered = sorted.filter((p) => {
      if (!chapterTier || chapterTier === "all") return true;
      if (!p.allowed_levels || p.allowed_levels.length === 0) return true;
      return p.allowed_levels.some(
        (lvl) =>
          lvl.toLowerCase() === chapterTier.toLowerCase() ||
          lvl.toLowerCase() === "all",
      );
    });

    const searchLower = debouncedSearchQuery.toLowerCase().trim();

    // Accumulated list of card items (occupied or vacant) to render in grid
    const results: Array<
      | { type: "occupied"; official: PartyOfficialItem; positionTitle: string; key: string }
      | { type: "vacant"; position: PartyPositionItem; key: string }
    > = [];

    for (const pos of tierFiltered) {
      let assigned = officialsByPosition.get(pos.id) || [];

      // Filter occupants by appointment type (e.g. substantive, acting, caretaker)
      if (appointmentTypeFilter !== "all") {
        assigned = assigned.filter(
          (o) =>
            o.appointment_type?.toLowerCase() ===
            appointmentTypeFilter.toLowerCase(),
        );
      }

      // If active search query, match position name or official names/titles
      if (searchLower) {
        const posMatches = pos.name.toLowerCase().includes(searchLower);
        const matchingOfficials = assigned.filter(
          (o) =>
            posMatches ||
            o.position_name?.toLowerCase().includes(searchLower) ||
            `${o.first_name || ""} ${o.last_name || ""}`
              .toLowerCase()
              .includes(searchLower) ||
            (o.username && o.username.toLowerCase().includes(searchLower)),
        );

        if (matchingOfficials.length > 0) {
          // Render cards for matching occupants
          for (const off of matchingOfficials) {
            results.push({
              type: "occupied",
              official: off,
              positionTitle: off.position_name || pos.name,
              key: `occupied-${off.assignment_id}`,
            });
          }
        } else if (posMatches && appointmentTypeFilter === "all") {
          // If position name matches but has no occupants, show vacant card
          results.push({
            type: "vacant",
            position: pos,
            key: `vacant-${pos.id}`,
          });
        }
        continue;
      }

      // When not searching: render card for each occupant (supports multiple occupants)
      if (assigned.length > 0) {
        for (const off of assigned) {
          results.push({
            type: "occupied",
            official: off,
            positionTitle: off.position_name || pos.name,
            key: `occupied-${off.assignment_id}`,
          });
        }
      } else if (appointmentTypeFilter === "all") {
        // Show vacant card only when not filtering by a specific appointment type
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
    chapterTier,
    officialsByPosition,
    appointmentTypeFilter,
    debouncedSearchQuery,
  ]);

  const resolvedChapterId =
    officialsRes?.data?.chapter_id || rawOfficials[0]?.chapter_id;

  const resolvedChapterLabel = React.useMemo(() => {
    if (chapterTier === "national") return "National chapter";
    const geoName = rawOfficials[0]?.geo_name;
    if (geoName) return `${geoName} (${chapterTier}) chapter`;
    return `${chapterTier} chapter`;
  }, [chapterTier, rawOfficials]);

  if (isPositionsLoading || isOfficialsLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-c-40 bg-background rounded-2xl border border-border">
        <Loader2 className="size-6 animate-spin mr-2 text-primary" />
        <span className="text-[14px]">Loading party positions & officials...</span>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="w-full p-16 text-center text-c-50 font-medium bg-background rounded-2xl border border-border space-y-3">
        <p className="text-[16px] text-c-70">No party positions or officials found.</p>
        <p className="text-[13px] text-c-40 max-w-md mx-auto">
          No positions or appointed officials match your selected tier and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-2xl bg-sidebar-softer/5 dark:bg-card/40 p-8 md:p-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
          {displayItems.map((item) =>
            item.type === "occupied" ? (
              <OccupiedPositionCard
                key={item.key}
                official={item.official}
                positionTitle={item.positionTitle}
                onVacate={handleVacateOfficial}
              />
            ) : (
              <VacantPositionCard
                key={item.key}
                position={item.position}
                onAppoint={(pos) => {
                  if (onAppointPosition) {
                    onAppointPosition(pos);
                  } else {
                    setAppointingPosition(pos);
                  }
                }}
              />
            ),
          )}
        </div>
      </div>

      {/* Appoint Official Dialog */}
      <AppointOfficialDialog
        open={!!appointingPosition}
        onClose={() => setAppointingPosition(null)}
        position={appointingPosition}
        chapterId={resolvedChapterId}
        chapterTier={chapterTier}
        chapterContextLabel={resolvedChapterLabel}
        partyId={partyId}
      />
    </>
  );
}

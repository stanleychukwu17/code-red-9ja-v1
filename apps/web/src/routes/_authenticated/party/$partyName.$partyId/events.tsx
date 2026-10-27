import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  Clock,
  Search,
  ChevronRight,
  Sparkles,
  Building,
  Flag,
} from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { getPartyEvents, type PartyEventData } from "@/lib/server/parties";
import { partyProfileQueryOptions } from "../$partyName.$partyId";

export type PartyEventsSearch = {
  chapterId?: number;
};

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId/events")({
  validateSearch: (search: Record<string, unknown>): PartyEventsSearch => {
    const rawChapterId = search?.chapterId;
    const parsed = Number(rawChapterId);
    return {
      chapterId: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
    };
  },
  component: PartyEventsTabComponent,
});

export type EventTierLevel = "national" | "state" | "lga" | "ward";

interface TierBulletItem {
  id: EventTierLevel;
  label: string;
  badgeLabel: string;
  icon: typeof Building;
}

interface PartyEventItem {
  id: string;
  title: string;
  description: string;
  tier: EventTierLevel;
  date: string;
  month: string;
  day: string;
  time: string;
  location: string;
  venueName: string;
  attendeesCount: number;
  category: "Meeting" | "Convention" | "Rally" | "Workshop";
  isVirtual?: boolean;
}

// Sample events structured across the 4 Nigerian party hierarchy tiers
const SAMPLE_PARTY_EVENTS: PartyEventItem[] = [
  // 1. National Level Events
  {
    id: "evt-nat-1",
    title: "National Working Committee (NWC) Quarterly Strategy Summit",
    description: "High-level national leadership assembly reviewing quarterly grassroots progress, policy manifestos, and electoral readiness.",
    tier: "national",
    month: "NOV",
    day: "14",
    date: "November 14, 2026",
    time: "10:00 AM - 3:00 PM",
    location: "Eagle Square Conference Center, Central Business District, Abuja",
    venueName: "National Headquarters, Abuja",
    attendeesCount: 340,
    category: "Convention",
  },
  {
    id: "evt-nat-2",
    title: "National Youth & Digital Mobilization Conference",
    description: "National youth convention focusing on digital civic organizing, leadership development, and innovative electoral mobilization.",
    tier: "national",
    month: "DEC",
    day: "02",
    date: "December 02, 2026",
    time: "11:00 AM - 4:30 PM",
    location: "International Conference Centre (ICC), Abuja",
    venueName: "Abuja Event Hub",
    attendeesCount: 1250,
    category: "Rally",
  },

  // 2. State Level Events
  {
    id: "evt-state-1",
    title: "State Executive Council & Chapter Harmonization Meeting",
    description: "State-wide delegate meeting reviewing local government chapters, constituency coordinators, and regional grassroots outreach.",
    tier: "state",
    month: "NOV",
    day: "21",
    date: "November 21, 2026",
    time: "12:00 PM - 3:30 PM",
    location: "Party State Secretariat, Ikeja, Lagos",
    venueName: "State Secretariat Auditorium",
    attendeesCount: 220,
    category: "Meeting",
  },
  {
    id: "evt-state-2",
    title: "State Grassroots Engagement & Leadership Townhall",
    description: "Interactive citizens townhall with state party executives discussing community manifestos, member welfare, and election monitors.",
    tier: "state",
    month: "DEC",
    day: "09",
    date: "December 09, 2026",
    time: "2:00 PM - 5:30 PM",
    location: "Cultural Centre Hall, Victoria Island, Lagos",
    venueName: "Civic Pavilion",
    attendeesCount: 680,
    category: "Rally",
  },

  // 3. LGA Level Events
  {
    id: "evt-lga-1",
    title: "Local Government General Assembly & Ward Delegates Briefing",
    description: "Monthly statutory convening of local government party executives, ward chairpersons, and local community representatives.",
    tier: "lga",
    month: "NOV",
    day: "28",
    date: "November 28, 2026",
    time: "1:00 PM - 3:30 PM",
    location: "LGA Party Headquarters, Alausa Secretariat Way",
    venueName: "LGA Council Hall",
    attendeesCount: 110,
    category: "Meeting",
  },
  {
    id: "evt-lga-2",
    title: "Constituency Voter Registration & Community Outreach Drive",
    description: "Grassroots civic initiative to support eligible constituents with verification, party membership registration, and polling unit lookups.",
    tier: "lga",
    month: "DEC",
    day: "15",
    date: "December 15, 2026",
    time: "9:00 AM - 1:00 PM",
    location: "Community Sports Complex, Main Street",
    venueName: "Outreach Center",
    attendeesCount: 450,
    category: "Workshop",
  },

  // 4. Ward Level Events
  {
    id: "evt-ward-1",
    title: "Ward General Meeting & Community Dialogue",
    description: "Grassroots monthly gathering of registered party members in the ward, discussing local civic initiatives, neighborhood projects, and member dues.",
    tier: "ward",
    month: "NOV",
    day: "18",
    date: "November 18, 2026",
    time: "4:00 PM - 6:00 PM",
    location: "Ward Secretariat Hall, 14 Community Road",
    venueName: "Ward Assembly Room",
    attendeesCount: 75,
    category: "Meeting",
  },
  {
    id: "evt-ward-2",
    title: "Neighborhood Polling Unit Marshals Coordination Session",
    description: "Orientation and briefing session for accredited polling unit observers and community mobilizers across the ward.",
    tier: "ward",
    month: "DEC",
    day: "05",
    date: "December 05, 2026",
    time: "3:30 PM - 5:30 PM",
    location: "Local Community Hall, Ward Center",
    venueName: "Civic Hall",
    attendeesCount: 90,
    category: "Meeting",
  },
];

function parseApiEvent(evt: PartyEventData): PartyEventItem {
  const startDate = new Date(evt.starts_at);
  const isValidDate = !isNaN(startDate.getTime());

  const month = isValidDate
    ? startDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    : "TBD";
  const day = isValidDate ? String(startDate.getDate()).padStart(2, "0") : "--";
  const fullDate = isValidDate
    ? startDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  let timeStr = "";
  if (isValidDate) {
    const startTimeStr = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (evt.ends_at) {
      const endDate = new Date(evt.ends_at);
      if (!isNaN(endDate.getTime())) {
        const endTimeStr = endDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        timeStr = `${startTimeStr} - ${endTimeStr}`;
      } else {
        timeStr = startTimeStr;
      }
    } else {
      timeStr = startTimeStr;
    }
  }

  return {
    id: String(evt.id),
    title: evt.title,
    description: evt.description,
    tier: (evt.tier as EventTierLevel) || "national",
    date: fullDate,
    month,
    day,
    time: timeStr,
    location: evt.location,
    venueName: evt.venue_name || "",
    attendeesCount: 0,
    category: (evt.category as any) || "Meeting",
    isVirtual: evt.is_virtual,
  };
}

function PartyEventsTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const { chapterId } = Route.useSearch();

  // Load cached party and chapter profile
  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName, chapterId)
  );

  // Fetch party events from backend
  const { data: eventsRes, isLoading: isEventsLoading } = useQuery({
    queryKey: ["partyEvents", partyId, chapterId],
    queryFn: () => getPartyEvents({ data: { partyId, chapterId } }),
  });

  const allEvents = useMemo<PartyEventItem[]>(() => {
    if (eventsRes?.success && eventsRes.data && eventsRes.data.length > 0) {
      return eventsRes.data.map(parseApiEvent);
    }
    return SAMPLE_PARTY_EVENTS;
  }, [eventsRes]);

  // Determine active chapter tier ("national", "state", "lga", "ward")
  const currentChapterType: EventTierLevel = useMemo(() => {
    const rawType = profileRes?.success
      ? (profileRes.data.chapter_type || profileRes.data.chapter?.chapter_type || "national")
      : "national";
    const normalized = rawType.toLowerCase().trim();
    if (normalized === "ward" || normalized === "lga" || normalized === "state") {
      return normalized as EventTierLevel;
    }
    return "national";
  }, [profileRes]);

  // Geographical labels for customization
  const geoLabels = useMemo(() => {
    const chapter = profileRes?.success ? profileRes.data.chapter : null;
    const geoName = profileRes?.success ? profileRes.data.chapter_geo_name : "";
    const chapName = profileRes?.success ? (profileRes.data.chapter_name || chapter?.name) : "";
    return {
      geoName: geoName || chapName || "",
      chapName: chapName || "",
    };
  }, [profileRes]);

  // Compute available bullet button tiers strictly based on chapter level:
  // - In ward chapter: national, state, lga, ward (4 bullets)
  // - In lga chapter: national, state, lga (3 bullets)
  // - In state chapter: national, state (2 bullets)
  // - In national chapter: no tabs / 0 bullets
  const availableTiers = useMemo<TierBulletItem[]>(() => {
    if (currentChapterType === "national") {
      return []; // No tabs when in national chapter
    }

    const tiers: TierBulletItem[] = [];

    // All non-national chapters can see National events
    tiers.push({
      id: "national",
      label: "National",
      badgeLabel: "National Events",
      icon: Flag,
    });

    // State tier
    tiers.push({
      id: "state",
      label: "State",
      badgeLabel: "State Chapter Events",
      icon: Building,
    });

    // LGA tier (if in LGA or Ward chapter)
    if (currentChapterType === "lga" || currentChapterType === "ward") {
      tiers.push({
        id: "lga",
        label: "LGA",
        badgeLabel: "LGA Chapter Events",
        icon: Building,
      });
    }

    // Ward tier (only if in Ward chapter)
    if (currentChapterType === "ward") {
      tiers.push({
        id: "ward",
        label: "Ward",
        badgeLabel: "Ward Chapter Events",
        icon: Building,
      });
    }

    return tiers;
  }, [currentChapterType]);

  // Selected bullet tier (defaults to the current chapter level, or 'national' if in national chapter)
  const [selectedTier, setSelectedTier] = useState<EventTierLevel>(() => currentChapterType);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Keep selected tier in sync if currentChapterType changes
  useMemo(() => {
    setSelectedTier(currentChapterType);
  }, [currentChapterType]);

  // Filter events by selected tier, search query, and category
  const filteredEvents = useMemo(() => {
    // If in national chapter, show national events. Otherwise show selected tier events.
    const activeTier = currentChapterType === "national" ? "national" : selectedTier;

    return allEvents.filter((evt) => {
      // Tier match
      if (evt.tier !== activeTier) return false;

      // Category match
      if (categoryFilter !== "All" && evt.category !== categoryFilter) return false;

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = evt.title.toLowerCase().includes(query);
        const matchesLocation = evt.location.toLowerCase().includes(query);
        const matchesVenue = evt.venueName.toLowerCase().includes(query);
        return matchesTitle || matchesLocation || matchesVenue;
      }

      return true;
    });
  }, [currentChapterType, selectedTier, searchQuery, categoryFilter, allEvents]);

  const categories = ["All", "Meeting", "Convention", "Rally", "Workshop"];

  return (
    <div className="space-y-6 pb-20">
      {/* Tab Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {partyName.toUpperCase()} Events & Meetings
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3" />
              {currentChapterType.toUpperCase()} CHAPTER
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Browse upcoming party conventions, general assemblies, and grassroots meetings across chapters.
          </p>
        </div>
      </div>

      {/* 
        Bullet Buttons Navigation:
        - Only rendered when in a sub-national chapter (Ward: 4 buttons, LGA: 3 buttons, State: 2 buttons).
        - In National chapter, availableTiers is empty, so no tabs are rendered.
      */}
      {availableTiers.length > 0 && (
        <div className="bg-card border border-border/70 rounded-2xl p-2.5 sm:p-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Filter by Chapter Tier:
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {availableTiers.map((tier) => {
                const isActive = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-foreground text-background shadow-sm scale-100"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {/* Bullet indicator dot */}
                    <span
                      className={`size-2 rounded-full transition-transform ${
                        isActive ? "bg-primary scale-125" : "bg-muted-foreground/40"
                      }`}
                    />
                    <span>{tier.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search and Category Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, venue, or address..."
            className="pl-10 h-11 bg-card border-border/60 rounded-xl"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Listing / Grid */}
      {isEventsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={`events-skeleton-${idx}`}
              className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="size-14 sm:size-16 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <div className="pt-2 border-t border-border/40 space-y-2">
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-card border border-border/70 hover:border-border rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Event header row: Date calendar tile + Tier badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Calendar Day Badge */}
                    <div className="size-14 sm:size-16 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0 text-center">
                      <span className="text-[11px] font-bold text-primary tracking-wider uppercase leading-none">
                        {evt.month}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-foreground leading-none mt-1">
                        {evt.day}
                      </span>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {evt.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {evt.title}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground shrink-0 uppercase tracking-wide">
                    {evt.tier}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {evt.description}
                </p>

                {/* Event Metadata row: Time & Location */}
                <div className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary shrink-0" />
                    <span>{evt.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span className="line-clamp-1">{evt.location}</span>
                  </div>
                </div>
              </div>

              {/* Event Card Footer */}
              <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>{evt.category}</span>
                </span>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Details</span>
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-10 sm:p-14 text-center">
          <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <CalendarDays className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No Events Scheduled for this Tier
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            There are currently no upcoming events or meetings found for the selected {selectedTier} chapter.
          </p>
        </div>
      )}
    </div>
  );
}
